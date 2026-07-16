"use server";

import { db } from "./firebaseAdmin";

const COLLECTION_NAME = "leads";
const SETTINGS_COLLECTION = "settings";
const SETTINGS_DOC = "lead_intelligence";
const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:5000";

/**
 * Updates a lead's status (e.g. New, Contacted, Won, Lost, Archived).
 */
export async function updateLeadStatus(id: string, status: string): Promise<void> {
  try {
    await db.collection(COLLECTION_NAME).doc(id).update({
      status,
      updatedAt: new Date(),
    });
  } catch (error) {
    console.error(`Error updating lead status for ${id}:`, error);
    throw new Error("Failed to update lead status");
  }
}

/**
 * Updates a lead's draft status or details in Firestore directly.
 */
export async function updateLeadDraft(id: string, updates: Record<string, any>): Promise<void> {
  try {
    await db.collection(COLLECTION_NAME).doc(id).update({
      ...updates,
      updatedAt: new Date(),
    });
  } catch (error) {
    console.error(`Error updating lead draft fields for ${id}:`, error);
    throw new Error("Failed to update lead draft info");
  }
}

/**
 * Fetches the current auto-draft Lead Score threshold from Firestore.
 */
export async function getLeadThreshold(): Promise<number> {
  try {
    const doc = await db.collection(SETTINGS_COLLECTION).doc(SETTINGS_DOC).get();
    if (doc.exists) {
      const data = doc.data();
      return typeof data?.threshold === "number" ? data.threshold : 90;
    }
  } catch (error) {
    console.error("Error fetching lead threshold settings:", error);
  }
  return 90; // Default fallback
}

/**
 * Updates the auto-draft threshold in Firestore and notifies the backend.
 */
export async function updateLeadThreshold(threshold: number): Promise<void> {
  try {
    // 1. Update in Firestore Admin
    await db.collection(SETTINGS_COLLECTION).doc(SETTINGS_DOC).set(
      { threshold, updatedAt: new Date() },
      { merge: true }
    );

    // 2. Notify the backend API to update its cache
    try {
      const response = await fetch(`${BACKEND_URL}/leads/settings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ threshold }),
      });
      if (!response.ok) {
        console.warn("[Dashboard Service] Backend settings sync failed.");
      }
    } catch (err) {
      console.warn("[Dashboard Service] Backend is offline; could not sync settings threshold:", err.message);
    }
  } catch (error) {
    console.error("Error updating lead threshold settings:", error);
    throw new Error("Failed to update threshold settings");
  }
}

/**
 * Calls the backend to regenerate the outreach email for a lead.
 */
export async function regenerateLeadEmail(leadId: string): Promise<Record<string, any>> {
  try {
    const response = await fetch(`${BACKEND_URL}/leads/regenerate-email`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ leadId }),
      cache: "no-store"
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || "Backend returned an error");
    }

    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error || "Failed to regenerate email");
    }

    return data.updates;
  } catch (error: any) {
    console.error(`Error in regenerateLeadEmail for ${leadId}:`, error.message);
    throw new Error(error.message || "Failed to regenerate email via backend service");
  }
}

/**
 * Calls the backend to manually create a Gmail draft for a lead.
 */
export async function createGmailDraft(leadId: string): Promise<Record<string, any>> {
  try {
    const response = await fetch(`${BACKEND_URL}/leads/create-draft`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ leadId }),
      cache: "no-store"
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || "Backend returned an error");
    }

    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error || "Failed to create draft");
    }

    return data.result;
  } catch (error: any) {
    console.error(`Error in createGmailDraft for ${leadId}:`, error.message);
    throw new Error(error.message || "Failed to create Gmail draft via backend service");
  }
}
