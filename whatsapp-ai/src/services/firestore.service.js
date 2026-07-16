import db from "../config/firebase.js";

export async function saveMessage(phone, role, message, metadata = {}) {
  try {
    const phoneNumber = phone.replace("@s.whatsapp.net", "");

    console.log("Saving...");
    console.log(phoneNumber);

    const doc = await db
      .collection("customers")
      .doc(phoneNumber)
      .collection("messages")
      .add({
        role,
        message,
        intent: metadata.intent || "general",
        topic: metadata.topic || "website",
        keywords: Array.isArray(metadata.keywords) ? metadata.keywords : [],
        createdAt: new Date(),
      });

    console.log("✅ Saved document:", doc.id);
    return doc.id;
  } catch (err) {
    console.error("🔥 FIRESTORE ERROR");
    console.error(err);
    return null;
  }
}