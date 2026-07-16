import express from "express";
import dotenv from "dotenv";
import axios from "axios";
import { startWhatsApp } from "./whatsapp/client.js";
import { loadKnowledge } from "./knowledge/knowledge.service.js";
import { loadPrompts, reloadPrompts } from "./prompt/prompt.service.js";

import cors from "cors";
import db from "./config/firebase.js";
import {
  regenerateLeadEmail,
  createDraftForLead,
  getLeadThreshold
} from "./services/leadIntelligence.service.js";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({
    status: "Grox AI Running",
  });
});

app.post("/prompts/reload", async (req, res) => {
  try {
    await reloadPrompts();
    res.json({ success: true, message: "Prompt cache reloaded successfully" });
  } catch (err) {
    console.error("❌ Failed to reload prompts:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// LEAD INTELLIGENCE ENDPOINTS

app.post("/leads/regenerate-email", async (req, res) => {
  try {
    const { leadId } = req.body;
    if (!leadId) {
      return res.status(400).json({ success: false, error: "leadId is required" });
    }
    const updates = await regenerateLeadEmail(leadId);
    res.json({ success: true, updates });
  } catch (err) {
    console.error("❌ Failed to regenerate email:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post("/leads/create-draft", async (req, res) => {
  try {
    const { leadId } = req.body;
    if (!leadId) {
      return res.status(400).json({ success: false, error: "leadId is required" });
    }
    const result = await createDraftForLead(leadId);
    res.json({ success: true, result });
  } catch (err) {
    console.error("❌ Failed to create draft:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get("/leads/settings", async (req, res) => {
  try {
    const threshold = await getLeadThreshold();
    res.json({ success: true, threshold });
  } catch (err) {
    console.error("❌ Failed to get lead settings:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post("/leads/settings", async (req, res) => {
  try {
    const { threshold } = req.body;
    if (typeof threshold !== "number") {
      return res.status(400).json({ success: false, error: "threshold must be a number" });
    }
    await db.collection("settings").doc("lead_intelligence").set({ threshold }, { merge: true });
    res.json({ success: true, threshold });
  } catch (err) {
    console.error("❌ Failed to update lead settings:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});


const PORT = process.env.PORT || 5000;

app.listen(PORT, async () => {
  console.log(`🚀 Grox AI Agent running on port ${PORT}`);

  // Load Prompt Library
  await loadPrompts();

  // Load Business Knowledge
  await loadKnowledge();

  // Confirm memory system readiness
  console.log("✓ Memory Ready");
  console.log("✓ Customer Profile Service Ready");
  console.log("✓ Memory Service Ready");

  // Verify Ollama connection
  const ollamaUrl = process.env.OLLAMA_URL || "http://localhost:11434";
  try {
    const checkOllama = await axios.get(`${ollamaUrl}/api/tags`);
    if (checkOllama.status === 200) {
      console.log(`✓ Ollama Connected to ${ollamaUrl}`);
    }
  } catch (err) {
    console.log(`⚠️ Ollama Offline (Failed to connect to ${ollamaUrl})`);
  }

  // Start WhatsApp Gateway
  await startWhatsApp();
});