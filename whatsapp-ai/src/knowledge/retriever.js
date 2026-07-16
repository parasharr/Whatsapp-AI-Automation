import { getKnowledge } from "./knowledge.service.js";

// Stop words to ignore during query tokenization
const STOP_WORDS = new Set([
  "what", "is", "the", "a", "an", "tell", "me", "about", "please", "can", "you"
]);

// Synonym map for mapping query keywords to topics
const SYNONYM_MAP = {
  about: new Set(["who", "what", "company", "organization", "business", "grox", "studio", "about"]),
  pricing: new Set(["price", "pricing", "cost", "quotation", "quote", "budget"]),
  services: new Set(["service", "services", "offer", "provide", "develop", "build", "create"]),
  portfolio: new Set(["projects", "case", "studies", "work", "examples", "experience"]),
  contact: new Set(["contact", "call", "email", "reach", "phone"]),
  faq: new Set(["help", "question", "support"])
};

/**
 * Normalizes text by converting to lowercase, removing punctuation, 
 * collapsing multiple spaces into a single space, and trimming.
 * @param {string} text - The raw input text.
 * @returns {string} - The normalized clean text.
 */
export function normalizeText(text) {
  if (!text) return "";
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Filters out stop words from a list of words.
 * @param {string[]} words - List of tokenized words.
 * @returns {string[]} - Words list without stop words.
 */
export function removeStopWords(words) {
  if (!words) return [];
  return words.filter((word) => !STOP_WORDS.has(word));
}

/**
 * Maps query words to category/topic keys based on defined synonyms.
 * @param {string[]} words - Clean query keywords.
 * @returns {string[]} - Matched topic keys.
 */
export function expandSynonyms(words) {
  if (!words) return [];
  const matchedTopics = new Set();
  for (const word of words) {
    for (const [topic, synonyms] of Object.entries(SYNONYM_MAP)) {
      if (synonyms.has(word)) {
        matchedTopics.add(topic);
      }
    }
  }
  return Array.from(matchedTopics);
}

/**
 * Calculates a weighted relevance score for a document based on query keywords and synonyms.
 * @param {Object} doc - The knowledge base document.
 * @param {string} normalizedQuery - The full normalized query string.
 * @param {string[]} queryWords - Tokenized query keywords.
 * @param {string[]} matchedTopics - Expanded synonym topic keys.
 * @returns {number} - The cumulative document score.
 */
export function calculateScore(doc, normalizedQuery, queryWords, matchedTopics) {
  let score = 0;

  // 1. Title match (+10)
  const titleNorm = normalizeText(doc.title);
  const titleWords = titleNorm.split(/\s+/).filter(Boolean);
  const titleMatch =
    titleNorm.includes(normalizedQuery) ||
    normalizedQuery.includes(titleNorm) ||
    queryWords.some((word) => titleWords.includes(word));

  if (titleMatch) score += 10;

  // 2. Category match (+8)
  const categoryNorm = normalizeText(doc.category);
  const categoryMatch =
    categoryNorm === normalizedQuery ||
    normalizedQuery.split(/\s+/).includes(categoryNorm) ||
    queryWords.includes(categoryNorm);

  if (categoryMatch) score += 8;

  // 3. Tag match (+5)
  const tagMatch =
    doc.tags?.some((tag) => {
      const tagNorm = normalizeText(tag);
      return tagNorm === normalizedQuery ||
             normalizedQuery.split(/\s+/).includes(tagNorm) ||
             queryWords.includes(tagNorm);
    }) || false;

  if (tagMatch) score += 5;

  // 4. Content match (+2)
  const contentNorm = normalizeText(doc.content);
  const contentWords = contentNorm.split(/\s+/).filter(Boolean);
  const contentMatch = queryWords.some((word) => contentWords.includes(word));

  if (contentMatch) score += 2;

  // 5. Synonym match (+6)
  const synonymMatch =
    matchedTopics.includes(doc.category?.toLowerCase()) ||
    doc.tags?.some((tag) => matchedTopics.includes(tag.toLowerCase())) ||
    false;

  if (synonymMatch) score += 6;

  return score;
}

/**
 * Production-ready RAG keyword retriever.
 * Normalizes input, tokenizes, expands synonyms, weights document scoring,
 * filters active status, ranks documents, and handles empty results.
 * @param {string} userMessage - Raw message from the user.
 * @returns {Object[]|string} - Top 5 scored documents, or "NO_KNOWLEDGE_FOUND" if none matched.
 */
export function retrieveKnowledge(userMessage) {
  const normalizedQuery = normalizeText(userMessage);
  if (!normalizedQuery) {
    return "NO_KNOWLEDGE_FOUND";
  }

  // Tokenize and filter stop words
  const words = normalizedQuery.split(/\s+/).filter(Boolean);
  const queryWords = removeStopWords(words);

  // If query consists only of stop words, fallback to using all words
  const finalQueryWords = queryWords.length > 0 ? queryWords : words;

  // Expand query to retrieve synonym topics
  const matchedTopics = expandSynonyms(finalQueryWords);

  const docs = getKnowledge();

  const scoredDocs = docs
    .map((doc) => {
      // Exclude documents if status is defined and is not 'active'
      const isActive = doc.status === undefined || doc.status === "active";
      if (!isActive) {
        return null;
      }

      const score = calculateScore(doc, normalizedQuery, finalQueryWords, matchedTopics);

      if (score === 0) {
        return null;
      }

      return {
        ...doc,
        score
      };
    })
    .filter(Boolean);

  if (scoredDocs.length === 0) {
    return "NO_KNOWLEDGE_FOUND";
  }

  // Sort by score (descending) and return the top 5 most relevant entries
  return scoredDocs
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);
}