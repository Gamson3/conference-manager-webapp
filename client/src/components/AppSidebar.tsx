"use client";

import { usePathname, useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "./ui/sidebar";
import {
  ArrowLeftRightIcon,
  FileText,
  Globe,
  Heart,
  LayoutDashboard,
  Menu,
  PlusSquare,
  Settings,
  Upload,
  UserCheck,
  UserPlus,
  X,
} from "lucide-react";
import { NAVBAR_HEIGHT } from "@/lib/constants";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useAuth } from "@/app/(auth)/authContext";

interface AppSidebarProps {
  userType?: string;
}

const AppSidebar = ({ userType }: AppSidebarProps) => {
  const pathname = usePathname();
  const router = useRouter();
  const { toggleSidebar, open } = useSidebar();
  const { hasRole, user: authUser } = useAuth();

  const [currentView, setCurrentView] = useState<
    "organizer" | "attendee" | "presenter"
  >("attendee");
  const [transitioningView, setTransitioningView] = useState<string | null>(null);

  // ---- NAV LINK DEFINITIONS ----
  const views = {
    attendee: {
      title: "Attendee View",
      links: [
        { icon: LayoutDashboard, label: "Dashboard", href: "/attendee/dashboard" },
        { icon: Globe, label: "Discover", href: "/attendee/discover" },
        { icon: Heart, label: "Favorites", href: "/attendee/favorites" },
        { icon: FileText, label: "My Events", href: "/attendee/view-event" },
        { icon: Settings, label: "Settings", href: "/attendee/settings" },
      ],
    },
    presenter: {
      title: "Presenter View",
      links: [
        { icon: LayoutDashboard, label: "Dashboard", href: "/presenter/dashboard" },
        { icon: Upload, label: "My Presentations", href: "/presenter/presentations" },
        { icon: PlusSquare, label: "Submit Presentation", href: "/presenter/submit" },
        { icon: FileText, label: "Materials", href: "/presenter/materials" },
        { icon: Settings, label: "Settings", href: "/presenter/settings" },
      ],
    },
    organizer: {
      title: "Organizer View",
      links: [
        { icon: LayoutDashboard, label: "Dashboard", href: "/organizer/dashboard" },
        { icon: Upload, label: "Review Submissions", href: "/organizer/submissions" },
        { icon: PlusSquare, label: "Create Event", href: "/organizer/create-event" },
        { icon: Globe, label: "Manage Events", href: "/organizer/events" },
        { icon: Settings, label: "Settings", href: "/organizer/settings" },
      ],
    },
  };

  // --- Handle switching between views ---
  const switchView = (view: "attendee" | "presenter") => {
    setTransitioningView(view);
    localStorage.setItem("userViewPreference", view);

    setTimeout(() => {
      setCurrentView(view);
      router.push(`/${view}/dashboard`);
      setTransitioningView(null);
    }, 300); // match Tailwind duration
  };

  // Sync view from path
  useEffect(() => {
    if (pathname.startsWith("/organizer") && hasRole("organizer")) {
      setCurrentView("organizer");
    } else if (pathname.startsWith("/presenter") && hasRole("presenter")) {
      setCurrentView("presenter");
    } else {
      setCurrentView("attendee");
    }
  }, [pathname, hasRole]);

  const activeView = views[currentView];

  return (
    <Sidebar
      collapsible="icon"
      className="fixed left-0 bg-white shadow-lg"
      style={{
        top: `${NAVBAR_HEIGHT}px`,
        height: `calc(100vh - ${NAVBAR_HEIGHT}px)`,
      }}
    >
      {/* Header */}
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <div
              className={cn(
                "flex min-h-[56px] w-full items-center pt-3 mb-3",
                open ? "justify-between px-6" : "justify-center"
              )}
            >
              {open ? (
                <>
                  <h1
                    className={cn(
                      "text-xl font-bold text-gray-800 transition-all duration-300 ease-in-out",
                      transitioningView ? "opacity-0 translate-y-2" : "opacity-100"
                    )}
                  >
                    {activeView.title}
                  </h1>
                  <button
                    className="hover:bg-gray-100 p-2 rounded-md"
                    onClick={toggleSidebar}
                  >
                    <X className="h-6 w-6 text-gray-600" />
                  </button>
                </>
              ) : (
                <button
                  className="hover:bg-gray-100 p-2 rounded-md"
                  onClick={toggleSidebar}
                >
                  <Menu className="h-6 w-6 text-gray-600" />
                </button>
              )}
            </div>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      {/* Main Links */}
      <SidebarContent>
        <SidebarMenu>
          <div
            className={cn(
              "transition-all duration-300 ease-in-out",
              transitioningView ? "opacity-0 translate-y-4" : "opacity-100"
            )}
          >
            {activeView.links.map((link) => {
              const isActive = pathname === link.href;
              return (
                <SidebarMenuItem key={link.href}>
                  <SidebarMenuButton
                    asChild
                    className={cn(
                      "flex items-center rounded-none transition-all",
                      isActive
                        ? "bg-gray-300 text-blue-600 font-medium"
                        : "text-gray-600 hover:bg-gray-300",
                      open ? "px-5 py-7 my-1" : "p-2 mx-[5px] my-4 justify-center"
                    )}
                  >
                    <Link href={link.href} className="w-full" scroll={false}>
                      <div className={cn("flex items-center", open ? "gap-3" : "justify-center")}>
                        <link.icon className="h-5 w-5" />
                        {open && <span>{link.label}</span>}
                      </div>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </div>

          {/* Show loading indicator during transitions */}
          {transitioningView && (
            <div className="flex justify-center items-center h-48">
              <div className="animate-pulse flex flex-col items-center">
                <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                  <div className="h-6 w-6 rounded-full bg-primary-200 animate-ping"></div>
                </div>
                <div className="mt-3 text-sm text-gray-500">Switching...</div>
              </div>
            </div>
          )}
        </SidebarMenu>
      </SidebarContent>

      {/* Footer: Switcher */}
      {currentView !== "organizer" && (
        <SidebarFooter>
          <SidebarMenu>
            {open && (
              <div className="flex items-center gap-3 px-4 py-2 text-sm text-gray-500 font-medium">
                <h2>SWITCH ROLE</h2>
                <ArrowLeftRightIcon className="h-4 w-4" />
              </div>
            )}

            {currentView === "attendee" && authUser?.roles.includes("presenter") && (
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  className={cn(
                    "flex items-center cursor-pointer",
                    open
                      ? "px-5 py-3 mb-1 rounded-lg mx-1 hover:bg-primary-500 hover:text-white"
                      : "p-2 mx-[5px] my-4 justify-center rounded-lg hover:bg-primary-500 hover:text-white"
                  )}
                >
                  <div onClick={() => switchView("presenter")} className="w-full transition-transform duration-200">
                    <UserPlus className="h-6 w-6" />
                    {open && <span>Switch to Presenter</span>}
                  </div>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )}

            {currentView === "presenter" && authUser?.roles.includes("attendee") && (
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  className={cn(
                    "flex items-center cursor-pointer",
                    open
                      ? "px-5 py-3 mb-1 rounded-lg mx-1 hover:bg-primary-500 hover:text-white"
                      : "p-2 mx-[5px] my-4 justify-center rounded-lg hover:bg-primary-500 hover:text-white"
                  )}
                >
                  <div onClick={() => switchView("attendee")} className="w-full transition-transform duration-200">
                    <UserCheck className="h-6 w-6" />
                    {open && <span>Switch to Attendee</span>}
                  </div>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )}
          </SidebarMenu>
        </SidebarFooter>
      )}
    </Sidebar>
  );
};

export default AppSidebar;
