/**
 * Firebase Cloud Functions for PayPal Integration
 */
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import paypalClient from "./paypalClient"; // Corrected import path
import paypal from "@paypal/checkout-server-sdk"; // Ensure this is also imported if types are needed directly

// Initialize Firebase Admin SDK
// Ensure your service account key is available in the environment
// For local development, you might use GOOGLE_APPLICATION_CREDENTIALS
// or initialize with a service account JSON.
if (admin.apps.length === 0) {
  admin.initializeApp();
}
const db = admin.firestore();

const main = express();

main.use(cors({ origin: true })); // Enable CORS for all routes
main.use(bodyParser.json());
main.use(bodyParser.urlencoded({ extended: true }));

// Test route
main.get("/", (req, res) => {
  res.send("PayPal API for AutoNest is live!");
});

// Create PayPal Order
main.post("/create-order", async (req, res) => {
  const { dollarAmount, creditsToPurchase } = req.body;

  if (
    !dollarAmount ||
    typeof dollarAmount !== "number" ||
    dollarAmount <= 0
  ) {
    return res.status(400).json({ error: "Invalid amount specified." });
  }
  if (
    !creditsToPurchase ||
    typeof creditsToPurchase !== "number" ||
    creditsToPurchase <= 0
  ) {
    return res
      .status(400)
      .json({ error: "Invalid creditsToPurchase specified." });
  }

  const request = new paypal.orders.OrdersCreateRequest();
  request.prefer("return=representation");
  request.requestBody({
    intent: "CAPTURE",
    purchase_units: [
      {
        amount: {
          currency_code: "USD",
          value: dollarAmount.toFixed(2),
        },
        description: `${creditsToPurchase} AutoNest Credits`,
      },
    ],
  });

  try {
    const order = await paypalClient.execute(request);
    functions.logger.info(
      `[Cloud Function] PayPal Order Created: ${order.result.id}`,
      { structuredData: true }
    );
    return res.status(201).json({ id: order.result.id });
  } catch (err: any) {
    functions.logger.error("[Cloud Function] Error creating PayPal order:", err, {
      structuredData: true,
    });
    let errorMessage = "Failed to create PayPal order.";
    if (err.isAxiosError && err.response && err.response.data) {
        errorMessage = err.response.data.message || err.message;
    } else if (err.message) {
        errorMessage = err.message;
    }
    return res.status(500).json({ error: errorMessage, details: err.message });
  }
});

// Capture PayPal Payment
main.post("/capture-payment", async (req, res) => {
  const { orderID, creditsToPurchase, userUID } = req.body;

  if (!orderID) {
    return res.status(400).json({ error: "Missing orderID." });
  }
  if (
    !creditsToPurchase ||
    typeof creditsToPurchase !== "number" ||
    creditsToPurchase <= 0
  ) {
    return res
      .status(400)
      .json({ error: "Invalid creditsToPurchase specified." });
  }
  if (!userUID) {
    return res
      .status(400)
      .json({ error: "Missing userUID for credit update." });
  }

  const request = new paypal.orders.OrdersCaptureRequest(orderID);
  request.requestBody({}); // Empty body for capture

  try {
    const capture = await paypalClient.execute(request);
    functions.logger.info(
      `[Cloud Function] PayPal Payment Captured. Status: ${capture.result.status}, ID: ${capture.result.id}`,
      { structuredData: true }
    );

    if (capture.result.status === "COMPLETED") {
      try {
        const userDocRef = db.collection("users").doc(userUID);
        await userDocRef.update({
          credits: admin.firestore.FieldValue.increment(creditsToPurchase),
        });
        functions.logger.info(
          `[Cloud Function] Successfully updated credits for user ${userUID} by ${creditsToPurchase} via Admin SDK.`,
          { structuredData: true }
        );
      } catch (adminError: any) {
        functions.logger.error(
          `[Cloud Function] CRITICAL: Failed to update credits for user ${userUID} via Admin SDK after successful PayPal capture. Manual intervention required. Error:`,
          adminError,
          { structuredData: true }
        );
        // Even if Firestore update fails, the PayPal transaction was successful.
        // Log for manual reconciliation. Consider how to handle this in production (e.g., retry queue).
        return res.status(500).json({
          error:
            "Payment captured but failed to update credits. Please contact support.",
          paypalCaptureId: capture.result.id,
          adminErrorCode: adminError.code,
        });
      }

      return res.status(200).json({
        message: "Payment captured successfully and credits updated.",
        paypalCaptureId: capture.result.id,
        status: capture.result.status,
      });
    } else {
      // Handle other capture statuses if necessary, e.g., PENDING
      functions.logger.warn(
        `[Cloud Function] PayPal payment captured but status is not COMPLETED. Status: ${capture.result.status}`,
        { structuredData: true }
      );
      return res.status(400).json({
        error: `Payment status: ${capture.result.status}`,
        details: capture.result,
        paypalCaptureId: capture.result.id,
      });
    }
  } catch (err: any) {
    functions.logger.error("[Cloud Function] Error capturing PayPal payment:", err, {
      structuredData: true,
    });
    let errorDetails = err.message;
    let statusCode = 500;

    // Check if it's a PayPal SDK error with more details
    if (err.isAxiosError && err.response && err.response.data) {
        functions.logger.error("[Cloud Function] PayPal Error Details:", err.response.data, { structuredData: true });
        errorDetails = err.response.data.message || err.message;
        if (err.response.data.name === 'INSTRUMENT_DECLINED') {
            return res.status(402).json({ // 402 Payment Required
                error: 'Payment method declined by PayPal.',
                paypalError: err.response.data,
                details: err.response.data.details,
            });
        }
        statusCode = err.response.status || 500;
    }
    return res.status(statusCode).json({
      error: "Failed to capture PayPal payment.",
      details: errorDetails,
    });
  }
});

// Export the Express API as a Cloud Function
// The name 'paypalAPI' will be part of the function URL
export const paypalAPI = functions.https.onRequest(main);
