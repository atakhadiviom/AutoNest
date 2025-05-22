
import * as functions from "firebase-functions";
import * as dotenv from "dotenv";

// Use a namespace import for PayPal SDK for robust compatibility
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
  const errorMessage = "PayPal config missing. Set CLIENT_ID, SECRET, & ENV.";
  functions.logger.error(errorMessage, {
    clientIdExists: !!clientId,
    clientSecretExists: !!clientSecret,
    environmentConfigExists: !!environmentConfig,
  });
  throw new Error(errorMessage);
}

let environment;
if (environmentConfig.toLowerCase() === "live") {
  environment = new paypal.core.LiveEnvironment(clientId, clientSecret);
} else {
  environment = new paypal.core.SandboxEnvironment(clientId, clientSecret);
}
const client = new paypal.core.PayPalHttpClient(environment);

export default client;
