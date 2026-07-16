import dotenv from "dotenv";
dotenv.config();

import { handleLeadMessage, getLeadThreshold } from "./services/leadIntelligence.service.js";
import db from "./config/firebase.js";

async function verifyLeadIntelligence() {
  console.log("==================================================");
  console.log("🚀 STARTING LEAD INTELLIGENCE VERIFICATION TEST");
  console.log("==================================================\n");

  const qualifiedMessage = {
    message: {
      conversation: "Hey Grox Studio! We are looking for an expert software development agency to build a premium SaaS admin dashboard for our real-estate startup, Apex Rentals. Our budget is around $15,000, and we want to launch it in 2 months. We want to use React and Node.js. Please contact our product head, Rohan, at rohan@apexrentals.co or call him at +91 9876543210. Our site is apexrentals.co. We need long term maintenance too."
    },
    key: {
      remoteJid: "1203633123456789@g.us",
      fromMe: false
    }
  };

  const ignoredMessage = {
    message: {
      conversation: "Hello, I am a junior frontend developer with 1 year experience in React. I am looking for full-time job openings or internships at your company. Here is my resume. Please check my portfolio: portfolio.com/john. Are you currently hiring?"
    },
    key: {
      remoteJid: "1203633123456789@g.us",
      fromMe: false
    }
  };

  const groupName = "Leads - Grox Studio";

  // 1. Check current threshold setting
  const threshold = await getLeadThreshold();
  console.log(`[Test] Current Lead Auto-Draft Threshold: ${threshold}\n`);

  // 2. Test Ignored message flow
  console.log("[Test 1] Processing non-qualifying message (should be ignored)...");
  
  // Track existing documents to make sure nothing new is written
  const snapshotBeforeIgnore = await db.collection("leads").get();
  const countBeforeIgnore = snapshotBeforeIgnore.size;

  await handleLeadMessage(ignoredMessage, groupName);

  const snapshotAfterIgnore = await db.collection("leads").get();
  const countAfterIgnore = snapshotAfterIgnore.size;

  if (countBeforeIgnore === countAfterIgnore) {
    console.log("✅ Success: Non-qualifying message was correctly ignored and not saved to database.\n");
  } else {
    console.error("❌ Failure: Ignored message caused a new entry in Firestore!\n");
  }

  // 3. Test Qualified message flow
  console.log("[Test 2] Processing qualifying message...");
  
  const leadId = await handleLeadMessage(qualifiedMessage, groupName);

  if (leadId) {
    console.log(`✅ Success: Message qualified and saved in Firestore. Lead ID: ${leadId}`);
    
    // Retrieve and verify document
    const doc = await db.collection("leads").doc(leadId).get();
    const data = doc.data();
    
    console.log("\n--- Extracted Firestore Lead Fields ---");
    console.log(`- Company:      ${data.companyName}`);
    console.log(`- Client Name:  ${data.clientName}`);
    console.log(`- Category:     ${data.leadCategory}`);
    console.log(`- Score:        ${data.leadScore}`);
    console.log(`- Priority:     ${data.priority}`);
    console.log(`- Services:     ${data.requiredServices?.join(", ")}`);
    console.log(`- Technologies: ${data.mentionedTechnologies?.join(", ")}`);
    console.log(`- Email:        ${data.email}`);
    console.log(`- Phone:        ${data.phone}`);
    console.log(`- Website:      ${data.website}`);
    console.log(`- Budget:       ${data.budget}`);
    console.log(`- Timeline:     ${data.timeline}`);
    console.log(`- Draft Status: ${data.draftStatus}`);
    console.log(`- Draft ID:     ${data.draftId || "None"}`);
    if (data.draftError) {
      console.log(`- Draft Error:  ${data.draftError}`);
    }
    console.log("---------------------------------------\n");

    // Clean up created test lead
    console.log("[Test Cleanup] Deleting test lead from Firestore...");
    await db.collection("leads").doc(leadId).delete();
    console.log("✅ Test lead successfully cleaned up.");
  } else {
    console.error("❌ Failure: Qualifying message failed to be processed or qualified!\n");
  }

  console.log("\n==================================================");
  console.log("🎉 LEAD INTELLIGENCE VERIFICATION TEST COMPLETE");
  console.log("==================================================");
}

verifyLeadIntelligence().catch(console.error);
