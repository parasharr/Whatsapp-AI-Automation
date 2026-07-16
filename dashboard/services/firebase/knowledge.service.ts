"use server";

import { db } from "./firebaseAdmin";
import { KnowledgeEntry } from "../../types";

const COLLECTION_NAME = "knowledge";

export async function getKnowledge(): Promise<KnowledgeEntry[]> {
  try {
    const snapshot = await db.collection(COLLECTION_NAME).orderBy("updatedAt", "desc").get();
    const list: KnowledgeEntry[] = [];
    
    snapshot.forEach((doc) => {
      const data = doc.data();
      list.push({
        id: doc.id,
        title: data.title,
        category: data.category,
        tags: data.tags || [],
        content: data.content,
        createdAt: data.createdAt?.toDate().toISOString() || null,
        updatedAt: data.updatedAt?.toDate().toISOString() || null,
      });
    });
    
    return list;
  } catch (error) {
    console.error("Error fetching knowledge base:", error);
    throw new Error("Failed to fetch knowledge entries");
  }
}

export async function getKnowledgeById(id: string): Promise<KnowledgeEntry | null> {
  try {
    const doc = await db.collection(COLLECTION_NAME).doc(id).get();
    if (!doc.exists) return null;
    
    const data = doc.data()!;
    return {
      id: doc.id,
      title: data.title,
      category: data.category,
      tags: data.tags || [],
      content: data.content,
      createdAt: data.createdAt?.toDate().toISOString() || null,
      updatedAt: data.updatedAt?.toDate().toISOString() || null,
    };
  } catch (error) {
    console.error("Error fetching entry by ID:", error);
    throw new Error("Failed to fetch knowledge entry");
  }
}

export async function createKnowledge(entry: Omit<KnowledgeEntry, "createdAt" | "updatedAt">): Promise<string> {
  try {
    const docRef = await db.collection(COLLECTION_NAME).add({
      ...entry,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    return docRef.id;
  } catch (error) {
    console.error("Error creating knowledge entry:", error);
    throw new Error("Failed to create knowledge entry");
  }
}

export async function updateKnowledge(id: string, entry: Partial<Omit<KnowledgeEntry, "createdAt" | "updatedAt">>): Promise<void> {
  try {
    await db.collection(COLLECTION_NAME).doc(id).update({
      ...entry,
      updatedAt: new Date(),
    });
  } catch (error) {
    console.error("Error updating knowledge entry:", error);
    throw new Error("Failed to update knowledge entry");
  }
}

export async function deleteKnowledge(id: string): Promise<void> {
  try {
    await db.collection(COLLECTION_NAME).doc(id).delete();
  } catch (error) {
    console.error("Error deleting knowledge entry:", error);
    throw new Error("Failed to delete knowledge entry");
  }
}

export async function searchKnowledge(query: string = "", category: string = ""): Promise<KnowledgeEntry[]> {
  try {
    const all = await getKnowledge();
    const queryNormalized = query.toLowerCase().trim();
    
    return all.filter((entry) => {
      // Filter by category
      if (category && category !== "all" && entry.category !== category) {
        return false;
      }
      
      // Filter by query string
      if (queryNormalized) {
        const matchesTitle = entry.title.toLowerCase().includes(queryNormalized);
        const matchesContent = entry.content.toLowerCase().includes(queryNormalized);
        const matchesTags = entry.tags.some(tag => tag.toLowerCase().includes(queryNormalized));
        const matchesCategory = entry.category.toLowerCase().includes(queryNormalized);
        return matchesTitle || matchesContent || matchesTags || matchesCategory;
      }
      
      return true;
    });
  } catch (error) {
    console.error("Error searching knowledge:", error);
    throw new Error("Failed to search knowledge base");
  }
}
