// components/ui/Badge.tsx
import { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: "neutral" | "success" | "warning" | "danger" | "info";
}

export function Badge({ className, tone = "neutral", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium",
        tone === "neutral" && "bg-slate-800 text-slate-300",
        tone === "success" && "bg-emerald-500/15 text-emerald-400",
        tone === "warning" && "bg-amber-500/15 text-amber-400",
        tone === "danger" && "bg-rose-500/15 text-rose-400",
        tone === "info" && "bg-indigo-500/15 text-indigo-400",
        className
      )}
      {...props}
    />
  );
}
