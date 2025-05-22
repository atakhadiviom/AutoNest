/**
 * Firebase Cloud Functions for AutoNest.
 */
import * as functions from "firebase-functions";

// Basic HTTP function for testing deployment.
export const paypalAPI = functions.https.onRequest((request, response) => {
  functions.logger.info("[paypalAPI] Basic test endpoint called!");
  response.send("Hello from paypalAPI basic test!");
});

// Standard Hello World function for testing deployment.
export const helloWorld = functions.https.onRequest((request, response) => {
  functions.logger.info("[helloWorld] Endpoint called!");
  response.send("Hello from Firebase (helloWorld)!");
});
