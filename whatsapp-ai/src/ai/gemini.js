import axios from "axios";
import { GEMINI_API_KEY, GEMINI_MODEL, GEMINI_BASE_URL, DEFAULT_FALLBACK_MODELS } from "../config/gemini.js";

/**
 * Checks if an error is due to missing/invalid API key credentials.
 */
function isApiKeyError(err) {
  const status = err.status || err.response?.status || err.response?.data?.error?.code;
  if (status === 401 || status === 403) {
    const errorStatusStr = String(err.response?.data?.error?.status || "").toUpperCase();
    const errMsg = String(err.response?.data?.error?.message || err.message || "").toLowerCase();
    if (
      errorStatusStr === "UNAUTHENTICATED" ||
      errorStatusStr === "PERMISSION_DENIED" ||
      errMsg.includes("api key") ||
      errMsg.includes("invalid key") ||
      errMsg.includes("unauthenticated")
    ) {
      return true;
    }
  }
  return false;
}

/**
 * Checks if an error from Gemini API is due to quota/rate limiting, high demand, or model availability.
 */
function shouldSwitchModel(err) {
  const status = err.status || err.response?.status || err.response?.data?.error?.code;
  if ([429, 503, 500, 502, 504, 404].includes(status)) return true;

  const errorStatusStr = String(err.response?.data?.error?.status || "").toUpperCase();
  if ([
    "RESOURCE_EXHAUSTED",
    "UNAVAILABLE",
    "DEADLINE_EXCEEDED",
    "INTERNAL",
    "NOT_FOUND",
    "ABORTED"
  ].includes(errorStatusStr)) {
    return true;
  }

  const errMsg = String(err.response?.data?.error?.message || err.message || "").toLowerCase();
  const switchKeywords = [
    "429",
    "503",
    "quota",
    "resource_exhausted",
    "rate limit",
    "too many requests",
    "high demand",
    "spikes in demand",
    "demand",
    "try again later",
    "overloaded",
    "capacity",
    "unavailable",
    "busy",
    "exceeded",
    "not found"
  ];

  return switchKeywords.some((kw) => errMsg.includes(kw));
}

/**
 * Sends a single generation request to Gemini API for a specific model name.
 */
async function callGemini(modelName, messages, options = {}) {
  const apiKey = process.env.GEMINI_API_KEY || GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("[Gemini AI] GEMINI_API_KEY is not configured in environment variables.");
  }

  // 1. Separate system instruction from conversation contents
  let systemInstruction = undefined;
  const systemParts = messages
    .filter((m) => m && m.role === "system")
    .map((m) => m.content)
    .join("\n\n");

  if (systemParts.trim()) {
    systemInstruction = {
      parts: [{ text: systemParts }]
    };
  }

  // 2. Build contents array for Gemini
  const contents = messages
    .filter((m) => m && m.role !== "system")
    .map((m) => ({
      role: m.role === "assistant" || m.role === "model" ? "model" : "user",
      parts: [{ text: m.content || "" }]
    }));

  // If no non-system message was provided, add a fallback user message
  if (contents.length === 0) {
    contents.push({ role: "user", parts: [{ text: "Process prompt" }] });
  }

  // 3. Configure generation options
  const generationConfig = {};
  if (options.format === "json") {
    generationConfig.responseMimeType = "application/json";
  }
  if (options.temperature !== undefined) {
    generationConfig.temperature = options.temperature;
  }

  const payload = {
    contents,
    ...(systemInstruction ? { systemInstruction } : {}),
    ...(Object.keys(generationConfig).length > 0 ? { generationConfig } : {})
  };

  const response = await axios.post(
    `${GEMINI_BASE_URL}/models/${modelName}:generateContent?key=${apiKey}`,
    payload,
    {
      headers: {
        "Content-Type": "application/json"
      }
    }
  );

  const candidates = response.data?.candidates;
  if (!candidates || candidates.length === 0 || !candidates[0].content?.parts?.[0]?.text) {
    throw new Error("Empty or invalid candidate response from Gemini API.");
  }

  return candidates[0].content.parts[0].text;
}

/**
 * Sends a chat completion request to Google Gemini API with model fallback on quota exceeded, rate limit, high demand, or model errors.
 * 
 * @param {Array<{role: string, content: string}>} messages - List of prompt messages.
 * @param {Object} options - Additional options (e.g. { format: "json", temperature: 0.7, model: "..." }).
 * @returns {Promise<string>} - Generated response text.
 */
export async function askAI(messages, options = {}) {
  const configuredModel = options.model || process.env.GEMINI_MODEL || GEMINI_MODEL;
  
  // Combine requested/configured model with fallback models list without duplicates
  const modelsToTry = Array.from(new Set([configuredModel, ...DEFAULT_FALLBACK_MODELS]));

  let lastError = null;

  for (const model of modelsToTry) {
    try {
      const result = await callGemini(model, messages, options);
      if (model !== configuredModel) {
        console.log(`[Gemini AI] Successfully generated response using fallback model: ${model}`);
      }
      return result;
    } catch (err) {
      const errorDetails = err.response?.data?.error?.message || err.message || String(err);

      if (isApiKeyError(err)) {
        console.error(`[Gemini AI] Invalid API Key error for model '${model}': ${errorDetails}`);
        throw new Error(`Gemini API Key Error: ${errorDetails}`);
      }

      if (shouldSwitchModel(err)) {
        console.warn(`[Gemini AI] Model '${model}' unavailable/quota exceeded (${errorDetails}). Switching to next fallback model...`);
      } else {
        console.warn(`[Gemini AI] Error calling model '${model}' (${errorDetails}). Attempting next fallback model...`);
      }

      lastError = err;
    }
  }

  const lastMsg = lastError?.response?.data?.error?.message || lastError?.message || "All fallback models failed";
  throw new Error(`All Gemini models failed. Last error: ${lastMsg}`);
}

