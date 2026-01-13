"use client";

import React, { useState } from "react";
import OrganizerGuard from "@/components/layouts/OrganizerGuard";
import PerConferencePrimarySidebar from "@/components/layouts/PerConferencePrimarySidebar";
import PerConferenceSecondarySidebar from "@/components/layouts/PerConferenceSecondarySidebar";
import ContentShell from "@/components/layouts/ContentShell";
import ImpersonationBanner from "@/components/ImpersonationBanner";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConferenceProvider } from "@/features/conferences/context/ConferenceContext";

// Per-conference layout: renders dual sidebars (icon primary + text secondary) and main content.
// Children are individual pages (summary, setup subsections, submissions, schedule, etc.).
// Responsive strategy: 
// - Desktop (md+): Both sidebars visible
// - Mobile (< md): Drawer with navigation, main content full width

export default function ConferenceConsoleLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  const toggleSidebar = () => {
    setCollapsed((prev) => !prev);
  };

  return (
    <OrganizerGuard>
      <ConferenceProvider>
        {/* Impersonation Banner - appears at very top when active */}
        <ImpersonationBanner />
        <div className="flex min-h-[calc(100vh-var(--navbar-height))]">
          {/* Primary Sidebar - Hidden on mobile */}
          <div className="hidden md:block">
            <PerConferencePrimarySidebar />
          </div>

          {/* Secondary Sidebar - Hidden on mobile */}
          <div className="hidden md:block">
            <PerConferenceSecondarySidebar collapsed={collapsed} toggleSidebar={toggleSidebar} />
          </div>

          {/* Mobile Navigation Drawer */}
          <div className="md:hidden fixed top-[var(--navbar-height)] left-0 z-40">
            <Sheet open={mobileDrawerOpen} onOpenChange={setMobileDrawerOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-none border-r">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-64 p-0">
                <SheetTitle className="sr-only">Navigation</SheetTitle>
                <PerConferenceSecondarySidebar collapsed={false} toggleSidebar={() => {}} />
              </SheetContent>
            </Sheet>
          </div>

          {/* Main Content */}
          <main
            className={`flex-1 overflow-y-auto transition-all duration-300 ${
              collapsed ? "ml-0 md:ml-32" : "ml-0 md:ml-80" // On mobile: no margin; on desktop: account for sidebars
            } mt-[var(--navbar-height)] md:mt-0`} // align with top nav height on mobile
          >
            {/* Use right-aligned container to match TopNav right gutter */}
            <ContentShell variant="flush">{children}</ContentShell>
          </main>
        </div>
      </ConferenceProvider>
    </OrganizerGuard>
  );
}
