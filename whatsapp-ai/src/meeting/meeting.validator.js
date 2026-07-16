/**
 * Helper to get the current date in Asia/Kolkata as a YYYY-MM-DD string.
 * @returns {string} - Today's date as YYYY-MM-DD.
 */
export function getTodayKolkata() {
  const d = new Date();
  const tzString = d.toLocaleString("en-US", { timeZone: "Asia/Kolkata" });
  const localDate = new Date(tzString);
  const yyyy = localDate.getFullYear();
  const mm = String(localDate.getMonth() + 1).padStart(2, '0');
  const dd = String(localDate.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Checks if a date is in the past.
 * @param {string} dateStr - Date string in YYYY-MM-DD format.
 * @returns {boolean} - True if date is in the past.
 */
export function isPastDate(dateStr) {
  if (!dateStr || dateStr === "null") return true;
  const today = getTodayKolkata();
  return dateStr < today;
}

/**
 * Checks if a date is mathematically impossible (e.g. Feb 30th).
 * @param {string} dateStr - Date string in YYYY-MM-DD format.
 * @returns {boolean} - True if the date is impossible.
 */
export function isImpossibleDate(dateStr) {
  if (!dateStr || dateStr === "null") return true;
  
  // Format check: YYYY-MM-DD
  const formatRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!formatRegex.test(dateStr)) return true;

  const parts = dateStr.split("-");
  const y = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10) - 1; // 0-indexed month
  const d = parseInt(parts[2], 10);
  
  if (isNaN(y) || isNaN(m) || isNaN(d)) return true;
  if (m < 0 || m > 11 || d < 1 || d > 31) return true;
  
  const testDate = new Date(y, m, d);
  return (
    testDate.getFullYear() !== y ||
    testDate.getMonth() !== m ||
    testDate.getDate() !== d
  );
}

/**
 * Parses time string (e.g. "3 PM", "10:30 AM", "15:30") into hours and minutes.
 * @param {string} timeStr - Time string.
 * @returns {Object|null} - { hours, minutes } or null if invalid.
 */
export function parseTime(timeStr) {
  if (!timeStr || timeStr === "null") return null;
  const normalized = timeStr.trim().toUpperCase();
  
  // Match H:MM AM/PM or H AM/PM
  const ampmMatch = normalized.match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)$/);
  if (ampmMatch) {
    let hours = parseInt(ampmMatch[1], 10);
    const minutes = ampmMatch[2] ? parseInt(ampmMatch[2], 10) : 0;
    const ampm = ampmMatch[3];
    
    if (hours < 1 || hours > 12 || minutes < 0 || minutes > 59) return null;
    
    if (ampm === "PM" && hours !== 12) {
      hours += 12;
    } else if (ampm === "AM" && hours === 12) {
      hours = 0;
    }
    return { hours, minutes };
  }
  
  // Match HH:MM (24h)
  const militaryMatch = normalized.match(/^(\d{1,2}):(\d{2})$/);
  if (militaryMatch) {
    const hours = parseInt(militaryMatch[1], 10);
    const minutes = parseInt(militaryMatch[2], 10);
    if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
    return { hours, minutes };
  }
  
  return null;
}

/**
 * Checks if the time is in the past.
 * @param {string} dateStr - Date string in YYYY-MM-DD.
 * @param {string} timeStr - Time string.
 * @returns {boolean} - True if time is in the past.
 */
export function isPastTime(dateStr, timeStr) {
  if (!dateStr || !timeStr) return true;
  
  const today = getTodayKolkata();
  if (dateStr > today) return false;
  if (dateStr < today) return true;
  
  const time = parseTime(timeStr);
  if (!time) return true;
  
  // Get current time in Asia/Kolkata timezone
  const d = new Date();
  const tzString = d.toLocaleString("en-US", { timeZone: "Asia/Kolkata" });
  const localDate = new Date(tzString);
  const currentHours = localDate.getHours();
  const currentMinutes = localDate.getMinutes();
  
  if (time.hours < currentHours) return true;
  if (time.hours === currentHours && time.minutes <= currentMinutes) return true;
  
  return false;
}

/**
 * Validates the date field.
 * @param {string} date - Date string YYYY-MM-DD.
 * @returns {boolean} - True if valid date.
 */
export function isValidDate(date) {
  if (!date || date === "null" || date === "undefined") return false;
  return !isImpossibleDate(date) && !isPastDate(date);
}

/**
 * Validates the time field.
 * @param {string} date - Date string YYYY-MM-DD.
 * @param {string} time - Time string.
 * @returns {boolean} - True if valid time.
 */
export function isValidTime(date, time) {
  if (!time || time === "null" || time === "undefined") return false;
  if (!parseTime(time)) return false;
  return !isPastTime(date, time);
}

/**
 * Validates customer name.
 * @param {string} name - Customer name.
 * @returns {boolean} - True if valid name.
 */
export function isValidName(name) {
  if (!name) return false;
  const val = String(name).trim().toLowerCase();
  return val.length > 0 && val !== "null" && val !== "undefined";
}

/**
 * Validates if the meeting details are syntactically and logically correct.
 * Returns an object containing the status and missing/invalid fields.
 * 
 * @param {Object} draft - The current draft meeting data.
 * @returns {Object} - { missingFields: string[], invalidFields: string[] }
 */
export function validateMeetingDraft(draft) {
  const missingFields = [];
  const invalidFields = [];
  
  if (!draft) {
    return {
      missingFields: ["customerName", "preferredDate", "preferredTime"],
      invalidFields: []
    };
  }
  
  // Check customerName
  if (!draft.customerName || String(draft.customerName).trim() === "") {
    missingFields.push("customerName");
  } else if (!isValidName(draft.customerName)) {
    invalidFields.push("customerName");
  }
  
  // Check preferredDate
  if (!draft.preferredDate || String(draft.preferredDate).trim() === "") {
    missingFields.push("preferredDate");
  } else {
    // If date is impossible or in the past
    if (isImpossibleDate(draft.preferredDate) || isPastDate(draft.preferredDate)) {
      invalidFields.push("preferredDate");
    }
  }
  
  // Check preferredTime
  if (!draft.preferredTime || String(draft.preferredTime).trim() === "") {
    missingFields.push("preferredTime");
  } else {
    // Check if time format is valid
    const timeParsed = parseTime(draft.preferredTime);
    if (!timeParsed) {
      invalidFields.push("preferredTime");
    } else {
      // If date is valid, check if time is in the past
      if (draft.preferredDate && !isImpossibleDate(draft.preferredDate) && !isPastDate(draft.preferredDate)) {
        if (isPastTime(draft.preferredDate, draft.preferredTime)) {
          invalidFields.push("preferredTime");
        }
      }
    }
  }
  
  return {
    missingFields,
    invalidFields
  };
}
