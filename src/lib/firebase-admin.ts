
// This file is intended for Firebase Admin SDK initialization,
// typically used in server environments like Cloud Functions or Next.js API routes
// for privileged operations (e.g., bypassing security rules, minting custom tokens).

// IMPORTANT: You need to set up a service account and configure environment variables
// for this to work.
// 1. Go to Firebase Console > Project settings > Service accounts.
// 2. Generate a new private key (JSON file).
// 3. DO NOT commit this JSON file to your repository.
// 4. Set an environment variable FIREBASE_ADMIN_SERVICE_ACCOUNT to the JSON content of this file,
//    OR set GOOGLE_APPLICATION_CREDENTIALS to the path of this JSON file if your environment supports it.

import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore'; // Import FieldValue

const serviceAccountKeyFromEnv = process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT;

if (!admin.apps.length) {
  if (serviceAccountKeyFromEnv) {
    try {
      const serviceAccount = JSON.parse(serviceAccountKeyFromEnv);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        // databaseURL: `https://${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}.firebaseio.com` // If using Realtime Database
      });
      console.log("[Firebase Admin] SDK initialized with service account from FIREBASE_ADMIN_SERVICE_ACCOUNT.");
    } catch (e) {
      console.error("[Firebase Admin] Error parsing FIREBASE_ADMIN_SERVICE_ACCOUNT JSON:", e);
      console.error("[Firebase Admin] SDK NOT initialized. Server-side Firestore updates WILL FAIL.");
    }
  } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
     admin.initializeApp({
        // Credential is automatically read from GOOGLE_APPLICATION_CREDENTIALS
        // if the env var is set and points to a valid service account JSON file.
     });
     console.log("[Firebase Admin] SDK initialized using GOOGLE_APPLICATION_CREDENTIALS.");
  } else {
    console.warn(
      '[Firebase Admin] SDK not initialized. Missing FIREBASE_ADMIN_SERVICE_ACCOUNT or GOOGLE_APPLICATION_CREDENTIALS environment variable. ' +
      'Server-side Firestore updates needing admin privileges WILL FAIL.'
    );
  }
}

export const db = admin.firestore();
export const auth = admin.auth();
export { FieldValue }; // Export FieldValue

// NOTE: For Vercel deployment, you'd typically store the service account JSON content
// in a Vercel environment variable (e.g., FIREBASE_ADMIN_SERVICE_ACCOUNT) and parse it.
// For Firebase Cloud Functions, Application Default Credentials often work if the function
// has the correct IAM permissions.
