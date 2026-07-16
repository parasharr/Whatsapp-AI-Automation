import db from "../config/firebase.js";

let knowledgeCache = [];

export async function loadKnowledge() {
  try {
    const snapshot = await db.collection("knowledge").get();

    knowledgeCache = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    console.log("✓ Knowledge Loaded");

    return knowledgeCache;
  } catch (err) {
    console.error(err);
    return [];
  }
}

export function getKnowledge() {
  return knowledgeCache;
}