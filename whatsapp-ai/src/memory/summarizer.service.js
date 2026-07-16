import { askAI } from "../ai/ollama.js";

/**
 * Generates a customer summary of long-term useful info based on chat history.
 * @param {Object[]} conversation - Chronological conversation history.
 * @param {string} [currentSummary] - The existing customer summary (if any) to refine.
 * @returns {Promise<string>} - The newly generated plain text summary under 150 words.
 */
export async function generateSummary(conversation, currentSummary = "") {
  const formattedChat = conversation
    .map((msg) => `${msg.role === "user" ? "Customer" : "Assistant"}: ${msg.content}`)
    .join("\n");

  const prompt = `You are a memory summarizer agent. Your job is to extract and update the long-term memory for a customer based on their chat history.

Current Memory Summary:
"${currentSummary || "No previous memory."}"

New Chat History:
${formattedChat}

Instructions:
- Summarize only the long-term useful information about this customer (e.g., their business, goals, needs, preferences, projects discussed, budget, timeline).
- Ignore greetings, polite small talk, and temporary details.
- Keep the summary under 150 words.
- Return plain text only. Do not use markdown, bullets, or headers.
- The summary should be optimized to give the AI context for future conversations.`;

  try {
    const summary = await askAI([
      {
        role: "system",
        content: "You are a professional assistant that summarizes customer details into a plain text memory summary."
      },
      {
        role: "user",
        content: prompt
      }
    ]);

    return summary ? summary.trim() : "";
  } catch (error) {
    console.error("[Summarizer Service] Error generating memory summary:", error.message);
    return currentSummary; // Fallback to existing summary on error
  }
}
