import Link from "next/link";
import { getKnowledge } from "@/services/firebase/knowledge.service";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Database, Plus, Tag, LayoutGrid, Clock, ArrowRight } from "lucide-react";

export const revalidate = 0; // Always fetch fresh data on request

export default async function DashboardPage() {
  const allKnowledge = await getKnowledge();
  
  // Calculate metrics
  const totalEntries = allKnowledge.length;
  
  const categoryCounts: Record<string, number> = {};
  const tagsSet = new Set<string>();
  
  allKnowledge.forEach((item) => {
    categoryCounts[item.category] = (categoryCounts[item.category] || 0) + 1;
    item.tags?.forEach(tag => tagsSet.add(tag.toLowerCase()));
  });
  
  const totalTags = tagsSet.size;
  const uniqueCategories = Object.keys(categoryCounts).length;
  
  // Sort and get recent entries
  const recentEntries = allKnowledge.slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="p-6 rounded-2xl glass-panel relative overflow-hidden flex flex-col gap-2">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -z-10" />
        <h2 className="text-lg font-bold text-foreground">Welcome to Grox AI Knowledge Hub</h2>
        <p className="text-xs text-muted-foreground max-w-xl">
          Create, edit, and categorize fine-grained business knowledge blocks for the Grox AI WhatsApp agent. 
          The agent retrieves these blocks in real-time to answer customer queries.
        </p>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="space-y-1">
              <CardDescription>Knowledge Base</CardDescription>
              <CardTitle className="text-xl font-bold">{totalEntries}</CardTitle>
            </div>
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
              <Database className="w-5 h-5 text-blue-400" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-[11px] text-muted-foreground">Total small entries stored in Firestore</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="space-y-1">
              <CardDescription>Active Topics</CardDescription>
              <CardTitle className="text-xl font-bold">{uniqueCategories}</CardTitle>
            </div>
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
              <LayoutGrid className="w-5 h-5 text-emerald-400" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-[11px] text-muted-foreground">Topics matching customer keywords</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="space-y-1">
              <CardDescription>Unique Tags</CardDescription>
              <CardTitle className="text-xl font-bold">{totalTags}</CardTitle>
            </div>
            <div className="w-10 h-10 rounded-lg bg-violet-500/10 flex items-center justify-center border border-violet-500/20">
              <Tag className="w-5 h-5 text-violet-400" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-[11px] text-muted-foreground">Semantic flags used by search indexing</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Split Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Updates */}
        <Card className="lg:col-span-2 flex flex-col justify-between">
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <div className="space-y-1">
              <CardTitle className="text-base font-semibold">Recent Updates</CardTitle>
              <CardDescription>The last knowledge documents modified in Firestore</CardDescription>
            </div>
            <Link href="/knowledge">
              <Button variant="ghost" size="sm" className="gap-1 text-xs">
                View all <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentEntries.length === 0 ? (
              <div className="h-40 flex flex-col items-center justify-center text-muted-foreground border border-dashed border-border rounded-lg gap-2">
                <Database className="w-6 h-6 opacity-40" />
                <span className="text-xs">No knowledge entries found</span>
                <Link href="/knowledge/new">
                  <Button size="sm" className="gap-1 mt-2 text-xs">
                    <Plus className="w-3.5 h-3.5" /> Create New
                  </Button>
                </Link>
              </div>
            ) : (
              recentEntries.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3.5 rounded-lg border border-border bg-zinc-900/30 hover:bg-zinc-900/60 transition-colors"
                >
                  <div className="space-y-1 max-w-[70%]">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-xs text-foreground truncate block">{item.title}</span>
                      <Badge variant="accent" className="capitalize text-[10px] scale-90 origin-left">
                        {item.category}
                      </Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground truncate">{item.content}</p>
                  </div>
                  <div className="flex items-center gap-4 text-xs font-mono text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-muted-foreground/60" />
                      {item.updatedAt ? new Date(item.updatedAt).toLocaleDateString() : 'N/A'}
                    </span>
                    <Link href={`/knowledge/${item.id}`}>
                      <Button variant="outline" size="sm" className="h-8 px-2.5 text-xs">
                        Edit
                      </Button>
                    </Link>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Categories Breakdown */}
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Category Breakdown</CardTitle>
            <CardDescription>Entries grouped by topic filters</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col gap-4">
            {Object.keys(categoryCounts).length === 0 ? (
              <div className="flex-1 flex items-center justify-center text-xs text-muted-foreground">
                No categories available
              </div>
            ) : (
              Object.entries(categoryCounts).map(([cat, count]) => {
                const percentage = totalEntries > 0 ? (count / totalEntries) * 100 : 0;
                return (
                  <div key={cat} className="space-y-1">
                    <div className="flex justify-between items-center text-xs">
                      <span className="capitalize text-muted-foreground font-medium">{cat}</span>
                      <span className="font-mono text-foreground font-semibold">{count}</span>
                    </div>
                    <div className="w-full bg-zinc-900 rounded-full h-1.5 border border-zinc-800/40">
                      <div
                        className="bg-primary h-1.5 rounded-full"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
