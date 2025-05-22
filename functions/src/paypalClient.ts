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
  const errorMessage = `PayPal client ID, client secret, or environment not configured.
For DEPLOYED functions, ensure you have set these using the Firebase CLI:
  'firebase functions:config:set paypal.client_id=...'
  'firebase functions:config:set paypal.client_secret=...'
  'firebase functions:config:set paypal.environment=...'
For LOCAL EMULATION, ensure your functions/.env file is correctly set
with CLIENT_ID, SECRET, and ENVIRONMENT.`;
  console.error(errorMessage);
  throw new Error(errorMessage);
}


const environment =
  environmentConfig.toLowerCase() === "live" ?
    new paypal.core.LiveEnvironment(clientId, clientSecret) :
    new paypal.core.SandboxEnvironment(clientId, clientSecret);

const client = new paypal.core.PayPalHttpClient(environment);

export default client;
