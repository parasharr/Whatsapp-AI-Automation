import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAnalytics, isSupported } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyB1elcZAsZoJBn0tWbfFANJYtmdm4tHdUI",
  authDomain: "grox-ai-8e9ce.firebaseapp.com",
  projectId: "grox-ai-8e9ce",
  storageBucket: "grox-ai-8e9ce.firebasestorage.app",
  messagingSenderId: "463079431751",
  appId: "1:463079431751:web:4bb3f186db5f41bba69b62",
  measurementId: "G-7P40KM9NBT"
};

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const clientDb = getFirestore(app);

// Initialize Analytics conditionally (client-side only to prevent SSR build crashes)
let analytics = null;
if (typeof window !== "undefined") {
  isSupported().then((supported) => {
    if (supported) {
      analytics = getAnalytics(app);
    }
  });
}

export { app, clientDb, analytics };
