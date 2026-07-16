import {
  hasConversation,
  getConversation,
  setConversation,
  addMessage,
} from "../memory/conversationManager.js";

import db from "../config/firebase.js";
import { saveMessage } from "../services/firestore.service.js";

const MAX_HISTORY = 30;

/**
 * Load conversation from Firestore into RAM
 */
export async function loadConversation(phone) {
  const phoneNumber = phone.replace("@s.whatsapp.net", "");

  const snapshot = await db
    .collection("customers")
    .doc(phoneNumber)
    .collection("messages")
    .orderBy("createdAt", "asc")
    .limit(MAX_HISTORY)
    .get();

  const conversation = [];

  snapshot.forEach((doc) => {
    const data = doc.data();

    conversation.push({
      role: data.role,
      content: data.message,
    });
  });

  setConversation(phoneNumber, conversation);

  console.log(
    `📥 Loaded ${conversation.length} messages from Firestore`
  );

  return conversation;
}

/**
 * Save message to Firestore with metadata
 */
export async function saveConversation(phone, role, message, metadata = {}) {
  await saveMessage(phone, role, message, metadata);
}

/**
 * Returns the conversation with the new user message appended.
 */
export async function processUserMessage(phone, message, metadata = {}) {
  const phoneNumber = phone.replace("@s.whatsapp.net", "");

  if (!hasConversation(phoneNumber)) {
    await loadConversation(phoneNumber);
  }

  const conversation = addMessage(phoneNumber, "user", message);

  // Save without blocking AI generation
  saveConversation(phoneNumber, "user", message, metadata).catch(console.error);

  return conversation;
}

/**
 * Save AI reply to RAM + Firestore with metadata
 */
export async function processAssistantMessage(phone, reply, metadata = {}) {
  const phoneNumber = phone.replace("@s.whatsapp.net", "");

  addMessage(phoneNumber, "assistant", reply);

  saveConversation(phoneNumber, "assistant", reply, metadata).catch(console.error);
}

/**
 * Current RAM conversation
 */
export function getCurrentConversation(phone) {
  const phoneNumber = phone.replace("@s.whatsapp.net", "");

  return getConversation(phoneNumber);
}
