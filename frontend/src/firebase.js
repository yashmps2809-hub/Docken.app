import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyAr0H7ka8lvOdUUGq6_gsuYgDDfNmnKsAI",
  authDomain: "docken-67063.firebaseapp.com",
  projectId: "docken-67063",
  storageBucket: "docken-67063.firebasestorage.app",
  messagingSenderId: "591309839949",
  appId: "1:591309839949:web:dce463e3e9ed9e4486c604",
  measurementId: "G-HH9KJR1T5X"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
