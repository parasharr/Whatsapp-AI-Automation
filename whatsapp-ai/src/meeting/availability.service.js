import { checkCalendarAvailability } from "./calendar.service.js";
import { parseTime, getTodayKolkata } from "./meeting.validator.js";

/**
 * Finds the next 3 available meeting slots in Asia/Kolkata timezone.
 * Ensures slots are:
 * - In the future
 * - Within business hours (9:00 AM - 6:00 PM IST, slot starts up to 5:30 PM)
 * - Available on Google Calendar
 * 
 * @param {string} dateStr - Date string YYYY-MM-DD.
 * @param {string} timeStr - Time string (e.g. "3 PM").
 * @returns {Promise<Date[]>} - Next 3 available slot start Date objects.
 */
export async function findNextAvailableSlots(dateStr, timeStr) {
  const time = parseTime(timeStr);
  if (!time) {
    return [];
  }

  // Construct local requested date/time in Asia/Kolkata
  const isoStr = `${dateStr}T${String(time.hours).padStart(2, '0')}:${String(time.minutes).padStart(2, '0')}:00+05:30`;
  let currentSlotStart = new Date(isoStr);
  
  const availableSlots = [];
  const maxChecks = 50; // Safeguard to prevent infinite loops
  let checks = 0;

  while (availableSlots.length < 3 && checks < maxChecks) {
    checks++;
    
    // Get local date/time fields in Asia/Kolkata for business hours checks
    const tzString = currentSlotStart.toLocaleString("en-US", { timeZone: "Asia/Kolkata" });
    const localFields = new Date(tzString);
    
    const hours = localFields.getHours();
    const minutes = localFields.getMinutes();
    
    // Ensure slot starts in the future relative to current server time
    const now = new Date();
    if (currentSlotStart <= now) {
      // Advance by 30 mins
      currentSlotStart = new Date(currentSlotStart.getTime() + 30 * 60 * 1000);
      continue;
    }

    // Business hours check: 9:00 AM (inclusive) to 5:30 PM (inclusive, since slot is 30 mins ending at 6:00 PM)
    const currentSlotMinutes = hours * 60 + minutes;
    const startBusinessMinutes = 9 * 60;       // 9:00 AM
    const endBusinessMinutes = 17 * 60 + 30;   // 5:30 PM

    if (currentSlotMinutes < startBusinessMinutes) {
      // Before business hours: Set start to 9:00 AM of that day
      const y = localFields.getFullYear();
      const m = String(localFields.getMonth() + 1).padStart(2, '0');
      const d = String(localFields.getDate()).padStart(2, '0');
      currentSlotStart = new Date(`${y}-${m}-${d}T09:00:00+05:30`);
      continue;
    } else if (currentSlotMinutes > endBusinessMinutes) {
      // After business hours: Advance by 1 day and set to 9:00 AM
      const nextDayFields = new Date(localFields.getTime() + 24 * 60 * 60 * 1000);
      const y = nextDayFields.getFullYear();
      const m = String(nextDayFields.getMonth() + 1).padStart(2, '0');
      const d = String(nextDayFields.getDate()).padStart(2, '0');
      currentSlotStart = new Date(`${y}-${m}-${d}T09:00:00+05:30`);
      continue;
    }

    // Determine slot end time
    const currentSlotEnd = new Date(currentSlotStart.getTime() + 30 * 60 * 1000);

    // Check calendar availability
    let available = false;
    try {
      available = await checkCalendarAvailability(currentSlotStart, currentSlotEnd);
    } catch (err) {
      console.error("[Availability Service] Error checking calendar availability, assuming unavailable:", err.message);
    }

    if (available) {
      availableSlots.push(new Date(currentSlotStart.getTime()));
    }

    // Advance by 30 mins
    currentSlotStart = new Date(currentSlotStart.getTime() + 30 * 60 * 1000);
  }

  return availableSlots;
}

/**
 * Formats a Date object as a human-friendly slot text (e.g. "Today 3:30 PM" or "Tomorrow 11:00 AM").
 * @param {Date} date - The slot start Date.
 * @returns {string} - Human readable slot string.
 */
export function formatSlotKolkata(date) {
  const tzString = date.toLocaleString("en-US", { timeZone: "Asia/Kolkata" });
  const localDate = new Date(tzString);
  
  const todayStr = getTodayKolkata(); // YYYY-MM-DD
  
  // Format dates in en-CA to easily check YYYY-MM-DD
  const y = localDate.getFullYear();
  const m = String(localDate.getMonth() + 1).padStart(2, '0');
  const d = String(localDate.getDate()).padStart(2, '0');
  const slotDateStr = `${y}-${m}-${d}`;
  
  // Time formatting in AM/PM
  const timeOptions = { timeZone: "Asia/Kolkata", hour: "numeric", minute: "2-digit", hour12: true };
  const timeFormatted = date.toLocaleTimeString("en-US", timeOptions);

  if (slotDateStr === todayStr) {
    return `Today ${timeFormatted}`;
  }
  
  // Tomorrow YYYY-MM-DD check
  const todayDate = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
  const tomorrowDate = new Date(todayDate.getTime() + 24 * 60 * 60 * 1000);
  const tomorrowY = tomorrowDate.getFullYear();
  const tomorrowM = String(tomorrowDate.getMonth() + 1).padStart(2, '0');
  const tomorrowD = String(tomorrowDate.getDate()).padStart(2, '0');
  const tomorrowStr = `${tomorrowY}-${tomorrowM}-${tomorrowD}`;
  
  if (slotDateStr === tomorrowStr) {
    return `Tomorrow ${timeFormatted}`;
  }
  
  // Custom format: e.g. "Thursday, July 16 at 11:00 AM"
  const dateOptions = { timeZone: "Asia/Kolkata", weekday: "long", month: "long", day: "numeric" };
  const dateFormatted = date.toLocaleDateString("en-US", dateOptions);
  return `${dateFormatted} at ${timeFormatted}`;
}
