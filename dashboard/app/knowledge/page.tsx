"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { getKnowledge, deleteKnowledge } from "@/services/firebase/knowledge.service";
import { KnowledgeEntry } from "@/types";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Dialog } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { Plus, Search, Calendar, Trash2, Edit2, Loader2, Database, AlertTriangle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function KnowledgeListPage() {
  const { toast } = useToast();
  const [entries, setEntries] = useState<KnowledgeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  
  // Deletion state
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch initial data
  const fetchData = async () => {
    try {
      setLoading(true);
      const data = await getKnowledge();
      setEntries(data);
    } catch (err) {
      toast("Failed to load knowledge entries.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Handle delete action
  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      setIsDeleting(true);
      await deleteKnowledge(deleteId);
      toast("Knowledge entry deleted successfully.", "success");
      setEntries((prev) => prev.filter((item) => item.id !== deleteId));
      setDeleteId(null);
    } catch (err) {
      toast("Failed to delete the entry.", "error");
    } finally {
      setIsDeleting(false);
    }
  };

  // Filter entries locally for zero latency
  const filteredEntries = entries.filter((entry) => {
    // Category match
    const categoryMatch = selectedCategory === "all" || entry.category === selectedCategory;
    
    // Search query match (title, category, tags, or content)
    const normalizedQuery = searchQuery.toLowerCase().trim();
    const queryMatch =
      !normalizedQuery ||
      entry.title.toLowerCase().includes(normalizedQuery) ||
      entry.content.toLowerCase().includes(normalizedQuery) ||
      entry.category.toLowerCase().includes(normalizedQuery) ||
      entry.tags.some((tag) => tag.toLowerCase().includes(normalizedQuery));
      
    return categoryMatch && queryMatch;
  });

  const categories = [
    { value: "all", label: "All Categories" },
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
    <div className="space-y-6">
      {/* Top action bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        {/* Filters */}
        <div className="flex-1 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by title, category, content, or tags..."
              className="pl-9 bg-zinc-900/30"
            />
          </div>
          <Select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full sm:w-48 bg-zinc-900/30"
          >
            {categories.map((c) => (
              <option key={c.value} value={c.value} className="bg-zinc-950 text-foreground">
                {c.label}
              </option>
            ))}
          </Select>
        </div>

        {/* Create button */}
        <Link href="/knowledge/new" className="shrink-0">
          <Button className="w-full sm:w-auto gap-1.5 text-xs">
            <Plus className="w-3.5 h-3.5" />
            New Knowledge
          </Button>
        </Link>
      </div>

      {/* Main Grid View */}
      {loading ? (
        /* Skeleton Loader Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="space-y-3">
                <div className="flex justify-between items-center">
                  <div className="h-4 bg-zinc-800 rounded w-16" />
                  <div className="h-4 bg-zinc-800 rounded w-24" />
                </div>
                <div className="h-6 bg-zinc-800 rounded w-3/4" />
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="h-3.5 bg-zinc-800 rounded w-full" />
                <div className="h-3.5 bg-zinc-800 rounded w-5/6" />
                <div className="h-3.5 bg-zinc-800 rounded w-4/6" />
              </CardContent>
              <CardFooter className="flex gap-2">
                <div className="h-8 bg-zinc-850 rounded w-16" />
                <div className="h-8 bg-zinc-850 rounded w-16" />
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : filteredEntries.length === 0 ? (
        /* Empty State */
        <div className="flex flex-col items-center justify-center p-12 border border-dashed border-border rounded-2xl h-80 gap-3 text-muted-foreground glass-panel">
          <Database className="w-8 h-8 opacity-45" />
          <span className="text-sm font-semibold">No knowledge entries found</span>
          <p className="text-xs max-w-xs text-center">
            Try adjusting your search query or filters, or add a new entry to the database.
          </p>
          <Link href="/knowledge/new" className="mt-2">
            <Button size="sm" className="gap-1 text-xs">
              <Plus className="w-3.5 h-3.5" />
              Add Knowledge
            </Button>
          </Link>
        </div>
      ) : (
        /* Card grid list */
        <motion.div
          layout
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          <AnimatePresence mode="popLayout">
            {filteredEntries.map((item) => (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.15 }}
              >
                <Card className="h-full flex flex-col justify-between overflow-hidden relative">
                  <div>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between gap-2">
                        <Badge variant="accent" className="capitalize text-[10px]">
                          {item.category}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground flex items-center gap-1 font-mono">
                          <Calendar className="w-3 h-3 text-muted-foreground/60" />
                          {item.updatedAt ? new Date(item.updatedAt).toLocaleDateString() : "N/A"}
                        </span>
                      </div>
                      <CardTitle className="text-xs font-bold leading-tight mt-1 line-clamp-1">
                        {item.title}
                      </CardTitle>
                    </CardHeader>
                    
                    <CardContent className="pb-3 text-xs leading-relaxed text-muted-foreground line-clamp-4 min-h-[5.5rem]">
                      {item.content}
                    </CardContent>
                  </div>

                  <div>
                    {/* Tags List */}
                    {item.tags && item.tags.length > 0 && (
                      <div className="px-6 pb-4 flex items-center gap-1 flex-wrap">
                        {item.tags.map((tag) => (
                          <span
                            key={tag}
                            className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-zinc-900 border border-zinc-800 text-[9px] text-muted-foreground font-mono"
                          >
                            #{tag.toLowerCase()}
                          </span>
                        ))}
                      </div>
                    )}
                    
                    <CardFooter className="flex items-center justify-between border-t border-border/20 pt-3">
                      <div className="flex gap-2 w-full justify-end">
                        <Link href={`/knowledge/${item.id}`}>
                          <Button variant="outline" size="sm" className="h-8 px-2.5 text-xs gap-1">
                            <Edit2 className="w-3 h-3" />
                            Edit
                          </Button>
                        </Link>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeleteId(item.id || null)}
                          className="h-8 px-2.5 text-xs text-rose-500 hover:bg-rose-500/10 hover:text-rose-400 gap-1 cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3" />
                          Delete
                        </Button>
                      </div>
                    </CardFooter>
                  </div>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog
        isOpen={deleteId !== null}
        onClose={() => setDeleteId(null)}
        title="Delete Knowledge Entry"
        description="Are you absolutely sure you want to delete this knowledge entry? This action is permanent and the AI agent will no longer have access to this information."
      >
        <div className="flex items-center gap-3 p-3 rounded-lg bg-rose-500/5 border border-rose-500/10 text-rose-400 text-xs mb-6">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <span>Warning: Deleting this resource cannot be undone.</span>
        </div>
        
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => setDeleteId(null)} disabled={isDeleting} className="text-xs">
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={isDeleting}
            className="text-xs gap-1.5"
          >
            {isDeleting ? (
              <>
                <Loader2 className="w-3 h-3 animate-spin" />
                Deleting...
              </>
            ) : (
              "Yes, Delete"
            )}
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
