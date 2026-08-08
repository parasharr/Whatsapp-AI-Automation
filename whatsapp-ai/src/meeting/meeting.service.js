import db from "../config/firebase.js";
import { askAI } from "../ai/gemini.js";
import { detectMeetingIntent } from "./meeting.detector.js";
import { validateMeetingDraft, parseTime, getTodayKolkata } from "./meeting.validator.js";
import { checkCalendarAvailability, createCalendarEvent } from "./calendar.service.js";
import { findNextAvailableSlots, formatSlotKolkata } from "./availability.service.js";
import {
  processUserMessage,
  processAssistantMessage,
} from "../conversation/conversation.service.js";

/**
 * Retrieves the active meeting draft from Firestore.
 * @param {string} phone - User phone number.
 * @returns {Promise<Object|null>} - Draft data or null.
 */
export async function getMeetingDraft(phone) {
  try {
    const doc = await db.collection("meeting_drafts").doc(phone).get();
    if (doc.exists) {
      return doc.data();
    }
    return null;
  } catch (error) {
    console.error(`[Meeting Service] Error getting draft for ${phone}:`, error.message);
    return null;
  }
}

/**
 * Saves/updates the meeting draft in Firestore.
 * @param {string} phone - User phone number.
 * @param {Object} draftData - Draft details.
 */
export async function saveMeetingDraft(phone, draftData) {
  try {
    await db.collection("meeting_drafts").doc(phone).set({
      ...draftData,
      updatedAt: new Date()
    }, { merge: true });
  } catch (error) {
    console.error(`[Meeting Service] Error saving draft for ${phone}:`, error.message);
  }
}

/**
 * Deletes the meeting draft from Firestore.
 * @param {string} phone - User phone number.
 */
export async function deleteMeetingDraft(phone) {
  try {
    await db.collection("meeting_drafts").doc(phone).delete();
  } catch (error) {
    console.error(`[Meeting Service] Error deleting draft for ${phone}:`, error.message);
  }
}

/**
 * Stores the final meeting in the meetings collection.
 * @param {Object} meetingData - Final meeting details.
 * @returns {Promise<string>} - The document ID of the created meeting.
 */
export async function saveMeeting(meetingData) {
  try {
    const docRef = await db.collection("meetings").add({
      ...meetingData,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    return docRef.id;
  } catch (error) {
    console.error("[Meeting Service] Error saving meeting:", error.message);
    throw error;
  }
}

/**
 * Extracts structured meeting fields from a user message using Ollama.
 * @param {string} userMessage - Raw message from the user.
 * @returns {Promise<Object>} - Extracted fields.
 */
export async function extractMeetingDetails(userMessage) {
  const localTimeStr = new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" });
  const prompt = `You are a meeting details extraction assistant.
Analyze the following user message to extract meeting/consultation details.
Current Date/Time Reference: ${localTimeStr}

User Message: "${userMessage}"

Extract the following fields. If a field is not present or cannot be determined, return null.
1. customerName: The name of the customer, if mentioned in the message (e.g. "My name is John").
2. company: The customer's company, if mentioned.
3. projectType: The type of project they want to discuss, if mentioned (e.g. mobile app, website, SEO, dashboard).
4. preferredDate: The preferred date for the meeting. If the user uses relative expressions like "tomorrow", "next Monday", "Friday", calculate the absolute date in YYYY-MM-DD format based on the Current Date/Time Reference. If no date is mentioned, return null.
5. preferredTime: The preferred time or timeframe for the meeting (e.g. "3 PM", "10:30 AM", "afternoon"). If no time is mentioned, return null.
6. meetingPurpose: Any additional context, description of what they want to discuss, or purpose of the meeting.

Return ONLY a valid JSON object matching this structure:
{
  "customerName": string | null,
  "company": string | null,
  "projectType": string | null,
  "preferredDate": string | null,
  "preferredTime": string | null,
  "meetingPurpose": string | null
}`;

  try {
    const responseText = await askAI(
      [
        {
          role: "system",
          content: "You are a precise data extraction agent. You output JSON only."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      { format: "json" }
    );

    return JSON.parse(responseText);
  } catch (error) {
    console.error("[Meeting Service] Error extracting meeting details:", error.message);
    return {
      customerName: null,
      company: null,
      projectType: null,
      preferredDate: null,
      preferredTime: null,
      meetingPurpose: null
    };
  }
}

/**
 * Handles the meeting booking flow for incoming messages.
 * No business logic inside the WhatsApp message handler.
 * All Firestore operations should go through meeting.service.js.
 * 
 * @param {Object} sock - Baileys socket object.
 * @param {string} remoteJid - Customer's WhatsApp JID.
 * @param {string} text - Raw user message.
 * @param {Object} profile - Customer's current profile from Firestore.
 * @returns {Promise<boolean>} - True if message was handled by meeting flow, false otherwise.
 */
export async function handleMeetingFlow(sock, remoteJid, text, profile) {
  const phoneNumber = remoteJid.replace("@s.whatsapp.net", "");
  
  // 1. Check if draft exists
  let draft = await getMeetingDraft(phoneNumber);
  const intentDetected = detectMeetingIntent(text);
  
  // 2. If no active draft and intent is not detected, this is not a meeting flow message
  if (!draft && !intentDetected) {
    return false;
  }
  
  // Show typing indicator on WhatsApp
  await sock.sendPresenceUpdate("composing", remoteJid);
  
  // 3. Log Meeting Intent Detected
  if (!draft) {
    console.log("✓ Meeting Intent Detected");
  }
  
  // 4. Extract details from current turn
  const extracted = await extractMeetingDetails(text);

  // Log extracted fields if valid
  if (extracted.preferredDate && extracted.preferredDate !== "null") {
    // Only log if it's not a past/impossible date
    const parts = extracted.preferredDate.split("-");
    if (parts.length === 3) {
      console.log("✓ Date Collected");
    }
  }
  if (extracted.preferredTime && extracted.preferredTime !== "null") {
    console.log("✓ Time Collected");
  }
  
  // 5. Initialize or merge draft
  if (!draft) {
    draft = {
      customerId: remoteJid,
      phone: phoneNumber,
      customerName: extracted.customerName || (profile && profile.name) || null,
      company: extracted.company || (profile && profile.company) || null,
      projectType: extracted.projectType || (profile && profile.projectType) || null,
      preferredDate: extracted.preferredDate,
      preferredTime: extracted.preferredTime,
      meetingPurpose: extracted.meetingPurpose || null
    };
  } else {
    // Merge new extracted fields if they are not null
    draft.customerName = extracted.customerName || draft.customerName || (profile && profile.name) || null;
    draft.company = extracted.company || draft.company || (profile && profile.company) || null;
    draft.projectType = extracted.projectType || draft.projectType || (profile && profile.projectType) || null;
    draft.preferredDate = extracted.preferredDate || draft.preferredDate || null;
    draft.preferredTime = extracted.preferredTime || draft.preferredTime || null;
    if (extracted.meetingPurpose) {
      draft.meetingPurpose = draft.meetingPurpose ? `${draft.meetingPurpose}\n${extracted.meetingPurpose}` : extracted.meetingPurpose;
    }
  }
  
  // 6. Validate required fields
  let { missingFields, invalidFields } = validateMeetingDraft(draft);
  
  let replyText = "";
  
  // If there are invalid fields, notify customer and request them again
  if (invalidFields.length > 0) {
    // Reset invalid fields in the draft
    if (invalidFields.includes("preferredDate")) {
      draft.preferredDate = null;
    }
    if (invalidFields.includes("preferredTime")) {
      draft.preferredTime = null;
    }
    await saveMeetingDraft(phoneNumber, draft);

    replyText = "I'm sorry, but that date or time is invalid or is in the past. Could you please specify a valid future date and time for our meeting?";
    
    // Send response and return
    await sendReply(sock, remoteJid, text, replyText);
    return true;
  }
  
  // If required fields are missing, ask for them
  if (missingFields.length > 0) {
    await saveMeetingDraft(phoneNumber, draft);
    
    const promptList = [];
    if (missingFields.includes("customerName")) {
      promptList.push("your name");
    }
    if (missingFields.includes("preferredDate")) {
      promptList.push("preferred date (e.g. tomorrow, next Monday, YYYY-MM-DD)");
    }
    if (missingFields.includes("preferredTime")) {
      promptList.push("preferred time (e.g. 3 PM, 10 AM)");
    }
    
    if (promptList.length === 1) {
      replyText = `Could you please provide ${promptList[0]} for the meeting?`;
    } else {
      replyText = `To schedule your consultation, could you please provide:\n${promptList.map(item => `- ${item}`).join("\n")}`;
    }
    
    await sendReply(sock, remoteJid, text, replyText);
    return true;
  }
  
  // All required fields are present and valid. Let's calculate slot availability
  try {
    const time = parseTime(draft.preferredTime);
    const parts = draft.preferredDate.split("-");
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    
    // Construct local Date objects for Asia/Kolkata
    const isoStartStr = `${draft.preferredDate}T${String(time.hours).padStart(2, '0')}:${String(time.minutes).padStart(2, '0')}:00+05:30`;
    const startTime = new Date(isoStartStr);
    const endTime = new Date(startTime.getTime() + 30 * 60 * 1000); // 30 mins duration
    
    // Check Calendar Availability
    const isAvailable = await checkCalendarAvailability(startTime, endTime);
    
    if (isAvailable) {
      console.log("✓ Slot Available");
      
      // Create Calendar Event with Google Meet
      const eventData = {
        customerName: draft.customerName,
        projectType: draft.projectType,
        notes: draft.meetingPurpose,
        startTime,
        endTime
      };
      
      const eventResult = await createCalendarEvent(eventData);
      
      // Save meeting to Firestore
      const finalMeeting = {
        customerId: draft.customerId,
        customerName: draft.customerName,
        phone: draft.phone,
        company: draft.company || "",
        projectType: draft.projectType || "",
        googleEventId: eventResult.googleEventId,
        googleMeetLink: eventResult.googleMeetLink,
        calendarLink: eventResult.calendarLink,
        organizer: "info.groxstudio@gmail.com",
        startTime,
        endTime,
        duration: 30,
        timezone: "Asia/Kolkata",
        meetingPurpose: draft.meetingPurpose || "Project Discussion",
        status: "scheduled"
      };
      
      await saveMeeting(finalMeeting);
      console.log("✓ Meeting Saved to Firestore");
      
      // Delete temporary draft
      await deleteMeetingDraft(phoneNumber);
      
      // Format success response
      const formattedDate = startTime.toLocaleDateString("en-US", {
        timeZone: "Asia/Kolkata",
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric"
      });
      const formattedTime = startTime.toLocaleTimeString("en-US", {
        timeZone: "Asia/Kolkata",
        hour: "numeric",
        minute: "2-digit",
        hour12: true
      });
      
      replyText = `Your meeting has been scheduled successfully.

Date:
${formattedDate}

Time:
${formattedTime}

Duration:
30 minutes

Meeting Link:
${eventResult.googleMeetLink}

The meeting has been scheduled with the Grox Studio team.

We look forward to speaking with you.`;
      
      await sendReply(sock, remoteJid, text, replyText);
      console.log("✓ Confirmation Sent");
    } else {
      // Slot is busy. Suggest next 3 available slots
      const alternateSlots = await findNextAvailableSlots(draft.preferredDate, draft.preferredTime);
      
      // Clear occupied date/time so they can pick one
      draft.preferredDate = null;
      draft.preferredTime = null;
      await saveMeetingDraft(phoneNumber, draft);
      
      if (alternateSlots.length > 0) {
        const slotsText = alternateSlots.map(slot => `• ${formatSlotKolkata(slot)}`).join("\n");
        replyText = `The requested time is unavailable.

Here are the next available slots:
${slotsText}

Please let me know which time works best.`;
      } else {
        replyText = "The requested time is unavailable. Could you please specify another date or time that works for you?";
      }
      
      await sendReply(sock, remoteJid, text, replyText);
    }
  } catch (error) {
    console.error("[Meeting Service] Error during booking flow:", error.message);
    
    // Graceful error response for Google Calendar API failures
    replyText = "I'm sorry, but I couldn't schedule the meeting at the moment due to a technical issue. Please try again in a few minutes or contact the Grox Studio team directly.";
    await sendReply(sock, remoteJid, text, replyText);
  }
  
  return true;
}

/**
 * Helper to save message history and send the WhatsApp reply.
 */
async function sendReply(sock, remoteJid, text, replyText) {
  // Save conversation messages to RAM + Firestore to sync history
  await processUserMessage(remoteJid, text, { intent: "meeting", topic: "booking" });
  await processAssistantMessage(remoteJid, replyText, { intent: "meeting", topic: "booking" });
  
  // Send message on WhatsApp
  console.log(`[WhatsApp] Sending reply to ${remoteJid}...`);
  await sock.sendMessage(remoteJid, { text: replyText });
  console.log(`[WhatsApp] Reply sent successfully!`);
  
  // Turn off typing indicator
  await sock.sendPresenceUpdate("paused", remoteJid);
}
