
import * as functions from "firebase-functions";
import * as dotenv from "dotenv";
// Correctly import the necessary type from the SDK.
// Note: The SDK might not export all internal types directly.
// We use `paypal.core` for Environment and HttpClient.
import * as paypal from "@paypal/checkout-server-sdk";

// Load .env file for local development/emulation.
// In deployed Firebase, use functions.config().
if (process.env.NODE_ENV !== "production") {
  dotenv.config();
}

// Ensure these are defined and fallback gracefully.
const paypalConfig = functions.config().paypal;

const clientId = paypalConfig?.client_id || process.env.PAYPAL_CLIENT_ID;
const clientSecret =
  paypalConfig?.client_secret || process.env.PAYPAL_CLIENT_SECRET;
const environmentConfig =
  paypalConfig?.environment || process.env.PAYPAL_ENVIRONMENT;

if (!clientId || !clientSecret || !environmentConfig) {
  const errorMessage = "PayPal config missing. Set paypal.client_id, " +
    "secret, & environment via Firebase config or .env.";
  functions.logger.error(errorMessage);
  throw new Error(errorMessage);
}

const environment =
  environmentConfig.toLowerCase() === "live" ?
    new paypal.core.LiveEnvironment(clientId, clientSecret) :
    new paypal.core.SandboxEnvironment(clientId, clientSecret);

const client = new paypal.core.PayPalHttpClient(environment);

export default client;
