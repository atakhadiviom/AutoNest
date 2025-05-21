
import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAnalytics, isSupported, type Analytics } from "firebase/analytics";
import { getAuth, type Auth } from "firebase/auth";

// IMPORTANT: In a real application, use environment variables for Firebase config.
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBOUIjVo5UyxtEMltLk_aAUAKgxaPG_8fk",
  authDomain: "autonest-4f417.firebaseapp.com",
  projectId: "autonest-4f417",
  storageBucket: "autonest-4f417.firebasestorage.app",
  messagingSenderId: "941221968659",
  appId: "1:941221968659:web:3dc7cdf1127dc34a2eb8e6",
  measurementId: "G-ZHLQLFJG7G"
};

// Initialize Firebase
const app: FirebaseApp = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth: Auth = getAuth(app);
let analytics: Analytics | undefined;

if (typeof window !== 'undefined') {
  isSupported().then(supported => {
    if (supported) {
      analytics = getAnalytics(app);
    }
  }).catch(err => {
    console.error("Failed to initialize Analytics:", err);
  });
}

export { app, auth, analytics };
