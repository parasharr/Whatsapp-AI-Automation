import db from "../config/firebase.js";
import { getCachedPrompts, setCachedPrompts } from "./prompt.cache.js";

const DEFAULT_PRIORITIES = {
  "System Instruction": 1,
  "Guardrails": 2,
  "Tone of Voice": 3,
  "Response Style": 4,
  "Pricing Strategy": 5,
  "Sales Pitching": 6,
  "Lead Generation": 7,
  "Support Protocol": 8
};

/**
 * Loads active prompts from Firestore, sorts by priority, and caches them in memory.
 * @returns {Promise<Object[]>}
 */
export async function loadPrompts() {
  try {
    const snapshot = await db
      .collection("prompts")
      .where("status", "==", "active")
      .get();
      
    const list = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      const title = data.title || doc.id;
      const priority = data.priority !== undefined ? Number(data.priority) : (DEFAULT_PRIORITIES[title] || 100);
      
      list.push({
        id: doc.id,
        title,
        content: data.content || "",
        priority,
        status: data.status || "active"
      });
    });
    
    // Sort by priority ASC
    const sorted = list.sort((a, b) => a.priority - b.priority);
    setCachedPrompts(sorted);
    
    console.log("Prompt Cache Loaded");
    sorted.forEach((p) => {
      console.log(`✓ ${p.title}`);
    });
    
    return sorted;
  } catch (err) {
    console.error("❌ Failed to load Prompt Library from Firestore:", err.message);
    return [];
  }
}

/**
 * Reloads the cache from Firestore.
 */
export async function reloadPrompts() {
  return loadPrompts();
}

/**
 * Retrieves the cached prompts list (already sorted).
 * @returns {Object[]}
 */
export function getPrompts() {
  return getCachedPrompts();
}

/**
 * Retrieves a prompt from cache by its title (case-insensitive).
 * @param {string} title
 * @returns {Object|null}
 */
export function getPromptByTitle(title) {
  const prompts = getCachedPrompts();
  return prompts.find((p) => p.title.toLowerCase() === title.toLowerCase()) || null;
}

/**
 * Retrieves an intent-based prompt by detected intent.
 * - pricing -> Pricing Strategy
 * - services -> Sales Pitching
 * - lead -> Lead Generation
 * - support -> Support Protocol
 * @param {string} intent
 * @returns {Object|null}
 */
export function getPromptByIntent(intent) {
  if (!intent) return null;
  const mapping = {
    pricing: "Pricing Strategy",
    services: "Sales Pitching",
    lead: "Lead Generation",
    support: "Support Protocol"
  };
  const title = mapping[intent.toLowerCase()];
  if (!title) return null;
  return getPromptByTitle(title);
}
