"use client";

import React, { useEffect, useState } from "react";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { clientDb } from "@/services/firebase/firebaseClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { 
  Users, Mail, Award, Clock, Search, Settings, 
  Filter, Calendar, Loader2, ArrowUpDown, ChevronRight, RefreshCw, MailCheck, Crosshair
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import LeadDetailDrawer from "@/components/leads/LeadDetailDrawer";
import SettingsPanel from "@/components/leads/SettingsPanel";
import LeadStatsOverview from "@/components/leads/LeadStatsOverview";
import Calender from "./components/Calender";
import LeadHunter from "./components/LeadHunter";

export default function LeadIntelligencePage() {
  const { toast } = useToast();
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Active Tab Navigation State ("leads" | "calendar" | "hunter")
  const [activeTab, setActiveTab] = useState<"leads" | "calendar" | "hunter">("leads");

  // Filter States
  const [searchQuery, setSearchQuery] = useState("");
  const [filterScore, setFilterScore] = useState("all");
  const [filterPriority, setFilterPriority] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterDraftStatus, setFilterDraftStatus] = useState("all");
  const [filterLeadStatus, setFilterLeadStatus] = useState("all");
  const [filterDate, setFilterDate] = useState("all");

  // Drawer / Modals State
  const [selectedLead, setSelectedLead] = useState<any | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Threshold indicator state
  const [threshold, setThreshold] = useState<number>(90);

  // 1. Subscribe to real-time Firestore updates
  useEffect(() => {
    setLoading(true);
    const leadsQuery = query(
      collection(clientDb, "leads"),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(
      leadsQuery,
      (snapshot) => {
        const fetchedLeads = snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            // Convert Firestore timestamps to ISO Strings safely
            createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt || null,
            updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt || null,
          };
        });
        setLeads(fetchedLeads);
        setLoading(false);
      },
      (error) => {
        console.error("Firestore leads listener failed:", error);
        toast("Failed to connect to leads database stream.", "error");
        setLoading(false);
      }
    );

    // Also fetch initial settings threshold for UI indicators
    const fetchThresholdSetting = async () => {
      try {
        const response = await fetch("http://localhost:5000/leads/settings");
        if (response.ok) {
          const data = await response.json();
          setThreshold(data.threshold || 90);
        }
      } catch (e) {
        console.warn("Could not load backend settings threshold config:", e);
      }
    };
    fetchThresholdSetting();

    return () => unsubscribe();
  }, []);

  // Update selected lead dynamically if it updates in the leads list
  useEffect(() => {
    if (selectedLead && leads.length > 0) {
      const updated = leads.find((l) => l.id === selectedLead.id);
      if (updated) {
        setSelectedLead(updated);
      }
    }
  }, [leads, selectedLead]);

  // 2. Compute Top Statistics
  const totalQualified = leads.length;
  const draftsCreated = leads.filter((l) => l.draftStatus === "Created").length;
  const pendingDrafts = leads.filter((l) => l.draftStatus === "Pending").length;
  
  const avgLeadScore = totalQualified > 0 
    ? Math.round(leads.reduce((sum, l) => sum + (l.leadScore || 0), 0) / totalQualified)
    : 0;

  // 3. Perform Local Filtering
  const filteredLeads = leads.filter((lead) => {
    // Search match
    const queryNormalized = searchQuery.toLowerCase().trim();
    const matchesSearch = !queryNormalized || 
      lead.companyName?.toLowerCase().includes(queryNormalized) ||
      lead.clientName?.toLowerCase().includes(queryNormalized) ||
      lead.email?.toLowerCase().includes(queryNormalized) ||
      lead.projectSummary?.toLowerCase().includes(queryNormalized) ||
      lead.leadCategory?.toLowerCase().includes(queryNormalized) ||
      (lead.mentionedTechnologies && lead.mentionedTechnologies.some((t: string) => t.toLowerCase().includes(queryNormalized)));

    // Score match
    let matchesScore = true;
    if (filterScore === "90+") matchesScore = (lead.leadScore >= 90);
    else if (filterScore === "70-89") matchesScore = (lead.leadScore >= 70 && lead.leadScore < 90);
    else if (filterScore === "<70") matchesScore = (lead.leadScore < 70);

    // Priority match
    const matchesPriority = filterPriority === "all" || lead.priority?.toLowerCase() === filterPriority.toLowerCase();

    // Category match
    const matchesCategory = filterCategory === "all" || lead.leadCategory?.toLowerCase() === filterCategory.toLowerCase();

    // Draft Status match
    const matchesDraft = filterDraftStatus === "all" || lead.draftStatus?.toLowerCase() === filterDraftStatus.toLowerCase();

    // Lead Status match
    const matchesStatus = filterLeadStatus === "all" || lead.status?.toLowerCase() === filterLeadStatus.toLowerCase();

    // Date range match
    let matchesDate = true;
    if (filterDate !== "all" && lead.createdAt) {
      const createdDate = new Date(lead.createdAt);
      const now = new Date();
      const diffTime = Math.abs(now.getTime() - createdDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (filterDate === "today") {
        matchesDate = diffDays <= 1 && createdDate.toDateString() === now.toDateString();
      } else if (filterDate === "week") {
        matchesDate = diffDays <= 7;
      } else if (filterDate === "month") {
        matchesDate = diffDays <= 30;
      }
    }

    return matchesSearch && matchesScore && matchesPriority && matchesCategory && matchesDraft && matchesStatus && matchesDate;
  });

  // Unique Categories computed from leads for filtering
  const categoriesList = Array.from(new Set(leads.map((l) => l.leadCategory).filter(Boolean)));

  // Badge styling map helpers
  const scoreColor = (score: number) => {
    if (score >= 90) return "text-emerald-400 bg-emerald-500/10 border border-emerald-500/20";
    if (score >= 70) return "text-blue-400 bg-blue-500/10 border border-blue-500/20";
    if (score >= 50) return "text-amber-400 bg-amber-500/10 border border-amber-500/20";
    return "text-rose-400 bg-rose-500/10 border border-rose-500/20";
  };

  const priorityBadge = (priority: string) => {
    switch (priority?.toLowerCase()) {
      case "high": return "bg-rose-500/10 text-rose-400 border border-rose-500/20";
      case "medium": return "bg-amber-500/10 text-amber-400 border border-amber-500/20";
      default: return "bg-blue-500/10 text-blue-400 border border-blue-500/20";
    }
  };

  const draftBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case "created": return "bg-emerald-500/10 text-emerald-400 border border-emerald-500/25";
      case "pending": return "bg-amber-500/10 text-amber-400 border border-amber-500/25";
      default: return "bg-zinc-800 text-zinc-400 border border-zinc-700/50";
    }
  };

  const statusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case "won": return "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30";
      case "lost": return "bg-rose-500/20 text-rose-300 border border-rose-500/30";
      case "contacted": return "bg-blue-500/20 text-blue-300 border border-blue-500/30";
      case "archived": return "bg-zinc-800 text-zinc-400 border border-zinc-700/50";
      default: return "bg-zinc-900 text-zinc-200 border border-zinc-800";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-border/60">
        <div>
          <h1 className="text-xl font-bold text-foreground">Lead Intelligence</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Continuous background monitor of monitored WhatsApp channels for qualified Grox Studio business proposals.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => setIsSettingsOpen(true)}
          className="w-full sm:w-auto text-xs gap-1.5 shrink-0"
        >
          <Settings className="w-4 h-4" />
          Settings Configuration
        </Button>
      </div>

      {/* Top Navigation Tabs: Leads | Calendar | Lead Hunter */}
      <div className="flex items-center gap-1.5 p-1 rounded-xl bg-zinc-950/80 border border-zinc-800/80 text-xs font-mono w-fit">
        <button
          onClick={() => setActiveTab("leads")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
            activeTab === "leads"
              ? "bg-zinc-800 text-zinc-100 shadow-sm border border-zinc-700/60 font-semibold"
              : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50"
          }`}
        >
          <Users className="w-4 h-4 text-blue-400" />
          <span>Leads</span>
        </button>

        <button
          onClick={() => setActiveTab("calendar")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
            activeTab === "calendar"
              ? "bg-zinc-800 text-zinc-100 shadow-sm border border-zinc-700/60 font-semibold"
              : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50"
          }`}
        >
          <Calendar className="w-4 h-4 text-emerald-400" />
          <span>Calendar</span>
        </button>

        <button
          onClick={() => setActiveTab("hunter")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
            activeTab === "hunter"
              ? "bg-zinc-800 text-zinc-100 shadow-sm border border-zinc-700/60 font-semibold"
              : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50"
          }`}
        >
          <Crosshair className="w-4 h-4 text-purple-400" />
          <span>Lead Hunter</span>
        </button>
      </div>

      {/* TAB 1: LEADS VIEW */}
      {activeTab === "leads" && (
        <>
          {/* Top Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <Card className="glass-card">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div className="space-y-1">
                  <CardDescription className="text-[10px] uppercase font-mono tracking-wider">Total Leads</CardDescription>
                  <CardTitle className="text-2xl font-bold font-mono">{totalQualified}</CardTitle>
                </div>
                <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center border border-blue-500/20 text-blue-400">
                  <Users className="w-5 h-5" />
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-[10px] text-muted-foreground">Opportunities qualified by AI agent</p>
              </CardContent>
            </Card>

            <Card className="glass-card">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div className="space-y-1">
                  <CardDescription className="text-[10px] uppercase font-mono tracking-wider">Drafts Created</CardDescription>
                  <CardTitle className="text-2xl font-bold font-mono text-emerald-400">{draftsCreated}</CardTitle>
                </div>
                <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 text-emerald-400">
                  <MailCheck className="w-5 h-5" />
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-[10px] text-muted-foreground">Drafts auto-injected into Gmail API</p>
              </CardContent>
            </Card>

            <Card className="glass-card">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div className="space-y-1">
                  <CardDescription className="text-[10px] uppercase font-mono tracking-wider">Pending Drafts</CardDescription>
                  <CardTitle className="text-2xl font-bold font-mono text-amber-400">{pendingDrafts}</CardTitle>
                </div>
                <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center border border-amber-500/20 text-amber-400">
                  <Mail className="w-5 h-5" />
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-[10px] text-muted-foreground">Needs review or manual trigger</p>
              </CardContent>
            </Card>

            <Card className="glass-card">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div className="space-y-1">
                  <CardDescription className="text-[10px] uppercase font-mono tracking-wider">Average Lead Score</CardDescription>
                  <CardTitle className={`text-2xl font-bold font-mono ${avgLeadScore >= 90 ? "text-emerald-400" : "text-blue-400"}`}>{avgLeadScore}</CardTitle>
                </div>
                <div className="w-10 h-10 rounded-lg bg-violet-500/10 flex items-center justify-center border border-violet-500/20 text-violet-400">
                  <Award className="w-5 h-5" />
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-[10px] text-muted-foreground">Relative strength matching agency criteria</p>
              </CardContent>
            </Card>
          </div>

          {/* Analytics & Stats Overview Grid */}
          <LeadStatsOverview leads={leads} />

          {/* Interactive Filters Grid */}
          <div className="p-4 rounded-xl glass-panel border border-border/50 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
            {/* Search */}
            <div className="relative col-span-1 sm:col-span-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search leads, technology..."
                className="pl-9 bg-zinc-900/30 text-xs"
              />
            </div>

            {/* Score Filter */}
            <div className="space-y-1">
              <Select
                value={filterScore}
                onChange={(e) => setFilterScore(e.target.value)}
                className="w-full bg-zinc-900/30 text-xs py-2 px-3 border border-border rounded-lg text-foreground focus:outline-hidden"
              >
                <option value="all">All Lead Scores</option>
                <option value="90+">High Match (90+)</option>
                <option value="70-89">Medium Match (70-89)</option>
                <option value="<70">Low Match (&lt;70)</option>
              </Select>
            </div>

            {/* Priority Filter */}
            <div className="space-y-1">
              <Select
                value={filterPriority}
                onChange={(e) => setFilterPriority(e.target.value)}
                className="w-full bg-zinc-900/30 text-xs py-2 px-3 border border-border rounded-lg text-foreground focus:outline-hidden"
              >
                <option value="all">All Priorities</option>
                <option value="high">High Priority</option>
                <option value="medium">Medium Priority</option>
                <option value="low">Low Priority</option>
              </Select>
            </div>

            {/* Category Filter */}
            <div className="space-y-1">
              <Select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="w-full bg-zinc-900/30 text-xs py-2 px-3 border border-border rounded-lg text-foreground focus:outline-hidden capitalize"
              >
                <option value="all">All Categories</option>
                {categoriesList.map((category) => (
                  <option key={category} value={category.toLowerCase()} className="capitalize text-foreground bg-zinc-950">
                    {category}
                  </option>
                ))}
              </Select>
            </div>

            {/* Draft Status Filter */}
            <div className="space-y-1">
              <Select
                value={filterDraftStatus}
                onChange={(e) => setFilterDraftStatus(e.target.value)}
                className="w-full bg-zinc-900/30 text-xs py-2 px-3 border border-border rounded-lg text-foreground focus:outline-hidden"
              >
                <option value="all">All Draft Statuses</option>
                <option value="created">Draft Created</option>
                <option value="pending">Draft Pending</option>
              </Select>
            </div>

            {/* Lead Status Filter */}
            <div className="space-y-1">
              <Select
                value={filterLeadStatus}
                onChange={(e) => setFilterLeadStatus(e.target.value)}
                className="w-full bg-zinc-900/30 text-xs py-2 px-3 border border-border rounded-lg text-foreground focus:outline-hidden"
              >
                <option value="all">All Lead Statuses</option>
                <option value="new">New</option>
                <option value="contacted">Contacted</option>
                <option value="won">Won</option>
                <option value="lost">Lost</option>
                <option value="archived">Archived</option>
              </Select>
            </div>
          </div>

          {/* Main Lead Table */}
          <div className="rounded-xl border border-border/80 bg-zinc-900/10 overflow-hidden shadow-md">
            {loading ? (
              /* Loading View */
              <div className="py-24 flex flex-col items-center justify-center gap-3 text-muted-foreground">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <span className="text-xs">Connecting to lead stream...</span>
              </div>
            ) : filteredLeads.length === 0 ? (
              /* Empty View */
              <div className="py-24 flex flex-col items-center justify-center text-center p-8 gap-3 text-muted-foreground">
                <Filter className="w-8 h-8 opacity-35" />
                <span className="text-sm font-semibold">No qualified leads matching criteria</span>
                <p className="text-xs max-w-xs leading-normal">
                  Try adjusting your query fields, filters, or wait for new opportunities to appear on the WhatsApp channel.
                </p>
              </div>
            ) : (
              /* Responsive Table */
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-zinc-900/60 border-b border-border/60 text-muted-foreground font-mono text-[10px] uppercase">
                      <th className="py-3 px-4 font-semibold">Company / Client</th>
                      <th className="py-3 px-4 font-semibold">Category</th>
                      <th className="py-3 px-4 font-semibold text-center">Score</th>
                      <th className="py-3 px-4 font-semibold text-center">Priority</th>
                      <th className="py-3 px-4 font-semibold">Email</th>
                      <th className="py-3 px-4 font-semibold text-center">Draft Status</th>
                      <th className="py-3 px-4 font-semibold text-center">Lead Status</th>
                      <th className="py-3 px-4 font-semibold text-right">Created Date</th>
                      <th className="py-3 px-4 w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {filteredLeads.map((lead) => (
                      <tr
                        key={lead.id}
                        onClick={() => {
                          setSelectedLead(lead);
                          setIsDrawerOpen(true);
                        }}
                        className="hover:bg-zinc-900/40 transition-colors group cursor-pointer"
                      >
                        <td className="py-3.5 px-4 font-medium text-foreground">
                          <div className="flex flex-col gap-0.5">
                            <span className="text-foreground group-hover:text-primary transition-colors font-semibold">
                              {lead.companyName || "Unknown Company"}
                            </span>
                            <span className="text-[10px] text-muted-foreground font-normal">
                              {lead.clientName || "Unknown client"}
                            </span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 capitalize text-muted-foreground font-medium">
                          {lead.leadCategory}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span className={`px-2 py-0.5 font-mono text-[11px] font-bold rounded-md ${scoreColor(lead.leadScore)}`}>
                            {lead.leadScore}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <Badge className={`capitalize font-semibold text-[9px] ${priorityBadge(lead.priority)}`}>
                            {lead.priority}
                          </Badge>
                        </td>
                        <td className="py-3.5 px-4 text-muted-foreground truncate max-w-[140px] font-medium">
                          {lead.email || <span className="text-zinc-600 font-normal">N/A</span>}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <Badge className={`capitalize text-[9px] ${draftBadge(lead.draftStatus)}`}>
                            {lead.draftStatus}
                          </Badge>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-[9px] font-bold ${statusBadge(lead.status)}`}>
                            {lead.status || "New"}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right text-muted-foreground font-mono text-[10px]">
                          {lead.createdAt ? new Date(lead.createdAt).toLocaleDateString() : "N/A"}
                        </td>
                        <td className="py-3.5 px-4 text-right text-muted-foreground">
                          <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 group-hover:text-primary transform translate-x-[-4px] group-hover:translate-x-0 transition-all duration-200" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* TAB 2: CALENDAR VIEW */}
      {activeTab === "calendar" && (
        <Calender
          leads={leads}
          onSelectLead={(lead) => {
            setSelectedLead(lead);
            setIsDrawerOpen(true);
          }}
        />
      )}

      {/* TAB 3: LEAD HUNTER VIEW */}
      {activeTab === "hunter" && (
        <LeadHunter
          leads={leads}
          onSelectLead={(lead) => {
            setSelectedLead(lead);
            setIsDrawerOpen(true);
          }}
        />
      )}

      {/* Slide-over Detail Drawer Component */}
      <LeadDetailDrawer
        lead={selectedLead}
        isOpen={isDrawerOpen}
        onClose={() => {
          setIsDrawerOpen(false);
          setSelectedLead(null);
        }}
      />

      {/* Settings Modal Component */}
      <SettingsPanel
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onSaveSuccess={(newVal) => setThreshold(newVal)}
      />
    </div>
  );
}
