// components/ui/Button.tsx
"use client";

import { ButtonHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md" | "lg";
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
          variant === "primary" && "bg-indigo-600 text-white hover:bg-indigo-700",
          variant === "secondary" &&
            "bg-white text-slate-700 border border-slate-300 hover:bg-slate-50",
          variant === "ghost" && "bg-transparent text-slate-700 hover:text-slate-900",
          size === "sm" && "text-sm px-3 py-1.5",
          size === "md" && "text-base px-4 py-2",
          size === "lg" && "text-lg px-6 py-3",
          className
        )}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button };
