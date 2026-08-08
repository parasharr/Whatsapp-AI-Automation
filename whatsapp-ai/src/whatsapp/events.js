import { askAI } from "../ai/gemini.js";
import {
  processUserMessage,
  processAssistantMessage,
} from "../conversation/conversation.service.js";
import { buildPrompt } from "../prompt/prompt.builder.js";
import { formatResponse } from "../utils/responseFormatter.js";
import { getProfile, saveProfile, mergeProfile } from "../memory/profile.service.js";
import { getMemory, updateMemoryIfNeeded } from "../memory/memory.service.js";
import { performance } from "perf_hooks";

// Import context engine services
import { analyzeContext } from "../context-engine/contextAnalyzer.service.js";
import { findRelevantMessages } from "../context/conversation.selector.js";
import { retrieveKnowledge } from "../knowledge/retriever.js";
import { handleMeetingFlow } from "../meeting/meeting.service.js";
import { handleLeadMessage } from "../services/leadIntelligence.service.js";

// Cache to store resolved group JIDs -> subjects
const groupNameCache = new Map();

async function getGroupName(sock, jid) {
  if (!jid.endsWith("@g.us")) return "";
  if (groupNameCache.has(jid)) return groupNameCache.get(jid);
  try {
    const metadata = await sock.groupMetadata(jid);
    const subject = metadata?.subject || "";
    if (subject) {
      groupNameCache.set(jid, subject);
    }
    return subject;
  } catch (err) {
    console.error(`[WhatsApp] Failed to fetch group metadata for ${jid}:`, err.message);
    return "";
  }
}

export function registerEvents(sock) {
  sock.ev.on("messages.upsert", async ({ messages }) => {
    try {
      const msg = messages[0];

      if (!msg.message) return;

      if (msg.key.fromMe) return;

      const remoteJid = msg.key.remoteJid;
      const isGroup = remoteJid.endsWith("@g.us");

      // Intercept and handle monitored Leads group
      if (isGroup) {
        const groupSubject = await getGroupName(sock, remoteJid);
        if (groupSubject === "Leads - Grox Studio") {
          const text = msg.message.conversation || msg.message.extendedTextMessage?.text;
          if (text) {
            console.log(`[Lead Intelligence] Intercepted message in Leads group: ${groupSubject}`);
            handleLeadMessage(msg, groupSubject).catch((err) => {
              console.error("[Lead Intelligence] Error processing lead message:", err);
            });
          }
          return; // Strictly READ-ONLY. Bypass conversational responder.
        }
      }

      const text =
        msg.message.conversation ||
        msg.message.extendedTextMessage?.text;

      console.log("\n======================");
      console.log("Message From:", msg.key.remoteJid);
      console.log("Message:", text);
      console.log("======================\n");

      if (!text) return;

      // 1. Load customer profile & memory
      const profile = await getProfile(remoteJid);

      // Check if message is handled by the meeting request system flow
      const isMeetingFlowHandled = await handleMeetingFlow(sock, remoteJid, text, profile);
      if (isMeetingFlowHandled) {
        return; // Bypasses the rest of the message handling pipeline
      }

      const memory = await getMemory(remoteJid);

      // --- Start performance measurement ---
      const tStartAnalyzer = performance.now();
      // 2. Context Analyzer (Rule-based)
      const { intent, topic, keywords, profileUpdates, profileConfidences } = analyzeContext(text);
      const tEndAnalyzer = performance.now();

      const tStartKnowledge = performance.now();
      // 3. Knowledge Retrieval
      const businessKnowledge = retrieveKnowledge(text);
      const tEndKnowledge = performance.now();

      const tStartConversation = performance.now();
      // 4. Conversation Retrieval
      const relevantConversation = await findRelevantMessages(remoteJid, intent, topic, keywords);
      const tEndConversation = performance.now();

      const tStartPrompt = performance.now();
      // 5. Prompt Builder
      const promptMessages = buildPrompt(text, profile, memory, relevantConversation, businessKnowledge, intent);
      const tEndPrompt = performance.now();

      // Show typing indicator on WhatsApp
      await sock.sendPresenceUpdate("composing", remoteJid);

      const tStartLLM = performance.now();
      // 6. Gemini Flash (LLM) Response
      const reply = await askAI(promptMessages);
      const tEndLLM = performance.now();

      // Format response to remove Markdown for WhatsApp
      const formattedReply = formatResponse(reply);

      // Turn off typing indicator
      await sock.sendPresenceUpdate("paused", remoteJid);

      // 7. Reply immediately on WhatsApp
      console.log(`[WhatsApp] Sending reply to ${remoteJid}...`);
      await sock.sendMessage(remoteJid, {
        text: formattedReply,
      });
      console.log(`[WhatsApp] Reply sent successfully!`);

      // Print performance logs
      console.log("\n===== PERFORMANCE =====");
      console.log(`Context Analyzer          : ${Math.round(tEndAnalyzer - tStartAnalyzer)} ms`);
      console.log(`Knowledge Retrieval       : ${Math.round(tEndKnowledge - tStartKnowledge)} ms`);
      console.log(`Conversation Retrieval    : ${Math.round(tEndConversation - tStartConversation)} ms`);
      console.log(`Prompt Builder            : ${Math.round(tEndPrompt - tStartPrompt)} ms`);
      console.log(`Gemini Flash              : ${Math.round(tEndLLM - tStartLLM)} ms`);
      console.log("Reply Sent");
      console.log("Memory Update             : Background");
      console.log("=======================\n");

      // 8. Run Background Tasks asynchronously (without await)
      (async () => {
        const metadata = { intent, topic, keywords };

        // Save profile updates if any were rule-extracted, or initialize profile if not present
        let newProfile = profile || {};
        let shouldSave = false;

        if (!profile) {
          shouldSave = true;
        }

        if (profileUpdates && Object.keys(profileUpdates).length > 0) {
          // Filter high confidence updates only
          const highConfUpdates = {};
          for (const key of Object.keys(profileUpdates)) {
            const score = profileConfidences?.[key] || 0;
            if (score >= 0.8) {
              // Rule 4: Never overwrite an existing valid name unless a new valid self-introduction is detected.
              if (key === "name" && profile && profile.name && profile.name.trim() !== "") {
                const hasSelfIntro = text.match(/\bmy name is\b/i) ||
                                     text.match(/\bi'm\b/i) ||
                                     text.match(/\bi am\b/i) ||
                                     text.match(/\bcall me\b/i) ||
                                     text.match(/\bthis is\b/i);
                if (!hasSelfIntro) {
                  continue; // Do not overwrite existing name if current message has no self-introduction pattern
                }
              }
              highConfUpdates[key] = profileUpdates[key];
            }
          }

          if (Object.keys(highConfUpdates).length > 0) {
            newProfile = mergeProfile(newProfile, highConfUpdates);
            if (profile) {
              for (const key of Object.keys(newProfile)) {
                if (JSON.stringify(newProfile[key]) !== JSON.stringify(profile[key])) {
                  shouldSave = true;
                  break;
                }
              }
            } else {
              shouldSave = true;
            }
          }
        }

        if (shouldSave) {
          newProfile.lastInteraction = new Date();
          await saveProfile(remoteJid, newProfile);
          console.log("✓ Profile Updated");
        }

        // Save conversation history to RAM + Firestore
        const conversation = await processUserMessage(remoteJid, text, metadata);
        await processAssistantMessage(remoteJid, formattedReply, metadata);

        // Update memory if criteria are met
        await updateMemoryIfNeeded(remoteJid, profile || {}, newProfile || {}, memory, conversation);
      })().catch((err) => {
        console.error("[Background Tasks] Error executing updates:", err);
      });

    } catch (err) {
      console.error("❌ Error handling message:", err);
    }
  });
}