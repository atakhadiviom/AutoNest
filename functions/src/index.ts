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
import *אל admin from "firebase-admin";
import type {Request, Response} from "express"; // Explicit imports
import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import * as logger from "firebase-functions/logger";

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


// --- PayPal Direct REST API Integration ---

const getPaypalApiBaseUrl = (): string => {
  const environment = functions.config().paypal?.environment ||
    process.env.PAYPAL_ENVIRONMENT;
  if (environment && environment.toLowerCase() === "live") {
    return "https://api-m.paypal.com";
  }
  return "https://api-m.sandbox.paypal.com";
};

const getPaypalAccessToken = async (): Promise<string> => {
  const clientId = functions.config().paypal?.client_id ||
    process.env.PAYPAL_CLIENT_ID;
  const clientSecret = functions.config().paypal?.client_secret ||
    process.env.PAYPAL_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    logger.error(
      "PayPal REST API: Client ID or Secret Key is missing in config.",
    );
    throw new Error("PayPal client credentials not configured.");
  }

  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const tokenUrl = `${getPaypalApiBaseUrl()}/v1/oauth2/token`;

  try {
    const response = await fetch(tokenUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Authorization": `Basic ${auth}`,
      },
      body: "grant_type=client_credentials",
    });

    if (!response.ok) {
      const errorData = await response.json();
      logger.error("PayPal Auth Error:", {
        status: response.status,
        data: errorData,
      });
      throw new Error(
        `PayPal token request failed: ${response.status} ${response.statusText}`,
      );
    }

    const data: { access_token: string } = await response.json();
    return data.access_token;
  } catch (error) {
    logger.error("Error fetching PayPal access token:", error);
    throw error; // Re-throw to be caught by endpoint handler
  }
};


// ======== PAYPAL ORDER CREATION ROUTE (REST API) ========
app.post("/create-order", async (req: Request, res: Response) => {
  logger.info("Received /create-order request (REST API):", req.body);
  const {dollarAmount, creditsToPurchase} = req.body;

  if (
    !dollarAmount ||
    typeof dollarAmount !== "string" ||
    creditsToPurchase === undefined ||
    typeof creditsToPurchase !== "number"
  ) {
    logger.error("Invalid input for /create-order (REST API):", req.body);
    return res.status(400).json({
      error: "Invalid input. Missing dollarAmount or creditsToPurchase.",
    });
  }

  try {
    const accessToken = await getPaypalAccessToken();
    const orderApiUrl = `${getPaypalApiBaseUrl()}/v2/checkout/orders`;

    const orderPayload = {
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
        description: `${creditsToPurchase} App Credits Purchase`,
        items: [{
          name: "App Credits",
          unit_amount: {
            currency_code: "USD",
            value: dollarAmount,
          },
          quantity: "1",
          description: `${creditsToPurchase} credits for AutoNest app.`,
          sku: `AUTONEST-CREDITS-${creditsToPurchase}`,
        }],
      }],
    };

    const response = await fetch(orderApiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${accessToken}`,
      },
      body: JSON.stringify(orderPayload),
    });

    const responseData = await response.json();

    if (!response.ok || !responseData.id) {
      logger.error("PayPal order creation failed (REST API):", {
        status: response.status,
        paypalResponse: responseData,
      });
      return res.status(response.status || 500).json({
        error: responseData.message || "Failed to create PayPal order.",
        details: responseData.details,
      });
    }

    logger.info(
      "PayPal order created successfully (REST API):",
      {orderID: responseData.id},
    );
    return res.status(200).json({orderID: responseData.id});
  } catch (err: any) {
    logger.error("PayPal order creation exception (REST API):", {
      message: err.message,
      fullError: err,
    });
    return res.status(500).json({
      error: err.message || "Server error during PayPal order creation.",
    });
  }
});

// ======== PAYPAL PAYMENT CAPTURE ROUTE (REST API) ========
app.post("/capture-payment", async (req: Request, res: Response) => {
  logger.info("Received /capture-payment request (REST API):", req.body);
  const {orderID, creditsToPurchase, userUID} = req.body;

  if (!orderID || creditsToPurchase === undefined || !userUID) {
    logger.error("Invalid input for /capture-payment (REST API):", req.body);
    return res.status(400).json({
      error: "Invalid input. Missing orderID, creditsToPurchase, or userUID.",
    });
  }

  try {
    const accessToken = await getPaypalAccessToken();
    const captureApiUrl =
      `${getPaypalApiBaseUrl()}/v2/checkout/orders/${orderID}/capture`;

    const response = await fetch(captureApiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${accessToken}`,
      },
      // Capture API often doesn't need a body if created with intent: CAPTURE
    });

    const captureData = await response.json();

    if (!response.ok) {
      logger.error("PayPal payment capture failed (REST API):", {
        status: response.status,
        paypalResponse: captureData,
        orderID,
      });
      // Check for specific issues like INSTRUMENT_DECLINED
      const errorDetail = captureData.details?.[0];
      if (errorDetail?.issue === "INSTRUMENT_DECLINED") {
        return res.status(402).json({
          error: "Payment method declined by PayPal.",
          isInstrumentDeclined: true,
          details: captureData.details,
        });
      }
      return res.status(response.status || 500).json({
        error: captureData.message || "Failed to capture PayPal payment.",
        details: captureData.details,
      });
    }

    logger.info(
      "PayPal payment captured successfully (REST API):",
      captureData,
    );

    if (captureData.status === "COMPLETED") {
      const userDocRef = db.collection("users").doc(userUID);
      try {
        await userDocRef.update({
          credits: admin.firestore.FieldValue.increment(creditsToPurchase),
        });
        logger.info(
          `Successfully updated credits for user ${userUID} via REST API.`,
        );
        return res.status(200).json({
          message: "Payment successful and credits updated.",
          captureData: captureData,
        });
      } catch (dbError: any) {
        const logMsg =
          "REST API: PayPal payment OK, DB update for user credits FAIL:";
        logger.error(logMsg, {orderID, userUID, error: dbError});
        return res.status(500).json({
          error: "Payment successful, credit update failed. Contact support.",
          paypalOrderId: orderID,
        });
      }
    } else {
      const logMsg =
        `REST API: PayPal capture status for order ${orderID}`;
      logger.warn(`${logMsg} is ${captureData.status}.`);
      return res.status(400).json({
        error: `Payment capture status: ${captureData.status}.`,
        details: captureData,
      });
    }
  } catch (err: any) {
    logger.error(
      `REST API: Failed to capture PayPal for ${orderID}:`,
      {message: err.message, fullError: err},
    );
    return res.status(500).json({
      error: err.message || "Server error during PayPal payment capture.",
    });
  }
});

// Expose Express API as a single Cloud Function:
export const paypalAPI = functions.https.onRequest(app);


// --- Original helloWorld for testing deployment ---
export const helloWorld = functions.https.onRequest(
  (request: Request, response: Response) => {
    logger.info("Hello logs!", {structuredData: true});
    response.send("Hello from simplified Firebase!");
  },
);
