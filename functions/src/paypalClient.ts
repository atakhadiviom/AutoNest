
import paypal from "@paypal/checkout-server-sdk";
import * as functions from "firebase-functions";
import * as dotenv from "dotenv";

// Load .env file for local development/emulation if not in Firebase Functions
// environment (where functions.config() would be used).
if (!process.env.FUNCTIONS_EMULATOR && process.env.NODE_ENV !== "production") {
  dotenv.config();
}

// Use Firebase Functions config for deployed environment,
// fallback to process.env (loaded by dotenv) for local emulation.
const clientId = functions.config().paypal?.client_id ||
                 process.env.PAYPAL_CLIENT_ID;
const clientSecret = functions.config().paypal?.client_secret ||
                     process.env.PAYPAL_CLIENT_SECRET;
const environmentConfig = functions.config().paypal?.environment ||
                          process.env.PAYPAL_ENVIRONMENT;

if (!clientId || !clientSecret || !environmentConfig) {
  // Reformatting errorMessage using a template literal
  const errorMessage = `PayPal config missing.
Set paypal.client_id, paypal.client_secret, paypal.environment
via 'firebase functions:config:set' for deployed functions,
or in functions/.env for local emulation.`;
  console.error(errorMessage);
  throw new Error(errorMessage);
}


const environment =
  environmentConfig.toLowerCase() === "live" ?
    new paypal.core.LiveEnvironment(clientId, clientSecret) :
    new paypal.core.SandboxEnvironment(clientId, clientSecret);

const client = new paypal.core.PayPalHttpClient(environment);

export default client;
