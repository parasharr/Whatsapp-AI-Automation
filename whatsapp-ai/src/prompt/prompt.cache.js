let promptsCache = [];

/**
 * Gets the sorted active prompts from memory.
 * @returns {Object[]}
 */
export function getCachedPrompts() {
  return promptsCache;
}

/**
 * Updates the prompts cache.
 * @param {Object[]} prompts - List of active, sorted prompt objects.
 */
export function setCachedPrompts(prompts) {
  promptsCache = prompts;
}

/**
 * Clears the prompts cache.
 */
export function clearCache() {
  promptsCache = [];
}
