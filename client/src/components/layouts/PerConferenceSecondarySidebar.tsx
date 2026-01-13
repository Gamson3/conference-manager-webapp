"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useParams } from "next/navigation";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  CalendarDays,
  CalendarRange,
  Users,
  Tags,
  Shapes,
  ClipboardList,
  Settings2,
  ChevronLeft,
  ChevronRight,
  FileText,
  Upload,
  Edit,
  Files,
  ListChecks,
  Plus,
  Minus,
  BarChart2,
  type LucideIcon,
} from "lucide-react";

// --------------------------------------------
// TYPES
// --------------------------------------------

interface SubLink {
  label: string;
  icon?: LucideIcon;
  href: (id: string) => string;
  match: (pathname: string, id: string) => boolean;
}

interface NestedLinkGroup {
  label: string;
  icon?: LucideIcon;
  collapsible?: boolean;
  children?: SubLink[];
  href?: (id: string) => string;
  match?: (pathname: string, id: string) => boolean;
}

interface GroupConfig {
  heading: string;
  links?: SubLink[];
  nested?: NestedLinkGroup[];
}

// Sidebar groups and links
// Final agreed IA modules for secondary sidebar:
// Home (with nested Program & Reports) | Settings | Registration | Abstracts | Website
// Note: Program and Reports are nested under Home as collapsible groups
type GroupKey =
  | "home"
  | "settings"
  | "registration"
  | "abstracts"
  | "website";

// --------------------------------------------
// GROUP CONFIG
// --------------------------------------------

const groups: Record<GroupKey, GroupConfig> = {
  home: {
    heading: "Home",
    nested: [
      {
        label: "Dashboard",
        icon: LayoutDashboard,
        href: (id) => `/organizer/conferences/${id}/home`,
        match: (p, id) => p === `/organizer/conferences/${id}/home`,
      },
      {
        label: "People",
        icon: Users,
        href: (id) => `/organizer/conferences/${id}/home/people`,
        match: (p, id) =>
          p.startsWith(`/organizer/conferences/${id}/home/people`) ||
          p.startsWith(`/organizer/conferences/${id}/home/participants`),
      },
      {
        label: "Submissions",
        icon: FileText,
        href: (id) => `/organizer/conferences/${id}/home/submissions`,
        match: (p, id) =>
          p.startsWith(`/organizer/conferences/${id}/home/submissions`),
      },
      {
        label: "Program",
        icon: CalendarDays,
        collapsible: true,
        children: [
          {
            label: "Overview",
            href: (id) => `/organizer/conferences/${id}/home/program`,
            match: (p, id) =>
              p === `/organizer/conferences/${id}/home/program`,
          },
          {
            label: "Sessions",
            href: (id) => `/organizer/conferences/${id}/home/program/sessions`,
            match: (p, id) =>
              p.startsWith(`/organizer/conferences/${id}/home/program/sessions`),
          },
          {
            label: "Scheduler",
            href: (id) => `/organizer/conferences/${id}/home/program/scheduler`,
            match: (p, id) =>
              p.startsWith(`/organizer/conferences/${id}/home/program/scheduler`),
          },
        ],
      },
      {
        label: "Reports",
        icon: BarChart2,
        collapsible: true,
        children: [
          {
            label: "Exports",
            href: (id) => `/organizer/conferences/${id}/home/reports/exports`,
            match: (p, id) =>
              p.startsWith(`/organizer/conferences/${id}/home/reports/exports`),
          },
          {
            label: "Analytics",
            href: (id) => `/organizer/conferences/${id}/home/reports/analytics`,
            match: (p, id) =>
              p.startsWith(`/organizer/conferences/${id}/home/reports/analytics`),
          },
        ],
      },
    ],
  },

  settings: {
    heading: "Settings",
    links: [
      {
        label: "Conference Basics",
        icon: Settings2,
        href: (id) => `/organizer/conferences/${id}/settings/basics`,
        match: (p, id) =>
          p.startsWith(`/organizer/conferences/${id}/settings/basics`),
      },
      {
        label: "Organizer Info",
        icon: Users,
        href: (id) => `/organizer/conferences/${id}/settings/organizer-info`,
        match: (p, id) =>
          p.startsWith(`/organizer/conferences/${id}/settings/organizer-info`),
      },
      {
        label: "Key Dates & Deadlines",
        icon: CalendarRange,
        href: (id) => `/organizer/conferences/${id}/settings/deadlines`,
        match: (p, id) =>
          p.startsWith(`/organizer/conferences/${id}/settings/deadlines`),
      },
      {
        label: "Publish",
        icon: Upload,
        href: (id) => `/organizer/conferences/${id}/settings/publish`,
        match: (p, id) =>
          p.startsWith(`/organizer/conferences/${id}/settings/publish`),
      },
    ],
  },

  registration: {
    heading: "Registration",
    links: [
      {
        label: "Overview",
        icon: LayoutDashboard,
        href: (id) => `/organizer/conferences/${id}/registration/overview`,
        match: (p, id) =>
          p.startsWith(`/organizer/conferences/${id}/registration/overview`),
      },
      {
        label: "Registration Settings",
        icon: Settings2,
        href: (id) => `/organizer/conferences/${id}/registration/settings`,
        match: (p, id) =>
          p.startsWith(`/organizer/conferences/${id}/registration/settings`),
      },
      {
        label: "Registration Form Builder",
        icon: ClipboardList,
        href: (id) => `/organizer/conferences/${id}/registration/form`,
        match: (p, id) =>
          p.startsWith(`/organizer/conferences/${id}/registration/form`),
      },
      {
        label: "Custom Questions",
        icon: ListChecks,
        href: (id) => `/organizer/conferences/${id}/registration/custom-questions`,
        match: (p, id) =>
          p.startsWith(`/organizer/conferences/${id}/registration/custom-questions`),
      },
      {
        label: "Registration Deadlines",
        icon: CalendarRange,
        href: (id) => `/organizer/conferences/${id}/registration/deadlines`,
        match: (p, id) =>
          p.startsWith(`/organizer/conferences/${id}/registration/deadlines`),
      },
    ],
  },

  abstracts: {
    heading: "Abstracts",

    nested: [
      {
        label: "Overview",
        icon: LayoutDashboard,
        href: (id) => `/organizer/conferences/${id}/abstracts/overview`,
        match: (p, id) =>
          p.startsWith(`/organizer/conferences/${id}/abstracts/overview`) ||
          p.startsWith(`/organizer/conferences/${id}/submissions`),
      },
      {
        label: "Topics & Categories",
        icon: Tags,
        href: (id) => `/organizer/conferences/${id}/abstracts/topics-and-categories`,
        match: (p, id) =>
          p.startsWith(`/organizer/conferences/${id}/abstracts/topics-and-categories`),
      },
      {
        label: "Presentation Types",
        icon: Shapes,
        href: (id) => `/organizer/conferences/${id}/abstracts/presentation-types`,
        match: (p, id) =>
          p.startsWith(`/organizer/conferences/${id}/abstracts/presentation-types`),
      },
      {
        label: "Submission Form Settings",
        icon: ClipboardList,
        href: (id) => `/organizer/conferences/${id}/abstracts/submission-form-settings`,
        match: (p, id) =>
          p.startsWith(`/organizer/conferences/${id}/abstracts/submission-form-settings`),
      },
      {
        label: "Submission Dates & Limits",
        icon: CalendarRange,
        href: (id) =>
          `/organizer/conferences/${id}/abstracts/submission-dates-limits`,
        match: (p, id) =>
          p.startsWith(
            `/organizer/conferences/${id}/abstracts/submission-dates-limits`
          ),
      },
      {
        label: "Export Submissions",
        icon: FileText,
        href: (id) => `/organizer/conferences/${id}/abstracts/export`,
        match: (p, id) =>
          p.startsWith(`/organizer/conferences/${id}/abstracts/export`),
      },
    ],
  },

  website: {
    heading: "Website",
    links: [
      {
        label: "Overview",
        icon: LayoutDashboard,
        href: (id) => `/organizer/conferences/${id}/website`,
        match: (p, id) =>
          p === `/organizer/conferences/${id}/website`,
      },
      {
        label: "Public Page",
        icon: Edit,
        href: (id) => `/organizer/conferences/${id}/website/public`,
        match: (p, id) =>
          p.startsWith(`/organizer/conferences/${id}/website/public`),
      },
      {
        label: "CFP Content",
        icon: FileText,
        href: (id) => `/organizer/conferences/${id}/website/cfp`,
        match: (p, id) =>
          p.startsWith(`/organizer/conferences/${id}/website/cfp`),
      },
      {
        label: "Materials",
        icon: Files,
        href: (id) => `/organizer/conferences/${id}/website/materials`,
        match: (p, id) =>
          p.startsWith(`/organizer/conferences/${id}/website/materials`),
      },
      {
        label: "Visibility",
        icon: Upload,
        href: (id) => `/organizer/conferences/${id}/website/visibility`,
        match: (p, id) =>
          p.startsWith(`/organizer/conferences/${id}/website/visibility`),
      },
    ],
  },
};

// --------------------------------------------
// DETECT ACTIVE GROUP
// --------------------------------------------

function detectPrimary(pathname: string, id: string): GroupKey {
  if (pathname.startsWith(`/organizer/conferences/${id}/home`)) return "home";
  if (pathname === `/organizer/conferences/${id}`) return "home";

  if (pathname.startsWith(`/organizer/conferences/${id}/settings`)) return "settings";
  if (pathname.startsWith(`/organizer/conferences/${id}/registration`)) return "registration";

  if (pathname.startsWith(`/organizer/conferences/${id}/abstracts`)) return "abstracts";
  // legacy mapping to keep abstracts group active
  if (pathname.startsWith(`/organizer/conferences/${id}/submissions`)) return "abstracts";

  // Program and Reports are now nested under Home
  if (pathname.startsWith(`/organizer/conferences/${id}/program`)) return "home";
  if (pathname.startsWith(`/organizer/conferences/${id}/reports`)) return "home";

  if (pathname.startsWith(`/organizer/conferences/${id}/website`)) return "website";

  return "home";
}

// --------------------------------------------
// COMPONENT
// --------------------------------------------

export default function PerConferenceSecondarySidebar({
  collapsed,
  toggleSidebar,
}: {
  collapsed: boolean;
  toggleSidebar: () => void;
}) {
  const pathname = usePathname();
  const params = useParams();
  const rawId = (params as Record<string, string | string[] | undefined>)?.id;
  const confId = Array.isArray(rawId) ? rawId[0] : rawId;

  // ensure hooks are always called in same order (do not early return before hooks)
  const [openGroups, setOpenGroups] = React.useState<Record<string, boolean>>(
    {}
  );

  // compute id & group early so hooks can reference them safely
  const id = confId ? String(confId) : "";
  const primary = detectPrimary(pathname, id);
  const group = groups[primary];

  // Auto-open collapsible groups when a child is active
  // NOTE: effect always runs (hook not conditional); it guards internally
  React.useEffect(() => {
    if (!group || !group.nested || !id) {
      return;
    }

    const newState: Record<string, boolean> = {};

    group.nested.forEach((g) => {
      if (!g.collapsible || !g.children) return;

      const childActive = g.children.some((child) =>
        child.match(pathname, id)
      );

      if (childActive) newState[g.label] = true;
    });

    // only update if any changes (avoids re-renders)
    setOpenGroups((prev) => {
      const merged = { ...prev, ...newState };
      // shallow compare
      const same =
        Object.keys(merged).length === Object.keys(prev).length &&
        Object.keys(merged).every((k) => merged[k] === prev[k]);
      return same ? prev : merged;
    });
  }, [pathname, group, id]);

  // only after hooks
  if (!confId) return null;
  if (!group) return null;

  return (
    <aside
      className={cn(
        "flex flex-col border-r bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60",
        "transition-all duration-300 ease-in-out shadow-sm",
        collapsed ? "w-16" : "w-64",
        "min-h-[calc(100vh-3.5rem)]",
        "fixed top-[3.5rem] left-16 z-20"
      )}
    >
      <button
        type="button"
        onClick={toggleSidebar}
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        className="absolute -right-3 top-3 z-10 inline-flex h-7 w-7 items-center justify-center rounded-full border bg-background shadow hover:bg-muted"
      >
        {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
      </button>

      <div className="flex-1 overflow-y-auto py-5 px-3 flex flex-col justify-between">
        <div>
          <div
            className={cn(
              "mb-6 text-xs font-semibold text-muted-foreground px-3 uppercase tracking-wide transition-opacity duration-200",
              collapsed && "opacity-0"
            )}
          >
            {group.heading}
          </div>

          <nav className="flex flex-col gap-2">
            {/* Regular links */}
            {group.links &&
              group.links.map((l) => {
                const href = l.href(id);
                const active = l.match(pathname, id);
                const Icon = l.icon;
                return (
                  <Link
                    key={href}
                    href={href}
                    className={cn(
                      "flex items-center rounded-md px-3 py-2 text-sm transition-colors duration-150",
                      active
                        ? "bg-primary/10 text-primary font-medium"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                    )}
                  >
                    {Icon && <Icon className="h-4 w-4 shrink-0" />}
                    <span
                      className={cn(
                        "ml-2 transition-opacity duration-200",
                        collapsed ? "opacity-0" : "opacity-100"
                      )}
                    >
                      {l.label}
                    </span>
                  </Link>
                );
              })}

            {/* Nested groups (Abstracts) */}
            {group.nested &&
              group.nested.map((g) => {
                const isActive =
                  (g.match && g.match(pathname, id)) ||
                  (g.children && g.children.some((c) => c.match(pathname, id)));

                const isOpen = openGroups[g.label] ?? false;

                return (
                  <div key={g.label} className="flex flex-col">
                    {/* explicit Link branch */}
                    {g.href && !g.collapsible ? (
                      <Link
                        href={g.href(id)}
                        className={cn(
                          "flex items-center rounded-md px-3 py-2 text-sm transition-colors duration-150",
                          isActive
                            ? "bg-primary/10 text-primary font-medium"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                        )}
                      >
                        {g.icon && (
                          <g.icon className="h-4 w-4 shrink-0 opacity-80" />
                        )}
                        <span
                          className={cn(
                            "ml-2 transition-opacity duration-200",
                            collapsed ? "opacity-0" : "opacity-100"
                          )}
                        >
                          {g.label}
                        </span>
                      </Link>
                    ) : (
                      // button branch (either collapsible parent or parent without href)
                      <button
                        type="button"
                        onClick={() => {
                          if (g.collapsible) {
                            setOpenGroups((s) => ({
                              ...s,
                              [g.label]: !isOpen,
                            }));
                          }
                        }}
                        className={cn(
                          "flex items-center rounded-md px-3 py-2 text-sm transition-colors duration-150 text-left",
                          isActive
                            ? "bg-primary/10 text-primary font-medium"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                        )}
                      >
                        {g.icon && (
                          <g.icon className="h-4 w-4 shrink-0 opacity-80" />
                        )}

                        <span
                          className={cn(
                            "ml-2 transition-opacity duration-200",
                            collapsed ? "opacity-0" : "opacity-100"
                          )}
                        >
                          {g.label}
                        </span>

                        {g.collapsible && (
                          <span className="ml-auto">
                            {isOpen ? (
                              <Minus className="h-3 w-3" />
                            ) : (
                              <Plus className="h-3 w-3" />
                            )}
                          </span>
                        )}
                      </button>
                    )}

                    {/* Nested children */}
                    {g.collapsible && isOpen && g.children && !collapsed && (
                      <div className="relative ml-4 mt-2 pl-2">
                        {/* vertical line */}
                        <div className="absolute left-0 top-0 h-full w-px bg-muted" />
                        <div className="flex flex-col gap-1">
                          {g.children.map((c) => {
                            const href = c.href(id);
                            const active = c.match(pathname, id);

                            return (
                              <Link
                                key={href}
                                href={href}
                                className={cn(
                                  "relative flex items-center rounded px-3 py-1.5 text-sm",
                                  active
                                    ? "text-primary font-medium"
                                    : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                                )}
                              >
                                {/* node indicator */}
                                <span
                                  className={cn(
                                    "absolute left-[-9px] h-3 w-3 rounded-full border-2",
                                    active
                                      ? "border-primary bg-primary/40"
                                      : "border-muted bg-background"
                                  )}
                                />
                                {/* overlay the vertical line segment with primary when active */}
                                {active && (
                                  <span className="absolute left-0 top-0 h-full w-px bg-primary" />
                                )}
                                {c.label}
                              </Link>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
          </nav>
        </div>

        <div className={cn("mt-auto pt-4", collapsed && "hidden")}>
          <Separator />
        </div>
      </div>
    </aside>
  );
}