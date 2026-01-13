"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface LandingContainerProps {
  children: React.ReactNode;
  className?: string;
  size?: "text" | "default" | "wide" | "full";
}

/**
 * LandingContainer
 *
 * Uses the global `.app-container` utility from `globals.css`:
 * - max-width: 1328px
 * - centered (mx-auto)
 * - px-4 on mobile, px-6 on ≥640px
 * - width: 100%
 */
export function LandingContainer({
  children,
  className,
}: LandingContainerProps) {
  return (
    <div
      className={cn(
        "app-container",
        className
      )}
    >
      {children}
    </div>
  );
}

export default LandingContainer;
