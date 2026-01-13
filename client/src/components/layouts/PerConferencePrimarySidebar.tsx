"use client";

import React from "react";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  Home,
  Settings2,
  FileText,
  Globe2,
  ClipboardList,
  type LucideIcon,
} from "lucide-react";

// Final IA modules for primary sidebar (icon-only rail):
// Home | Settings | Registration | Abstracts | Website
// Note: Program and Reports are now nested under Home in the secondary sidebar
type PrimaryKey =
  | "home"
  | "settings"
  | "registration"
  | "abstracts"
  | "website";

const items: Array<{
  key: PrimaryKey;
  label: string;
  icon: LucideIcon;
  to: (id: string) => string;
}> = [
  { key: "home", label: "Home", icon: Home, to: (id) => `/organizer/conferences/${id}/home` },
  { key: "settings", label: "Settings", icon: Settings2, to: (id) => `/organizer/conferences/${id}/settings/basics` },
  { key: "registration", label: "Registration", icon: ClipboardList, to: (id) => `/organizer/conferences/${id}/registration/overview` },
  { key: "abstracts", label: "Abstracts", icon: FileText, to: (id) => `/organizer/conferences/${id}/abstracts/overview` },
  { key: "website", label: "Website", icon: Globe2, to: (id) => `/organizer/conferences/${id}/website` },
];

function detectActive(pathname: string, id: string): PrimaryKey {
  if (
    pathname.startsWith(`/organizer/conferences/${id}/settings`)
  ) return "settings";
  if (
    pathname.startsWith(`/organizer/conferences/${id}/registration`)
  ) return "registration";
  if (
    pathname.startsWith(`/organizer/conferences/${id}/abstracts`)
  ) return "abstracts";
  if (
    pathname.startsWith(`/organizer/conferences/${id}/website`)
  ) return "website";
  // Program and Reports now nested under Home - keep Home active for these paths
  if (pathname.startsWith(`/organizer/conferences/${id}/program`)) return "home";
  if (pathname.startsWith(`/organizer/conferences/${id}/reports`)) return "home";
  if (pathname.startsWith(`/organizer/conferences/${id}/home`)) return "home";
  // fallback to home for conference root
  if (pathname === `/organizer/conferences/${id}`) return "home";
  return "home";
}

export default function PerConferencePrimarySidebar() {
  const pathname = usePathname();
  const params = useParams();
  const rawId = (params as Record<string, string | string[] | undefined>)?.id;
  const confId = Array.isArray(rawId) ? rawId[0] : rawId;
  if (!confId) return null;
  const active = detectActive(pathname, String(confId));

  return (
    <aside
      className={cn(
        "hidden md:flex w-16 shrink-0 flex-col items-center gap-3 border-r py-6 pl-0",
        "bg-gradient-to-b from-background to-muted/30",
        "backdrop-blur-md supports-[backdrop-filter]:bg-background/60",
        "shadow-sm border-white/10 dark:border-white/5",
        "min-h-[calc(100vh-3.5rem)]",          // ensure full vertical stretch under top nav
        "fixed top-[3.5rem] left-0 z-30"   // fixed below top nav
      )}
    >
      <TooltipProvider delayDuration={100}>
        {items.map(({ key, label, icon: Icon, to }) => {
          const href = to(String(confId));
          const isActive = key === active;
          return (
            <Tooltip key={key}>
              <TooltipTrigger asChild>
                <Link
                  href={href}
                  className={cn(
                    "relative flex h-10 w-10 items-center justify-center rounded-md transition-all duration-200",
                    isActive
                      ? "bg-primary/10 text-primary shadow-sm"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  )}
                >
                  {isActive && (
                    <span className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-full bg-primary" />
                  )}
                  <Icon className="h-5 w-5" />
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right" className="text-sm">
                {label}
              </TooltipContent>
            </Tooltip>
          );
        })}
      </TooltipProvider>
    </aside>
  );
}
