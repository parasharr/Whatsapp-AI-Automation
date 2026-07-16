import { getPromptByTitle, getPromptByIntent } from "./prompt.service.js";

/**
 * Dynamically builds the prompt message list for the AI engine.
 * Assembles System Instruction, Guardrails, Tone of Voice, Intent Prompt (if applicable),
 * Response Style, Verified Business Knowledge (top 3 max), Customer Profile, Customer Memory,
 * and Relevant Conversation Context in strict ordered sequence.
 *
 * @param {string} userMessage - Raw message content from the user.
 * @param {Object} profile - Customer profile data.
 * @param {Object} memory - Customer memory data.
 * @param {Object[]} relevantConversation - Selected relevant historical messages.
 * @param {Object[]} businessKnowledge - Retrieved business knowledge matching the turn.
 * @param {string} intent - The classified intent of the user message.
 * @returns {Object[]} - Assembled list of message objects for the Ollama chat endpoint.
 */
export function buildPrompt(userMessage, profile, memory, relevantConversation = [], businessKnowledge = [], intent = "") {
  // 1. Retrieve required and conditional prompts from service
  const systemPrompt = getPromptByTitle("System Instruction")?.content || "";
  const guardrailsPrompt = getPromptByTitle("Guardrails")?.content || "";
  const toneOfVoicePrompt = getPromptByTitle("Tone of Voice")?.content || "";
  const responseStylePrompt = getPromptByTitle("Response Style")?.content || "";
  const intentPromptObj = getPromptByIntent(intent);
  const intentPrompt = intentPromptObj?.content || "";

  // 2. Format Verified Business Knowledge Context (capped to Top 3 most relevant)
  const docsArray = Array.isArray(businessKnowledge) ? businessKnowledge : [];
  const top3Docs = docsArray.slice(0, 3);
  let knowledgeContent = "NO_KNOWLEDGE_FOUND: There is no matching business knowledge found for this query.";
  if (top3Docs.length > 0) {
    knowledgeContent = top3Docs
      .map(
        (doc) => `Title: ${doc.title}
Category: ${doc.category}
Content: ${doc.content}`
      )
      .join("\n\n");
  }

  const knowledgeSection = `====================================
VERIFIED BUSINESS KNOWLEDGE
<knowledge>
${knowledgeContent}
</knowledge>
====================================

CRITICAL DIRECTIVES:
1. The Verified Business Knowledge above is your ONLY source of truth regarding Grox Studio.
2. Never invent facts, services, pricing, technologies, clients, or company information.
3. Never use pretrained knowledge or mix Grox Studio with similarly named companies.
4. If the required information is not fully available in the Verified Business Knowledge, politely state that you do not have enough verified information and offer to connect them with the human team.`;

  // 3. Assemble prompt sections in strict sequential order
  const sections = [];

  // system instructions
  if (systemPrompt) sections.push(systemPrompt);

  // guardrails
  if (guardrailsPrompt) sections.push(guardrailsPrompt);

  // tone of voice
  if (toneOfVoicePrompt) sections.push(toneOfVoicePrompt);

  // intent based instruction (if applicable)
  if (intentPrompt) sections.push(intentPrompt);

  // response style (last behavioral guideline before knowledge)
  if (responseStylePrompt) sections.push(responseStylePrompt);

  // verified business knowledge
  sections.push(knowledgeSection);

  // customer profile
  const prof = profile || {};
  const mem = memory || {};

  const profileLines = [
    `Name: ${prof.name || ""}`,
    `Company: ${prof.company || ""}`,
    `Industry: ${prof.industry || ""}`,
    `Project Type: ${prof.projectType || ""}`,
    `Interested Services: ${Array.isArray(prof.interestedServices) ? prof.interestedServices.join(", ") : (prof.interestedServices || "")}`,
    `Budget: ${prof.budget || ""}`,
    `Timeline: ${prof.timeline || ""}`,
    `Language: ${prof.language || ""}`
  ];
  sections.push(`Customer Profile\n${profileLines.join("\n")}`);

  // customer memory (skip if empty)
  if (mem.summary && mem.summary.trim() !== "") {
    sections.push(`Customer Memory\n${mem.summary.trim()}`);
  }

  // relevant conversation (skip if empty)
  if (relevantConversation && relevantConversation.length > 0) {
    const historyText = relevantConversation
      .map((m) => {
        const sender = m.role === "user" ? "Customer" : "Assistant";
        return `[${sender}]: ${m.message}`;
      })
      .join("\n");

    sections.push(`========================
RELEVANT CONVERSATION CONTEXT (FOR HISTORICAL CONTEXT ONLY)
========================
<conversation_context>
${historyText}
</conversation_context>
========================
CRITICAL DIRECTIVE: Use the conversation history ONLY as reference for context (e.g. knowing what was discussed previously). Keep your answers relevant to the current user message.`);
  }

  const systemMessageContent = sections.join("\n\n");

  // 4. Print dynamic prompt details performance logging
  const alwaysLoadedLogs = [
    systemPrompt ? "✓ System Instruction" : "✗ System Instruction",
    guardrailsPrompt ? "✓ Guardrails" : "✗ Guardrails",
    toneOfVoicePrompt ? "✓ Tone of Voice" : "✗ Tone of Voice",
    responseStylePrompt ? "✓ Response Style" : "✗ Response Style"
  ].join("\n");

  const intentLog = intentPrompt ? `✓ ${intentPromptObj.title}` : "None";
  const memoryLog = memory && memory.summary && memory.summary.trim() !== "" ? "Loaded" : "Empty (Skipped)";
  const profileLog = profile && Object.keys(profile).length > 0 ? "Loaded" : "Empty";

  console.log("===== PROMPT =====");
  console.log("Always Loaded");
  console.log(alwaysLoadedLogs);
  console.log("Intent Prompt");
  console.log(intentLog);
  console.log("Knowledge");
  console.log(`${top3Docs.length} documents`);
  console.log("Conversation");
  console.log(`${relevantConversation.length} messages`);
  console.log("Profile");
  console.log(profileLog);
  console.log("Memory");
  console.log(memoryLog);
  console.log("Prompt Size");
  console.log(`${systemMessageContent.length} characters`);
  console.log("===================\n");

  return [
    {
      role: "system",
      content: systemMessageContent
    },
    {
      role: "user",
      content: userMessage
    }
  ];
}
