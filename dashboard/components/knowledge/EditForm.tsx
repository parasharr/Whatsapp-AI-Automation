"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { updateKnowledge } from "@/services/firebase/knowledge.service";
import { KnowledgeEntry } from "@/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { ArrowLeft, Loader2, Plus, X, Save } from "lucide-react";
import Link from "next/link";

const formSchema = z.object({
  title: z.string().min(3, { message: "Title must be at least 3 characters" }),
  category: z.enum([
    "services",
    "pricing",
    "faq",
    "portfolio",
    "about",
    "contact",
    "technologies",
    "process",
    "custom",
  ]),
  content: z.string().min(10, { message: "Content must be at least 10 characters" }),
});

type FormValues = z.infer<typeof formSchema>;

interface EditFormProps {
  initialData: KnowledgeEntry;
}

export default function EditForm({ initialData }: EditFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  
  const [tags, setTags] = useState<string[]>(initialData.tags || []);
  const [tagInput, setTagInput] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      category: initialData.category,
      title: initialData.title,
      content: initialData.content,
    },
  });

  const handleAddTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === "," || e.key === " ") {
      e.preventDefault();
      const val = tagInput.trim().toLowerCase().replace(/,/g, "");
      
      if (val && !tags.includes(val)) {
        setTags((prev) => [...prev, val]);
      }
      setTagInput("");
    }
  };

  const handleAddTagBtn = () => {
    const val = tagInput.trim().toLowerCase().replace(/,/g, "");
    if (val && !tags.includes(val)) {
      setTags((prev) => [...prev, val]);
    }
    setTagInput("");
  };

  const handleRemoveTag = (index: number) => {
    setTags((prev) => prev.filter((_, i) => i !== index));
  };

  const onSubmit = async (values: FormValues) => {
    if (!initialData.id) return;
    try {
      setIsSaving(true);
      
      const updatedFields = {
        title: values.title.trim(),
        category: values.category,
        content: values.content.trim(),
        tags: tags,
      };

      await updateKnowledge(initialData.id, updatedFields);
      
      toast("Knowledge entry updated successfully!", "success");
      router.push("/knowledge");
    } catch (err) {
      toast("Failed to update entry. Please try again.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const categories = [
    { value: "services", label: "Services" },
    { value: "pricing", label: "Pricing" },
    { value: "faq", label: "FAQ" },
    { value: "portfolio", label: "Portfolio" },
    { value: "about", label: "About" },
    { value: "contact", label: "Contact" },
    { value: "technologies", label: "Technologies" },
    { value: "process", label: "Process" },
    { value: "custom", label: "Custom" },
  ];

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center">
        <Link href="/knowledge">
          <Button variant="ghost" size="sm" className="gap-1.5 text-xs text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to list
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-bold">Edit Knowledge Entry</CardTitle>
          <CardDescription>
            Modify this entry to update the Grox AI WhatsApp agent's knowledge base.
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            
            {/* Category */}
            <div className="space-y-2">
              <label htmlFor="category" className="text-xs font-semibold text-foreground">
                Category
              </label>
              <Select
                id="category"
                {...register("category")}
                className={errors.category ? "border-rose-500/50 focus:border-rose-500/50" : ""}
              >
                {categories.map((c) => (
                  <option key={c.value} value={c.value} className="bg-zinc-950 text-foreground">
                    {c.label}
                  </option>
                ))}
              </Select>
              {errors.category && (
                <p className="text-[10px] text-rose-500 font-medium">{errors.category.message}</p>
              )}
            </div>

            {/* Title */}
            <div className="space-y-2">
              <label htmlFor="title" className="text-xs font-semibold text-foreground">
                Title
              </label>
              <Input
                id="title"
                type="text"
                {...register("title")}
                className={errors.title ? "border-rose-500/50 focus:border-rose-500/50" : ""}
              />
              {errors.title && (
                <p className="text-[10px] text-rose-500 font-medium">{errors.title.message}</p>
              )}
            </div>

            {/* Tags */}
            <div className="space-y-2">
              <label htmlFor="tags" className="text-xs font-semibold text-foreground">
                Tags
              </label>
              <div className="flex gap-2">
                <Input
                  id="tags"
                  type="text"
                  placeholder="Type tag name and press Space, Comma, or Enter..."
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={handleAddTag}
                  className="flex-1"
                />
                <Button type="button" variant="outline" onClick={handleAddTagBtn} className="shrink-0 h-10 cursor-pointer">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              
              {tags.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap p-3 rounded-lg border border-border bg-zinc-900/20">
                  {tags.map((tag, i) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-zinc-900 border border-zinc-800 text-[10px] text-muted-foreground font-mono font-medium shadow-sm hover:border-zinc-700/50 transition-colors"
                    >
                      #{tag}
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(i)}
                        className="text-muted-foreground hover:text-rose-400 focus:outline-hidden cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Content */}
            <div className="space-y-2">
              <label htmlFor="content" className="text-xs font-semibold text-foreground">
                Knowledge Content
              </label>
              <Textarea
                id="content"
                rows={8}
                {...register("content")}
                className={errors.content ? "border-rose-500/50 focus:border-rose-500/50" : ""}
              />
              {errors.content && (
                <p className="text-[10px] text-rose-500 font-medium">{errors.content.message}</p>
              )}
            </div>

            {/* Buttons */}
            <div className="flex items-center justify-end border-t border-border/20 pt-4 mt-6 gap-3">
              <Link href="/knowledge">
                <Button type="button" variant="outline" className="text-xs">
                  Cancel
                </Button>
              </Link>
              <Button type="submit" disabled={isSaving} className="text-xs gap-1.5 cursor-pointer">
                {isSaving ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>

          </form>
        </CardContent>
      </Card>
    </div>
  );
}
