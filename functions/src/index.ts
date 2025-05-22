/**
 * Firebase Cloud Functions for PayPal REST API integration.
 */
import * as functions from "firebase-functions";
// import * as admin from "firebase-admin"; // Temporarily removed for simplification
// import express from "express"; // Temporarily removed for simplification
// import cors from "cors"; // Temporarily removed for simplification
// import bodyParser from "body-parser"; // Temporarily removed for simplification
// import paypalClient from "./paypalClient"; // Temporarily removed for simplification
// import paypal from "@paypal/checkout-server-sdk"; // Temporarily removed for simplification

// Initialize Firebase Admin SDK if not already initialized
// This will use Application Default Credentials when deployed to Firebase.
// if (admin.apps.length === 0) {
//   admin.initializeApp();
// }
// const db = admin.firestore();

// const app = express();

// Middleware
// app.use(cors({origin: true}));
// app.use(bodyParser.json());

// ---- Simplified PayPal API for testing deployment ----
// If this deploys, the issue is within the more complex PayPal logic.
// If this still fails, the issue is project/environment configuration.
export const paypalAPI = functions.https.onRequest((request, response) => {
  functions.logger.info("Simplified paypalAPI called!", {structuredData: true});
  response.send("Simplified paypalAPI response!");
});

// ---- PayPal Create Order Endpoint ----
// app.post("/create-order", async (req, res) => {
//   // ... (original create-order logic commented out)
// });

// ---- PayPal Capture Payment Endpoint ----
// app.post("/capture-payment", async (req, res) => {
//   // ... (original capture-payment logic commented out)
// });

// Expose Express API as a single Cloud Function
// export const paypalAPI = functions.https.onRequest(app);

// --- Placeholder for other functions ---
export const helloWorld = functions.https.onRequest((request, response) => {
  functions.logger.info("Hello logs!", {structuredData: true});
  response.send("Hello from Firebase!");
});
