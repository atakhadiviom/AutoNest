
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
// import {onRequest} from "firebase-functions/v2/https"; // Keep if using v2
// import * as logger from "firebase-functions/logger"; // Keep if using logger

// Express for API routing
import express, {Request, Response} from "express";
import cors from "cors";
import bodyParser from "body-parser";

// PayPal
import paypalClient from "./paypalClient";
// Use require for PayPal SDK to ensure CommonJS loading
const checkoutNodeJssdk = require("@paypal/checkout-server-sdk");


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
        value: dollarAmount, // e.g., "10.00"
        breakdown: { // Optional, but good for itemized view
          item_total: {
            currency_code: "USD",
            value: dollarAmount,
          },
        },
      },
      description: `${creditsToPurchase} App Credits Purchase`,
      items: [{ // Optional, but good for receipt details
        name: "App Credits",
        unit_amount: {
          currency_code: "USD",
          value: dollarAmount,
        },
        quantity: "1",
        description: `${creditsToPurchase} credits for AutoNest app.`,
        sku: `AUTONEST-CREDITS-${creditsToPurchase}`, // Example SKU
      }],
    }],
  });

  try {
    const order = await paypalClient.execute(request);
    functions.logger.info("PayPal order created successfully:", order.result);
    return res.status(200).json({orderID: order.result.id});
  } catch (err: any) {
    functions.logger.error("Failed to create PayPal order:", {
      message: err.message,
      statusCode: err.statusCode,
      details: err.result ? err.result.details : "No details",
      fullError: err, // Log the full error object for more details
    });
    const statusCode = err.statusCode || 500;
    const errorMessage =
      err.result?.details?.[0]?.description ||
      err.message ||
      "Failed to create PayPal order.";
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

  const request = new checkoutNodeJssdk.orders.OrdersCaptureRequest(orderID);
  // request.requestBody({}); // Body is empty for capture

  try {
    const capture = await paypalClient.execute(request);
    const captureData = capture.result;
    functions.logger.info(
      "PayPal payment captured successfully:", captureData,
    );

    // Check if payment is completed
    if (captureData.status === "COMPLETED") {
      // Payment successful, update user credits in Firestore
      const userDocRef = db.collection("users").doc(userUID);
      try {
        await userDocRef.update({
          credits: admin.firestore.FieldValue.increment(creditsToPurchase),
        });
        functions.logger.info(
          `Successfully updated credits for user ${userUID}.`,
        );
        // Return success to client
        return res.status(200).json({
          message: "Payment successful and credits updated.",
          captureData: captureData,
        });
      } catch (dbError: any) {
        functions.logger.error(
          `PayPal payment captured for order ${orderID}, ` +
          `but failed to update credits for user ${userUID}:`,
          dbError,
        );
        // Critical: Payment taken, credits not awarded. Implement retry/alert.
        return res.status(500).json({
          error: "Payment successful, but credit update failed. " +
                 "Please contact support.",
          paypalOrderId: orderID,
        });
      }
    } else {
      // Handle other capture statuses (e.g., PENDING) if necessary
      functions.logger.warn(
        `PayPal capture status for order ${orderID} is ${captureData.status}.`,
      );
      return res.status(400).json({
        error: `Payment capture status: ${captureData.status}.`,
        details: captureData,
      });
    }
  } catch (err: any) {
    functions.logger.error(`Failed to capture PayPal for ${orderID}:`, {
      message: err.message,
      statusCode: err.statusCode,
      details: err.result ? err.result.details : "No details",
      fullError: err, // Log the full error object
    });

    // Check for INSTRUMENT_DECLINED specifically
    if (
      err.statusCode === 422 &&
      err.result?.details?.[0]?.issue === "INSTRUMENT_DECLINED"
    ) {
      functions.logger.warn(
        `Instrument declined for order ${orderID}.`,
        err.result.details,
      );
      return res.status(402).json({ // 402 Payment Required
        error: "Payment method declined by PayPal.",
        isInstrumentDeclined: true,
        details: err.result.details,
      });
    }

    const statusCode = err.statusCode || 500;
    const errorMessage =
      err.result?.details?.[0]?.description ||
      err.message ||
      "Failed to capture PayPal payment.";
    return res.status(statusCode).json({error: errorMessage});
  }
});


// Expose Express API as a single Cloud Function:
export const paypalAPI = functions.https.onRequest(app);

// Extremely simplified helloWorld function for testing deployment
export const helloWorld = functions.https.onRequest((
  _req: Request, response: Response,
) => {
  // functions.logger.info("Hello logs!", {structuredData: true});
  response.send("Hello from simplified Firebase!");
});
