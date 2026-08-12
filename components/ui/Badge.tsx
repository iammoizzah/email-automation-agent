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
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        tone === "neutral" && "bg-slate-50 text-slate-700 border-slate-200",
        tone === "success" && "bg-emerald-50 text-emerald-700 border-emerald-200",
        tone === "warning" && "bg-amber-50 text-amber-700 border-amber-200",
        tone === "danger" && "bg-rose-50 text-rose-700 border-rose-200",
        tone === "info" && "bg-indigo-50 text-indigo-700 border-indigo-200",
        className
      )}
      {...props}
    />
  );
}
