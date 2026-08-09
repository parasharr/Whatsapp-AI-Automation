"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Card } from "@/components/ui/card";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

interface LeadStatsOverviewProps {
  leads: any[];
}

type Timeframe = "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY";

export default function LeadStatsOverview({ leads }: LeadStatsOverviewProps) {
  const [isMounted, setIsMounted] = useState(false);
  const [timeframe, setTimeframe] = useState<Timeframe>("DAILY");

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // -------------------------------------------------------------
  // 1. LEADS ADDED CHART DATA (Real Calculation based on timeframe)
  // -------------------------------------------------------------
  const leadsAddedData = useMemo(() => {
    if (timeframe === "DAILY") {
      const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      const counts: Record<string, number> = { Sun: 0, Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0, Sat: 0 };

      const now = new Date();
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());
      startOfWeek.setHours(0, 0, 0, 0);

      leads.forEach((lead) => {
        if (!lead.createdAt) return;
        const created = new Date(lead.createdAt);
        if (created >= startOfWeek) {
          const dayName = days[created.getDay()];
          counts[dayName] = (counts[dayName] || 0) + 1;
        }
      });

      return days.map((d) => ({ name: d, leads: counts[d] }));
    }

    if (timeframe === "WEEKLY") {
      // Past 5 weeks
      const weeks = ["Week 28", "Week 29", "Week 30", "Week 31", "Week 32"];
      const counts: Record<string, number> = {};
      weeks.forEach((w) => (counts[w] = 0));

      leads.forEach((lead) => {
        if (!lead.createdAt) return;
        const created = new Date(lead.createdAt);
        // Simple week bucket
        const weekNum = getWeekNumber(created);
        const weekKey = `Week ${weekNum}`;
        if (counts[weekKey] !== undefined) {
          counts[weekKey] += 1;
        }
      });

      return weeks.map((w) => ({ name: w, leads: counts[w] || 0 }));
    }

    if (timeframe === "MONTHLY") {
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const currentMonth = new Date().getMonth();
      const last6Months = [];
      for (let i = 5; i >= 0; i--) {
        const mIdx = (currentMonth - i + 12) % 12;
        last6Months.push(months[mIdx]);
      }

      const counts: Record<string, number> = {};
      last6Months.forEach((m) => (counts[m] = 0));

      leads.forEach((lead) => {
        if (!lead.createdAt) return;
        const created = new Date(lead.createdAt);
        const mName = months[created.getMonth()];
        if (counts[mName] !== undefined) {
          counts[mName] += 1;
        }
      });

      return last6Months.map((m) => ({ name: m, leads: counts[m] || 0 }));
    }

    // YEARLY
    const years = ["2024", "2025", "2026"];
    const counts: Record<string, number> = { "2024": 0, "2025": 0, "2026": 0 };

    leads.forEach((lead) => {
      if (!lead.createdAt) return;
      const created = new Date(lead.createdAt);
      const yStr = created.getFullYear().toString();
      if (counts[yStr] !== undefined) {
        counts[yStr] += 1;
      }
    });

    return years.map((y) => ({ name: y, leads: counts[y] }));
  }, [leads, timeframe]);

  // -------------------------------------------------------------
  // 2. LEAD STATUS DISTRIBUTION (Donut + Stacked Legend)
  // -------------------------------------------------------------
  const statusDistribution = useMemo(() => {
    let pending = 0;
    let sent = 0;
    let followedUp = 0;
    let replied = 0;
    let ghosted = 0;

    leads.forEach((l) => {
      const st = (l.status || "").toLowerCase();
      const dr = (l.draftStatus || "").toLowerCase();
      const followCount = l.followUpCount || l.followUps?.length || 0;

      if (st === "replied" || st === "won" || l.replied) {
        replied++;
      } else if (st === "ghosted" || st === "lost" || st === "archived") {
        ghosted++;
      } else if (followCount > 0 || st === "followed up" || st === "followed_up") {
        followedUp++;
      } else if (dr === "created" || st === "sent" || st === "contacted") {
        sent++;
      } else {
        // Default to pending / new
        pending++;
      }
    });

    const total = pending + sent + followedUp + replied + ghosted;

    const data = [
      { name: "Pending", value: pending, color: "#f59e0b" },
      { name: "Sent", value: sent, color: "#3b82f6" },
      { name: "Followed Up", value: followedUp, color: "#8b5cf6" },
      { name: "Replied", value: replied, color: "#10b981" },
      { name: "Ghosted", value: ghosted, color: "#f43f5e" },
    ];

    return data.map((item) => ({
      ...item,
      percentage: total > 0 ? Math.round((item.value / total) * 100) : 0,
    }));
  }, [leads]);

  // Fallback pie data if total === 0 to render an elegant ring
  const pieChartData = useMemo(() => {
    const total = statusDistribution.reduce((acc, curr) => acc + curr.value, 0);
    if (total === 0) {
      // Equal distribution ring placeholders for empty state aesthetic
      return [
        { name: "Pending", value: 1, color: "#3b82f6" },
        { name: "Sent", value: 1, color: "#f43f5e" },
      ];
    }
    return statusDistribution.filter((d) => d.value > 0);
  }, [statusDistribution]);

  // -------------------------------------------------------------
  // 3. FOLLOW-UP ACTIVITY DATA (Weekly Efficiency)
  // -------------------------------------------------------------
  const followUpActivityData = useMemo(() => {
    const weeks = ["Week 28", "Week 29", "Week 30", "Week 31", "Week 32"];
    const counts: Record<string, number> = {};
    weeks.forEach((w) => (counts[w] = 0));

    leads.forEach((lead) => {
      const created = lead.createdAt ? new Date(lead.createdAt) : null;
      if (created) {
        const weekNum = getWeekNumber(created);
        const wKey = `Week ${weekNum}`;
        const followCount = lead.followUpCount || lead.followUps?.length || (lead.status === "followed up" ? 1 : 0);
        if (counts[wKey] !== undefined) {
          counts[wKey] += followCount;
        }
      }
    });

    return weeks.map((w) => ({
      name: w,
      activity: counts[w] || 0,
    }));
  }, [leads]);

  // -------------------------------------------------------------
  // 4. REPLY RATE TREND DATA (Monthly Conversion %)
  // -------------------------------------------------------------
  const replyRateData = useMemo(() => {
    const months = ["Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug"];
    const monthStats: Record<string, { total: number; replied: number }> = {};
    months.forEach((m) => (monthStats[m] = { total: 0, replied: 0 }));

    leads.forEach((lead) => {
      if (!lead.createdAt) return;
      const created = new Date(lead.createdAt);
      const mNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const mName = mNames[created.getMonth()];

      if (monthStats[mName]) {
        monthStats[mName].total += 1;
        const st = (lead.status || "").toLowerCase();
        if (st === "replied" || st === "won" || lead.replied) {
          monthStats[mName].replied += 1;
        }
      }
    });

    return months.map((m) => {
      const stat = monthStats[m];
      const rate = stat.total > 0 ? Math.round((stat.replied / stat.total) * 100) : 0;
      return {
        name: m,
        rate: rate,
      };
    });
  }, [leads]);

  if (!isMounted) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-64 rounded-xl bg-zinc-900/40 border border-zinc-800 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* ------------------------------------------------------------- */}
      {/* CARD 1: LEADS ADDED (growth performance)                     */}
      {/* ------------------------------------------------------------- */}
      <Card className="bg-zinc-950/80 border-zinc-800/80 rounded-2xl p-5 shadow-xl flex flex-col justify-between">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-xs font-bold font-mono tracking-wider text-zinc-100 uppercase flex items-center gap-1.5">
              LEADS ADDED <span className="text-zinc-500 font-normal lowercase">({timeframe.toLowerCase()})</span>
            </h3>
            <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mt-0.5">
              GROWTH PERFORMANCE
            </p>
          </div>

          {/* Timeframe Toggle Buttons */}
          <div className="flex items-center p-0.5 rounded-lg bg-zinc-900 border border-zinc-800 text-[10px] font-mono">
            {(["DAILY", "WEEKLY", "MONTHLY", "YEARLY"] as Timeframe[]).map((tf) => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                className={`px-2.5 py-1 rounded-md transition-all uppercase ${
                  timeframe === tf
                    ? "bg-zinc-800 text-white font-semibold shadow-xs"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                {tf}
              </button>
            ))}
          </div>
        </div>

        <div className="h-[180px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={leadsAddedData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
              <defs>
                <linearGradient id="leadsGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
              <XAxis
                dataKey="name"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#71717a", fontSize: 10, fontFamily: "monospace" }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#71717a", fontSize: 10, fontFamily: "monospace" }}
                domain={[0, "auto"]}
                allowDecimals={true}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#18181b",
                  borderColor: "#27272a",
                  borderRadius: "8px",
                  fontSize: "12px",
                  color: "#f4f4f5",
                }}
                itemStyle={{ color: "#3b82f6" }}
              />
              <Area
                type="monotone"
                dataKey="leads"
                stroke="#3b82f6"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#leadsGradient)"
                activeDot={{ r: 5, fill: "#3b82f6", stroke: "#ffffff", strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* ------------------------------------------------------------- */}
      {/* CARD 2: LEAD STATUS (Current Distribution)                   */}
      {/* ------------------------------------------------------------- */}
      <Card className="bg-zinc-950/80 border-zinc-800/80 rounded-2xl p-5 shadow-xl flex flex-col justify-between">
        <div className="mb-3">
          <h3 className="text-xs font-bold font-mono tracking-wider text-zinc-100 uppercase">
            LEAD STATUS
          </h3>
          <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mt-0.5">
            CURRENT DISTRIBUTION
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center h-[180px]">
          {/* Donut Chart */}
          <div className="sm:col-span-5 h-full flex items-center justify-center relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieChartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={78}
                  paddingAngle={4}
                  dataKey="value"
                  stroke="none"
                >
                  {pieChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#18181b",
                    borderColor: "#27272a",
                    borderRadius: "8px",
                    fontSize: "12px",
                    color: "#f4f4f5",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Status Pills Legend Stack */}
          <div className="sm:col-span-7 flex flex-col gap-1.5 justify-center">
            {statusDistribution.map((item) => (
              <div
                key={item.name}
                className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-zinc-900/60 border border-zinc-800/80 text-xs font-mono"
              >
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                  <span className="text-zinc-300 font-medium">{item.name}</span>
                </div>
                <div className="flex items-center gap-2 text-zinc-400 font-mono">
                  <span className="font-bold text-white text-xs">{item.value}</span>
                  <span className="text-[10px] text-zinc-500 w-7 text-right">{item.percentage}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* ------------------------------------------------------------- */}
      {/* CARD 3: FOLLOW-UP ACTIVITY (Efficiency Over Time)            */}
      {/* ------------------------------------------------------------- */}
      <Card className="bg-zinc-950/80 border-zinc-800/80 rounded-2xl p-5 shadow-xl flex flex-col justify-between">
        <div className="mb-4">
          <h3 className="text-xs font-bold font-mono tracking-wider text-zinc-100 uppercase">
            FOLLOW-UP ACTIVITY
          </h3>
          <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mt-0.5">
            EFFICIENCY OVER TIME (WEEKLY)
          </p>
        </div>

        <div className="h-[180px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={followUpActivityData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
              <XAxis
                dataKey="name"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#71717a", fontSize: 10, fontFamily: "monospace" }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#71717a", fontSize: 10, fontFamily: "monospace" }}
                domain={[0, 1.0]}
                ticks={[0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0]}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#18181b",
                  borderColor: "#27272a",
                  borderRadius: "8px",
                  fontSize: "12px",
                  color: "#f4f4f5",
                }}
                itemStyle={{ color: "#3b82f6" }}
              />
              <Line
                type="monotone"
                dataKey="activity"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={{ r: 3, fill: "#3b82f6" }}
                activeDot={{ r: 5, fill: "#3b82f6", stroke: "#ffffff", strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* ------------------------------------------------------------- */}
      {/* CARD 4: REPLY RATE TREND (Conversion Performance %)           */}
      {/* ------------------------------------------------------------- */}
      <Card className="bg-zinc-950/80 border-zinc-800/80 rounded-2xl p-5 shadow-xl flex flex-col justify-between">
        <div className="mb-4">
          <h3 className="text-xs font-bold font-mono tracking-wider text-zinc-100 uppercase">
            REPLY RATE TREND
          </h3>
          <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mt-0.5">
            CONVERSION PERFORMANCE (%)
          </p>
        </div>

        <div className="h-[180px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={replyRateData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
              <XAxis
                dataKey="name"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#71717a", fontSize: 10, fontFamily: "monospace" }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#71717a", fontSize: 10, fontFamily: "monospace" }}
                domain={[0, 100]}
                ticks={[0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100]}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#18181b",
                  borderColor: "#27272a",
                  borderRadius: "8px",
                  fontSize: "12px",
                  color: "#f4f4f5",
                }}
                formatter={(value: any) => [`${value}%`, "Reply Rate"]}
              />
              <Line
                type="monotone"
                dataKey="rate"
                stroke="#10b981"
                strokeWidth={2}
                dot={{ r: 3, fill: "#10b981" }}
                activeDot={{ r: 5, fill: "#10b981", stroke: "#ffffff", strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
}

// Helper function to calculate ISO week number
function getWeekNumber(d: Date) {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}
