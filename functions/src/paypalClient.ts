import paypal from "@paypal/checkout-server-sdk";
import {config} from "firebase-functions";
import * as dotenv from "dotenv";

// Load .env file for local development/emulation
if (process.env.NODE_ENV !== "production") {
  dotenv.config();
}

// Use Firebase Functions config for deployed environment,
// fallback to process.env for local
const clientId = process.env.PAYPAL_CLIENT_ID ||
 config().paypal?.client_id;
// paypal.client_id configured via firebase functions:config:set

const clientSecret = process.env.PAYPAL_CLIENT_SECRET ||
 config().paypal?.client_secret;
// paypal.client_secret configured via firebase functions:config:set

const environmentConfig = process.env.PAYPAL_ENVIRONMENT ||
 config().paypal?.environment;
// paypal.environment configured via firebase functions:config:set

if (!clientId || !clientSecret || !environmentConfig) {
  console.error(
    "PayPal client ID, client secret, or environment is not configured."
  );
  throw new Error(
    // Informative error message guiding the user on how to configure PayPal
    // credentials for both deployed functions and local emulation.
    "PayPal client ID, client secret, or environment not configured. " +
    "For deployed functions, set with " +
    "'firebase functions:config:set paypal.client_id=...' etc. " +
    "For local emulation, ensure .env file in /functions directory " +
    "is correctly set."
  );
}

const environment =
  environmentConfig.toLowerCase() === "live" ?
    new paypal.core.LiveEnvironment(clientId, clientSecret) :
    new paypal.core.SandboxEnvironment(clientId, clientSecret);

const client = new paypal.core.PayPalHttpClient(environment);

export default client;
