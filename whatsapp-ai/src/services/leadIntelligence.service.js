import db from "../config/firebase.js";
import { askAI } from "../ai/gemini.js";
import { createGmailDraft } from "./gmail.service.js";

/**
 * Parses and extracts structured JSON from Ollama's response.
 */
function parseAIResponse(responseText) {
  try {
    return JSON.parse(responseText.trim());
  } catch (e) {
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0].trim());
      } catch (innerError) {
        console.error("[Lead Intelligence] JSON extraction failed:", responseText);
        throw innerError;
      }
    }
    throw e;
  }
}

/**
 * System prompt to guide the AI model in qualifying, extracting, scoring, and drafting emails.
 */
const SYSTEM_PROMPT = `You are an advanced Lead Intelligence AI assistant for Grox Studio (a premium software design and development agency).
Your task is to analyze an incoming WhatsApp message and determine if it represents a genuine business opportunity for Grox Studio.

Grox Studio provides premium services including:
- Software Agency / Development Agency
- Website Development & Mobile App Development
- AI Development & AI Automation (Chatbots, LLM workflows, CRM/ERP integrations)
- SaaS Product Development & Admin Dashboards
- UI/UX Design & Branding
- Digital Marketing & SEO
- Software Maintenance, Product Enhancement & Technical Audits
- Cloud Migration & DevOps

QUALIFICATION RULES:
- QUALIFY messages where an external company or individual is explicitly looking to hire or contract Grox Studio for the agency services listed above.
- QUALIFY messages where a group member is forwarding or posting a clear client inquiry/lead from outside the group (e.g., copy-pasting an external request with contact information).
- STRICTLY IGNORE internal team discussions, updates, comments, queries, or chat between agency group members (e.g., discussing current code, assigning tasks, asking team members like "Pranjeet" if they checked something, or discussing project progress). This is internal chatter and NOT a new lead.
- IGNORE messages related to: hiring full-time/part-time employees, hiring freelancers, hiring interns, recruitment agencies, job openings/applications, resume/portfolio collections for jobs, educational courses, industry events, networking, promotions, giveaways, spam, or casual chatter.

SENDER CONTEXT:
You will be provided with the message sender's name and ID/phone. If the sender is an internal team member (e.g., "Pranjeet") and their message is conversational/directed at other team members rather than forwarding an external lead request, mark it as NOT a business opportunity (isBusinessOpportunity: false).

If a message is qualified, extract the details, calculate a Lead Score (0 to 100), generate a summary, and compose a personalized outreach email.

LEAD SCORING (0 to 100):
Generate a score considering:
1. Requirement clarity (vague vs detailed specs)
2. Project complexity (simple page vs complex dashboard/AI integration)
3. Agency explicitly requested (vs freelancer or general help)
4. Long-term potential (maintenance/enhancements)
5. Enterprise client (vs small project)
6. Budget mentioned/implied
7. Timeline mentioned/implied
8. Tech stack alignment
9. Contact information availability (email, phone, etc.)

OUTREACH EMAIL:
Generate a professional, personalized outreach email from the Grox Studio Outreach Team. The email body must be HTML-formatted (use <p>, <br>, <ul>, <li>, etc., but NO outer HTML page wrappers). Do not use generic placeholders like [Your Name] in the signature; sign off as "Grox Studio Team".

You MUST reply with a single, valid JSON object matching this schema exactly. Do not include any explanations or markdown wrappers outside the JSON structure.

JSON Schema:
{
  "isBusinessOpportunity": boolean,
  "extractedInfo": {
    "companyName": string or null,
    "clientName": string or null,
    "email": string or null,
    "phone": string or null,
    "website": string or null,
    "location": string or null,
    "industry": string or null,
    "requiredServices": string[] (list of services requested),
    "mentionedTechnologies": string[] (technologies listed in the message),
    "budget": string or null,
    "timeline": string or null,
    "priority": "Low" | "Medium" | "High",
    "leadCategory": string (the primary category of service, e.g., "AI Development", "Mobile App Development", "Website Development", "SaaS Development", "UI/UX Design", "Custom Software"),
    "projectSummary": string,
    "confidenceScore": number (0 to 100, representing your confidence in this qualification)
  },
  "leadScore": number (0 to 100),
  "aiSummary": string (concise summary of the lead, requirements, and highlights),
  "emailSubject": string (personalized subject line),
  "emailBody": string (HTML-formatted email draft body)
}
`;

/**
 * Retrieve the current configurable lead score threshold from Firestore settings.
 */
export async function getLeadThreshold() {
  try {
    const doc = await db.collection("settings").doc("lead_intelligence").get();
    if (doc.exists) {
      const data = doc.data();
      return typeof data.threshold === "number" ? data.threshold : 90;
    }
  } catch (error) {
    console.error("[Lead Intelligence] Error fetching threshold settings:", error.message);
  }
  return 90; // Default threshold
}

/**
 * Handle incoming WhatsApp messages from monitored groups.
 * Processes, qualifies, scores, writes to Firestore, and drafts emails.
 */
export async function handleLeadMessage(msg, groupName) {
  const text = msg.message.conversation || msg.message.extendedTextMessage?.text;
  if (!text) return;

  const senderName = msg.pushName || "Unknown";
  const senderJid = msg.key.participant || msg.key.remoteJid || "Unknown";

  console.log(`[Lead Intelligence] Processing message from "${senderName}" (${senderJid}) in group ${groupName}: "${text.substring(0, 60)}..."`);

  const messages = [
    { role: "system", content: SYSTEM_PROMPT },
    { 
      role: "user", 
      content: `Sender Name: ${senderName}\nSender ID/Phone: ${senderJid}\n\nAnalyze this message:\n\n${text}` 
    }
  ];

  try {
    const aiResponse = await askAI(messages);
    const parsed = parseAIResponse(aiResponse);

    if (!parsed.isBusinessOpportunity) {
      console.log("[Lead Intelligence] Message classified as NOT a business opportunity. Ignored.");
      return;
    }

    console.log("[Lead Intelligence] Business Opportunity Qualified! Extracting data...");

    const info = parsed.extractedInfo || {};
    const leadScore = parsed.leadScore || 50;
    const aiSummary = parsed.aiSummary || "";
    const emailSubject = parsed.emailSubject || "Project Discussion - Grox Studio";
    const emailBody = parsed.emailBody || "";
    const confidenceScore = info.confidenceScore || 70;

    // Fetch threshold settings
    const threshold = await getLeadThreshold();
    console.log(`[Lead Intelligence] Lead Score: ${leadScore}. Auto-draft Threshold: ${threshold}`);

    // Create Draft configuration
    let draftStatus = "Pending";
    let draftId = null;
    let draftError = null;

    if (leadScore >= threshold) {
      try {
        console.log(`[Lead Intelligence] Score ${leadScore} is >= Threshold ${threshold}. Creating Gmail Draft...`);
        const draftResult = await createGmailDraft(info.email || "", emailSubject, emailBody);
        draftId = draftResult.id;
        draftStatus = "Created";
      } catch (err) {
        console.error("[Lead Intelligence] Failed to create automated Gmail draft:", err.message);
        draftStatus = "Pending"; // Left as pending for manual creation later
        draftError = err.message;
      }
    }

    // Save lead in Firestore
    const leadData = {
      companyName: info.companyName || "Unknown Company",
      clientName: info.clientName || "Unknown Client",
      email: info.email || "",
      phone: info.phone || "",
      website: info.website || "",
      location: info.location || "",
      industry: info.industry || "",
      requiredServices: info.requiredServices || [],
      mentionedTechnologies: info.mentionedTechnologies || [],
      budget: info.budget || "Not Specified",
      timeline: info.timeline || "Not Specified",
      priority: info.priority || "Medium",
      leadCategory: info.leadCategory || "Custom Software",
      projectSummary: info.projectSummary || text.substring(0, 150),
      confidenceScore: confidenceScore,
      leadScore: leadScore,
      aiSummary: aiSummary,
      emailSubject: emailSubject,
      emailBody: emailBody,
      status: "New",
      draftStatus: draftStatus,
      draftId: draftId,
      draftError: draftError,
      originalWhatsAppGroup: groupName,
      originalMessage: text,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const docRef = await db.collection("leads").add(leadData);
    console.log(`[Lead Intelligence] Successfully saved lead in Firestore. ID: ${docRef.id}`);
    return docRef.id;

  } catch (error) {
    console.error("[Lead Intelligence] Error processing lead pipeline:", error.message || error);
  }
}

/**
 * Regenerate email for a lead and save it to Firestore.
 */
export async function regenerateLeadEmail(leadId) {
  try {
    const docRef = db.collection("leads").doc(leadId);
    const doc = await docRef.get();
    if (!doc.exists) {
      throw new Error(`Lead document with ID ${leadId} not found`);
    }

    const data = doc.data();
    const prompt = `You are a Lead outreach writer for Grox Studio.
We have this qualified business lead:
- Category: ${data.leadCategory}
- Company: ${data.companyName}
- Client Name: ${data.clientName}
- Services Requested: ${data.requiredServices?.join(", ")}
- Technologies Mentioned: ${data.mentionedTechnologies?.join(", ")}
- Project Summary: ${data.projectSummary}
- Original Message: ${data.originalMessage}

Write a highly personalized, professional outreach email proposing a call with Grox Studio.
Format your output ONLY as a JSON object matching this schema. No explanation or codeblocks.

Schema:
{
  "emailSubject": "String subject line",
  "emailBody": "HTML formatted body content (use <p>, <br>, etc., but no outer html page wrappers)"
}`;

    const aiResponse = await askAI([
      { role: "system", content: "You respond strictly in JSON matching the requested schema." },
      { role: "user", content: prompt }
    ]);

    const parsed = parseAIResponse(aiResponse);
    const updates = {
      emailSubject: parsed.emailSubject || "Project Discussion - Grox Studio",
      emailBody: parsed.emailBody || "",
      updatedAt: new Date()
    };

    await docRef.update(updates);
    console.log(`[Lead Intelligence] Regenerated email for lead: ${leadId}`);
    return updates;
  } catch (error) {
    console.error("[Lead Intelligence] Error regenerating email:", error.message);
    throw error;
  }
}

/**
 * Manually create a Gmail draft for a lead.
 */
export async function createDraftForLead(leadId) {
  try {
    const docRef = db.collection("leads").doc(leadId);
    const doc = await docRef.get();
    if (!doc.exists) {
      throw new Error(`Lead document with ID ${leadId} not found`);
    }

    const data = doc.data();
    if (data.draftStatus === "Created" && data.draftId) {
      console.log(`[Lead Intelligence] Draft already exists for lead: ${leadId} (ID: ${data.draftId})`);
      return { draftId: data.draftId, draftStatus: "Created" };
    }

    console.log(`[Lead Intelligence] Manually creating Gmail Draft for lead: ${leadId}`);
    const draftResult = await createGmailDraft(data.email || "", data.emailSubject, data.emailBody);
    
    const updates = {
      draftId: draftResult.id,
      draftStatus: "Created",
      draftError: null,
      updatedAt: new Date()
    };

    await docRef.update(updates);
    console.log(`[Lead Intelligence] Lead draft status updated to Created. Draft ID: ${draftResult.id}`);
    return updates;
  } catch (error) {
    console.error("[Lead Intelligence] Error manually creating draft:", error.message);
    
    // Update draft error on lead
    await db.collection("leads").doc(leadId).update({
      draftError: error.message,
      updatedAt: new Date()
    });
    throw error;
  }
}
