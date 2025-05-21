
import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAnalytics, isSupported, type Analytics } from "firebase/analytics";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore"; // Added Firestore import

// IMPORTANT: In a real application, use environment variables for Firebase config.
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCWqhM89DGyisi8z_BbO0JRW38HpDbdNRg",
  authDomain: "autonest-vn4w5.firebaseapp.com",
  projectId: "autonest-vn4w5",
  storageBucket: "autonest-vn4w5.firebasestorage.app",
  messagingSenderId: "708319441645",
  appId: "1:708319441645:web:f873753ef66dc1c0c192e4"
  // measurementId is optional, so it can be omitted if not provided or needed
};

// Initialize Firebase
const app: FirebaseApp = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth: Auth = getAuth(app);
const db: Firestore = getFirestore(app); // Initialize Firestore
let analytics: Analytics | undefined;

if (typeof window !== 'undefined') {
  isSupported().then(supported => {
    if (supported) {
      // Check if measurementId is present before initializing analytics
      if (firebaseConfig.projectId) { // Use projectId or appId as a proxy for a valid config
        analytics = getAnalytics(app);
      }
    }
  }).catch(err => {
    console.error("Failed to initialize Analytics:", err);
  });
}

export { app, auth, db, analytics }; // Export db
