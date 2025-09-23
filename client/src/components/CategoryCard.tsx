"use client";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { type LucideIcon } from "lucide-react";

interface CategoryCardProps {
  icon: LucideIcon;
  name: string;
  count?: number | null;
  onClick?: () => void;
  className?: string;
  asButton?: boolean;
}

export default function CategoryCard({
  icon: Icon,
  name,
  count,
  onClick,
  className,
  asButton = false,
}: CategoryCardProps) {
  return (
    <Card
      role={asButton ? "button" : "group"}
      tabIndex={asButton ? 0 : -1}
      onClick={onClick}
      onKeyDown={(e) => asButton && e.key === "Enter" && onClick?.()}
      className={cn(
        "relative h-full cursor-pointer select-none border bg-card hover:bg-muted/50 transition-colors",
        "rounded-xl p-4 focus:outline-none focus:ring-2 focus:ring-primary/40",
        className
      )}
    >
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 rounded-lg border flex items-center justify-center">
          <Icon className="h-5 w-5 text-primary" />
        </div>
      </div>
      <div className="mt-4">
        <h3 className="font-semibold text-foreground">{name}</h3>
        <p className="text-sm text-muted-foreground mt-1">
          {typeof count === "number" ? `${count} events` : "—"}
        </p>
      </div>
    </Card>
  );
}