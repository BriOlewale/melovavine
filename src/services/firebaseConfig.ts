// @ts-ignore
import { initializeApp } from "firebase/app";
// @ts-ignore
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Standard Vite environment variable access
// Ensure VITE_FIREBASE_API_KEY is set in your build environment or .env file
const env = (import.meta as any).env;
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

// Fail fast if critical keys are missing
if (!apiKey) {
  console.error("Firebase Config Error: VITE_FIREBASE_API_KEY is missing. Check your .env file or hosting configuration.");
}

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;