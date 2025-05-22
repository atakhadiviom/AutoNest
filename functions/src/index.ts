/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

// These were unused in the simplified version, causing build errors.
// import {onRequest} from "firebase-functions/v2/https";
// import * as logger from "firebase-functions/logger";

import * as functions from "firebase-functions";

// Extremely simplified helloWorld function for testing deployment
export const helloWorld = functions.https.onRequest((request, response) => {
  functions.logger.info("Hello logs!", {structuredData: true});
  response.send("Hello from simplified Firebase!");
});

// Extremely simplified paypalAPI function for testing deployment
export const paypalAPI = functions.https.onRequest((request, response) => {
  functions.logger.info("Simplified paypalAPI called!");
  response.send("Simplified paypalAPI response!");
});
