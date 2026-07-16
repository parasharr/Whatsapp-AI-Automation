import { getKnowledgeById } from "@/services/firebase/knowledge.service";
import EditForm from "@/components/knowledge/EditForm";
import { notFound } from "next/navigation";

interface PageProps {
  params: Promise<{ id: string }>;
}

export const revalidate = 0; // Bypass route cache to load fresh values

export default async function EditKnowledgePage({ params }: PageProps) {
  const { id } = await params;
  const entry = await getKnowledgeById(id);

  if (!entry) {
    notFound();
  }

  return <EditForm initialData={entry} />;
}
