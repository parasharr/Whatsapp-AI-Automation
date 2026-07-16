"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Database, Settings, Sparkles, MessageSquare, Users, UserCheck, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Sidebar() {
  const pathname = usePathname();

  const navItems = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard, active: pathname === "/dashboard" },
    { name: "Knowledge Base", href: "/knowledge", icon: Database, active: pathname.startsWith("/knowledge") },
    { name: "Prompt Library", href: "/prompts", icon: Sparkles, active: pathname.startsWith("/prompts") },
    { name: "Conversation Viewer", href: "#", icon: MessageSquare, disabled: true },
    { name: "Lead Intelligence", href: "/leads", icon: Users, active: pathname.startsWith("/leads") },
    { name: "Human Handoff", href: "#", icon: UserCheck, disabled: true },

    { name: "Analytics", href: "#", icon: TrendingUp, disabled: true },
    { name: "Settings", href: "/settings", icon: Settings, active: pathname === "/settings" },
  ];

  return (
    <aside className="w-64 glass-panel border-r border-border h-screen sticky top-0 flex flex-col justify-between p-4 z-40">
      <div className="flex flex-col gap-8">
        {/* Brand */}
        <div className="flex items-center gap-2 px-2 py-1">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shadow-lg shadow-primary/30">
            <Sparkles className="w-4 h-4 text-primary-foreground animate-pulse" />
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-md text-foreground tracking-tight">Grox AI Agent</span>
            <span className="text-[10px] text-muted-foreground font-mono">CMS Dashboard v1.0</span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex flex-col gap-1.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            if (item.disabled) {
              return (
                <div
                  key={item.name}
                  className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg text-muted-foreground/35 cursor-not-allowed select-none group text-sm font-medium"
                >
                  <div className="flex items-center gap-3">
                    <Icon className="w-4.5 h-4.5" />
                    <span>{item.name}</span>
                  </div>
                  <span className="text-[9px] uppercase font-mono px-1 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-muted-foreground/40 scale-90">
                    Soon
                  </span>
                </div>
              );
            }

            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group",
                  item.active
                    ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                )}
              >
                <Icon className={cn("w-4.5 h-4.5", item.active ? "text-primary-foreground" : "text-muted-foreground group-hover:text-foreground")} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Footer info */}
      <div className="px-3 py-2 rounded-lg bg-zinc-900/50 border border-zinc-800/40 text-center">
        <span className="text-[10px] text-muted-foreground font-mono block">Status: Active</span>
      </div>
    </aside>
  );
}
