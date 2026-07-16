import * as React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "secondary" | "destructive" | "outline" | "accent";
}

function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-hidden",
        {
          "border-transparent bg-primary text-primary-foreground shadow-sm":
            variant === "default",
          "border-transparent bg-secondary text-secondary-foreground":
            variant === "secondary",
          "border-transparent bg-destructive text-destructive-foreground shadow-sm":
            variant === "destructive",
          "border border-border text-foreground": variant === "outline",
          "bg-blue-500/10 text-blue-400 border border-blue-500/25":
            variant === "accent",
        },
        className
      )}
      {...props}
    />
  );
}

export { Badge };
