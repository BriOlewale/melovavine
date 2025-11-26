
import { initializeApp } from "firebase/app";
// @ts-ignore
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Safe access pattern:
// Assign to a variable to ensure safe runtime access while supporting Vite's injection.
// We default to an empty object if import.meta.env is undefined to prevent crashes.
const env = import.meta.env || {};

const apiKey = env.VITE_FIREBASE_API_KEY;
const authDomain = env.VITE_FIREBASE_AUTH_DOMAIN;
const projectId = env.VITE_FIREBASE_PROJECT_ID;
const storageBucket = env.VITE_FIREBASE_STORAGE_BUCKET;
const messagingSenderId = env.VITE_FIREBASE_MESSAGING_SENDER_ID;
const appId = env.VITE_FIREBASE_APP_ID;

const firebaseConfig = {
  apiKey,
  authDomain,
  projectId,
  storageBucket,
  messagingSenderId,
  appId,
};

// Fail fast if critical keys are missing, but only if we are actually running
if (!apiKey) {
  console.warn("Firebase Config: Missing VITE_FIREBASE_API_KEY. App may not function correctly.");
}

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;
