import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCqg4VYr4Fz5e43P0Z2-unM3sQTXSQt8A4",
  authDomain: "amitim-36d35.firebaseapp.com",
  projectId: "amitim-36d35",
  storageBucket: "amitim-36d35.firebasestorage.app",
  messagingSenderId: "263372833504",
  appId: "1:263372833504:web:158871ceeb9bdead1b4685",
  measurementId: "G-PS0Y3P8CYS"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Auth
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Initialize Firestore
export const db = getFirestore(app);

export default app;
