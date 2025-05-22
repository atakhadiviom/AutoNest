
/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

// Firebase and basic imports
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
// Use specific Request/Response types from Express
import type {Request, Response} from "express";
import express from "express";
import cors from "cors";
import bodyParser from "body-parser";

// PayPal
import paypalClient from "./paypalClient";
// Use a namespace import for PayPal SDK for robust compatibility
import * as checkoutNodeJssdk from "@paypal/checkout-server-sdk";


// Initialize Firebase Admin SDK
// Ensure service account is available or use App Default Credentials.
if (!admin.apps.length) {
  admin.initializeApp();
}
const db = admin.firestore();

const app = express();

// Middleware
app.use(cors({origin: true})); // Enable CORS for all origins
app.use(bodyParser.json());


// ======== PAYPAL ORDER CREATION ROUTE ========
app.post("/create-order", async (req: Request, res: Response) => {
  functions.logger.info("Received /create-order request:", req.body);

  const {dollarAmount, creditsToPurchase} = req.body;

  if (
    !dollarAmount ||
    typeof dollarAmount !== "string" ||
    creditsToPurchase === undefined ||
    typeof creditsToPurchase !== "number"
  ) {
    functions.logger.error("Invalid input for /create-order:", req.body);
    return res.status(400).json({
      error: "Invalid input. Missing dollarAmount or creditsToPurchase.",
    });
  }

  const request = new checkoutNodeJssdk.orders.OrdersCreateRequest();
  request.prefer("return=representation");
  request.requestBody({
    intent: "CAPTURE",
    purchase_units: [{
      amount: {
        currency_code: "USD",
        value: dollarAmount, // The total amount for the purchase
        breakdown: {
          item_total: { // Required if items are specified
            currency_code: "USD",
            value: dollarAmount,
          },
        },
      },
      description: `${creditsToPurchase} App Credits Purchase`,
      items: [{ // Optional, but good for itemization on PayPal's side
        name: "App Credits",
        unit_amount: {
          currency_code: "USD",
          value: dollarAmount, // Price per unit
        },
        quantity: "1", // Buying 1 "pack" of credits
        description: `${creditsToPurchase} credits for AutoNest app.`,
        sku: `AUTONEST-CREDITS-${creditsToPurchase}`, // Optional SKU
      }],
    }],
  });

  try {
    const order = await paypalClient.execute(request);
    functions.logger.info("PayPal order created successfully:", order.result);
    return res.status(200).json({orderID: order.result.id});
  } catch (err: any) { // eslint-disable-line  @typescript-eslint/no-explicit-any
    functions.logger.error("Create order fail:", {
      msg: err.message,
      code: err.statusCode,
      paypalDetails: err.result?.details || "N/A",
    });
    const statusCode = err.statusCode || 500;
    const errDesc = err.result?.details?.[0]?.description;
    const errorMessage =
      errDesc || err.message || "Create order failed.";
    return res.status(statusCode).json({error: errorMessage});
  }
});

// ======== PAYPAL PAYMENT CAPTURE ROUTE ========
app.post("/capture-payment", async (req: Request, res: Response) => {
  functions.logger.info("Received /capture-payment request:", req.body);
  const {orderID, creditsToPurchase, userUID} = req.body;

  if (!orderID || creditsToPurchase === undefined || !userUID) {
    functions.logger.error("Invalid input for /capture-payment:", req.body);
    return res.status(400).json({
      error: "Invalid input. Missing orderID, creditsToPurchase, or userUID.",
    });
  }

  // @ts-ignore
  const request = new checkoutNodeJssdk.orders.OrdersCaptureRequest(orderID);
  // No requestBody needed for capture

  try {
    const capture = await paypalClient.execute(request);
    const captureData = capture.result;
    functions.logger.info(
      "PayPal payment captured successfully:", captureData,
    );

    if (captureData.status === "COMPLETED") {
      // Payment successful, update user credits in Firestore
      const userDocRef = db.collection("users").doc(userUID);
      try {
        await userDocRef.update({
          credits: admin.firestore.FieldValue.increment(creditsToPurchase),
        });
        functions.logger.info(
          `Successfully updated credits for user ${userUID}.`
        );
        return res.status(200).json({
          message: "Payment successful and credits updated.",
          captureData: captureData,
        });
      } catch (dbError: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
        functions.logger.error(
          `PayPal payment OK for ${orderID}, DB update for ${userUID} FAIL:`,
          dbError
        );
        // Critical: Payment taken, credits not awarded. Implement retry/alert.
        return res.status(500).json({
          error: "Payment successful, but credit update failed. Contact support.",
          paypalOrderId: orderID, // Return orderID for reconciliation
        });
      }
    } else {
      // Handle other capture statuses (e.g., PENDING) if necessary
      functions.logger.warn(
        `PayPal capture status for order ${orderID} is ${captureData.status}.`
      );
      return res.status(400).json({
        error: `Payment capture status: ${captureData.status}.`,
        details: captureData,
      });
    }
  } catch (err: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
    const logMessage = `Capture fail for ${orderID}:`;
    functions.logger.error(logMessage, {
      msg: err.message,
      code: err.statusCode,
      paypalDetails: err.result?.details || "N/A",
    });

    // Check for INSTRUMENT_DECLINED specifically
    if (
      err.statusCode === 422 &&
      err.result?.details?.[0]?.issue === "INSTRUMENT_DECLINED"
    ) {
      functions.logger.warn(
        `Instrument declined for order ${orderID}. Details:`,
        err.result.details
      );
      return res.status(402).json({ // 402 Payment Required
        error: "Payment method declined by PayPal.",
        isInstrumentDeclined: true,
        details: err.result.details,
      });
    }

    const statusCode = err.statusCode || 500;
    const errDetails = err.result?.details?.[0]?.description;
    const errorMessage =
      errDetails || err.message || "Capture payment failed.";
    return res.status(statusCode).json({
      error: errorMessage,
    });
  }
});


// Expose Express API as a single Cloud Function:
export const paypalAPI = functions.https.onRequest(app);

// Extremely simplified helloWorld function for testing deployment
export const helloWorld = functions.https.onRequest((
  _req: Request, response: Response,
) => {
  functions.logger.info("Hello logs!", {structuredData: true});
  response.send("Hello from simplified Firebase!");
});
