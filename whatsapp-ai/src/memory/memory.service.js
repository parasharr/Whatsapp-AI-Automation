import db from "../config/firebase.js";
import { generateSummary } from "./summarizer.service.js";

/**
 * Loads the memory summary document from Firestore.
 * @param {string} phone - User JID/phone.
 * @returns {Promise<Object>} - Memory summary document.
 */
export async function getMemory(phone) {
  const phoneNumber = phone.replace("@s.whatsapp.net", "");
  try {
    const doc = await db
      .collection("customers")
      .doc(phoneNumber)
      .collection("memory")
      .doc("info")
      .get();
      
    if (doc.exists) {
      return doc.data();
    }
    return {
      summary: "",
      lastUpdated: null,
      version: 0
    };
  } catch (error) {
    console.error(`[Memory Service] Error loading memory for ${phoneNumber}:`, error.message);
    return {
      summary: "",
      lastUpdated: null,
      version: 0
    };
  }
}

/**
 * Saves/updates the memory summary document in Firestore.
 * @param {string} phone - User JID/phone.
 * @param {Object} memoryData - Memory fields to save.
 */
export async function saveMemory(phone, memoryData) {
  const phoneNumber = phone.replace("@s.whatsapp.net", "");
  try {
    await db
      .collection("customers")
      .doc(phoneNumber)
      .collection("memory")
      .doc("info")
      .set({
        summary: memoryData.summary || "",
        lastUpdated: memoryData.lastUpdated || new Date(),
        version: memoryData.version || 1
      });
  } catch (error) {
    console.error(`[Memory Service] Error saving memory for ${phoneNumber}:`, error.message);
  }
}

/**
 * Checks if memory should be updated based on profile differences and message count.
 * @param {Object} oldProfile - Previous profile.
 * @param {Object} newProfile - Merged profile.
 * @param {number} userMessageCountSinceLastUpdate - Number of user messages since last update.
 * @returns {boolean}
 */
export function shouldUpdateMemory(oldProfile, newProfile, userMessageCountSinceLastUpdate) {
  if (userMessageCountSinceLastUpdate >= 10) {
    return true;
  }

  if (!oldProfile || Object.keys(oldProfile).length === 0) {
    if (newProfile && Object.keys(newProfile).length > 0) {
      return true;
    }
    return false;
  }

  // Key fields that trigger memory updates when changed
  const keyFields = ["budget", "timeline", "projectType", "company", "interestedServices", "leadStatus"];
  for (const field of keyFields) {
    const oldVal = oldProfile[field];
    const newVal = newProfile[field];

    if (Array.isArray(oldVal) && Array.isArray(newVal)) {
      if (oldVal.length !== newVal.length || oldVal.some((v, i) => v !== newVal[i])) {
        return true;
      }
    } else if (oldVal !== newVal) {
      if (newVal !== undefined && newVal !== null && newVal !== "") {
        return true;
      }
    }
  }

  return false;
}

/**
 * Determines if we should generate a memory summary.
 * @param {string} currentSummary - Existing summary text.
 * @param {Object[]} conversation - Chronological chat history.
 * @returns {boolean}
 */
export function shouldGenerateSummary(currentSummary, conversation) {
  if (!conversation || conversation.length === 0) {
    return false;
  }
  return true;
}

/**
 * Service orchestrator that checks update criteria, calls summarizer, and persists results.
 * @param {string} phone - User JID/phone.
 * @param {Object} oldProfile - Profile before the current turn.
 * @param {Object} newProfile - Profile after the current turn.
 * @param {Object} currentMemory - Current memory info.
 * @param {Object[]} conversation - Chronological chat history.
 * @returns {Promise<Object>} - The updated or current memory summary.
 */
export async function updateMemoryIfNeeded(phone, oldProfile, newProfile, currentMemory, conversation) {
  const phoneNumber = phone.replace("@s.whatsapp.net", "");
  
  // 1. Get user message count since lastUpdated
  let userMessageCount = 0;
  if (currentMemory && currentMemory.lastUpdated) {
    try {
      const snapshot = await db
        .collection("customers")
        .doc(phoneNumber)
        .collection("messages")
        .where("createdAt", ">", currentMemory.lastUpdated)
        .where("role", "==", "user")
        .count()
        .get();
      userMessageCount = snapshot.data().count;
    } catch (err) {
      console.error("[Memory Service] Error counting user messages since last update:", err.message);
    }
  } else {
    try {
      const snapshot = await db
        .collection("customers")
        .doc(phoneNumber)
        .collection("messages")
        .where("role", "==", "user")
        .count()
        .get();
      userMessageCount = snapshot.data().count;
    } catch (err) {
      console.error("[Memory Service] Error counting all user messages:", err.message);
    }
  }

  // 2. Evaluate if we need to update
  if (shouldUpdateMemory(oldProfile, newProfile, userMessageCount)) {
    if (shouldGenerateSummary(currentMemory.summary, conversation)) {
      console.log("✓ Summary Generated");
      const newSummary = await generateSummary(conversation, currentMemory.summary);
      const updatedMemory = {
        summary: newSummary,
        lastUpdated: new Date(),
        version: (currentMemory.version || 0) + 1
      };
      await saveMemory(phone, updatedMemory);
      console.log("✓ Memory Updated");
      return updatedMemory;
    }
  } else {
    console.log("✓ Memory Skipped");
  }

  return currentMemory;
}
