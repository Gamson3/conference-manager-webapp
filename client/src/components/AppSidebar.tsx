import { usePathname } from 'next/navigation';
import React from 'react'
import { Sidebar, SidebarContent, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar } from './ui/sidebar';
import { FileText, Globe, Heart, LayoutDashboard, Menu, Plus, PlusSquare, Settings, Upload, Users, X } from 'lucide-react';
import { NAVBAR_HEIGHT } from '@/lib/constants';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { useAuth } from '@/app/(auth)/authContext'


interface AppSidebarProps {
  userType?: string;
}

const AppSidebar = ( { userType }: Appsidebarprops) => { 
    const pathname: string = usePathname();
    const { toggleSidebar, open } = useSidebar();
    const { hasRole } = useAuth();

    // Determine links based on user roles
    let navLinks = [];
    let viewType = "Attendee View";

    if (userType === "organizer" || hasRole('organizer')) {
      // Organizer-specific navigation links
      navLinks = [
        { icon: LayoutDashboard, label: "Dashboard", href: "/organizer/dashboard" },
        { icon: Upload, label: "Review Submissions", href: "/organizer/submissions" },
        { icon: PlusSquare, label: "Create Event", href: "/organizer/create-event" },
        { icon: Globe, label: "Manage Events", href: "/organizer/events" },
        { icon: Settings, label: "Settings", href: "/organizer/settings" }
      ];
      viewType = "Organizer View"
    } else {
      // Start with attendee links (base links)
      navLinks = [
        { icon: LayoutDashboard, label: "Dashboard", href: "/attendee/dashboard" },
        { icon: Globe, label: "Discover", href: "/attendee/discover" },
        { icon: Heart, label: "Favorites", href: "/attendee/favorites" },
        { icon: FileText, label: "My Events", href: "/attendee/view-event" },
        { icon: Settings, label: "Settings", href: "/attendee/settings" },
      ];

      // Add presenter links if user has presenter role
      if (hasRole('presenter')) {
        navLinks.push(
            { icon: Upload, label: "My Submissions", href: "/presenter/submissions" },
            { icon: PlusSquare, label: "Submit Presentation", href: "/presenter/submit" }
        );
      }
    }

  return (
    <Sidebar 
        collapsible="icon"
        className="fixed left-0 bg-white shadow-lg"
        style={{ 
            top: `${NAVBAR_HEIGHT}px`,
            height: `calc(100vh - ${NAVBAR_HEIGHT}px)` 
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
                    open 
                      ? "px-5 py-7 my-1" 
                      : "p-2 mx-[5px] my-4 justify-center"
                  )}
                >
                  <Link href={link.href} className="w-full" scroll={false}>
                    <div className={cn(
                      "flex items-center",
                      open ? "gap-3" : "justify-center"
                    )}>
                      <link.icon
                        className={`h-5 w-5 ${
                          isActive ? "text-blue-600" : "text-gray-500"
                        }`}
                      />
                      {open && (
                        <span className={isActive ? "text-blue-600" : "text-gray-700"}>
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
        
    </Sidebar>
  )
}

export default AppSidebar