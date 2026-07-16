// A set of English stop words to ignore during keyword extraction
const STOP_WORDS = new Set([
  "a", "about", "above", "after", "again", "against", "all", "am", "an", "and", "any", "are", "arent", "as", "at",
  "be", "because", "been", "before", "being", "below", "between", "both", "but", "by", "cant", "cannot", "could",
  "couldnt", "did", "didnt", "do", "does", "doesnt", "doing", "dont", "down", "during", "each", "few", "for", "from",
  "further", "had", "hadnt", "has", "hasnt", "have", "havent", "having", "he", "hed", "hell", "hes", "her", "here",
  "heres", "hers", "herself", "him", "himself", "his", "how", "hows", "i", "id", "ill", "im", "ive", "if", "in",
  "into", "is", "isnt", "it", "its", "itself", "lets", "me", "more", "most", "mustnt", "my", "myself", "no", "nor",
  "not", "of", "off", "on", "once", "only", "or", "other", "ought", "our", "ours", "ourselves", "out", "over", "own",
  "same", "shant", "she", "shed", "shell", "shes", "should", "shouldnt", "so", "some", "such", "than", "that",
  "thats", "the", "their", "theirs", "them", "themselves", "then", "there", "theres", "these", "they", "theyd",
  "theyll", "theyre", "theyve", "this", "those", "through", "to", "too", "under", "until", "up", "very", "was",
  "wasnt", "we", "wed", "well", "were", "weve", "werent", "what", "whats", "when", "whens", "where", "wheres",
  "which", "while", "who", "whos", "whom", "why", "whys", "with", "wont", "would", "wouldnt", "you", "youd",
  "youll", "youre", "youve", "your", "yours", "yourself", "yourselves", "need", "want", "please", "can", "tell",
  "show", "provide", "build", "make", "create", "get", "give"
]);

const REJECTED_NAME_WORDS = new Set([
  "here", "looking", "interested", "planning", "working", "searching", "from", "ready", "building",
  "going", "trying", "hoping", "asking", "having", "not", "sure", "just", "writing", "calling",
  "developing", "creating", "making", "designing", "helping", "coding", "testing",
  "website", "dashboard", "project", "app", "software", "business", "company", "services", "pricing",
  "a", "an", "the", "for", "to", "in", "on", "at", "by", "with"
]);

/**
 * Extracts and validates names from genuine self-introduction patterns only.
 * @param {string} text - The raw user message.
 * @returns {Object|null} - Name and confidence score if valid, otherwise null.
 */
function extractAndValidateName(text) {
  const selfIntroPatterns = [
    { regex: /\bmy name is\s+([A-Za-z\s]+)/i, confidence: 1.0 },
    { regex: /\bi'm\s+([A-Za-z\s]+)/i, confidence: 0.9 },
    { regex: /\bi am\s+([A-Za-z\s]+)/i, confidence: 0.85 },
    { regex: /\bcall me\s+([A-Za-z\s]+)/i, confidence: 0.95 },
    { regex: /\bthis is\s+([A-Za-z\s]+)/i, confidence: 0.9 }
  ];

  for (const pattern of selfIntroPatterns) {
    const match = text.match(pattern.regex);
    if (match) {
      const cleaned = cleanExtractedValue(match[1]);
      if (!cleaned) continue;

      const words = cleaned.split(/\s+/).filter(Boolean);
      // Validate: 1-4 words
      if (words.length < 1 || words.length > 4) continue;

      // Validate: Alphabetic only & Reject common non-name words
      let isValid = true;
      for (const word of words) {
        if (!/^[A-Za-z]+$/.test(word)) {
          isValid = false;
          break;
        }
        if (REJECTED_NAME_WORDS.has(word.toLowerCase())) {
          isValid = false;
          break;
        }
      }

      if (isValid) {
        return { name: cleaned, confidence: pattern.confidence };
      }
    }
  }

  return null;
}

/**
 * Cleans extracted customer profile values by removing punctuation and trailing clauses.
 * @param {string} value - Raw extracted string.
 * @returns {string|null} - Cleaned string or null.
 */
function cleanExtractedValue(value) {
  if (!value) return null;
  let cleaned = value.trim();
  // Remove trailing punctuation
  cleaned = cleaned.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, "").trim();
  // Truncate if the captured string contains conjunctions or verbs that starts a new sentence clause
  cleaned = cleaned.replace(/\s+(and|from|we|i|need|want|to|the|a|for|please|with|my|timeline|budget|is|was|am)\b.*/i, "").trim();
  return cleaned || null;
}

/**
 * Merges Intent, Topic, Keyword, and Profile extraction into a single, high-speed deterministic rules service.
 * @param {string} userMessage - The raw user message.
 * @returns {Object} - Analyzed context: { intent, topic, keywords, profileUpdates, profileConfidences }
 */
export function analyzeContext(userMessage) {
  if (!userMessage) {
    return {
      intent: "general",
      topic: "general",
      keywords: [],
      profileUpdates: {},
      profileConfidences: {}
    };
  }

  const text = userMessage.trim();
  const normalized = text.toLowerCase().replace(/[^\w\s]/g, " ").replace(/\s+/g, " ");

  // 1. Keyword extraction (Tokenization & Stop Word Filtering)
  const tokens = normalized.split(" ").filter(Boolean);
  const keywords = tokens.filter((t) => !STOP_WORDS.has(t));

  // 2. Profile Extraction
  const profileUpdates = {};
  const profileConfidences = {
    name: 0,
    company: 0,
    projectType: 0,
    budget: 0,
    timeline: 0
  };

  // Extract Name using helper
  const nameResult = extractAndValidateName(text);
  if (nameResult) {
    profileUpdates.name = nameResult.name;
    profileConfidences.name = nameResult.confidence;
  }

  // Extract Company Name
  const companyMatch = text.match(/\bour company is\s+([A-Za-z0-9\s]+)/i) || 
                       text.match(/\bwe own\s+([A-Za-z0-9\s]+)/i);
  if (companyMatch) {
    const val = cleanExtractedValue(companyMatch[1]);
    if (val) {
      profileUpdates.company = val;
      profileConfidences.company = 0.9;
    }
  }

  // Extract Project Type
  const projectMatch = text.match(/\bwe need\s+(?:an?|the)?\s*([A-Za-z\s-]+)/i) || 
                       text.match(/\bneed\s+(?:an?|the)?\s*([A-Za-z\s-]+)/i);
  if (projectMatch) {
    const val = cleanExtractedValue(projectMatch[1]);
    if (val) {
      profileUpdates.projectType = val;
      profileConfidences.projectType = 0.9;
    }
  }

  // Extract Budget
  const budgetMatch = text.match(/\bmy budget is\s+([^\.]+)/i) || 
                      text.match(/\bbudget is\s+([^\.]+)/i);
  if (budgetMatch) {
    const val = cleanExtractedValue(budgetMatch[1]);
    if (val) {
      profileUpdates.budget = val;
      profileConfidences.budget = 0.95;
    }
  }

  // Extract Timeline
  const timelineMatch = text.match(/\bmy timeline is\s+([^\.]+)/i) || 
                        text.match(/\btimeline is\s+([^\.]+)/i) ||
                        text.match(/\bmy timeline\s+([^\.]+)/i);
  if (timelineMatch) {
    const val = cleanExtractedValue(timelineMatch[1]);
    if (val) {
      profileUpdates.timeline = val;
      profileConfidences.timeline = 0.9;
    }
  }

  // 3. Intent Detection Rule mapping
  const intentKeywords = {
    introduction: ["name", "call", "myself", "introduce"],
    greeting: ["hello", "hi", "hey", "greetings", "yo", "sup", "morning", "afternoon", "evening"],
    goodbye: ["bye", "goodbye", "see ya", "see you", "farewell", "later", "adios"],
    pricing: ["price", "pricing", "cost", "budget", "quote", "quotation", "rate", "rates", "fees", "charge", "charges", "expensive", "cheap", "plans", "packages"],
    services: ["service", "services", "offer", "provide", "develop", "build", "create", "make", "capabilities"],
    portfolio: ["portfolio", "projects", "work", "examples", "previous", "experience", "past", "demo", "case", "samples", "screenshots"],
    contact: ["contact", "call", "phone", "email", "reach", "address", "location", "office", "where", "connect", "number", "whatsapp"],
    support: ["support", "help", "issue", "bug", "broken", "error", "problem", "not working", "fix", "trouble", "fail", "failed", "crash"],
    lead: ["hire", "book", "meeting", "schedule", "appoint", "consult", "consultation", "interested", "start", "proposal"],
    about: ["who are you", "about you", "what is grox", "grox studio", "grox ai", "who is", "about grox", "background", "history"],
    follow_up: ["previous", "before", "last question", "what was", "continue", "what did"]
  };

  let intent = "general";
  if (nameResult || normalized.includes("my name is") || normalized.includes("myself") || normalized.startsWith("i am ")) {
    intent = "introduction";
  } else {
    let maxIntentScore = 0;
    for (const [intentName, words] of Object.entries(intentKeywords)) {
      let score = 0;
      for (const word of words) {
        if (normalized.includes(word)) {
          const regex = new RegExp(`\\b${word}\\b`, "i");
          if (text.match(regex)) {
            score += 3;
          } else {
            score += 1;
          }
        }
      }
      if (score > maxIntentScore) {
        maxIntentScore = score;
        intent = intentName;
      }
    }
  }

  // 4. Topic Detection Rule mapping
  const topicKeywords = {
    profile: ["name", "company", "budget", "timeline"],
    website: ["website", "web", "ecommerce", "e-commerce", "shopify", "wordpress", "landing page", "webpage", "site", "online store", "nextjs", "react", "html", "css"],
    mobile_app: ["app", "mobile", "ios", "android", "flutter", "react native", "application", "phone app"],
    dashboard: ["dashboard", "admin", "portal", "saas", "crm", "cms", "control panel", "admin panel"],
    branding: ["branding", "logo", "design", "ui", "ux", "ui/ux", "wireframe", "graphic", "flyer", "identity", "brand kit"],
    marketing: ["marketing", "promotion", "promote", "growth", "campaign", "ad", "ads", "advertising"],
    seo: ["seo", "search engine", "google ranking", "rank", "optimization", "speed", "sem"],
    social_media: ["social media", "instagram", "facebook", "linkedin", "twitter", "smm", "post", "posts", "story", "stories", "reels", "reel", "influencer"],
    performance_marketing: ["performance marketing", "lead generation", "leads", "ppc", "google ads", "meta ads", "conversion", "roi"],
    ai: ["ai", "bot", "chatbot", "automation", "llm", "openai", "gpt", "agent", "agents", "machine learning", "chatgpt"],
    pricing: ["price", "pricing", "cost", "budget", "quote", "quotation", "rate", "fees"],
    portfolio: ["portfolio", "case studies", "projects", "work", "examples", "previous", "experience", "past"],
    contact: ["contact", "call", "phone", "email", "reach", "address", "location", "office"]
  };

  let topic = "general";
  if (intent === "introduction" || nameResult) {
    topic = "profile";
  } else {
    let maxTopicScore = 0;
    for (const [topicName, words] of Object.entries(topicKeywords)) {
      let score = 0;
      for (const word of words) {
        if (normalized.includes(word)) {
          const regex = new RegExp(`\\b${word}\\b`, "i");
          if (text.match(regex)) {
            score += 3;
          } else {
            score += 1;
          }
        }
      }
      if (topicName === intent) {
        score += 2;
      }
      if (score > maxTopicScore) {
        maxTopicScore = score;
        topic = topicName;
      }
    }
  }

  return {
    intent,
    topic,
    keywords,
    profileUpdates,
    profileConfidences
  };
}
