import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// TODO: Replace with your Firebase project configuration.
// You can find this in the Firebase Console under Project Settings > General > Your Apps.
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCemOKz1cGVV742nFOARkliFjfYduyXWek",
  authDomain: "financetracker-f76f2.firebaseapp.com",
  projectId: "financetracker-f76f2",
  storageBucket: "financetracker-f76f2.firebasestorage.app",
  messagingSenderId: "253034802487",
  appId: "1:253034802487:web:382013169b46d7d3bc7eb2",
  measurementId: "G-5H4HY90XKR",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;
