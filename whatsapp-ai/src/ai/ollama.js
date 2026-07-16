import axios from "axios";

export async function askAI(messages, options = {}) {
  const ollamaUrl = process.env.OLLAMA_URL || "http://localhost:11434";
  const modelName = process.env.MODEL || "qwen3:8b";
  try {
    const response = await axios.post(
      `${ollamaUrl}/api/chat`,
      {
        model: modelName,
        messages,
        stream: false,
        ...options,
      }
    );

    return response.data.message.content;
  } catch (err) {
    console.error("[Ollama AI] Error calling Ollama:", err.message || err);
    throw err;
  }
}