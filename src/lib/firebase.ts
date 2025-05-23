
import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAnalytics, isSupported, type Analytics } from "firebase/analytics";
import { getAuth, connectAuthEmulator, type Auth } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator, type Firestore } from "firebase/firestore";
// If you were to use callable functions and wanted to emulate them directly, you'd import connectFunctionsEmulator
// import { getFunctions, connectFunctionsEmulator } from "firebase/functions";

const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
const authDomain = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN;
const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const storageBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
const messagingSenderId = process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID;
const appId = process.env.NEXT_PUBLIC_FIREBASE_APP_ID;
const measurementId = process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID; // Optional

if (!apiKey || !projectId) {
  const errorMessage = `Firebase API Key or Project ID is missing. 
    Please ensure NEXT_PUBLIC_FIREBASE_API_KEY and NEXT_PUBLIC_FIREBASE_PROJECT_ID are correctly set in your .env file or hosting environment variables.
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

const authInstance: Auth = getAuth(app);
const dbInstance: Firestore = getFirestore(app);
// let functionsInstance; // Uncomment if using connectFunctionsEmulator

let analyticsInstance: Analytics | undefined;

if (typeof window !== 'undefined') {
  isSupported().then(supported => {
    if (supported) {
      if (firebaseConfig.measurementId) {
        analyticsInstance = getAnalytics(app);
      }
    }
  }).catch(err => {
    console.error("Failed to initialize Analytics:", err);
  });

  // Connect to emulators in development mode
  // IMPORTANT: Ensure your emulators are running before your Next.js app tries to connect.
  if (process.env.NODE_ENV === 'development') {
    console.log("Development mode: Attempting to connect to Firebase emulators...");
    try {
      // Make sure these ports match your firebase.json emulators config
      connectAuthEmulator(authInstance, 'http://127.0.0.1:9099', { disableWarnings: true });
      console.log("Auth Emulator connected on port 9099");

      connectFirestoreEmulator(dbInstance, '127.0.0.1', 8081);
      console.log("Firestore Emulator connected on port 8081");

      // If you were using callable functions directly from the client SDK:
      // functionsInstance = getFunctions(app);
      // connectFunctionsEmulator(functionsInstance, '127.0.0.1', 5001);
      // console.log("Functions Emulator connected for client SDK on port 5001");

    } catch (error) {
        console.error("Error connecting to Firebase emulators:", error);
    }
  } else {
    console.log("Production mode: Connecting to live Firebase services.");
  }
}


export { app, authInstance as auth, dbInstance as db, analyticsInstance as analytics };
// export { app, authInstance as auth, dbInstance as db, functionsInstance as functions, analyticsInstance as analytics }; // If using functionsInstance
