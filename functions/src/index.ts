/**
 * Firebase Cloud Functions.
 * PayPal integration has been removed.
 */
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
// Express, cors, body-parser, and paypalClient are no longer needed here
// if PayPal was the only reason for them.

// Initialize Firebase Admin SDK.
if (admin.apps.length === 0) {
  admin.initializeApp();
}
// const db = admin.firestore(); // Keep if other functions might use it or will be added.

// If paypalAPI was the only HTTP function, it can be removed or simplified.
// For now, let's make it return a message indicating PayPal is disabled.
export const paypalAPI = functions.https.onRequest((req, res) => {
  functions.logger.info(
    "[Cloud Function] paypalAPI called, but PayPal integration has been removed.",
    {structuredData: true}
  );
  res.status(410).json({
    error: "PayPal API functionality has been removed from this application.",
    message: "This endpoint is no longer active."
  });
});

// You can add other Cloud Functions here as needed for your application.
// For example:
// export const helloWorld = functions.https.onRequest((request, response) => {
//   functions.logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });
