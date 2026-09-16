import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onIdTokenChanged,
  User as FirebaseUser,
} from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyCsHiUcjrpeRo6Xr56219PBr07J-Nr8oDo",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "postharvest-5a5bb.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "postharvest-5a5bb",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "postharvest-5a5bb.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "961767146993",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:961767146993:web:8a21f97cc0c365c2ee3050",
};

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export {
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  firebaseSignOut,
  onIdTokenChanged,
};
export type { FirebaseUser };
