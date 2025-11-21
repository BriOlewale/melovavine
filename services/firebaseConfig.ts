import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAdoWCLtntD9sOsJF9bBq8PixyxqLPU5qM",
  authDomain: "vavanagi.firebaseapp.com",
  projectId: "vavanagi",
  storageBucket: "vavanagi.firebasestorage.app",
  messagingSenderId: "120967964890",
  appId: "1:120967964890:web:563192d567b667c1f35de3",
  measurementId: "G-XFC6GDWC4N"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
