import dotenv from "dotenv";
dotenv.config();

import { loadKnowledge } from "./knowledge/knowledge.service.js";
import { loadPrompts } from "./prompt/prompt.service.js";
import { analyzeContext } from "./context-engine/contextAnalyzer.service.js";
import { findRelevantMessages } from "./context/conversation.selector.js";
import { buildPrompt } from "./prompt/prompt.builder.js";
import { retrieveKnowledge } from "./knowledge/retriever.js";
import { saveMessage } from "./services/firestore.service.js";
import db from "./config/firebase.js";

async function runTests() {
  console.log("=== STARTING CONTEXT ANALYZER TESTING ===");

  // 1. Initialize prompts and knowledge
  console.log("Loading prompts and business knowledge...");
  await loadPrompts();
  await loadKnowledge();

  const mockPhone = "9999999999";

  // Clean up any stale test messages first
  console.log("Cleaning up previous test messages...");
  const oldMsgs = await db.collection("customers").doc(mockPhone).collection("messages").get();
  if (!oldMsgs.empty) {
    const batch = db.batch();
    oldMsgs.docs.forEach(doc => batch.delete(doc.ref));
    await batch.commit();
    console.log("Stale messages deleted.");
  }

  // 2. Test LLM-Free rule-based service
  const testPhrases = [
    {
      text: "My name is Pranjeet Goswami.",
      expectedIntent: "introduction",
      expectedTopic: "profile",
      expectedName: "Pranjeet Goswami"
    },
    {
      text: "I am Pranjeet.",
      expectedIntent: "introduction",
      expectedTopic: "profile",
      expectedName: "Pranjeet"
    },
    {
      text: "I am here for an admin dashboard project.",
      expectedIntent: "general",
      expectedTopic: "general"
    },
    {
      text: "Our company is Nova Game Pvt Ltd.",
      expectedIntent: "introduction",
      expectedTopic: "profile",
      expectedCompany: "Nova Game Pvt Ltd"
    },
    {
      text: "I need an ecommerce website with Stripe payment gateway.",
      expectedIntent: "services",
      expectedTopic: "website",
      expectedProjectType: "ecommerce website"
    },
    {
      text: "My budget is ₹80,000.",
      expectedIntent: "pricing",
      expectedTopic: "profile",
      expectedBudget: "₹80,000"
    },
    {
      text: "My timeline is 2 months.",
      expectedIntent: "pricing",
      expectedTopic: "profile",
      expectedTimeline: "2 months"
    },
    {
      text: "Hey, do you support google ads or SEO?",
      expectedIntent: "services",
      expectedTopic: "seo"
    },
    {
      text: "Just general chit chat.",
      expectedIntent: "general",
      expectedTopic: "general"
    }
  ];

  for (const phrase of testPhrases) {
    console.log(`\nTesting phrase: "${phrase.text}"`);
    const { intent, topic, keywords, profileUpdates, profileConfidences } = analyzeContext(phrase.text);

    console.log(`  Intent:  ${intent}`);
    console.log(`  Topic:   ${topic}`);
    console.log(`  Keywords: [ ${keywords.join(", ")} ]`);
    console.log(`  Profile Updates:`, JSON.stringify(profileUpdates));
    console.log(`  Confidences:`, JSON.stringify(profileConfidences));
  }

  // 3. Test Metadata Tagging and Saving in Firestore
  console.log("\nSaving test messages to Firestore...");
  
  const sampleMessages = [
    {
      role: "user",
      message: "Our company is Nova Game",
      metadata: { intent: "introduction", topic: "profile", keywords: ["company", "nova", "game"] }
    },
    {
      role: "assistant",
      message: "Nice to meet you. What project can we start?",
      metadata: { intent: "introduction", topic: "profile", keywords: ["company", "nova", "game"] }
    },
    {
      role: "user",
      message: "What is your pricing for search engine optimization?",
      metadata: { intent: "pricing", topic: "seo", keywords: ["pricing", "seo", "optimization"] }
    }
  ];

  for (const msg of sampleMessages) {
    await saveMessage(mockPhone, msg.role, msg.message, msg.metadata);
  }

  // 4. Test Selector with matching intent, topic, keywords
  console.log("\nTesting Selector with matching Intent/Topic/Keywords...");
  const searchIntent = "pricing";
  const searchTopic = "seo";
  const searchKeywords = ["seo", "pricing", "optimization"];
  
  const relevantHistory = await findRelevantMessages(mockPhone, searchIntent, searchTopic, searchKeywords);
  
  console.log(`\nRelevant History Retrieved (${relevantHistory.length} messages):`);
  relevantHistory.forEach(m => {
    console.log(`  [${m.role}] ${m.message} (Intent: ${m.intent}, Topic: ${m.topic}, Keywords: [${m.keywords.join(", ")}])`);
  });

  // 5. Test Prompt Builder Formatting with the new signature
  console.log("\nTesting Prompt Builder Formatting...");
  const mockProfile = { name: "Pranjeet Goswami", company: "Nova Game" };
  const mockMemory = { summary: "Customer wants to build websites." };
  const currentMsg = "How much do your branding packages cost?";
  
  // Retrieve Business Knowledge
  const businessKnowledge = retrieveKnowledge(currentMsg);
  
  const finalPrompt = buildPrompt(currentMsg, mockProfile, mockMemory, relevantHistory, businessKnowledge, "pricing");
  
  console.log("\nFinal Built Messages Structure:");
  console.log(JSON.stringify(finalPrompt, null, 2));

  // 6. Clean up database
  console.log("\nCleaning up mock Firestore documents...");
  const finalMsgs = await db.collection("customers").doc(mockPhone).collection("messages").get();
  const cleanupBatch = db.batch();
  finalMsgs.docs.forEach((doc) => {
    cleanupBatch.delete(doc.ref);
  });
  await cleanupBatch.commit();
  console.log("Cleanup complete!");

  console.log("\n=== CONTEXT ANALYZER TESTING COMPLETE ===");
}

runTests().catch(console.error);
