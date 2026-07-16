import db from "../config/firebase.js";

/**
 * Dynamic conversation history selector based on intent, topic, and keywords.
 * Queries Firestore safely without requiring composite indexes, merges results,
 * and returns the top 10 most recent relevant messages.
 * 
 * @param {string} phone - User's phone number or JID.
 * @param {string} intent - Detected message intent.
 * @param {string} topic - Detected message topic.
 * @param {string[]} keywords - Extracted message keywords.
 * @returns {Promise<Object[]>} - Up to 10 relevant messages formatted for prompt context.
 */
export async function findRelevantMessages(phone, intent, topic, keywords = []) {
  const phoneNumber = phone.replace("@s.whatsapp.net", "");
  const messagesRef = db
    .collection("customers")
    .doc(phoneNumber)
    .collection("messages");

  const queries = [];

  // Query 1: Match same topic
  if (topic) {
    queries.push(
      messagesRef
        .where("topic", "==", topic)
        .limit(20)
        .get()
        .catch((err) => {
          console.error("[Conversation Selector] Topic query failed:", err.message);
          return null;
        })
    );
  }

  // Query 2: Match same intent
  if (intent) {
    queries.push(
      messagesRef
        .where("intent", "==", intent)
        .limit(20)
        .get()
        .catch((err) => {
          console.error("[Conversation Selector] Intent query failed:", err.message);
          return null;
        })
    );
  }

  // Query 3: Match overlapping keywords
  if (Array.isArray(keywords) && keywords.length > 0) {
    // Firestore array-contains-any supports up to 10 elements
    const slicedKeywords = keywords.slice(0, 10);
    queries.push(
      messagesRef
        .where("keywords", "array-contains-any", slicedKeywords)
        .limit(20)
        .get()
        .catch((err) => {
          console.error("[Conversation Selector] Keywords query failed:", err.message);
          return null;
        })
    );
  }

  try {
    const snapshots = await Promise.all(queries);
    const messageMap = new Map();

    for (const snapshot of snapshots) {
      if (!snapshot || snapshot.empty) continue;

      snapshot.forEach((doc) => {
        const data = doc.data();
        
        // Normalize createdAt to timestamp for sorting
        let timestamp = 0;
        if (data.createdAt) {
          if (typeof data.createdAt.toDate === "function") {
            timestamp = data.createdAt.toDate().getTime();
          } else if (data.createdAt instanceof Date) {
            timestamp = data.createdAt.getTime();
          } else if (typeof data.createdAt === "number") {
            timestamp = data.createdAt;
          } else if (typeof data.createdAt === "string") {
            timestamp = new Date(data.createdAt).getTime();
          }
        }

        messageMap.set(doc.id, {
          id: doc.id,
          role: data.role,
          message: data.message,
          intent: data.intent,
          topic: data.topic,
          keywords: data.keywords,
          timestamp,
        });
      });
    }

    // Sort all relevant messages descending by timestamp (newest first)
    const sortedMessages = Array.from(messageMap.values())
      .sort((a, b) => b.timestamp - a.timestamp);

    // Get the top 10 relevant messages
    const top10 = sortedMessages.slice(0, 10);

    // Format for prompt context (we sort in chronological order for LLM readability)
    return top10.sort((a, b) => a.timestamp - b.timestamp);
  } catch (error) {
    console.error("[Conversation Selector] Error retrieving relevant messages:", error.message);
    return [];
  }
}
