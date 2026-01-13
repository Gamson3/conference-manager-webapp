"use client";
import React from "react";
import { usePathname } from "next/navigation";
import OrganizerGuard from '@/components/layouts/OrganizerGuard';
import OrganizerTopNav from '@/components/layouts/OrganizerTopNav';
import ContentShell from '@/components/layouts/ContentShell';

export default function OrganizerLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  // Detect per-conference console nested layout: /organizer/conferences/[id]
  // We skip the centered ContentShell so its own dual-sidebar layout controls width.
  const isPerConference = pathname.startsWith('/organizer/conferences/') &&
    pathname.split('/').length >= 4; // /organizer/conferences/[id]/...

  return (
    <div className="min-h-screen flex flex-col">
      <OrganizerTopNav />
      <main className="flex-1">
        <OrganizerGuard>
          {isPerConference ? (
            // Pass through: nested layout (conferences/[id]/layout.tsx) manages spacing.
            <>{children}</>
          ) : (
            <ContentShell>{children}</ContentShell>
          )}
        </OrganizerGuard>
      </main>
    </div>
  );
}
