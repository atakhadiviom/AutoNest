
// This file is intended for Firebase Admin SDK initialization for use within the
// Next.js server environment (e.g., API Routes IF they were not moved to Cloud Functions).
// Since PayPal logic is now intended for dedicated Cloud Functions in the /functions directory,
// this specific file might not be directly used by those Cloud Functions, as they typically
// initialize their own admin instance.
// However, it's good practice to keep it if other parts of your Next.js app might
// need server-side admin access in the future.

import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

// Ensure this is only initialized once
if (!admin.apps.length) {
  const serviceAccountKeyFromEnv = process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON_STRING;

  if (serviceAccountKeyFromEnv) {
    try {
      const serviceAccount = JSON.parse(serviceAccountKeyFromEnv);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      console.log("[Firebase Admin SDK - Next.js Context] Initialized with service account from FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON_STRING.");
    } catch (e) {
      console.error("[Firebase Admin SDK - Next.js Context] Error parsing FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON_STRING:", e);
      console.error("[Firebase Admin SDK - Next.js Context] NOT initialized. Server-side operations in Next.js needing admin WILL FAIL.");
    }
  } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    // This is common for environments like Google Cloud Run (where App Hosting might run)
    // or if you set this environment variable locally pointing to your service account key file.
    try {
      admin.initializeApp(); // Uses GOOGLE_APPLICATION_CREDENTIALS by default if set
      console.log("[Firebase Admin SDK - Next.js Context] Initialized using GOOGLE_APPLICATION_CREDENTIALS.");
    } catch (e) {
       console.error("[Firebase Admin SDK - Next.js Context] Error initializing with GOOGLE_APPLICATION_CREDENTIALS:", e);
       console.error("[Firebase Admin SDK - Next.js Context] NOT initialized. Server-side operations in Next.js needing admin WILL FAIL.");
    }
  } else {
    console.warn(
      '[Firebase Admin SDK - Next.js Context] Not initialized. Missing FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON_STRING or GOOGLE_APPLICATION_CREDENTIALS. ' +
      'Server-side operations in Next.js needing admin will fail.'
    );
  }
}

const adminDb = admin.firestore();
const adminAuth = admin.auth();

export { adminDb, adminAuth, FieldValue as AdminFieldValue };
