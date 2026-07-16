/**
 * Supported phrases for deterministic meeting intent detection.
 */
export const MEETING_PHRASES = [
  "consultation",
  "meeting",
  "schedule meeting",
  "book meeting",
  "project discussion",
  "call",
  "video call",
  "google meet",
  "zoom",
  "demo",
  "talk with your team",
  "talk with someone",
  "connect with team"
];

/**
 * Detects meeting intent using deterministic keyword matching.
 * Checks if the user message contains any of the supported phrases (case-insensitive).
 * 
 * @param {string} text - The raw user message.
 * @returns {boolean} - True if meeting intent is detected.
 */
export function detectMeetingIntent(text) {
  if (!text) return false;
  const normalized = text.toLowerCase();
  
  // Return true if any of the phrases are found in the text
  return MEETING_PHRASES.some(phrase => normalized.includes(phrase));
}
