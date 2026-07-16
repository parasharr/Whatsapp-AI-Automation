import { google } from "googleapis";

let gmailInstance = null;

/**
 * Clean environment variable values to avoid quoting issues.
 */
const cleanEnvVal = (val) => {
  if (!val) return "";
  return val.trim().replace(/^['"]|['"]$/g, "");
};

/**
 * Instantiates and returns the authorized Google Gmail API client.
 * @returns {Object|null} - Authorized google.gmail client or null if env not configured.
 */
export function getGmailClient() {
  if (gmailInstance) return gmailInstance;

  const clientId = cleanEnvVal(process.env.GOOGLE_CLIENT_ID);
  const clientSecret = cleanEnvVal(process.env.GOOGLE_CLIENT_SECRET);
  const redirectUri = cleanEnvVal(process.env.GOOGLE_REDIRECT_URI);
  const refreshToken = cleanEnvVal(process.env.GOOGLE_REFRESH_TOKEN);

  if (!clientId || !clientSecret || !refreshToken) {
    console.warn("[Gmail Service] Google OAuth credentials are not fully configured in environment.");
    return null;
  }

  try {
    const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
    oauth2Client.setCredentials({ refresh_token: refreshToken });

    gmailInstance = google.gmail({ version: "v1", auth: oauth2Client });
    return gmailInstance;
  } catch (error) {
    console.error("[Gmail Service] Error creating Google auth client for Gmail:", error.message);
    return null;
  }
}

/**
 * Creates a Gmail draft.
 * @param {string} toEmail - Recipient email.
 * @param {string} subject - Email subject.
 * @param {string} htmlBody - HTML content for the body.
 * @returns {Promise<Object>} - The Gmail API draft object response.
 */
export async function createGmailDraft(toEmail, subject, htmlBody) {
  const gmail = getGmailClient();
  if (!gmail) {
    throw new Error("Gmail API client is not configured");
  }

  // Format recipient and content safely
  const recipient = toEmail ? toEmail.trim() : "";
  const emailSubject = subject ? subject.trim() : "Outreach from Grox Studio";

  // Build a RFC 2822 compliant raw MIME message
  const emailLines = [
    `To: ${recipient}`,
    `Subject: ${emailSubject}`,
    "MIME-Version: 1.0",
    "Content-Type: text/html; charset=utf-8",
    "",
    htmlBody
  ];

  const rawMessage = Buffer.from(emailLines.join("\r\n"))
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  try {
    const response = await gmail.users.drafts.create({
      userId: "me",
      requestBody: {
        message: {
          raw: rawMessage,
        },
      },
    });

    console.log(`✓ Gmail Draft Created: ${response.data.id}`);
    return response.data;
  } catch (error) {
    console.error("[Gmail Service] Failed to create draft:", error.message || error);
    throw error;
  }
}
