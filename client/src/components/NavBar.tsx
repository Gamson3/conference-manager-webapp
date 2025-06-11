"use client";

import { NAVBAR_HEIGHT } from "@/lib/constants";
import Image from "next/image";
import Link from "next/link";
import React from "react";
import { Button } from "./ui/button";
import { useGetAuthUserQuery } from "@/state/api";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "aws-amplify/auth";
import { Bell, MessageCircle, Plus, Search } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "./ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { SidebarTrigger } from "./ui/sidebar";


const NavBar = () => {
    const { data: authUser } = useGetAuthUserQuery();
    const router = useRouter();
    const pathname = usePathname();

    const isDashboardPage = pathname.includes("/organizer") || pathname.includes("/attendee");

    const handleSignOut = async () => {
        try {
            await signOut();
            window.location.href = "/";
        } catch (error) {
            console.error("Error signing out:", error);
        }
    }

  return (
    <div
      className="fixed top-0 left-0 w-full z-50 shadow-xl"
      style={{ height: `${NAVBAR_HEIGHT}px` }}
    >
      <div className="flex justify-between items-center w-full py-3 px-8 backdrop-blur-md bg-primary-700/90 border-b border-white/10 text-white">
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
              <Image
                src="/logo.svg"
                alt="ConferenceMaster Logo"
                width={24}
                height={24}
                className="w-6 h-6"
              />
              <div className="text-xl font-bold">
                CONFERENCE
                <span className="text-secondary-500 hover:!text-primary-300">
                  MASTER.
                </span>
              </div>
            </div>
          </Link>
          {isDashboardPage && authUser && (
            <Button
              variant="secondary"
              className="md:ml-4 bg-primary-50 text-primary-700 hover:bg-secondary-500 hover:text-primary-50"
              onClick={() =>
                router.push(
                  authUser.userRole?.toLowerCase() === "organizer"
                    ? "/organizer/create-event"
                    : "/attendee/discover"
                )
              }
            >
              {authUser.userRole?.toLowerCase() === "organizer" ? (
                <>
                  <Plus className="h-4 w-4" />
                  <span className="hidden md:block">Create New Event</span>
                </>
              ) : (
                <>
                  <Search className="h-4 w-4" />
                  <span className="hidden md:block">
                    Search Events
                  </span>
                </>
              )}
            </Button>
          )}
        </div>

        {!isDashboardPage && (
        <p className="text-primary-200 hidden md:block">
          End-to-end tools to simplify your conference management process.
        </p>
        )}

        <div className="flex items-center gap-5">
            {authUser ? (
                <>
                    <div className="relative hidden md:block">
                      <MessageCircle className="w-6 h-6 cursor-pointer text-primary-200 hover:text-primary-400" />
                      <span className="absolute top-0 right-0 w-2 h-2 bg-secondary-700 rounded-full"></span>
                    </div>
                    <div className="relative hidden md:block">
                      <Bell className="w-6 h-6 cursor-pointer text-primary-200 hover:text-primary-400" />
                      <span className="absolute top-0 right-0 w-2 h-2 bg-secondary-700 rounded-full"></span>
                    </div>

                    <DropdownMenu>
                      <DropdownMenuTrigger className="flex items-center gap-2 focus:outline-none cursor-pointer">
                        <Avatar>
                            <AvatarImage src={authUser.userInfo?.image} />
                            <AvatarFallback className="bg-primary-600">
                                {authUser.userInfo?.name?.charAt(0).toUpperCase()}
                            </AvatarFallback>
                        </Avatar>
                        <p className="hidden md:block text-primary-200">
                            {authUser.userInfo?.name}
                        </p>
                      </DropdownMenuTrigger>

                      <DropdownMenuContent className="bg-white text-primary-700">
                        <DropdownMenuItem 
                        className="font-bold hover:!bg-primary-700 hover:!text-primary-100 cursor-pointer"
                            onClick={() => router.push(
                              authUser.userRole?.toLowerCase() === "organizer"
                                ? "/organizer/dashboard"
                                : "/attendee/dashboard",
                              { scroll: false }
                            )}
                        >
                          Go to Dashboard
                        </DropdownMenuItem>
                          
                        <DropdownMenuSeparator className="bg-primary-200" />

                        <DropdownMenuItem 
                        className="hover:!bg-primary-700 hover:!text-primary-100 cursor-pointer"
                        onClick={() => router.push(
                            `/${authUser.userRole?.toLowerCase()}/settings`,
                            { scroll: false }
                        )}
                        >
                          Settings
                        </DropdownMenuItem>

                        <DropdownMenuItem
                          onClick={handleSignOut}
                          className="hover:!bg-primary-700 hover:!text-primary-100 cursor-pointer"
                        >
                          Sign Out
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                </>
            ): (
                <>
                <Link href="/signin">
                    <Button
                      variant="outline"
                      className="text-white border-white bg-transparent hover:bg-white hover:text-primary-700 rounded-lg"
                    >
                      Sign In
                    </Button>
                </Link>
                <Link href="/signup">
                  <Button
                    variant="secondary"
                    className="text-white bg-secondary-600 hover:bg-white hover:text-primary-700 rounded-lg"
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
