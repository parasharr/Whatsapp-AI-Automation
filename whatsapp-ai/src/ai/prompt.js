const SYSTEM_PROMPT = `You are Grox Ai Agent, a helpful AI assistant integrated with WhatsApp.
Your goal is to provide concise, friendly, and accurate answers to user queries.
Respond to the user directly, keeping responses concise and optimized for reading on mobile devices.
Do not use overly complex markdown formatting, and use emojis where appropriate to make the chat engaging.`;

/**
 * Formats the history and current message into a clean format for Ollama's chat or generate endpoint.
 * @param {string} userMessage - The new incoming message.
 * @returns {Array} - Array of message objects for Ollama.
 */
function getChatMessages(userMessage) {
  return [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: userMessage }
  ];
}

module.exports = {
  SYSTEM_PROMPT,
  getChatMessages
};
