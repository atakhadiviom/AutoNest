
/**
 * Firebase Cloud Functions.
 *
 * This file includes:
 * - paypalAPI: An Express app for handling PayPal REST API interactions
 *   (creating orders, capturing payments) and securely updating user credits
 *   in Firestore.
 * - helloWorld: A simple test function.
 * - sendWelcomeEmail: An Auth trigger that attempts to send a welcome email
 *   to new users via MailerSend.
 */

import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import type {Request, Response} from "express"; // Explicitly import types
import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import dotenv from "dotenv";

// Load .env file for local development/emulation of Cloud Functions.
// In a deployed Firebase environment, use `firebase functions:config:set ...`
if (process.env.NODE_ENV !== "production") {
  dotenv.config();
}

// Initialize Firebase Admin SDK
// Ensures it's initialized only once.
if (!admin.apps.length) {
  admin.initializeApp();
}
const db = admin.firestore();

const app = express();

// Middleware
app.use(cors({origin: true})); // Enable CORS for all origins
app.use(bodyParser.json()); // Parse JSON request bodies

// --- PayPal API Configuration ---
const getPaypalApiBaseUrl = (): string => {
  // For deployed functions, prefer Firebase config.
  // Fallback to process.env for local.
  const env = functions.config().paypal?.environment ||
              process.env.PAYPAL_ENVIRONMENT;
  if (env && env.toLowerCase() === "live") {
    return "https://api-m.paypal.com";
  }
  return "https://api-m.sandbox.paypal.com"; // Default to sandbox
};

const getPaypalCredentials = () => {
  // For deployed functions, prefer Firebase config.
  // Fallback to process.env for local.
  const clientId = functions.config().paypal?.client_id ||
                   process.env.PAYPAL_CLIENT_ID;
  const clientSecret = functions.config().paypal?.client_secret ||
                       process.env.PAYPAL_CLIENT_SECRET;

  const errorMsg =
    "PayPal API credentials or environment not configured. " +
    "For deployed: `firebase functions:config:set paypal.client_id=... " +
    "paypal.client_secret=... paypal.environment=...`. " +
    "For local: check functions/.env.";

  if (!clientId || !clientSecret) {
    functions.logger.error(errorMsg);
    throw new Error(errorMsg);
  }
  return {clientId, clientSecret};
};

// Function to get PayPal Access Token using direct REST API call
const getPaypalAccessToken = async (): Promise<string> => {
  const {clientId, clientSecret} = getPaypalCredentials();
  const paypalApiBaseUrl = getPaypalApiBaseUrl();
  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  const response = await fetch(`${paypalApiBaseUrl}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Authorization": `Basic ${auth}`,
    },
    body: "grant_type=client_credentials",
  });

  if (!response.ok) {
    const errorBody = await response.text();
    functions.logger.error(
      "Failed to get PayPal access token:",
      response.status,
      errorBody,
    );
    throw new Error(
      `PayPal token API request failed: ${response.status} ${errorBody}`,
    );
  }

  const data = await response.json() as { access_token: string };
  return data.access_token;
};


// ======== PAYPAL ORDER CREATION ROUTE (REST API) ========
app.post("/create-order", async (req: Request, res: Response) => {
  functions.logger.info("Received /create-order request:", req.body);
  const {dollarAmount, creditsToPurchase} = req.body;

  if (
    !dollarAmount || typeof dollarAmount !== "string" ||
    creditsToPurchase === undefined || typeof creditsToPurchase !== "number"
  ) {
    functions.logger.error("Invalid input for /create-order:", req.body);
    return res.status(400).json({
      error: "Invalid input. Missing dollarAmount or creditsToPurchase.",
    });
  }

  try {
    const accessToken = await getPaypalAccessToken();
    const paypalApiBaseUrl = getPaypalApiBaseUrl();
    const orderPayload = {
      intent: "CAPTURE",
      purchase_units: [{
        amount: {
          currency_code: "USD",
          value: dollarAmount,
          breakdown: {
            item_total: {currency_code: "USD", value: dollarAmount},
          },
        },
        description: `${creditsToPurchase} App Credits Purchase`,
        items: [{
          name: "App Credits",
          unit_amount: {currency_code: "USD", value: dollarAmount},
          quantity: "1",
          description: `${creditsToPurchase} credits for AutoNest app.`,
          sku: `AUTONEST-CREDITS-${creditsToPurchase}`,
        }],
      }],
    };

    const response = await fetch(`${paypalApiBaseUrl}/v2/checkout/orders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${accessToken}`,
      },
      body: JSON.stringify(orderPayload),
    });

    const orderData = await response.json() as { id?: string, details?: any[] };
    if (!response.ok || !orderData.id) {
      functions.logger.error(
        "Failed to create PayPal order via REST API:",
        response.status,
        orderData,
      );
      const errorMsg = orderData.details?.[0]?.description ||
        `Failed to create order. Status: ${response.status}`;
      return res.status(response.status || 500).json({error: errorMsg});
    }

    functions.logger.info("PayPal order created (REST):", orderData);
    return res.status(200).json({orderID: orderData.id});
  } catch (err: any) {
    const paypalDetails = err.result ? err.result.details : "No details";
    const errorLogDetails = {
      message: err.message,
      statusCode: err.statusCode,
      paypalAPIDetails: paypalDetails,
    };
    functions.logger.error(
      "Exception in /create-order:",
      errorLogDetails,
    );
    const errMsg = err.message || "Server error creating order.";
    return res.status(500).json({error: errMsg});
  }
});

// ======== PAYPAL PAYMENT CAPTURE ROUTE (REST API) ========
app.post("/capture-payment", async (req: Request, res: Response) => {
  functions.logger.info("Received /capture-payment request:", req.body);
  const {orderID, creditsToPurchase, userUID} = req.body;

  if (!orderID || creditsToPurchase === undefined || !userUID) {
    functions.logger.error("Invalid input for /capture-payment:", req.body);
    return res.status(400).json({
      error: "Invalid input. Missing orderID, creditsToPurchase, or userUID.",
    });
  }

  try {
    const accessToken = await getPaypalAccessToken();
    const paypalApiBaseUrl = getPaypalApiBaseUrl();

    const response = await fetch(
      `${paypalApiBaseUrl}/v2/checkout/orders/${orderID}/capture`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${accessToken}`,
        },
      },
    );

    const captureData = await response.json() as
      { status?: string, details?: any[], id?: string, purchase_units?: any[] };

    if (!response.ok) {
      functions.logger.error(
        `Failed to capture PayPal payment for order ${orderID}:`,
        response.status,
        captureData,
      );
      const errorDetail = captureData.details?.[0];
      if (errorDetail?.issue === "INSTRUMENT_DECLINED") {
        const instrumentErrorDetails = errorDetail;
        functions.logger.warn(
          `Instrument declined for order ${orderID}.`,
          instrumentErrorDetails,
        );
        const responsePayload = {
          error: "PayPal: Instrument Declined.",
          isInstrumentDeclined: true,
          details: instrumentErrorDetails,
        };
        return res.status(402).json(responsePayload);
      }
      const errorMsg = errorDetail?.description ||
        `Failed to capture payment. Status: ${response.status}`;
      return res.status(response.status || 500).json({error: errorMsg});
    }

    functions.logger.info("PayPal payment captured (REST):", captureData);

    if (captureData.status === "COMPLETED") {
      const userDocRef = db.collection("users").doc(userUID);
      try {
        await userDocRef.update({
          credits: admin.firestore.FieldValue.increment(creditsToPurchase),
        });
        functions.logger.info(`Credits updated for user ${userUID}.`);
        return res.status(200).json({
          message: "Payment successful and credits updated.",
          captureData: captureData,
        });
      } catch (dbError: any) {
        functions.logger.error(
          `Payment captured for order ${orderID}, ` +
          `but DB update failed for ${userUID}:`,
          dbError,
        );
        return res.status(500).json({
          error: "Payment success, but credit update failed. Contact support.",
          paypalOrderId: orderID,
        });
      }
    } else {
      functions.logger.warn(
        `Capture status for ${orderID} is ${captureData.status}.`,
      );
      return res.status(400).json({
        error: `Payment capture status: ${captureData.status}.`,
        details: captureData,
      });
    }
  } catch (err: any) {
    const paypalAPIDetails = err.result ? err.result.details : "No details";
    const errorLogDetails = {
      message: err.message,
      statusCode: err.statusCode,
      paypalAPIDetails,
    };
    functions.logger.error(
      `Capture failed for ${orderID}. Details:`,
      errorLogDetails,
    );
    const errMsg = err.message || "Server error capturing payment.";
    return res.status(500).json({
      error: errMsg,
    });
  }
});

// Expose Express API as a single Cloud Function:
export const paypalAPI = functions.https.onRequest(app);

// Simplified helloWorld function for testing deployment
export const helloWorld = functions.https.onRequest(
  (_req: Request, response: Response) => {
    functions.logger.info("Hello logs!", {structuredData: true});
    response.send("Hello from simplified Firebase!");
  },
);

// --- New Auth Trigger for Welcome Email ---
export const sendWelcomeEmail = functions.auth.user().onCreate(async (user) => {
  const email = user.email;
  const displayName = user.displayName || user.email?.split("@")[0] ||
                    "Valued User";

  if (!email) {
    functions.logger.error(
      "Cannot send welcome email: user email is missing.",
      {userId: user.uid},
    );
    return;
  }

  // Retrieve MailerSend API token and sender email from Firebase config
  // For MailerSend:
  // functions.config().mailersend.apitoken
  // functions.config().mailersend.senderemail
  // For SendGrid (example):
  // functions.config().sendgrid.apikey
  // functions.config().sendgrid.sender
  // Choose one service and configure its specific keys.

  const MAILERSEND_API_TOKEN = functions.config().mailersend?.apitoken;
  const SENDER_EMAIL = functions.config().mailersend?.senderemail;
  // Example for SendGrid:
  // const SENDGRID_API_KEY = functions.config().sendgrid?.apikey;
  // const SENDER_EMAIL_SENDGRID = functions.config().sendgrid?.sender;


  const subject = `Welcome to AutoNest, ${displayName}!`;
  const textContent = `Hi ${displayName},\n\n` +
    "Welcome to AutoNest! We're thrilled to have you on board.\n\n" +
    "Explore your dashboard and start automating your workflows " +
    "today.\n\n" +
    "Best regards,\nThe AutoNest Team";
  const htmlContent = `<p>Hi ${displayName},</p>` +
    "<p>Welcome to AutoNest! We're thrilled to have you on board.</p>" +
    "<p>Explore your dashboard and start automating your workflows today.</p>" +
    "<p>Best regards,<br>The AutoNest Team</p>";

  // --- MailerSend Integration ---
  if (!MAILERSEND_API_TOKEN || !SENDER_EMAIL) {
    let warningMessage = "[MailerSend] Welcome email notifications are" +
                         " currently SIMULATED. ";
    if (!MAILERSEND_API_TOKEN) {
      warningMessage += "MailerSend API Token (mailersend.apitoken) is NOT " +
                        "configured. ";
      warningMessage += "Set it via `firebase functions:config:set " +
                        "mailersend.apitoken=\"YOUR_TOKEN\"`. ";
    }
    if (!SENDER_EMAIL) {
      warningMessage += "Sender email (mailersend.senderemail) is NOT " +
                        "configured. ";
      warningMessage += "Set it via `firebase functions:config:set " +
                        "mailersend.senderemail=\"welcome@autonest.site\"`. ";
    }
    warningMessage += "Ensure your domain autonest.site is verified " +
                      "with MailerSend.";
    functions.logger.warn(warningMessage, {userId: user.uid});

    // Log simulation details
    const simulatedFrom = SENDER_EMAIL || "config_missing@autonest.site";
    functions.logger.info(
      `SIMULATED Welcome Email to: ${email} ` +
      `from ${simulatedFrom} via MailerSend`,
      {
        userId: user.uid,
        emailDetails: {
          to: email,
          from: simulatedFrom,
          subject,
          text: textContent,
          html: htmlContent,
        },
      },
    );
    return null;
  }

  // Configuration is present, attempt to send email via MailerSend
  functions.logger.info(
    `[MailerSend] Attempting to send welcome email to ${email} ` +
    `from ${SENDER_EMAIL}.`,
  );

  const mailerSendPayload = {
    from: {email: SENDER_EMAIL},
    to: [{email: email}],
    subject: subject,
    text: textContent,
    html: htmlContent,
  };

  try {
    const response = await fetch("https://api.mailersend.com/v1/email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Requested-With": "XMLHttpRequest",
        "Authorization": `Bearer ${MAILERSEND_API_TOKEN}`,
      },
      body: JSON.stringify(mailerSendPayload),
    });

    if (response.ok) {
      // status 202 Accepted is a success for MailerSend
      functions.logger.info(
        `[MailerSend] Welcome email SENT to ${email}. ` +
        `Status: ${response.status}`,
      );
    } else {
      // Attempt to parse error response from MailerSend
      const errorBody = await response.text();
      functions.logger.error(
        `[MailerSend] Send err: ${email}, St: ${response.status}`,
        {errorBody, responseHeaders: response.headers},
      );
    }
  } catch (error: any) {
    functions.logger.error(
      `[MailerSend] Excp sending email to ${email}:`,
      error,
    );
  }
  // --- End MailerSend Integration ---

  /*
  // --- Example SendGrid Integration (Commented Out) ---
  // 1. Install SendGrid SDK: `npm install @sendgrid/mail` in functions dir
  // 2. Set API Key: `firebase functions:config:set sendgrid.apikey="YOUR_KEY"`
  //
  // if (!SENDGRID_API_KEY || !SENDER_EMAIL_SENDGRID) {
  //   functions.logger.warn(
  //      "[SendGrid] Welcome email notifications are SIMULATED. " +
  //      "SendGrid API Key (sendgrid.apikey) or Sender Email " +
  //      "(sendgrid.sender) is NOT configured. " +
  //      "Set them via `firebase functions:config:set ...`"
  //   );
  //   // Log simulation details for SendGrid
  //   functions.logger.info(
  //     `SIMULATED Welcome Email (SendGrid) to: ${email} from ` +
  //     `${SENDER_EMAIL_SENDGRID || "config_missing@example.com"}`,
  //     {
  //       userId: user.uid,
  //   );
  //   return null;
  // }
  //
  // functions.logger.info(
  //    `[SendGrid] Attempting to send welcome email to ${email}`
  // );
  //
  // const sgMail = require('@sendgrid/mail');
  // sgMail.setApiKey(SENDGRID_API_KEY);
  // const msg = {
  //   to: email,
  //   from: SENDER_EMAIL_SENDGRID, // Use the verified sender
  //   subject: subject,
  //   text: textContent,
  //   html: htmlContent,
  // };
  //
  // try {
  //   await sgMail.send(msg);
  //   functions.logger.info(`[SendGrid] Welcome email SENT to ${email}`);
  // } catch (error: any) {
  //   functions.logger.error(
  //      `[SendGrid] Error sending welcome email to ${email}:`, error
  //   );
  //   if (error.response) {
  //     functions.logger.error(error.response.body);
  //   }
  // }
  // --- End SendGrid Integration ---
  */

  return null; // Indicate function completion.
});
