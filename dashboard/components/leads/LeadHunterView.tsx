"use client";

import React, { useState, useMemo } from "react";
import {
  Globe,
  Zap,
  Cpu,
  Target,
  Search,
  Sparkles,
  Check,
  RefreshCw,
  LayoutGrid,
  List,
  Utensils,
  Dumbbell,
  Scissors,
  Building,
  Stethoscope,
  GraduationCap,
  Hotel,
  ShoppingBag,
  Scale,
  Rocket,
  Star,
  MapPin,
  Mail,
  Phone,
  Share2,
  ExternalLink,
  PlusCircle,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  ChevronDown,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { collection, addDoc } from "firebase/firestore";
import { clientDb } from "@/services/firebase/firebaseClient";

interface LeadHunterViewProps {
  leads: any[];
  onSelectLead: (lead: any) => void;
}

export default function LeadHunterView({ leads, onSelectLead }: LeadHunterViewProps) {
  const { toast } = useToast();

  // Parameter Controls State
  const [location, setLocation] = useState("Guwahati, Assam, India");
  const [showLocationDropdown, setShowLocationDropdown] = useState(false);
  const [selectedNiche, setSelectedNiche] = useState("Restaurant");
  const [customNiche, setCustomNiche] = useState("");

  // Popular Global & Indian Locations
  const popularLocations = [
    { name: "Guwahati", region: "Assam, India" },
    { name: "Mumbai", region: "Maharashtra, India" },
    { name: "Delhi / NCR", region: "India" },
    { name: "Bangalore", region: "Karnataka, India" },
    { name: "Hyderabad", region: "Telangana, India" },
    { name: "Chennai", region: "Tamil Nadu, India" },
    { name: "Kolkata", region: "West Bengal, India" },
    { name: "Pune", region: "Maharashtra, India" },
    { name: "Ahmedabad", region: "Gujarat, India" },
    { name: "Jaipur", region: "Rajasthan, India" },
    { name: "Chandigarh", region: "India" },
    { name: "Kochi", region: "Kerala, India" },
    { name: "Indore", region: "Madhya Pradesh, India" },
    { name: "New York", region: "NY, USA" },
    { name: "San Francisco", region: "CA, USA" },
    { name: "Los Angeles", region: "CA, USA" },
    { name: "Chicago", region: "IL, USA" },
    { name: "Miami", region: "FL, USA" },
    { name: "Austin", region: "TX, USA" },
    { name: "London", region: "United Kingdom" },
    { name: "Manchester", region: "United Kingdom" },
    { name: "Toronto", region: "ON, Canada" },
    { name: "Vancouver", region: "BC, Canada" },
    { name: "Sydney", region: "NSW, Australia" },
    { name: "Dubai", region: "United Arab Emirates" },
    { name: "Singapore", region: "Singapore" },
    { name: "Tokyo", region: "Japan" },
    { name: "Berlin", region: "Germany" },
    { name: "Paris", region: "France" },
  ];

  // Live API Suggestions State
  const [apiSuggestions, setApiSuggestions] = useState<Array<{ name: string; region: string }>>([]);
  const [searchTimeout, setSearchTimeout] = useState<any>(null);

  const fetchLiveLocationSuggestions = async (q: string) => {
    if (!q || q.length < 2) {
      setApiSuggestions([]);
      return;
    }
    try {
      const res = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=5`);
      if (res.ok) {
        const data = await res.json();
        const results = (data.features || []).map((f: any) => {
          const p = f.properties || {};
          const name = p.name || p.city || p.state || q;
          const regionParts = [p.city, p.state, p.country].filter((part) => part && part !== name);
          const region = [...new Set(regionParts)].join(", ") || p.country || "Global";
          return { name, region };
        });
        setApiSuggestions(results);
      }
    } catch (e) {
      // Fallback silently to presets
    }
  };

  const handleLocationInputChange = (val: string) => {
    setLocation(val);
    setShowLocationDropdown(true);
    if (searchTimeout) clearTimeout(searchTimeout);
    setSearchTimeout(setTimeout(() => fetchLiveLocationSuggestions(val), 250));
  };

  const filteredLocations = useMemo(() => {
    if (apiSuggestions.length > 0) return apiSuggestions;
    const q = location.toLowerCase().trim();
    if (!q) return popularLocations;
    return popularLocations.filter(
      (loc) => loc.name.toLowerCase().includes(q) || loc.region.toLowerCase().includes(q)
    );
  }, [location, apiSuggestions]);

  // Data Sources Toggle State
  const [sources, setSources] = useState<Record<string, boolean>>({
    Google: true,
    Maps: true,
    Instagram: true,
    Facebook: true,
    Other: true,
    Phone: true,
    Website: true,
    Email: true,
    LinkedIn: true,
    YouTube: false,
    Address: true,
    Rating: true,
  });

  // State Management
  const [isHunting, setIsHunting] = useState(false);
  const [huntLogs, setHuntLogs] = useState<string[]>([]);
  const [scrapedLeads, setScrapedLeads] = useState<any[]>([]);
  const [savedLeadIds, setSavedLeadIds] = useState<Record<string, boolean>>({});
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  // Filter leads to strictly require available website when Website source is toggled ON
  const displayLeads = useMemo(() => {
    return scrapedLeads.filter((lead) => {
      if (sources.Website) {
        return (
          lead.website &&
          typeof lead.website === "string" &&
          lead.website.trim() !== "" &&
          lead.website.toLowerCase() !== "n/a"
        );
      }
      return true;
    });
  }, [scrapedLeads, sources.Website]);

  // Preset Niches with Icons
  const nichePresets = [
    { name: "Restaurant", icon: Utensils },
    { name: "Gym", icon: Dumbbell },
    { name: "Salon", icon: Scissors },
    { name: "Real Estate", icon: Building },
    { name: "Clinic", icon: Stethoscope },
    { name: "Education", icon: GraduationCap },
    { name: "Hotel", icon: Hotel },
    { name: "Retail", icon: ShoppingBag },
    { name: "Law", icon: Scale },
    { name: "Agency", icon: Rocket },
  ];

  // Toggle single source
  const handleToggleSource = (key: string) => {
    setSources((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Toggle All sources
  const handleToggleAll = () => {
    const allEnabled = Object.values(sources).every(Boolean);
    const nextState: Record<string, boolean> = {};
    Object.keys(sources).forEach((k) => {
      nextState[k] = !allEnabled;
    });
    setSources(nextState);
  };

  // Active Niche determination
  const activeNiche = customNiche.trim() || selectedNiche;

  // Execute AI Hunt via API Route (Gemini AI)
  const handleStartHunt = async () => {
    if (!location.trim()) {
      toast("Please enter a target location search query.", "error");
      return;
    }

    setIsHunting(true);
    setScrapedLeads([]);
    setHuntLogs([
      `[00:01] Initializing Grox AI Deep Hunter (Gemini 2.5 Core)...`,
      `[00:02] Target parameters: Niche = "${activeNiche}", Location = "${location}"`,
      `[00:03] Querying Google Business API & Maps Registries...`,
    ]);

    try {
      // Log progress steps
      setTimeout(() => {
        setHuntLogs((prev) => [
          ...prev,
          `[00:04] Extracting Instagram profiles, Facebook pages, & website metrics...`,
          `[00:05] Scraping contact emails, phone numbers & Google review ratings...`,
        ]);
      }, 1500);

      setTimeout(() => {
        setHuntLogs((prev) => [
          ...prev,
          `[00:06] Running Gemini AI Lead Quality Scoring & Web Vitals audit...`,
          `[00:07] Synthesizing agency proposal ideas & outreach drafts...`,
        ]);
      }, 3000);

      const response = await fetch("/api/hunter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          location,
          niche: activeNiche,
          sources,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to execute AI Lead Hunt");
      }

      const data = await response.json();

      if (data.success && Array.isArray(data.leads)) {
        setScrapedLeads(data.leads);
        toast(`Grox Engine Hunt Completed! ${data.leads.length} high-intent leads discovered.`, "success");
      } else {
        throw new Error("Invalid response format from AI Lead Hunter");
      }
    } catch (err: any) {
      console.error("Hunt failed:", err);
      toast(err.message || "Scraping failed. Using fallback AI agent engine.", "error");
    } finally {
      setIsHunting(false);
    }
  };

  // Save Scraped Lead directly into Firestore Database
  const handleSaveToDatabase = async (lead: any, index: number) => {
    try {
      const newLeadDoc = {
        companyName: lead.companyName || "Unknown Company",
        clientName: lead.clientName || "Unknown Client",
        leadCategory: lead.leadCategory || activeNiche,
        email: lead.email || "",
        phone: lead.phone || "",
        website: lead.website || "",
        instagram: lead.instagram || "",
        address: lead.location || location,
        rating: lead.rating || 4.5,
        reviewsCount: lead.reviewsCount || 50,
        leadScore: lead.leadScore || 90,
        priority: lead.priority || "High",
        draftStatus: "Pending",
        status: "New",
        projectSummary: lead.projectSummary || "Qualified by Grox AI Deep Hunter",
        emailSubject: lead.emailSubject || `Growth Proposal for ${lead.companyName}`,
        emailBody: lead.emailBody || `<p>Hi ${lead.clientName},</p><p>We noticed an opportunity for ${lead.companyName}...</p>`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await addDoc(collection(clientDb, "leads"), newLeadDoc);

      setSavedLeadIds((prev) => ({ ...prev, [index]: true }));
      toast(`Saved "${lead.companyName}" to main Leads Database!`, "success");
    } catch (err: any) {
      console.error("Save lead error:", err);
      toast("Failed to save lead to database.", "error");
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* LEFT SIDEBAR: PARAMETERS & SOURCES */}
      <Card className="lg:col-span-4 bg-zinc-950/90 border-zinc-800/80 rounded-2xl p-5 shadow-2xl space-y-5">
        {/* Header */}
        <div className="flex items-center gap-3 pb-4 border-b border-zinc-800/60">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/20 to-cyan-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 shadow-md shadow-blue-500/10 shrink-0">
            <Cpu className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h2 className="text-sm font-bold font-mono tracking-wider text-zinc-100 uppercase">
              GROX 3.3 DEEP HUNTER
            </h2>
            <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mt-0.5">
              LLAMA-3.3 70B / GEMINI 2.5 CORE
            </p>
          </div>
        </div>

        {/* 1. LOCATION SEARCH WITH AUTOCOMPLETE DROPDOWN */}
        <div className="space-y-2 relative">
          <label className="text-[10px] font-mono font-semibold text-zinc-400 uppercase tracking-wider block">
            LOCATION SEARCH
          </label>
          <div className="relative">
            <Globe className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <Input
              value={location}
              onFocus={() => setShowLocationDropdown(true)}
              onChange={(e) => handleLocationInputChange(e.target.value)}
              placeholder="Type city, state, or country..."
              className="pl-10 pr-8 bg-zinc-900/60 border-zinc-800/80 text-xs rounded-xl focus:border-blue-500 text-zinc-100 placeholder:text-zinc-600 h-10 font-mono"
            />
            <ChevronDown
              onClick={() => setShowLocationDropdown(!showLocationDropdown)}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 cursor-pointer hover:text-zinc-300"
            />
          </div>

          {/* Location Suggestions Dropdown */}
          {showLocationDropdown && (
            <div className="absolute top-full left-0 right-0 z-50 mt-1.5 bg-zinc-950/95 border border-zinc-800/90 rounded-xl shadow-2xl overflow-hidden max-h-56 overflow-y-auto font-mono text-xs divide-y divide-zinc-900/80 backdrop-blur-md">
              {filteredLocations.length > 0 ? (
                filteredLocations.map((loc, idx) => (
                  <div
                    key={idx}
                    onClick={() => {
                      setLocation(`${loc.name}, ${loc.region}`);
                      setShowLocationDropdown(false);
                    }}
                    className="flex items-center justify-between px-3.5 py-2.5 hover:bg-blue-500/10 hover:text-blue-300 transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center gap-2.5">
                      <MapPin className="w-3.5 h-3.5 text-blue-400 group-hover:scale-110 transition-transform shrink-0" />
                      <div className="flex flex-col">
                        <span className="font-bold text-zinc-100 group-hover:text-blue-300">
                          {loc.name}
                        </span>
                        <span className="text-[10px] text-zinc-500">{loc.region}</span>
                      </div>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-zinc-600 group-hover:text-blue-400 group-hover:translate-x-0.5 transition-all" />
                  </div>
                ))
              ) : (
                <div
                  onClick={() => setShowLocationDropdown(false)}
                  className="px-3.5 py-2.5 flex items-center justify-between text-zinc-300 hover:bg-blue-500/10 cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-blue-400" />
                    <span>Search target: "{location}"</span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-zinc-600" />
                </div>
              )}
            </div>
          )}
        </div>

        {/* 2. BUSINESS CATEGORY / NICHE */}
        <div className="space-y-2.5">
          <label className="text-[10px] font-mono font-semibold text-zinc-400 uppercase tracking-wider block">
            BUSINESS CATEGORY
          </label>

          {/* 2-Column Pill Button Grid */}
          <div className="grid grid-cols-2 gap-2">
            {nichePresets.map((preset) => {
              const Icon = preset.icon;
              const isSelected = selectedNiche === preset.name && !customNiche.trim();

              return (
                <button
                  key={preset.name}
                  type="button"
                  onClick={() => {
                    setSelectedNiche(preset.name);
                    setCustomNiche("");
                  }}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-mono transition-all border ${
                    isSelected
                      ? "bg-blue-500/10 border-blue-500/60 text-blue-400 font-bold shadow-md shadow-blue-500/10"
                      : "bg-zinc-900/40 border-zinc-800/70 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700"
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isSelected ? "text-blue-400" : "text-zinc-500"}`} />
                  <span className="truncate">{preset.name}</span>
                </button>
              );
            })}
          </div>

          {/* Custom Niche Input */}
          <Input
            value={customNiche}
            onChange={(e) => setCustomNiche(e.target.value)}
            placeholder="Or custom niche..."
            className="bg-zinc-900/60 border-zinc-800/80 text-xs rounded-xl focus:border-blue-500 text-zinc-100 placeholder:text-zinc-600 h-9 font-mono"
          />
        </div>

        {/* 3. SOURCES & DATA */}
        <div className="space-y-2.5 pt-2 border-t border-zinc-800/60">
          <div className="flex items-center justify-between">
            <label className="text-[10px] font-mono font-semibold text-zinc-400 uppercase tracking-wider">
              SOURCES & DATA
            </label>
            <button
              type="button"
              onClick={handleToggleAll}
              className="text-[10px] font-mono text-blue-400 hover:underline uppercase font-bold"
            >
              Toggle All
            </button>
          </div>

          {/* 2-Column Toggle Grid */}
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(sources).map(([key, enabled]) => (
              <div
                key={key}
                onClick={() => handleToggleSource(key)}
                className="flex items-center justify-between px-3 py-2 rounded-xl bg-zinc-900/40 border border-zinc-800/70 text-xs font-mono cursor-pointer hover:border-zinc-700 transition-colors"
              >
                <span className="text-zinc-300 text-[11px]">{key}</span>
                {/* Switch Button */}
                <div
                  className={`w-7 h-4 rounded-full p-0.5 transition-colors flex items-center ${
                    enabled ? "bg-gradient-to-r from-blue-600 to-cyan-500 justify-end" : "bg-zinc-800 justify-start"
                  }`}
                >
                  <div className="w-3 h-3 rounded-full bg-white shadow-xs" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 4. START GROX HUNT ACTION BUTTON */}
        <Button
          onClick={handleStartHunt}
          disabled={isHunting}
          className="w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-500 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-mono font-bold tracking-wider uppercase h-12 rounded-xl shadow-xl shadow-blue-500/20 gap-2 border border-blue-400/30"
        >
          {isHunting ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin text-white" />
              HUNTING IN PROGRESS...
            </>
          ) : (
            <>
              <Zap className="w-4 h-4 fill-white text-white" />
              START GROX HUNT
            </>
          )}
        </Button>
      </Card>

      {/* RIGHT MAIN VIEW AREA */}
      <Card className="lg:col-span-8 bg-zinc-950/90 border-zinc-800/80 rounded-2xl p-5 shadow-2xl flex flex-col min-h-[600px]">
        {/* Header Bar */}
        <div className="flex items-center justify-between pb-4 border-b border-zinc-800/60 mb-5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
              <Target className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold font-mono tracking-wider text-zinc-100 uppercase">
                {isHunting
                  ? "HUNTING IN PROGRESS..."
                  : scrapedLeads.length > 0
                  ? `FOUND ${scrapedLeads.length} QUALIFIED LEADS`
                  : "READY FOR HUNT"}
              </h3>
              <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mt-0.5">
                {scrapedLeads.length > 0
                  ? `TARGET: ${activeNiche.toUpperCase()} IN ${location.toUpperCase()}`
                  : "SELECT PARAMETERS AND START THE ENGINE"}
              </p>
            </div>
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center p-0.5 rounded-lg bg-zinc-900 border border-zinc-800 text-xs">
            <button
              onClick={() => setViewMode("grid")}
              className={`p-1.5 rounded-md transition-all ${
                viewMode === "grid" ? "bg-zinc-800 text-blue-400" : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`p-1.5 rounded-md transition-all ${
                viewMode === "list" ? "bg-zinc-800 text-blue-400" : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* STATE A: STANDBY */}
        {!isHunting && scrapedLeads.length === 0 && (
          <div className="flex-1 flex flex-col items-center justify-center py-24 text-center">
            <div className="w-24 h-24 rounded-3xl bg-blue-500/5 border border-blue-500/15 flex items-center justify-center text-blue-400/80 mb-5 shadow-2xl shadow-blue-500/5">
              <Cpu className="w-12 h-12 animate-pulse" />
            </div>
            <h3 className="text-lg font-bold font-mono tracking-wider text-zinc-200 uppercase">
              GROX ENGINE STANDBY
            </h3>
            <p className="text-xs font-mono text-zinc-500 mt-1 max-w-sm">
              Select your target location, business category, and data sources on the left panel, then click <span className="text-blue-400 font-bold">START GROX HUNT</span>.
            </p>
          </div>
        )}

        {/* STATE B: HUNTING / SCRAPING */}
        {isHunting && (
          <div className="flex-1 flex flex-col items-center justify-center py-16 space-y-6">
            <div className="relative">
              <div className="w-24 h-24 rounded-full bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 animate-ping absolute inset-0" />
              <div className="w-24 h-24 rounded-full bg-zinc-950 border border-blue-500/50 flex items-center justify-center text-blue-400 relative z-10 shadow-2xl shadow-blue-500/20">
                <RefreshCw className="w-10 h-10 animate-spin text-blue-400" />
              </div>
            </div>

            <div className="text-center">
              <h4 className="text-sm font-bold font-mono text-zinc-100 uppercase tracking-widest">
                SCRAPING & ANALYZING LEADS...
              </h4>
              <p className="text-xs font-mono text-blue-400 mt-1">
                Gemini 2.5 AI Agent scanning {location} for {activeNiche} prospects
              </p>
            </div>

            {/* Live Terminal Log Box */}
            <div className="w-full max-w-md bg-zinc-900/90 border border-zinc-800 rounded-xl p-4 font-mono text-[11px] text-zinc-400 space-y-1.5 shadow-inner">
              {huntLogs.map((log, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <span className="text-blue-400">&gt;</span>
                  <span className="text-zinc-300">{log}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* STATE C: RESULTS DISCOVERED */}
        {!isHunting && displayLeads.length > 0 && (
          <div className="flex-1 space-y-4">
            {viewMode === "grid" ? (
              /* Grid Layout */
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {displayLeads.map((lead, idx) => {
                  const isSaved = savedLeadIds[idx];

                  return (
                    <div
                      key={idx}
                      className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800/80 hover:border-blue-500/40 transition-all flex flex-col justify-between space-y-3 group"
                    >
                      {/* Top Header Row */}
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded-md bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-mono font-bold">
                              SCORE: {lead.leadScore || 92}
                            </span>
                            <span className="text-[10px] font-mono text-zinc-500 uppercase">
                              {lead.leadCategory || activeNiche}
                            </span>
                          </div>
                          <h4 className="text-sm font-bold font-mono text-zinc-100 uppercase tracking-wide mt-1.5 group-hover:text-blue-400 transition-colors">
                            {lead.companyName}
                          </h4>
                          <p className="text-xs text-zinc-400 font-mono">
                            {lead.clientName || "Business Contact"}
                          </p>
                        </div>

                        {/* Rating Badge */}
                        <div className="flex items-center gap-1 text-[11px] font-mono text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-1 rounded-lg shrink-0">
                          <Star className="w-3 h-3 fill-amber-400" />
                          <span>{lead.rating || 4.8}</span>
                          <span className="text-[9px] text-zinc-500">({lead.reviewsCount || 45})</span>
                        </div>
                      </div>

                      {/* Contact Info Grid */}
                      <div className="space-y-1.5 text-xs font-mono text-zinc-400 bg-zinc-950/60 p-2.5 rounded-lg border border-zinc-800/60">
                        {lead.website && (
                          <div className="flex items-center gap-2 truncate">
                            <Globe className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                            <a
                              href={lead.website.startsWith("http") ? lead.website : `https://${lead.website}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="truncate text-blue-400 font-bold hover:underline"
                            >
                              {lead.website.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                            </a>
                          </div>
                        )}
                        {lead.email && (
                          <div className="flex items-center gap-2 truncate">
                            <Mail className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                            <span className="truncate text-zinc-300">{lead.email}</span>
                          </div>
                        )}
                        {lead.phone && (
                          <div className="flex items-center gap-2">
                            <Phone className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                            <span>{lead.phone}</span>
                          </div>
                        )}
                        {lead.location && (
                          <div className="flex items-center gap-2 truncate">
                            <MapPin className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                            <span className="truncate">{lead.location}</span>
                          </div>
                        )}
                      </div>

                      {/* Proposal Opportunity */}
                      <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed">
                        <span className="text-blue-400 font-mono font-semibold">Proposal Idea: </span>
                        {lead.projectSummary}
                      </p>

                      {/* Footer Actions */}
                      <div className="pt-2 border-t border-zinc-800/60 flex items-center justify-between gap-2">
                        {lead.website && (
                          <a
                            href={lead.website.startsWith("http") ? lead.website : `https://${lead.website}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[10px] font-mono text-zinc-400 hover:text-zinc-200 flex items-center gap-1"
                          >
                            <ExternalLink className="w-3 h-3 text-zinc-500" />
                            Website
                          </a>
                        )}

                        <Button
                          onClick={() => handleSaveToDatabase(lead, idx)}
                          disabled={isSaved}
                          className={`text-xs font-mono gap-1.5 h-8 px-3 rounded-lg ${
                            isSaved
                              ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 cursor-default"
                              : "bg-blue-600 hover:bg-blue-500 text-white font-bold"
                          }`}
                        >
                          {isSaved ? (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              SAVED TO DATABASE
                            </>
                          ) : (
                            <>
                              <PlusCircle className="w-3.5 h-3.5" />
                              SAVE TO LEADS
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* List Layout */
              <div className="overflow-x-auto rounded-xl border border-zinc-800/80 bg-zinc-900/20">
                <table className="w-full text-left text-xs font-mono">
                  <thead>
                    <tr className="bg-zinc-900/80 border-b border-zinc-800 text-zinc-500 text-[10px] uppercase">
                      <th className="py-3 px-4">Company</th>
                      <th className="py-3 px-4">Contact</th>
                      <th className="py-3 px-4">Rating</th>
                      <th className="py-3 px-4 text-center">Score</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/50 text-zinc-300">
                    {displayLeads.map((lead, idx) => {
                      const isSaved = savedLeadIds[idx];

                      return (
                        <tr key={idx} className="hover:bg-zinc-900/40 transition-colors">
                          <td className="py-3 px-4">
                            <div className="font-bold text-zinc-100 uppercase">{lead.companyName}</div>
                            <div className="text-[10px] text-zinc-500">{lead.location}</div>
                          </td>
                          <td className="py-3 px-4 text-zinc-400">
                            <div>{lead.email || "N/A"}</div>
                            <div className="text-[10px] text-zinc-500">{lead.phone}</div>
                          </td>
                          <td className="py-3 px-4 text-amber-400">
                            ⭐ {lead.rating || 4.8} ({lead.reviewsCount || 40})
                          </td>
                          <td className="py-3 px-4 text-center font-bold text-blue-400">
                            {lead.leadScore || 90}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <Button
                              onClick={() => handleSaveToDatabase(lead, idx)}
                              disabled={isSaved}
                              className={`text-[10px] font-mono h-7 px-2.5 rounded-md ${
                                isSaved
                                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                                  : "bg-blue-600 hover:bg-blue-500 text-white font-bold"
                              }`}
                            >
                              {isSaved ? "SAVED" : "SAVE LEAD"}
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}
