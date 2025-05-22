
import paypal from "@paypal/checkout-server-sdk";
import * as functions from "firebase-functions";
import * as dotenv from "dotenv";

// Load .env file for local development/emulation.
// In deployed Firebase, use functions.config().
if (process.env.NODE_ENV !== "production") {
  dotenv.config();
}

const clientId = functions.config().paypal?.client_id ||
                 process.env.PAYPAL_CLIENT_ID;
const clientSecret = functions.config().paypal?.client_secret ||
                     process.env.PAYPAL_CLIENT_SECRET;
const environmentConfig = functions.config().paypal?.environment ||
                          process.env.PAYPAL_ENVIRONMENT;

if (!clientId || !clientSecret || !environmentConfig) {
  const errorMessage = "PayPal config missing. Set paypal.client_id, " +
    "paypal.client_secret, paypal.environment via Firebase config or .env.";
  functions.logger.error(errorMessage);
  throw new Error(errorMessage);
}

const environment =
  environmentConfig.toLowerCase() === "live" ?
    new paypal.core.LiveEnvironment(clientId, clientSecret) :
    new paypal.core.SandboxEnvironment(clientId, clientSecret);

const client = new paypal.core.PayPalHttpClient(environment);

export default client;
