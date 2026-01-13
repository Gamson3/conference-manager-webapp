import React from "react";
import { cn } from "@/lib/utils";

type ContentShellVariant = "default" | "flush" | "right";

interface ContentShellProps {
  variant?: ContentShellVariant;
  className?: string;
  children: React.ReactNode;
}

// Shared content wrapper to keep consistent gutters and alignment.
// - "default": matches top navbar container (centered within viewport)
// - "flush": padding only, no centering/max-width (ideal for per-conference after sidebars)
// - "right": max-width like container but right-aligned (ml-auto) to match TopNav right edge
export default function ContentShell({
  variant = "default",
  className,
  children,
}: ContentShellProps) {
  const base =
    variant === "flush"
      ? cn(
        // Per-conference console: full-width content (no max-width),
        // but gutters should match the global app-container (16px / 24px).
        "px-4 sm:px-6",

        // Prevent container centering + eliminate max-width constraints
        "w-full max-w-none",

        "py-6"
      )
      : variant === "right"
      ? "mr-19 sm:pr-6 lg:pr-4 py-6"
      : // Default layout (same horizontal gutters as TopNav)
        "app-container py-6";

  return <div className={cn(base, className)}>{children}</div>;
}
