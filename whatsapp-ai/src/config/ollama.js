const axios = require('axios');

const OLLAMA_BASE_URL = process.env.OLLAMA_URL || process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.MODEL || process.env.OLLAMA_MODEL || 'qwen3:8b';

// Create a pre-configured axios instance for Ollama API requests
const ollamaClient = axios.create({
  baseURL: OLLAMA_BASE_URL,
  timeout: 60000, // LLM responses can take a while
  headers: {
    'Content-Type': 'application/json'
  }
});

module.exports = {
  baseUrl: OLLAMA_BASE_URL,
  model: OLLAMA_MODEL,
  client: ollamaClient
};
