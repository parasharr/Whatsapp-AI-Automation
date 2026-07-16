import { google } from "googleapis";

let calendarInstance = null;

/**
 * Instantiates and returns the authorized Google Calendar API client.
 * @returns {Object|null} - Authorized google.calendar client or null if env not configured.
 */
export function getCalendarClient() {
  if (calendarInstance) return calendarInstance;

  const cleanEnvVal = (val) => {
    if (!val) return "";
    return val.trim().replace(/^['"]|['"]$/g, "");
  };

  const clientId = cleanEnvVal(process.env.GOOGLE_CLIENT_ID);
  const clientSecret = cleanEnvVal(process.env.GOOGLE_CLIENT_SECRET);
  const redirectUri = cleanEnvVal(process.env.GOOGLE_REDIRECT_URI);
  const refreshToken = cleanEnvVal(process.env.GOOGLE_REFRESH_TOKEN);

  if (!clientId || !clientSecret || !refreshToken) {
    console.warn("[Calendar Service] Google OAuth credentials are not fully configured in environment.");
    return null;
  }

  try {
    const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
    oauth2Client.setCredentials({ refresh_token: refreshToken });

    calendarInstance = google.calendar({ version: "v3", auth: oauth2Client });
    return calendarInstance;
  } catch (error) {
    console.error("[Calendar Service] Error creating Google auth client:", error.message);
    return null;
  }
}

/**
 * Checks if the primary Google Calendar has any events booked in the specified range.
 * @param {Date} startTime - The start Date object.
 * @param {Date} endTime - The end Date object.
 * @returns {Promise<boolean>} - True if the slot is unoccupied (available), false if busy.
 */
export async function checkCalendarAvailability(startTime, endTime) {
  const calendar = getCalendarClient();
  if (!calendar) {
    throw new Error("Google Calendar API client is not configured");
  }

  const calendarId = (process.env.GOOGLE_CALENDAR_ID || "primary").trim().replace(/^['"]|['"]$/g, "");

  try {
    const response = await calendar.events.list({
      calendarId,
      timeMin: startTime.toISOString(),
      timeMax: endTime.toISOString(),
      singleEvents: true,
      timeZone: "Asia/Kolkata"
    });

    const events = response.data.items || [];
    // Ignore events that are cancelled
    const activeEvents = events.filter(e => e.status !== "cancelled");
    
    console.log("✓ Calendar Availability Checked");
    return activeEvents.length === 0;
  } catch (error) {
    console.error("[Calendar Service] Error listing calendar events:", error.message);
    throw error;
  }
}

/**
 * Creates a Google Calendar event with a Google Meet conference link.
 * @param {Object} meetingData - Event details containing customerName, startTime, endTime, notes, and projectType.
 * @returns {Promise<Object>} - Contains googleEventId, googleMeetLink, and calendarLink.
 */
export async function createCalendarEvent(meetingData) {
  const calendar = getCalendarClient();
  if (!calendar) {
    throw new Error("Google Calendar API client is not configured");
  }

  const calendarId = (process.env.GOOGLE_CALENDAR_ID || "primary").trim().replace(/^['"]|['"]$/g, "");

  const event = {
    summary: `Grox Studio Consultation - ${meetingData.customerName}`,
    description: meetingData.notes || `Consultation regarding ${meetingData.projectType || 'project'} with Grox Studio team.`,
    start: {
      dateTime: meetingData.startTime.toISOString(),
      timeZone: "Asia/Kolkata",
    },
    end: {
      dateTime: meetingData.endTime.toISOString(),
      timeZone: "Asia/Kolkata",
    },
    attendees: [
      { email: "info.groxstudio@gmail.com" }
    ],
    conferenceData: {
      createRequest: {
        requestId: `grox-${Date.now()}-${Math.random().toString(36).substring(7)}`,
        conferenceSolutionKey: {
          type: "hangoutsMeet",
        },
      },
    },
  };

  try {
    const response = await calendar.events.insert({
      calendarId,
      resource: event,
      conferenceDataVersion: 1 // Crucial: enables generating Hangouts/Meet video conference
    });

    const eventId = response.data.id;
    const calendarLink = response.data.htmlLink || "";
    
    // Find Google Meet link inside the conference entry points
    const meetEntryPoint = response.data.conferenceData?.entryPoints?.find(
      ep => ep.entryPointType === "video"
    );
    const googleMeetLink = meetEntryPoint ? meetEntryPoint.uri : "";

    console.log("✓ Google Calendar Event Created");
    if (googleMeetLink) {
      console.log("✓ Google Meet Link Generated");
    }

    return {
      googleEventId: eventId,
      googleMeetLink,
      calendarLink
    };
  } catch (error) {
    console.error("[Calendar Service] Error inserting calendar event:", error.message);
    throw error;
  }
}

/**
 * Sets a mock calendar instance for testing.
 * @param {Object} mockClient - Mock calendar client.
 */
export function setMockCalendarClient(mockClient) {
  calendarInstance = mockClient;
}
