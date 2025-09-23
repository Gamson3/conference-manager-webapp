"use client";

import { NAVBAR_HEIGHT } from "@/lib/constants";
import Image from "next/image";
import Link from "next/link";
import React, { useState } from "react";
import { Button } from "./ui/button";
import { useAuth } from "@/app/(auth)/authContext";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "aws-amplify/auth";
import {
  ArrowLeftRightIcon,
  Bell,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageCircle,
  Plus,
  Search,
  Settings,
  User,
  UserCheck,
  UserPlus,
  UserPlusIcon,
  X,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { SidebarTrigger } from "./ui/sidebar";
import { cn } from "@/lib/utils";

const NavBar = () => {
  const { user: authUser, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [hoverRole, setHoverRole] = useState(false);

  const isDashboardPage =
    pathname.includes("/organizer") || pathname.includes("/attendee");

  const isPresenterPage = pathname.startsWith("/presenter");

  const dashboardPage = isDashboardPage || isPresenterPage;

  const handleSignOut = async () => {
    try {
      await signOut();
      window.location.href = "/";
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  const presenterNav = [
    { name: "Dashboard", href: "/presenter/dashboard" },
    { name: "Submit", href: "/presenter/submit" },
    { name: "Materials", href: "/presenter/materials" },
    { name: "Presentations", href: "/presenter/presentations/1" }, // replace later with list
  ];

  // Add this near the top of your component
  if (isLoading) {
    return (
      <div
        className="fixed top-0 left-0 w-full z-50 shadow-xl"
        style={{ height: `${NAVBAR_HEIGHT}px` }}
      >
        <div className="flex justify-between items-center w-full py-3 px-8 backdrop-blur-md bg-primary-700/90 border-b border-white/10 text-white">
          <Link
            href="/"
            className="cursor-pointer hover:!text-primary-300"
            scroll={false}
          >
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 bg-muted/20 rounded-full flex items-center justify-center">
                <span className="text-md font-bold">C</span>
                <span className="text-md font-bold text-secondary-500">M</span>
              </div>
              <div className="text-xl font-bold">
                CONFERENCE
                <span className="text-secondary-500 hover:!text-primary-300">
                  MASTER.
                </span>
              </div>
            </div>
          </Link>
          <div className="flex items-center gap-5">
            {/* Show a loading skeleton for user avatar */}
            <div className="w-8 h-8 rounded-full bg-primary-600 animate-pulse"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed top-0 left-0 w-full z-50 shadow-xl"
      style={{ height: `${NAVBAR_HEIGHT}px` }}
    >
      <div className="flex justify-between items-center w-full py-3 px-8 backdrop-blur-md bg-primary-700/90 border-b border-muted/10 text-muted">
        <div className="flex items-center gap-4 md:gap-6">
          {isDashboardPage && (
            <div className="md:hidden">
              <SidebarTrigger />
            </div>
          )}
          <Link
            href="/"
            className="cursor-pointer hover:!text-primary-300"
            scroll={false}
          >
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 bg-card/20 rounded-full flex items-center justify-center">
                <span className="text-md font-bold">C</span>
                <span className="text-md font-bold text-secondary-500">M</span>
              </div>
              <div className="text-xl font-bold">
                CONFERENCE
                <span className="text-secondary-500 hover:!text-primary-300">
                  MASTER.
                </span>
              </div>
            </div>
          </Link>

          {/* Presenter Nav Links (desktop) */}
          {isPresenterPage && (
            <nav className="hidden md:flex gap-4 ml-4">
              {presenterNav.map((item) => {
                const isActive = pathname.startsWith(
                  item.href.replace(/\/\d+$/, "")
                );
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={cn(
                      "text-sm font-medium transition-colors",
                      isActive
                        ? "text-primary-foreground border-b-2 border-secondary-500 pb-1"
                        : "text-primary-200 hover:text-primary-foreground"
                    )}
                  >
                    {item.name}
                  </Link>
                );
              })}
            </nav>
          )}

          {/* Presenter Nav (mobile dropdown) */}
          {isPresenterPage && (
            <div className="md:hidden">
              <DropdownMenu>
                <DropdownMenuTrigger className="flex items-center gap-2 focus:outline-none">
                  <Menu className="h-6 w-6 text-primary-200" />
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  className="bg-card text-primary-700 rounded-xl shadow-lg w-52 p-2"
                  align="start"
                >
                  {presenterNav.map((item) => (
                    <DropdownMenuItem
                      key={item.name}
                      onClick={() => router.push(item.href)}
                      className={cn(
                        "cursor-pointer",
                        pathname.startsWith(item.href.replace(/\/\d+$/, ""))
                          ? "font-semibold text-secondary-600"
                          : ""
                      )}
                    >
                      {item.name}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}

          {/* Contextual CTA (organizer/attendee only) */}
          {isDashboardPage && authUser && (
            <Button
              variant="secondary"
              className="ml-2 md:ml-4 bg-primary-50 text-primary-700 hover:bg-secondary-500 hover:text-primary-foreground rounded-lg"
              onClick={() =>
                router.push(
                  authUser.roles.includes("organizer")
                    ? "/organizer/create-event"
                    : "/attendee/discover"
                )
              }
            >
              {authUser.roles.includes("organizer") ? (
                <>
                  <Plus className="h-4 w-4" />
                  <span className="hidden md:block">Create New Event</span>
                </>
              ) : (
                <>
                  <Search className="h-4 w-4" />
                  <span className="hidden md:block">Search Events</span>
                </>
              )}
            </Button>
          )}
        </div>

        {!dashboardPage && (
          <p className="text-primary-foreground md:text-base hidden md:block">
            End-to-end tools to simplify your conference management process.
          </p>
        )}

        {/* Right Side */}
        <div className="flex items-center gap-4 md:gap-5">
          {authUser ? (
            <>
              {/* Messages + Notifications always visible (responsive) */}
              <div className="relative">
                <MessageCircle className="w-6 h-6 cursor-pointer text-primary-200 hover:text-primary-400" />
                <span className="absolute top-0 right-0 w-2 h-2 bg-secondary-700 rounded-full"></span>
              </div>
              <div className="relative">
                <Bell className="w-6 h-6 cursor-pointer text-primary-200 hover:text-primary-400" />
                <span className="absolute top-0 right-0 w-2 h-2 bg-secondary-700 rounded-full"></span>
              </div>

              {/* Avatar Menu */}
              <DropdownMenu open={open} onOpenChange={setOpen}>
                <DropdownMenuTrigger
                  className="flex items-center gap-2 focus:outline-none cursor-pointer"
                  onClick={() => setOpen(true)}
                >
                  <Avatar className="h-9 w-9 md:h-10 md:w-10">
                    <AvatarImage src={authUser.image || ""} />
                    <AvatarFallback className="bg-primary-600 text-white font-semibold">
                      {authUser.name?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <p className="hidden sm:block font-medium text-primary-foreground capitalize">
                    {authUser.name}
                  </p>
                </DropdownMenuTrigger>

                <DropdownMenuContent
                  className="bg-card text-primary-700 rounded-xl shadow-lg w-68 p-2"
                  align="end"
                >
                  {/* Profile Header inside dropdown with close button*/}
                  <div className="flex items-center justify-between pl-3 py-2">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={authUser.image || ""} />
                        <AvatarFallback className="bg-primary-600 border border-border rounded-full text-primary-foreground font-semibold">
                          {authUser.name?.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-semibold text-primary-900 capitalize">
                          {authUser.name}
                        </p>
                        <p className="text-sm text-primary-500">
                          {authUser.email}
                        </p>
                      </div>
                    </div>

                    {/* Close Button */}
                    <button
                      onClick={() => setOpen(false)}
                      className="p-2 rounded-full hover:bg-primary-100 text-primary-500 cursor-pointer"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>

                  <DropdownMenuSeparator className="bg-primary-200" />

                  <DropdownMenuItem
                    className="flex items-center gap-2 p-3 text-base rounded-lg hover:!bg-primary-500 hover:!text-primary-100 cursor-pointer"
                    onClick={() =>
                      router.push(
                        authUser?.roles?.includes("organizer")
                          ? "/organizer/dashboard"
                          : "/attendee/dashboard",
                        { scroll: false }
                      )
                    }
                  >
                    <LayoutDashboard className="h-5 w-5" />
                    Go to Dashboard
                  </DropdownMenuItem>

                  <DropdownMenuItem
                    className="flex items-center gap-2 p-3 text-base rounded-lg hover:!bg-primary-500 hover:!text-primary-100 cursor-pointer"
                    onClick={() =>
                      router.push(`/${authUser.roles[0]}/settings`, {
                        scroll: false,
                      })
                    }
                  >
                    <Settings className="h-5 w-5" />
                    Settings
                  </DropdownMenuItem>

                  <DropdownMenuSeparator className="bg-primary-200" />

                  <DropdownMenuItem
                    onClick={handleSignOut}
                    className="flex items-center gap-2 p-3 text-base rounded-lg hover:!bg-red-500 hover:!text-white cursor-pointer"
                  >
                    <LogOut className="h-5 w-5" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <>
              <Link href="/signin">
                <Button
                  variant="outline"
                  className="text-primary-foreground border-primary-foreground bg-transparent hover:bg-primary-foreground hover:text-primary-700 rounded-lg"
                >
                  Sign In
                </Button>
              </Link>
              <Link href="/signup">
                <Button
                  variant="secondary"
                  className="text-primary-foreground bg-secondary-600 hover:bg-primary-foreground hover:text-primary-700 rounded-lg"
                >
                  Sign Up
                </Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default NavBar;
