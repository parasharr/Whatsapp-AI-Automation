import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import serviceAccount from "../../firebase/grox-ai-8e9ce-firebase-adminsdk-fbsvc-6aa7b1e17d.json" with {
  type: "json",
};

initializeApp({
  credential: cert(serviceAccount),
});

const db = getFirestore();

export default db;
