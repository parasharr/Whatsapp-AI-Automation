import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import fs from "fs";
import path from "path";

let db: FirebaseFirestore.Firestore;

if (getApps().length === 0) {
  try {
    const serviceAccountPath = path.resolve(
      process.cwd(),
      "../whatsapp-ai/firebase/grox-ai-8e9ce-firebase-adminsdk-fbsvc-6aa7b1e17d.json"
    );
    
    if (!fs.existsSync(serviceAccountPath)) {
      throw new Error(`Service account file not found at path: ${serviceAccountPath}`);
    }

    const serviceAccount = JSON.parse(
      fs.readFileSync(serviceAccountPath, "utf-8")
    );

    initializeApp({
      credential: cert(serviceAccount),
    });
    console.log("✅ Firebase Admin successfully initialized in Next.js.");
  } catch (error) {
    console.error("❌ Firebase Admin initialization failed:", error);
  }
}

db = getFirestore();

export { db };
