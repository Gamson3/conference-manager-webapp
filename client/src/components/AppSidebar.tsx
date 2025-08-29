import { usePathname, useRouter } from "next/navigation";
import React from "react";
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
  ArrowLeftRight,
  ArrowLeftRightIcon,
  FileText,
  Globe,
  Heart,
  LayoutDashboard,
  Menu,
  Plus,
  PlusSquare,
  Settings,
  Upload,
  UserCheck,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { NAVBAR_HEIGHT } from "@/lib/constants";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useAuth } from "@/app/(auth)/authContext";

interface AppSidebarProps {
  userType?: string;
}

const AppSidebar = ({ userType }: Appsidebarprops) => {
  const pathname: string = usePathname();
  const router = useRouter();
  const { toggleSidebar, open } = useSidebar();
  const { hasRole, user: authUser } = useAuth();

  // Determine links based on user roles
  let navLinks = [];
  let viewType = "Attendee View";

  if (userType === "organizer" || hasRole("organizer")) {
    // Organizer-specific navigation links
    navLinks = [
      {
        icon: LayoutDashboard,
        label: "Dashboard",
        href: "/organizer/dashboard",
      },
      {
        icon: Upload,
        label: "Review Submissions",
        href: "/organizer/submissions",
      },
      {
        icon: PlusSquare,
        label: "Create Event",
        href: "/organizer/create-event",
      },
      { icon: Globe, label: "Manage Events", href: "/organizer/events" },
      { icon: Settings, label: "Settings", href: "/organizer/settings" },
    ];
    viewType = "Organizer View";
  } else {
    // Start with attendee links (base links)
    navLinks = [
      {
        icon: LayoutDashboard,
        label: "Dashboard",
        href: "/attendee/dashboard",
      },
      { icon: Globe, label: "Discover", href: "/attendee/discover" },
      { icon: Heart, label: "Favorites", href: "/attendee/favorites" },
      { icon: FileText, label: "My Events", href: "/attendee/view-event" },
      { icon: Settings, label: "Settings", href: "/attendee/settings" },
    ];

    // Add presenter links if user has presenter role
    if (hasRole("presenter")) {
      navLinks.push(
        {
          icon: Upload,
          label: "My Submissions",
          href: "/presenter/submissions",
        },
        {
          icon: PlusSquare,
          label: "Submit Presentation",
          href: "/presenter/submit",
        }
      );
    }
  }

  return (
    <Sidebar
      collapsible="icon"
      className="fixed left-0 bg-white shadow-lg"
      style={{
        top: `${NAVBAR_HEIGHT}px`,
        height: `calc(100vh - ${NAVBAR_HEIGHT}px)`,
      }}
    >
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
                  <h1 className="text-xl font-bold text-gray-800">
                    {viewType}
                  </h1>
                  <button
                    className="hover:bg-gray-100 p-2 rounded-md"
                    onClick={() => toggleSidebar()}
                  >
                    <X className="h-6 w-6 text-gray-600" />
                  </button>
                </>
              ) : (
                <button
                  className="hover:bg-gray-100 p-2 rounded-md"
                  onClick={() => toggleSidebar()}
                >
                  <Menu className="h-6 w-6 text-gray-600" />
                </button>
              )}
            </div>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarMenu>
          {navLinks.map((link) => {
            const isActive = pathname === link.href;

            return (
              <SidebarMenuItem key={link.href}>
                <SidebarMenuButton
                  asChild
                  className={cn(
                    "flex items-center rounded-none transition-all",
                    isActive
                      ? "bg-gray-300 hover:bg-gray-300 text-blue-600 font-medium"
                      : "text-gray-600 hover:bg-gray-300",
                    open ? "px-5 py-7 my-1" : "p-2 mx-[5px] my-4 justify-center"
                  )}
                >
                  <Link href={link.href} className="w-full" scroll={false}>
                    <div
                      className={cn(
                        "flex items-center",
                        open ? "gap-3" : "justify-center"
                      )}
                    >
                      <link.icon
                        className={`h-5 w-5 ${
                          isActive ? "text-blue-600" : "text-gray-500"
                        }`}
                      />
                      {open && (
                        <span
                          className={
                            isActive ? "text-blue-600" : "text-gray-700"
                          }
                        >
                          {link.label}
                        </span>
                      )}
                    </div>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarContent>

      {/* Role Switcher Footer */}
      <SidebarFooter>
        <SidebarMenu>
          {/* Only show role switcher if user has multiple roles */}
          {authUser?.roles && authUser.roles.length > 1 && (
            <>
              {open && (
                <div className="flex items-center gap-3 px-4 py-2 text-sm text-gray-500 font-medium">
                  <h2>SWITCH ROLE</h2>
                  <span>
                    <ArrowLeftRightIcon className="h-4 w-4" />
                  </span>
                </div>
              )}

              {/* Show presenter role option if in attendee view and user has presenter role */}
              {pathname.startsWith("/attendee") &&
                authUser.roles.includes("presenter") && (
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      className={cn(
                        "flex items-center transition-all cursor-pointer",
                        open
                          ? "px-5 py-3 mb-1 rounded-lg mx-1 hover:bg-primary-500 hover:text-white"
                          : "p-2 mx-[5px] my-4 justify-center rounded-lg hover:bg-primary-500 hover:text-white"
                      )}
                    >
                      <div 
                        onClick={() => router.push("/presenter/dashboard")}
                      >
                        <UserPlus className="h-6 w-6" />
                        {open && (
                          <span className="text-gray-700">
                            Switch to Presenter Mode
                          </span>
                        )}
                      </div>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )}

              {/* Show attendee role option if in presenter view and user has attendee role */}
              {pathname.startsWith("/presenter") &&
                authUser.roles.includes("attendee") && (
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      className={cn(
                        "flex items-center transition-all cursor-pointer",
                        open
                          ? "px-5 py-3 mb-1 rounded-lg mx-1 hover:bg-primary-500 hover:text-white"
                          : "p-2 mx-[5px] my-4 justify-center rounded-lg hover:bg-primary-500 hover:text-white"
                      )}
                    >
                      <div onClick={() => router.push("/attendee/dashboard")}>
                        <UserCheck className="h-6 w-6" />
                        {open && (
                          <span className="text-gray-700">
                            Switch to Attendee
                          </span>
                        )}
                      </div>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )}

              {/* Show organizer role option if user has organizer role and is not in organizer view */}
              {/* {!pathname.startsWith("/organizer") && 
              authUser.roles.includes("organizer") && (
                <SidebarMenuItem>
                  <div
                    className={cn(
                      "flex items-center cursor-pointer",
                      open 
                        ? "px-5 py-3 mb-1 rounded-lg mx-1 hover:bg-primary-500 hover:text-white" 
                        : "p-2 mx-[5px] my-4 justify-center rounded-lg hover:bg-primary-500 hover:text-white"
                    )}
                    onClick={() => router.push("/organizer/dashboard")}
                  >
                    <Globe
                      className={`h-5 w-5 ${
                        open ? "mr-3" : ""
                      }`}
                    />
                    {open && (
                      <span className="text-gray-700">
                        Switch to Organizer
                      </span>
                    )}
                  </div>
                </SidebarMenuItem>
              )} */}
            </>
          )}
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
};

export default AppSidebar;
