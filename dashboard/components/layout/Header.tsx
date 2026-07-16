"use client";

import { usePathname } from "next/navigation";
import { Activity } from "lucide-react";

export default function Header() {
  const pathname = usePathname();

  const getPageTitle = () => {
    if (pathname === "/dashboard") return "Dashboard Overview";
    if (pathname === "/knowledge") return "Knowledge Base";
    if (pathname === "/knowledge/new") return "Create Knowledge Entry";
    if (pathname === "/settings") return "System Settings";
    if (pathname.includes("/knowledge/") && !pathname.endsWith("/new")) {
      return "Edit Knowledge Entry";
    }
    return "Knowledge Management";
  };

  return (
    <header className="h-16 border-b border-border bg-background/50 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-30">
      <div className="flex flex-col">
        <h1 className="text-base font-semibold text-foreground tracking-tight">{getPageTitle()}</h1>
      </div>

      <div className="flex items-center gap-4">
        {/* Firestore status indicator */}
        <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-[11px] text-muted-foreground">
          <Activity className="w-3.5 h-3.5 text-emerald-500 animate-pulse" />
          <span>Firestore Connected</span>
        </div>
      </div>
    </header>
  );
}
