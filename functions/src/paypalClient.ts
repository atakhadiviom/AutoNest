import paypal from "@paypal/checkout-server-sdk";
import * as functions from "firebase-functions";
import * as dotenv from "dotenv";

// Load .env file for local development/emulation if not in Firebase Functions environment
if (!process.env.FUNCTIONS_EMULATOR) {
  dotenv.config();
}

// Use Firebase Functions config for deployed environment,
// fallback to process.env for local emulation
const clientId = functions.config().paypal?.client_id || process.env.PAYPAL_CLIENT_ID;
const clientSecret = functions.config().paypal?.client_secret || process.env.PAYPAL_CLIENT_SECRET;
const environmentConfig = functions.config().paypal?.environment || process.env.PAYPAL_ENVIRONMENT;

if (!clientId || !clientSecret || !environmentConfig) {
  console.error(
    "PayPal client ID, client secret, or environment is not configured."
  );
  throw new Error(
    "PayPal client ID, client secret, or environment not configured. " +
    "For deployed functions, set with " +
    "'firebase functions:config:set paypal.client_id=...' etc. " +
    "For local emulation, ensure .env file in /functions directory " +
    "is correctly set with PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET, PAYPAL_ENVIRONMENT."
  );
}

const environment =
  environmentConfig.toLowerCase() === "live" ?
    new paypal.core.LiveEnvironment(clientId, clientSecret) :
    new paypal.core.SandboxEnvironment(clientId, clientSecret);

const client = new paypal.core.PayPalHttpClient(environment);

export default client;
