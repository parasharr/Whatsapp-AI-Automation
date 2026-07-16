import dotenv from "dotenv";
dotenv.config();

import db from "./config/firebase.js";
import { detectMeetingIntent, MEETING_PHRASES } from "./meeting/meeting.detector.js";
import { validateMeetingDraft, parseTime } from "./meeting/meeting.validator.js";
import { setMockCalendarClient } from "./meeting/calendar.service.js";
import {
  handleMeetingFlow,
  getMeetingDraft,
  deleteMeetingDraft,
  saveMeetingDraft
} from "./meeting/meeting.service.js";

async function runTests() {
  console.log("=== STARTING PHASE 6 GOOGLE MEET SCHEDULING TESTS ===");

  const mockPhone = "7777777777";
  const mockJid = `${mockPhone}@s.whatsapp.net`;
  
  // Clean up any stale test documents in Firestore
  console.log("Cleaning up Firestore test data...");
  await deleteMeetingDraft(mockPhone);
  
  const oldMeetings = await db.collection("meetings")
    .where("phone", "==", mockPhone)
    .get();
  if (!oldMeetings.empty) {
    const batch = db.batch();
    oldMeetings.docs.forEach(doc => batch.delete(doc.ref));
    await batch.commit();
  }
  
  const oldMessages = await db.collection("customers").doc(mockPhone).collection("messages").get();
  if (!oldMessages.empty) {
    const batch = db.batch();
    oldMessages.docs.forEach(doc => batch.delete(doc.ref));
    await batch.commit();
  }

  // 1. Intent Detection Verification
  console.log("\n--- Verification: Intent Detection ---");
  for (const phrase of MEETING_PHRASES) {
    const text = `I would like to ${phrase} with you guys.`;
    const detected = detectMeetingIntent(text);
    console.log(`Phrase: "${phrase}" -> ${detected ? "PASSED" : "FAILED"}`);
    if (!detected) throw new Error(`Intent not detected for: ${phrase}`);
  }

  // 2. Validation Verification (Past and Impossible dates/times)
  console.log("\n--- Verification: Date & Time Validator ---");
  
  // Mock current local date: 2026-07-15. Current local time: 11:00 AM
  const impossible = { customerName: "Test", preferredDate: "2026-02-30", preferredTime: "3:00 PM" };
  const pastDate = { customerName: "Test", preferredDate: "2026-07-14", preferredTime: "3:00 PM" };
  const pastTime = { customerName: "Test", preferredDate: "2026-07-15", preferredTime: "9:00 AM" }; // past today (current is 11:00 AM)
  const validFuture = { customerName: "Test", preferredDate: "2026-07-16", preferredTime: "3:00 PM" };

  const resImpossible = validateMeetingDraft(impossible);
  console.log("2026-02-30 (Impossible) -> Invalid Fields:", resImpossible.invalidFields);
  if (!resImpossible.invalidFields.includes("preferredDate")) throw new Error("Should flag impossible date");

  const resPastDate = validateMeetingDraft(pastDate);
  console.log("2026-07-14 (Past Date) -> Invalid Fields:", resPastDate.invalidFields);
  if (!resPastDate.invalidFields.includes("preferredDate")) throw new Error("Should flag past date");

  // Since test time runs live, let's verify pastTime checks relative to actual system clock.
  // We check that our validator catches a time set to 1 hour ago.
  const d = new Date();
  const tzString = d.toLocaleString("en-US", { timeZone: "Asia/Kolkata" });
  const localDate = new Date(tzString);
  const oneHourAgo = new Date(localDate.getTime() - 60 * 60 * 1000);
  const hour = oneHourAgo.getHours();
  const min = oneHourAgo.getMinutes();
  const ampm = hour >= 12 ? "PM" : "AM";
  const formattedHour = hour % 12 === 0 ? 12 : hour % 12;
  const timeStringAgo = `${formattedHour}:${String(min).padStart(2, "0")} ${ampm}`;
  
  const yyyy = localDate.getFullYear();
  const mm = String(localDate.getMonth() + 1).padStart(2, '0');
  const dd = String(localDate.getDate()).padStart(2, '0');
  const todayStr = `${yyyy}-${mm}-${dd}`;

  const resPastTime = validateMeetingDraft({
    customerName: "Test",
    preferredDate: todayStr,
    preferredTime: timeStringAgo
  });
  console.log(`Today at ${timeStringAgo} (Past Time today) -> Invalid Fields:`, resPastTime.invalidFields);
  if (!resPastTime.invalidFields.includes("preferredTime")) throw new Error("Should flag past time today");

  const resValid = validateMeetingDraft(validFuture);
  console.log("Future valid booking -> Invalid:", resValid.invalidFields, "Missing:", resValid.missingFields);
  if (resValid.invalidFields.length > 0 || resValid.missingFields.length > 0) {
    throw new Error("Valid booking was flagged incorrectly");
  }

  // 3. Mock Google Calendar client setup
  const mockCalendar = {
    events: {
      list: async ({ calendarId, timeMin, timeMax }) => {
        // Mock a busy slot on 2026-07-16 from 15:00:00+05:30 to 15:30:00+05:30 (3:00 PM to 3:30 PM)
        const busyStart = new Date("2026-07-16T15:00:00+05:30").getTime();
        const busyEnd = new Date("2026-07-16T15:30:00+05:30").getTime();
        
        const reqStart = new Date(timeMin).getTime();
        const reqEnd = new Date(timeMax).getTime();
        
        const overlaps = Math.max(reqStart, busyStart) < Math.min(reqEnd, busyEnd);
        
        if (overlaps) {
          return {
            data: {
              items: [
                {
                  id: "occupied-event-id",
                  status: "confirmed",
                  summary: "Occupied Slot"
                }
              ]
            }
          };
        }
        return { data: { items: [] } };
      },
      insert: async ({ calendarId, resource }) => {
        return {
          data: {
            id: "event-12345",
            htmlLink: "https://calendar.google.com/event?id=event-12345",
            conferenceData: {
              entryPoints: [
                {
                  entryPointType: "video",
                  uri: "https://meet.google.com/xyz-pdqr-abc"
                }
              ]
            }
          }
        };
      }
    }
  };

  setMockCalendarClient(mockCalendar);
  console.log("\nMock Google Calendar client configured.");

  // Mock socket object
  const mockSock = {
    sendPresenceUpdate: async (presence, remoteJid) => {
      console.log(`[Mock WhatsApp JID: ${remoteJid}] Presence status updated to: ${presence}`);
    },
    sendMessage: async (remoteJid, content) => {
      console.log(`[Mock WhatsApp JID: ${remoteJid}] Message Content:\n${content.text}`);
      return { key: { id: "mock-message-id" } };
    }
  };

  const mockProfile = {
    name: "Aria Sterling",
    company: "Apex Media",
    projectType: "Marketing Campaign"
  };

  // 4. Test Scenario: Occupied Slot (Should trigger suggestions and reset draft date/time)
  console.log("\n--- Scenario: Requested Slot is Busy (Suggest slots) ---");
  const msgBusy = "I want to schedule a project discussion on 2026-07-16 at 3:00 PM.";
  console.log(`User Input: "${msgBusy}"`);
  
  const handledBusy = await handleMeetingFlow(mockSock, mockJid, msgBusy, mockProfile);
  console.log(`Flow handled: ${handledBusy}`);
  if (!handledBusy) throw new Error("Busy flow not handled");

  const draftBusy = await getMeetingDraft(mockPhone);
  console.log("Draft state in Firestore after busy slot:", JSON.stringify(draftBusy, null, 2));
  if (draftBusy.preferredDate !== null || draftBusy.preferredTime !== null) {
    throw new Error("Draft should clear busy preferredDate and preferredTime to collect suggestions");
  }

  // 5. Test Scenario: Available Slot (Should book event, create Meet, save to Firestore, send confirmation)
  console.log("\n--- Scenario: Booking a Free Slot (Success) ---");
  const msgFree = "Let's do 2026-07-16 at 3:30 PM";
  console.log(`User Input: "${msgFree}"`);

  const handledFree = await handleMeetingFlow(mockSock, mockJid, msgFree, mockProfile);
  console.log(`Flow handled: ${handledFree}`);
  if (!handledFree) throw new Error("Free flow not handled");

  const draftFinal = await getMeetingDraft(mockPhone);
  console.log("Draft state in Firestore (should be null):", draftFinal);
  if (draftFinal !== null) throw new Error("Draft should be deleted upon booking");

  // Verify Firestore 'meetings' collection
  const meetingsSnapshot = await db.collection("meetings")
    .where("phone", "==", mockPhone)
    .get();

  console.log(`Meetings saved in database: ${meetingsSnapshot.size}`);
  if (meetingsSnapshot.size !== 1) throw new Error("Should have created exactly one meeting record");

  const meetingRecord = meetingsSnapshot.docs[0].data();
  console.log("Firestore Saved Meeting Record:", JSON.stringify(meetingRecord, null, 2));

  if (meetingRecord.googleEventId !== "event-12345") throw new Error("Event ID mismatch");
  if (meetingRecord.googleMeetLink !== "https://meet.google.com/xyz-pdqr-abc") throw new Error("Meet link mismatch");
  if (meetingRecord.status !== "scheduled") throw new Error("Status should be scheduled");
  if (meetingRecord.organizer !== "info.groxstudio@gmail.com") throw new Error("Organizer email incorrect");
  if (meetingRecord.customerName !== "Aria Sterling") throw new Error("Name mismatch");
  if (meetingRecord.company !== "Apex Media") throw new Error("Company mismatch");

  // Clean up database
  console.log("\nCleaning up final mock documents...");
  await db.collection("meetings").doc(meetingsSnapshot.docs[0].id).delete();
  
  const mockMessages = await db.collection("customers").doc(mockPhone).collection("messages").get();
  const cleanupBatch = db.batch();
  mockMessages.docs.forEach((doc) => {
    cleanupBatch.delete(doc.ref);
  });
  await cleanupBatch.commit();
  console.log("Cleanup complete!");

  console.log("\n=== ALL GOOGLE CALENDAR MEET SCHEDULING TESTS PASSED ===");
}

runTests().catch((err) => {
  console.error("\n❌ TESTS FAILED:", err);
  process.exit(1);
});
