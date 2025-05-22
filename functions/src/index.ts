/**
 * Firebase Cloud Functions for PayPal REST API integration.
 */
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import paypalClient from "./paypalClient"; // Corrected import name
import paypal from "@paypal/checkout-server-sdk";

// Initialize Firebase Admin SDK if not already initialized
if (admin.apps.length === 0) {
  admin.initializeApp();
}
const db = admin.firestore();

const app = express();

// Middleware
app.use(cors({origin: true})); // Enable CORS for all origins
app.use(bodyParser.json());

// ---- PayPal Create Order Endpoint ----
app.post("/create-order", async (req, res) => {
  const {dollarAmount, creditsToPurchase} = req.body;

  if (!dollarAmount || typeof dollarAmount !== "string" ||
      !creditsToPurchase || typeof creditsToPurchase !== "number") {
    functions.logger.error(
      "[PayPal API] Invalid input for /create-order:", req.body
    );
    return res.status(400).json({error: "Invalid input parameters."});
  }

  const request = new paypal.orders.OrdersCreateRequest();
  request.prefer("return=representation");
  request.requestBody({
    intent: "CAPTURE",
    purchase_units: [{
      amount: {
        currency_code: "USD",
        value: dollarAmount,
        breakdown: {
          item_total: {
            currency_code: "USD",
            value: dollarAmount,
          },
        },
      },
      description: `${creditsToPurchase} AutoNest Credits`,
      items: [{
        name: `AutoNest Credits Pack (${creditsToPurchase})`,
        quantity: "1",
        unit_amount: {
          currency_code: "USD",
          value: dollarAmount,
        },
        category: "DIGITAL_GOODS",
      }],
    }],
  });

  try {
    const order = await paypalClient.execute(request);
    functions.logger.info(
      "[PayPal API] Order created successfully:", {orderId: order.result.id}
    );
    return res.status(201).json({orderID: order.result.id});
  } catch (err: any) { // ESLint warning for 'any' can be refined later
    functions.logger.error(
      "[PayPal API] Error creating order:",
      {
        error: err.message,
        statusCode: err.statusCode,
        details: err.result ? err.result.details : "No details",
      }
    );
    const statusCode = err.statusCode || 500;
    const message = err.result?.details?.[0]?.description ||
                    err.message || "Failed to create PayPal order.";
    return res.status(statusCode).json({error: message});
  }
});

// ---- PayPal Capture Payment Endpoint ----
app.post("/capture-payment", async (req, res) => {
  const {orderID, creditsToPurchase, userUID} = req.body;

  if (!orderID || !creditsToPurchase || !userUID) {
    functions.logger.error(
      "[PayPal API] Invalid input for /capture-payment:", req.body
    );
    return res.status(400).json({error: "Invalid input parameters."});
  }

  const request = new paypal.orders.OrdersCaptureRequest(orderID);
  // For a simple capture, request.requestBody is often not needed or an empty
  // object is handled implicitly by the SDK for this type of request.
  // The previous line `request.requestBody = {};` and `@ts-ignore` are removed.

  try {
    const capture = await paypalClient.execute(request);
    const captureData = capture.result;

    functions.logger.info(
      "[PayPal API] Payment captured successfully:",
      {captureId: captureData.id, status: captureData.status}
    );

    if (captureData.status === "COMPLETED") {
      // Securely update user credits in Firestore
      const userDocRef = db.collection("users").doc(userUID);
      try {
        await userDocRef.update({
          credits: admin.firestore.FieldValue.increment(creditsToPurchase),
        });
        functions.logger.info(
          `[Firestore] Added ${creditsToPurchase} credits to user ${userUID}.`
        );
        return res.status(200).json({
          message: "Payment successful and credits updated.",
          captureData,
        });
      } catch (dbError: any) { // ESLint warning for 'any' can be refined later
        functions.logger.error(
          `[Firestore] Error updating credits for user ${userUID} after ` +
          `PayPal capture ${captureData.id}:`,
          dbError
        );
        // Payment captured, but DB update failed.
        // Critical error, needs manual reconciliation.
        return res.status(500).json({
          error: "Payment captured but failed to update credits. " +
                 "Please contact support.",
          paypalCaptureId: captureData.id,
        });
      }
    } else {
      // Handle other capture statuses (e.g., PENDING, VOIDED) if necessary
      functions.logger.warn(
        `[PayPal API] Payment capture for order ${orderID} ` +
        `status: ${captureData.status}.`
      );
      return res.status(400).json({
        error: `Payment capture status: ${captureData.status}.`,
        details: captureData,
      });
    }
  } catch (err: any) { // ESLint warning for 'any' can be refined later
    functions.logger.error(
      `[PayPal API] Error capturing payment for order ${orderID}:`,
      {
        error: err.message,
        statusCode: err.statusCode,
        details: err.result ? err.result.details : "No details",
      }
    );

    // Handle specific PayPal errors like INSTRUMENT_DECLINED
    if (err.statusCode === 422 &&
        err.result?.details?.[0]?.issue === "INSTRUMENT_DECLINED") {
      return res.status(402).json({ // 402 Payment Required
        error: "Payment method declined by PayPal.",
        paypalError: err.result.details[0],
        isInstrumentDeclined: true,
      });
    }

    const statusCode = err.statusCode || 500;
    const message = err.result?.details?.[0]?.description ||
                    err.message || "Failed to capture PayPal payment.";
    return res.status(statusCode).json({error: message});
  }
});


// Expose Express API as a single Cloud Function
export const paypalAPI = functions.https.onRequest(app);

// --- Placeholder for other functions ---
// This is the function that was previously here, now just logs
export const helloWorld = functions.https.onRequest((request, response) => {
  functions.logger.info(
    "[Cloud Function] helloWorld called, but PayPal integration " +
    "has been moved to paypalAPI.",
    {structuredData: true}
  );
  response.send(
    "Hello from Firebase! PayPal API is now at /paypalAPI endpoint."
  );
});
