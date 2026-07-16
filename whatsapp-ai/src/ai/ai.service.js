const ollamaConfig = require('../config/ollama');
const prompts = require('./prompt');

class AIService {
  /**
   * Generates a response using the local Ollama LLM.
   * @param {string} userMessage - The incoming message content.
   * @returns {Promise<string>} - The generated response text.
   */
  async generateResponse(userMessage) {
    try {
      console.log(`[AI Service] Sending request to Ollama (${ollamaConfig.model}) for: "${userMessage}"`);

      const messages = prompts.getChatMessages(userMessage);

      const response = await ollamaConfig.client.post('/api/chat', {
        model: ollamaConfig.model,
        messages: messages,
        stream: false
      });

      if (response.data && response.data.message && response.data.message.content) {
        const reply = response.data.message.content.trim();
        console.log(`[AI Service] Response generated successfully.`);
        return reply;
      }

      throw new Error('Unexpected empty response structure from Ollama API.');
    } catch (error) {
      console.error('[AI Service] Error generating response from Ollama:', error.message);
      
      // Fallback response if Ollama is offline or errors
      return `⚠️ (Grox AI System) Sorry, I couldn't reach my local AI brain. Please make sure Ollama is running and has the model loaded.`;
    }
  }
}

module.exports = new AIService();
