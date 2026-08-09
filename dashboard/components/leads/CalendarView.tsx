"use client";

import React, { useState, useMemo } from "react";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Search,
  Clock,
  Filter,
  Users,
  Mail,
  ChevronDown,
  Sparkles,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

interface CalendarViewProps {
  leads: any[];
  onSelectLead: (lead: any) => void;
}

export default function CalendarView({ leads, onSelectLead }: CalendarViewProps) {
  // Current view date state (year and month)
  const [currentDate, setCurrentDate] = useState(() => new Date());
  
  // Selected date state (defaults to today or date with leads)
  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date());

  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Navigation handlers
  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  // Filter leads based on search query & status filter
  const filteredLeads = useMemo(() => {
    return leads.filter((lead) => {
      const queryNorm = searchQuery.toLowerCase().trim();
      const matchesQuery =
        !queryNorm ||
        lead.companyName?.toLowerCase().includes(queryNorm) ||
        lead.clientName?.toLowerCase().includes(queryNorm) ||
        lead.email?.toLowerCase().includes(queryNorm) ||
        lead.projectSummary?.toLowerCase().includes(queryNorm);

      let matchesStatus = true;
      if (statusFilter !== "all") {
        const st = (lead.status || "").toLowerCase();
        const dr = (lead.draftStatus || "").toLowerCase();
        if (statusFilter === "followed_up") {
          matchesStatus = st === "followed up" || (lead.followUpCount || 0) > 0;
        } else if (statusFilter === "pending") {
          matchesStatus = st === "new" || dr === "pending";
        } else if (statusFilter === "sent") {
          matchesStatus = dr === "created" || st === "sent" || st === "contacted";
        } else if (statusFilter === "replied") {
          matchesStatus = st === "replied" || st === "won";
        } else if (statusFilter === "ghosted") {
          matchesStatus = st === "ghosted" || st === "lost" || st === "archived";
        }
      }

      return matchesQuery && matchesStatus;
    });
  }, [leads, searchQuery, statusFilter]);

  // Map filtered leads by Date String (YYYY-MM-DD)
  const leadsByDate = useMemo(() => {
    const map: Record<string, any[]> = {};
    filteredLeads.forEach((lead) => {
      if (!lead.createdAt) return;
      const d = new Date(lead.createdAt);
      if (isNaN(d.getTime())) return;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
        d.getDate()
      ).padStart(2, "0")}`;
      if (!map[key]) map[key] = [];
      map[key].push(lead);
    });
    return map;
  }, [filteredLeads]);

  // Days in month calculation
  const calendarDays = useMemo(() => {
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);

    const startingDayOfWeek = firstDayOfMonth.getDay(); // 0 = Sun
    const totalDays = lastDayOfMonth.getDate();

    const days: Array<{ date: Date; isCurrentMonth: boolean; key: string }> = [];

    // Previous month padding days
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      const pDate = new Date(year, month - 1, prevMonthLastDay - i);
      const key = `${pDate.getFullYear()}-${String(pDate.getMonth() + 1).padStart(2, "0")}-${String(
        pDate.getDate()
      ).padStart(2, "0")}`;
      days.push({ date: pDate, isCurrentMonth: false, key });
    }

    // Current month days
    for (let i = 1; i <= totalDays; i++) {
      const cDate = new Date(year, month, i);
      const key = `${year}-${String(month + 1).padStart(2, "0")}-${String(i).padStart(2, "0")}`;
      days.push({ date: cDate, isCurrentMonth: true, key });
    }

    // Next month padding days to fill 35 or 42 cells grid
    const remaining = (7 - (days.length % 7)) % 7;
    for (let i = 1; i <= remaining; i++) {
      const nDate = new Date(year, month + 1, i);
      const key = `${nDate.getFullYear()}-${String(nDate.getMonth() + 1).padStart(2, "0")}-${String(
        nDate.getDate()
      ).padStart(2, "0")}`;
      days.push({ date: nDate, isCurrentMonth: false, key });
    }

    return days;
  }, [year, month]);

  // Total leads in the currently displayed month
  const totalLeadsThisMonth = useMemo(() => {
    return calendarDays
      .filter((d) => d.isCurrentMonth)
      .reduce((sum, d) => sum + (leadsByDate[d.key]?.length || 0), 0);
  }, [calendarDays, leadsByDate]);

  // Selected Date Key
  const selectedKey = `${selectedDate.getFullYear()}-${String(
    selectedDate.getMonth() + 1
  ).padStart(2, "0")}-${String(selectedDate.getDate()).padStart(2, "0")}`;

  const leadsForSelectedDate = leadsByDate[selectedKey] || [];

  // Month Name Formatter
  const monthName = currentDate.toLocaleString("default", { month: "long" }).toUpperCase();

  // Status Badge Helper
  const statusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case "won":
      case "replied":
        return "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20";
      case "lost":
      case "ghosted":
        return "bg-rose-500/10 text-rose-400 border border-rose-500/20";
      case "contacted":
      case "sent":
        return "bg-blue-500/10 text-blue-400 border border-blue-500/20";
      case "followed up":
      case "followed_up":
        return "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20";
      default:
        return "bg-amber-500/10 text-amber-400 border border-amber-500/20";
    }
  };

  return (
    <div className="space-y-5">
      {/* Top Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Search */}
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, email or company..."
            className="pl-10 bg-zinc-950/80 border-zinc-800/80 text-xs rounded-xl focus:border-blue-500 text-zinc-100 placeholder:text-zinc-600 h-10"
          />
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          {/* Status Dropdown */}
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="appearance-none bg-zinc-950/80 border border-zinc-800/80 text-xs font-mono font-medium text-zinc-300 pl-3.5 pr-8 py-2.5 rounded-xl cursor-pointer hover:border-zinc-700 transition-colors uppercase focus:outline-none"
            >
              <option value="all">STATUS: ALL</option>
              <option value="pending">STATUS: PENDING</option>
              <option value="sent">STATUS: SENT</option>
              <option value="followed_up">STATUS: FOLLOWED UP</option>
              <option value="replied">STATUS: REPLIED</option>
              <option value="ghosted">STATUS: GHOSTED</option>
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500 pointer-events-none" />
          </div>

          {/* Timeframe Dropdown */}
          <div className="flex items-center gap-1.5 bg-zinc-950/80 border border-zinc-800/80 text-xs font-mono font-medium text-zinc-300 px-3.5 py-2.5 rounded-xl cursor-pointer hover:border-zinc-700 transition-colors uppercase">
            <CalendarIcon className="w-3.5 h-3.5 text-zinc-400" />
            <span>ALL TIME</span>
          </div>

          {/* Filter Button */}
          <button className="w-10 h-10 rounded-xl bg-zinc-950/80 border border-zinc-800/80 flex items-center justify-center text-zinc-400 hover:text-white hover:border-zinc-700 transition-colors">
            <Filter className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Two-Column Calendar Grid + Side Detail View */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Interactive Month Calendar (7-8 cols) */}
        <Card className="lg:col-span-8 bg-zinc-950/90 border-zinc-800/80 rounded-2xl p-5 shadow-2xl flex flex-col justify-between">
          {/* Header Bar */}
          <div className="flex items-center justify-between pb-4 border-b border-zinc-800/60 mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
                <CalendarIcon className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold font-mono tracking-wider text-zinc-100 uppercase">
                  {monthName} {year}
                </h2>
                <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mt-0.5">
                  {totalLeadsThisMonth} LEADS THIS MONTH
                </p>
              </div>
            </div>

            {/* Navigation Arrows */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={handlePrevMonth}
                className="w-8 h-8 rounded-full bg-zinc-900/80 border border-zinc-800 flex items-center justify-center text-zinc-400 hover:text-white hover:border-zinc-700 transition-all"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={handleNextMonth}
                className="w-8 h-8 rounded-full bg-zinc-900/80 border border-zinc-800 flex items-center justify-center text-zinc-400 hover:text-white hover:border-zinc-700 transition-all"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Days of Week Header */}
          <div className="grid grid-cols-7 mb-2 text-center">
            {["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"].map((day) => (
              <div key={day} className="text-[10px] font-mono font-semibold text-zinc-500 tracking-wider py-1.5 uppercase">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Day Cells Grid */}
          <div className="grid grid-cols-7 gap-1.5">
            {calendarDays.map((dayObj) => {
              const dayLeads = leadsByDate[dayObj.key] || [];
              const isSelected = dayObj.key === selectedKey;
              const isToday =
                dayObj.date.toDateString() === new Date().toDateString() && dayObj.isCurrentMonth;

              return (
                <div
                  key={dayObj.key}
                  onClick={() => setSelectedDate(dayObj.date)}
                  className={`min-h-[85px] sm:min-h-[95px] p-2 rounded-xl border transition-all cursor-pointer flex flex-col justify-between relative group ${
                    isSelected
                      ? "border-blue-500/90 bg-blue-950/25 shadow-lg shadow-blue-500/10 ring-1 ring-blue-500/50"
                      : dayObj.isCurrentMonth
                      ? "border-zinc-800/60 bg-zinc-900/30 hover:border-zinc-700 hover:bg-zinc-900/60"
                      : "border-zinc-900/40 bg-zinc-950/40 opacity-40 hover:opacity-70"
                  }`}
                >
                  {/* Top Day Number & Today indicator */}
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-mono font-medium ${
                        isSelected
                          ? "text-blue-400 font-bold"
                          : isToday
                          ? "text-blue-400 font-bold"
                          : dayObj.isCurrentMonth
                          ? "text-zinc-400"
                          : "text-zinc-600"
                      }`}
                    >
                      {dayObj.date.getDate()}
                    </span>
                    {isToday && (
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-400 shadow-xs shadow-blue-400/50" />
                    )}
                  </div>

                  {/* Leads Stack inside Day Cell */}
                  <div className="mt-1 space-y-1 overflow-hidden">
                    {dayLeads.slice(0, 3).map((lead) => (
                      <div
                        key={lead.id}
                        className="px-1.5 py-0.5 rounded-md bg-zinc-900/90 border border-zinc-800/90 text-[9px] font-mono text-zinc-300 truncate flex items-center gap-1 group-hover:border-zinc-700"
                      >
                        <span className="w-1 h-1 rounded-full bg-blue-400 shrink-0" />
                        <span className="truncate uppercase font-medium">
                          {lead.companyName || lead.clientName || "Lead"}
                        </span>
                      </div>
                    ))}
                    {dayLeads.length > 3 && (
                      <div className="text-[9px] font-mono text-blue-400 font-bold px-1.5 py-0.2 uppercase">
                        +{dayLeads.length - 3} MORE
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Right Column: Selected Day Details Panel (4 cols) */}
        <Card className="lg:col-span-4 bg-zinc-950/90 border-zinc-800/80 rounded-2xl p-5 shadow-2xl flex flex-col h-full min-h-[500px]">
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-zinc-800/60 mb-4">
            <div>
              <h3 className="text-sm font-bold font-mono tracking-wider text-zinc-100 uppercase">
                {selectedDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }).toUpperCase()}
              </h3>
              <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mt-0.5">
                {leadsForSelectedDate.length} TOTAL INQUIRIES
              </p>
            </div>
            <div className="w-9 h-9 rounded-full bg-zinc-900/90 border border-zinc-800 flex items-center justify-center text-blue-400">
              <Clock className="w-4 h-4" />
            </div>
          </div>

          {/* List of Leads for Selected Date */}
          <div className="space-y-3.5 overflow-y-auto pr-1 flex-1 max-h-[580px]">
            {leadsForSelectedDate.length === 0 ? (
              <div className="py-20 text-center flex flex-col items-center justify-center gap-2 text-zinc-600">
                <CalendarIcon className="w-8 h-8 opacity-30" />
                <span className="text-xs font-mono uppercase">No inquiries on this date</span>
                <p className="text-[10px] font-mono text-zinc-600 max-w-[200px]">
                  Select another day with active leads on the calendar.
                </p>
              </div>
            ) : (
              leadsForSelectedDate.map((lead) => {
                const timeStr = lead.createdAt
                  ? new Date(lead.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                  : "N/A";
                const displayStatus = (lead.status || lead.draftStatus || "FOLLOWED UP").toUpperCase();

                return (
                  <div
                    key={lead.id}
                    onClick={() => onSelectLead(lead)}
                    className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800/80 hover:border-zinc-700 transition-all cursor-pointer group space-y-2.5"
                  >
                    {/* Top Row: Status Badge & Time */}
                    <div className="flex items-center justify-between">
                      <span className={`px-2 py-0.5 rounded-md text-[9px] font-mono font-bold uppercase tracking-wider ${statusBadge(lead.status)}`}>
                        {displayStatus}
                      </span>
                      <span className="text-[10px] font-mono text-zinc-500">{timeStr}</span>
                    </div>

                    {/* Company & Email */}
                    <div>
                      <h4 className="text-sm font-bold font-mono tracking-wide text-zinc-100 uppercase group-hover:text-blue-400 transition-colors">
                        {lead.companyName || "Unknown Company"}
                      </h4>
                      <p className="text-xs text-zinc-400 font-mono mt-0.5 truncate">
                        {lead.email || lead.clientName || "No contact info"}
                      </p>
                    </div>

                    {/* Bottom Row: Indicator & Label */}
                    <div className="flex items-center justify-between pt-2 border-t border-zinc-800/50 text-[10px] font-mono text-zinc-500">
                      <div className="flex items-center gap-1">
                        <span className="w-1.5 h-3 rounded-full bg-blue-500" />
                        <span className="w-1.5 h-3 rounded-full bg-blue-500/60" />
                        <span className="w-1.5 h-3 rounded-full bg-blue-500/40" />
                        <span className="w-1.5 h-3 rounded-full bg-blue-500/20" />
                      </div>
                      <span className="uppercase tracking-widest text-[9px] text-zinc-500">
                        {lead.leadCategory || "FOLLOW UPS"}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
