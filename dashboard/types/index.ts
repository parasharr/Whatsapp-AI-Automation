export interface KnowledgeEntry {
  id?: string;
  title: string;
  category: "services" | "pricing" | "faq" | "portfolio" | "about" | "contact" | "technologies" | "process" | "custom";
  tags: string[];
  content: string;
  createdAt: Date | any;
  updatedAt: Date | any;
}

export interface PromptEntry {
  id: string;
  title?: string;
  content: string;
  priority?: number;
  status?: string;
  updatedAt: string | null;
}
