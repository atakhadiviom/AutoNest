
import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAnalytics, isSupported, type Analytics } from "firebase/analytics";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";

// IMPORTANT: In a real application, use environment variables for Firebase config.
// For Firebase JS SDK v7.20.0 and later, measurementId is optional

const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
const authDomain = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN;
const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const storageBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
const messagingSenderId = process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID;
const appId = process.env.NEXT_PUBLIC_FIREBASE_APP_ID;
const measurementId = process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID; // Optional

if (!apiKey || !projectId) {
  const errorMessage = `Firebase API Key or Project ID is missing. 
    Please ensure that NEXT_PUBLIC_FIREBASE_API_KEY and NEXT_PUBLIC_FIREBASE_PROJECT_ID are correctly set in your .env file (for local development) or your hosting provider's environment variables (for production).
    Current values:
    NEXT_PUBLIC_FIREBASE_API_KEY: ${apiKey}
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: ${projectId}`;
  console.error(errorMessage);
  throw new Error(errorMessage);
}

const firebaseConfig = {
  apiKey,
  authDomain,
  projectId,
  storageBucket,
  messagingSenderId,
  appId,
  measurementId,
};

// Initialize Firebase
let app: FirebaseApp;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
}

const auth: Auth = getAuth(app);
const db: Firestore = getFirestore(app);
let analytics: Analytics | undefined;

if (typeof window !== 'undefined') {
  isSupported().then(supported => {
    if (supported) {
      // Check if measurementId is present before initializing analytics
      if (firebaseConfig.measurementId) {
        analytics = getAnalytics(app);
      }
    }
  }).catch(err => {
    console.error("Failed to initialize Analytics:", err);
  });
}

export { app, auth, db, analytics };
