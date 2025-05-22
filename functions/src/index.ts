/**
 * Firebase Cloud Functions for PayPal Integration.
 */
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import paypalClient from "./paypalClient"; // Corrected import path
// Using * as paypal from "@paypal/checkout-server-sdk" to access OrdersCreateRequest etc.
import * as paypal from "@paypal/checkout-server-sdk";

// Initialize Firebase Admin SDK.
if (admin.apps.length === 0) {
  admin.initializeApp();
}
const db = admin.firestore();

const main = express();

main.use(cors({origin: true})); // Enable CORS for all routes
main.use(bodyParser.json());
main.use(bodyParser.urlencoded({extended: true}));

// Test route
main.get("/", (req, res) => {
  res.send("PayPal API for AutoNest is live!");
});

// Create PayPal Order
main.post("/create-order", async (req, res) => {
  const {dollarAmount, creditsToPurchase} = req.body;

  if (!dollarAmount || typeof dollarAmount !== "number" || dollarAmount <= 0) {
    return res.status(400).json({error: "Invalid amount specified."});
  }
  if (!creditsToPurchase || typeof creditsToPurchase !== "number" ||
    creditsToPurchase <= 0
  ) {
    return res
      .status(400)
      .json({error: "Invalid creditsToPurchase specified."});
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
      {structuredData: true},
    );
    return res.status(201).json({id: order.result.id});
  } catch (err: any) { // Keeping 'any' for now to focus on blocking errors
    functions.logger.error(
      "[Cloud Function] Error creating PayPal order:",
      err.message,
      {
        paypalStatusCode: err.statusCode,
        // err.result is common for PayPalHttpError, err.data might be for other types
        paypalResult: err.result || err.data,
        fullError: err, // Log the full error object for more details
        structuredData: true,
      },
    );
    let errorMessage = "Failed to create PayPal order.";
    // Check if PayPal SDK error has a specific message
    if (err.result && err.result.message) {
      errorMessage = err.result.message;
    } else if (err.message) { // Fallback to generic error message
      errorMessage = err.message;
    }
    return res
      .status(err.statusCode || 500)
      .json({error: errorMessage, details: err.result || err.data});
  }
});

// Capture PayPal Payment
main.post("/capture-payment", async (req, res) => {
  const {orderID, creditsToPurchase, userUID} = req.body;

  if (!orderID) {
    return res.status(400).json({error: "Missing orderID."});
  }
  if (!creditsToPurchase || typeof creditsToPurchase !== "number" ||
    creditsToPurchase <= 0
  ) {
    return res
      .status(400)
      .json({error: "Invalid creditsToPurchase specified."});
  }
  if (!userUID) {
    return res
      .status(400)
      .json({error: "Missing userUID for credit update."});
  }

  const request = new paypal.orders.OrdersCaptureRequest(orderID);
  request.requestBody = {}; // Empty body for capture

  try {
    const capture = await paypalClient.execute(request);
    functions.logger.info(
      "[Cloud Function] PayPal Payment Captured. Status: " +
      `${capture.result.status}, ID: ${capture.result.id}`,
      {structuredData: true},
    );

    if (capture.result.status === "COMPLETED") {
      try {
        const userDocRef = db.collection("users").doc(userUID);
        await userDocRef.update({
          credits:
            admin.firestore.FieldValue.increment(creditsToPurchase),
        });
        functions.logger.info(
          `[Cloud Function] Successfully updated credits for user ${userUID} ` +
          `by ${creditsToPurchase} via Admin SDK.`,
          {structuredData: true},
        );
      } catch (adminError: any) { // Keeping 'any' for now
        functions.logger.error(
          "[Cloud Function] CRITICAL: Failed to update credits for user " +
          `${userUID} via Admin SDK after successful PayPal capture. ` +
          "Manual intervention required. Error:",
          adminError,
          {
            errorMessage: adminError.message,
            errorCode: adminError.code,
            fullError: adminError,
            structuredData: true,
          },
        );
        // Even if Firestore update fails, the PayPal transaction was successful.
        // Log for manual reconciliation.
        // Consider how to handle this in production (e.g., retry queue).
        return res.status(500).json({
          error:
            "Payment captured but failed to update credits. " +
            "Please contact support.",
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
        "[Cloud Function] PayPal payment captured but status is not COMPLETED." +
        ` Status: ${capture.result.status}`,
        {paypalResult: capture.result, structuredData: true},
      );
      return res.status(400).json({
        error: `Payment status: ${capture.result.status}`,
        details: capture.result,
        paypalCaptureId: capture.result.id,
      });
    }
  } catch (err: any) { // Keeping 'any' for now
    functions.logger.error(
      "[Cloud Function] Error capturing PayPal payment:",
      err.message,
      {
        paypalStatusCode: err.statusCode,
        paypalResult: err.result || err.data,
        fullError: err,
        structuredData: true,
      },
    );
    let errorDetailsMessage = err.message || "Failed to capture PayPal payment.";
    const httpStatusCode = err.statusCode || 500;

    // Check for specific PayPal error like INSTRUMENT_DECLINED
    if (
      err.result &&
      err.result.details &&
      Array.isArray(err.result.details) &&
      err.result.details.length > 0 &&
      err.result.details[0].issue === "INSTRUMENT_DECLINED"
    ) {
      functions.logger.warn(
        "[Cloud Function] Instrument declined for PayPal payment.",
        {
          orderID: orderID,
          paypalErrorName: err.result.name, // e.g., "UNPROCESSABLE_ENTITY"
          paypalErrorDetails: err.result.details,
          structuredData: true,
        },
      );
      return res.status(402).json({ // 402 Payment Required
        error: "Payment method declined by PayPal.",
        paypalErrorName: err.result.name || "INSTRUMENT_DECLINED",
        details: err.result.details,
      });
    } else if (err.result && err.result.message) {
      errorDetailsMessage = err.result.message;
    }

    return res.status(httpStatusCode).json({
      error: "Failed to capture PayPal payment.",
      details: errorDetailsMessage,
      paypalErrorResult: err.result || err.data,
    });
  }
});

// Export the Express API as a Cloud Function
// The name "paypalAPI" will be part of the function URL
export const paypalAPI = functions.https.onRequest(main);
