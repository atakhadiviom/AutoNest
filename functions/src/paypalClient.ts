/**
 * Initializes and exports the PayPal SDK client.
 * This client is configured using environment variables for credentials
 * and environment (sandbox/live).
 */
import * as functions from "firebase-functions";
import * as paypal from "@paypal/checkout-server-sdk";
import * as dotenv from "dotenv";

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
  const errorMessage =
`PayPal config missing. Set paypal.client_id, client_secret, & environment.
Ensure functions.config().paypal is set for deployed functions OR
.env has PAYPAL_CLIENT_ID, SECRET, & ENVIRONMENT for local emulation.`;
  functions.logger.error(errorMessage);
  throw new Error(errorMessage);
}

const environment =
  environmentConfig.toLowerCase() === "live" ?
    new paypal.core.LiveEnvironment(clientId, clientSecret) :
    new paypal.core.SandboxEnvironment(clientId, clientSecret);

const client = new paypal.core.PayPalHttpClient(environment);

export default client;
