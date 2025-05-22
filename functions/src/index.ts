
// Firebase and basic imports
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import type {Request, Response} from "express"; // Explicit imports
import express from "express";
import cors from "cors";
import bodyParser from "body-parser";

// PayPal SDK - using import for ES6 style, compatible with esModuleInterop
import * as checkoutNodeJssdk from "@paypal/checkout-server-sdk";
import paypalClient from "./paypalClient"; // Corrected path

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
  functions.logger.info(
    "Received /create-order request:",
    req.body,
  );

  const {dollarAmount, creditsToPurchase} = req.body;

  if (
    !dollarAmount ||
    typeof dollarAmount !== "string" ||
    creditsToPurchase === undefined ||
    typeof creditsToPurchase !== "number"
  ) {
    functions.logger.error(
      "Invalid input for /create-order:",
      req.body,
    );
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
      items: [{
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
    functions.logger.info(
      "PayPal order created successfully:",
      order.result,
    );
    return res.status(200).json({orderID: order.result.id});
  } catch (err: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
    const statusCode = err.statusCode || 500;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    const errDesc = err.result?.details?.[0]?.description;
    const errorMessage = errDesc || err.message || "Create order failed.";
    const logObject = {
      message: err.message,
      statusCode: statusCode,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      details: err.result?.details || "No details",
    };
    functions.logger.error(
      "PayPal order creation failed:",
      logObject,
    );
    return res.status(statusCode).json({
      error: errorMessage,
    });
  }
});

// ======== PAYPAL PAYMENT CAPTURE ROUTE ========
app.post("/capture-payment", async (req: Request, res: Response) => {
  functions.logger.info(
    "Received /capture-payment request:",
    req.body,
  );
  const {orderID, creditsToPurchase, userUID} = req.body;

  if (!orderID || creditsToPurchase === undefined || !userUID) {
    functions.logger.error(
      "Invalid input for /capture-payment:",
      req.body,
    );
    return res.status(400).json({
      error: "Invalid input. Missing orderID, creditsToPurchase, or userUID.",
    });
  }

  const request = new checkoutNodeJssdk.orders.OrdersCaptureRequest(orderID);

  try {
    const capture = await paypalClient.execute(request);
    const captureData = capture.result;
    functions.logger.info(
      "PayPal payment captured successfully:",
      captureData,
    );

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
        return res.status(200).json({
          message: "Payment successful and credits updated.",
          captureData: captureData,
        });
      } catch (dbError: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
        const logMsg = "PayPal payment OK, DB update for user credits FAIL:";
        functions.logger.error(logMsg, {
          orderID,
          userUID,
          error: dbError,
        });
        // Critical: Payment taken, credits not awarded. Implement retry/alert.
        return res.status(500).json({
          error: "Payment successful, credit update failed. Contact support.",
          paypalOrderId: orderID,
        });
      }
    } else {
      // Handle other capture statuses (e.g., PENDING) if necessary
      const logMsg = `PayPal capture status for order ${orderID}`;
      functions.logger.warn(`${logMsg} is ${captureData.status}.`);
      return res.status(400).json({
        error: `Payment capture status: ${captureData.status}.`,
        details: captureData,
      });
    }
  } catch (err: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    const paypalDetails = err.result?.details || "N/A";

    // Check for INSTRUMENT_DECLINED specifically
    if (
      err.statusCode === 422 &&
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      err.result?.details?.[0]?.issue === "INSTRUMENT_DECLINED"
    ) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const instrumentErrorDetails = err.result.details;
      functions.logger.warn(
        `Instrument declined for order ${orderID}.`,
        {details: instrumentErrorDetails},
      );
      const responsePayload = {
        error: "PayPal: Instrument Declined.", // Shortened
        isInstrumentDeclined: true,
        details: instrumentErrorDetails,
      };
      return res.status(402).json(responsePayload);
    }

    const errorLogDetails = {
      message: err.message,
      statusCode: err.statusCode,
      paypalAPIDetails: paypalDetails,
    };
    functions.logger.error(
      `Capture failed for ${orderID}. Details:`,
      errorLogDetails,
    );

    const statusCode = err.statusCode || 500;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    const errDetails = err.result?.details?.[0]?.description;
    const errorMessage = errDetails || err.message || "Capture payment failed.";
    return res.status(statusCode).json({
      error: errorMessage,
    });
  }
});

// Expose Express API as a single Cloud Function:
export const paypalAPI = functions.https.onRequest(app);

// Extremely simplified helloWorld function for testing deployment
export const helloWorld = functions.https.onRequest((
  _req: Request,
  response: Response,
) => {
  functions.logger.info("Hello logs!", {structuredData: true});
  response.send("Hello from simplified Firebase!");
});
