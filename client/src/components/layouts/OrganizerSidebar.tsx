"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useParams } from "next/navigation";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

const NavItem = ({ href, label, active }: { href: string; label: string; active: boolean }) => (
  <Link
    href={href}
    className={cn(
      "block rounded-md px-3 py-2 mb-1 text-sm",
      active ? "bg-muted text-foreground font-medium" : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
    )}
  >
    {label}
  </Link>
);

export default function OrganizerSidebar() {
  const pathname = usePathname();
  const params = useParams<{ id?: string | string[] }>();
  // Try to infer active conference id from route like /organizer/conferences/[id]/...
  const confId = Array.isArray(params?.id) ? params.id[0] : params?.id;
  const inConference = !!confId;
  const base = "/organizer";

  const isActive = (href: string) => pathname.startsWith(href);

  return (
    <aside className="hidden md:block w-64 shrink-0 border-r bg-white/70 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div className="p-3">
        <div className="mb-2 text-xs font-semibold text-muted-foreground px-3">Overview</div>
        <NavItem href={`${base}/dashboard`} label="Dashboard" active={isActive(`${base}/dashboard`)} />
        <NavItem href={`${base}/conferences`} label="Conferences" active={isActive(`${base}/conferences`)} />
        <NavItem href={`${base}/conferences/new`} label="New Conference" active={isActive(`${base}/conferences/new`)} />

        {inConference && (
          <>
            <Separator className="my-3" />
            <div className="mb-1 text-xs font-semibold text-muted-foreground px-3">Active Conference</div>
            <NavItem href={`${base}/conferences/${confId}`} label="Summary" active={isActive(`${base}/conferences/${confId}`) && pathname === `${base}/conferences/${confId}`} />

            <div className="mb-1 mt-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground px-3">Setup</div>
            <NavItem href={`${base}/conferences/${confId}/setup/categories`} label="Categories" active={isActive(`${base}/conferences/${confId}/setup/categories`)} />
            <NavItem href={`${base}/conferences/${confId}/setup/types`} label="Types" active={isActive(`${base}/conferences/${confId}/setup/types`)} />
            <NavItem href={`${base}/conferences/${confId}/setup/requirements`} label="Requirements" active={isActive(`${base}/conferences/${confId}/setup/requirements`)} />
            <NavItem href={`${base}/conferences/${confId}/setup/timeline`} label="Timeline" active={isActive(`${base}/conferences/${confId}/setup/timeline`)} />

            <div className="mb-1 mt-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground px-3">Submissions</div>
            <NavItem href={`${base}/conferences/${confId}/submissions`} label="All Submissions" active={isActive(`${base}/conferences/${confId}/submissions`)} />
            <NavItem href={`${base}/conferences/${confId}/submissions/accepted`} label="Accepted" active={isActive(`${base}/conferences/${confId}/submissions/accepted`)} />

            <div className="mb-1 mt-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground px-3">Schedule</div>
            <NavItem href={`${base}/conferences/${confId}/schedule`} label="Overview" active={isActive(`${base}/conferences/${confId}/schedule`)} />
            <NavItem href={`${base}/conferences/${confId}/schedule/days`} label="Days" active={isActive(`${base}/conferences/${confId}/schedule/days`)} />
            <NavItem href={`${base}/conferences/${confId}/schedule/sections`} label="Sections" active={isActive(`${base}/conferences/${confId}/schedule/sections`)} />

            <div className="mb-1 mt-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground px-3">Participants</div>
            <NavItem href={`${base}/conferences/${confId}/participants`} label="Manage" active={isActive(`${base}/conferences/${confId}/participants`)} />

            <div className="mb-1 mt-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground px-3">Publishing</div>
            <NavItem href={`${base}/conferences/${confId}/publish`} label="Publish" active={isActive(`${base}/conferences/${confId}/publish`)} />
            <NavItem href={`${base}/conferences/${confId}/edit`} label="Edit Details" active={isActive(`${base}/conferences/${confId}/edit`)} />
            <NavItem href={`${base}/conferences/${confId}/materials`} label="Materials" active={isActive(`${base}/conferences/${confId}/materials`)} />
          </>
        )}
      </div>
    </aside>
  );
}
