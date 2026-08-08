import db from "../config/firebase.js";
import { askAI } from "../ai/gemini.js";

/**
 * Loads the customer profile from Firestore.
 * @param {string} phone - Remote JID or phone number.
 * @returns {Promise<Object>} - Customer profile fields.
 */
export async function getProfile(phone) {
  const phoneNumber = phone.replace("@s.whatsapp.net", "");
  try {
    const doc = await db
      .collection("customers")
      .doc(phoneNumber)
      .collection("profile")
      .doc("info")
      .get();
      
    if (doc.exists) {
      return doc.data();
    }
    return null;
  } catch (error) {
    console.error(`[Profile Service] Error loading profile for ${phoneNumber}:`, error.message);
    return null;
  }
}

/**
 * Saves/updates the customer profile in Firestore.
 * @param {string} phone - Remote JID or phone number.
 * @param {Object} profileData - Profile fields to save.
 */
export async function saveProfile(phone, profileData) {
  const phoneNumber = phone.replace("@s.whatsapp.net", "");
  const now = new Date();
  
  try {
    const profileRef = db
      .collection("customers")
      .doc(phoneNumber)
      .collection("profile")
      .doc("info");
      
    const doc = await profileRef.get();
    
    if (doc.exists) {
      await profileRef.update({
        ...profileData,
        updatedAt: now
      });
    } else {
      await profileRef.set({
        ...profileData,
        createdAt: now,
        updatedAt: now
      });
    }
  } catch (error) {
    console.error(`[Profile Service] Error saving profile for ${phoneNumber}:`, error.message);
  }
}

/**
 * Extracts structured customer profile information from a chat turn.
 * Uses Ollama with format: "json".
 * @param {string} userMessage - Latest user message.
 * @param {string} assistantReply - Latest assistant reply.
 * @returns {Promise<Object|null>} - Extracted fields or null.
 */
export async function extractProfile(userMessage, assistantReply) {
  const prompt = `You are a data extraction assistant.
Analyze the following latest exchange between a user and an AI assistant:
User: "${userMessage}"
Assistant: "${assistantReply}"

Extract structured customer information. Only extract a field if it is mentioned with high confidence. Do not make assumptions or guess. If a field is not mentioned, return null for it.

Fields to extract:
- name: Customer's personal name.
- company: Company or business name.
- industry: Sector or niche (e.g., restaurant, real estate, retail).
- projectType: Type of project (e.g., ecommerce website, mobile app, branding, SEO).
- interestedServices: List of services they are interested in (must be an array of strings).
- budget: Customer's budget (e.g., "₹80,000", "under 1L").
- timeline: Customer's preferred timeline (e.g., "2 months", "immediate").
- preferredLanguage: Language they prefer to communicate in.
- city: City they are located in.
- country: Country they are located in.
- leadStatus: Based on their interest level, classify as "cold" (vague/casual), "warm" (interested/asking about services), or "hot" (asking for quotation, booking a meeting, ready to start).

Return ONLY a valid JSON object matching this structure:
{
  "name": string | null,
  "company": string | null,
  "industry": string | null,
  "projectType": string | null,
  "interestedServices": string[] | null,
  "budget": string | null,
  "timeline": string | null,
  "preferredLanguage": string | null,
  "city": string | null,
  "country": string | null,
  "leadStatus": string | null
}`;

  try {
    const responseText = await askAI(
      [
        {
          role: "system",
          content: "You are a precise data extraction agent. You output JSON only."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      { format: "json" }
    );

    const data = JSON.parse(responseText);
    return data;
  } catch (error) {
    console.error("[Profile Service] Error extracting profile details:", error.message);
    return null;
  }
}

/**
 * Merges newly extracted profile data into the current profile, avoiding overwriting with empty values.
 * @param {Object} currentProfile - Existing profile.
 * @param {Object} extractedProfile - Newly extracted fields.
 * @returns {Object} - Merged profile object.
 */
export function mergeProfile(currentProfile, extractedProfile) {
  if (!currentProfile) {
    currentProfile = {};
  }
  if (!extractedProfile) {
    return currentProfile;
  }

  const merged = { ...currentProfile };

  for (const key of Object.keys(extractedProfile)) {
    const newVal = extractedProfile[key];

    if (newVal === null || newVal === undefined) {
      continue; // Never overwrite with empty/null values
    }

    if (key === "interestedServices") {
      const currentServices = Array.isArray(merged.interestedServices) ? merged.interestedServices : [];
      const newServices = Array.isArray(newVal) ? newVal : [newVal];
      const combined = [...new Set([...currentServices, ...newServices])].filter(Boolean);
      if (combined.length > 0) {
        merged.interestedServices = combined;
      }
    } else {
      if (typeof newVal === "string" && newVal.trim() !== "") {
        merged[key] = newVal.trim();
      } else if (typeof newVal !== "string") {
        merged[key] = newVal;
      }
    }
  }

  return merged;
}

/**
 * Service orchestrator to extract and update customer profile from a chat turn.
 * @param {string} phone - User JID/phone.
 * @param {string} userMessage - Latest user message.
 * @param {string} assistantReply - Latest assistant reply.
 * @returns {Promise<Object>} - The updated profile.
 */
export async function updateProfileFromTurn(phone, userMessage, assistantReply) {
  const currentProfile = await getProfile(phone) || {};
  const extracted = await extractProfile(userMessage, assistantReply);
  
  if (!extracted) return currentProfile;

  // Check if any non-null fields were extracted
  const hasNewInfo = Object.values(extracted).some(val => val !== null && val !== undefined);
  if (!hasNewInfo) return currentProfile;

  const merged = mergeProfile(currentProfile, extracted);
  
  // Compare merged with current to check if actual updates occurred
  let isDifferent = false;
  for (const key of Object.keys(merged)) {
    if (JSON.stringify(merged[key]) !== JSON.stringify(currentProfile[key])) {
      isDifferent = true;
      break;
    }
  }

  if (isDifferent) {
    merged.lastInteraction = new Date();
    await saveProfile(phone, merged);
    console.log("✓ Profile Updated");
    return merged;
  }

  return currentProfile;
}
