
import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAnalytics, isSupported, type Analytics } from "firebase/analytics";
import { getAuth, connectAuthEmulator, type Auth } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator, type Firestore } from "firebase/firestore";

const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
const authDomain = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN;
const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const storageBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
const messagingSenderId = process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID;
const appId = process.env.NEXT_PUBLIC_FIREBASE_APP_ID;
const measurementId = process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID; // Optional

if (!apiKey || !projectId) {
  const errorMessage = `Firebase API Key or Project ID is missing. 
    Please ensure NEXT_PUBLIC_FIREBASE_API_KEY and NEXT_PUBLIC_FIREBASE_PROJECT_ID are correctly set.
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
  console.log("Firebase App initialized.");
} else {
  app = getApp();
  console.log("Firebase App already initialized.");
}

const authInstance: Auth = getAuth(app);
const dbInstance: Firestore = getFirestore(app);
let analyticsInstance: Analytics | undefined;

if (typeof window !== 'undefined') {
  console.log(`Current NODE_ENV: ${process.env.NODE_ENV}`);
  isSupported().then(supported => {
    if (supported) {
      if (firebaseConfig.measurementId) {
        analyticsInstance = getAnalytics(app);
        console.log("Firebase Analytics initialized.");
      } else {
        console.log("Firebase Analytics not initialized (no measurementId).");
      }
    } else {
      console.log("Firebase Analytics not supported on this browser.");
    }
  }).catch(err => {
    console.error("Error checking Analytics support:", err);
  });

  if (process.env.NODE_ENV === 'development') {
    console.log("Development mode detected by NODE_ENV: Attempting to connect to Firebase emulators...");
    try {
      connectAuthEmulator(authInstance, 'http://127.0.0.1:9099', { disableWarnings: true });
      console.log("Firebase Auth SDK connected to Auth Emulator on http://127.0.0.1:9099");

      connectFirestoreEmulator(dbInstance, '127.0.0.1', 8081);
      console.log("Firebase Firestore SDK connected to Firestore Emulator on 127.0.0.1:8081");
    } catch (error) {
        console.error("Error connecting Firebase SDKs to emulators:", error);
    }
  } else {
    console.log(`NODE_ENV is not 'development' (it's '${process.env.NODE_ENV}'). Firebase SDKs will connect to live Firebase services.`);
  }
} else {
  console.log("Firebase SDK initialization: Not in a browser environment (e.g., server-side rendering pre-hydration). Emulator/live connection logic deferred to client-side.");
}


export { app, authInstance as auth, dbInstance as db, analyticsInstance as analytics };
