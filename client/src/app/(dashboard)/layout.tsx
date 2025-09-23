"use client";

import NavBar from "@/components/NavBar";
import { SidebarProvider } from "@/components/ui/sidebar";
import Sidebar from "@/components/AppSidebar";
import { NAVBAR_HEIGHT } from "@/lib/constants";
// import { useGetAuthUserQuery } from "@/state/api";
import { useAuth } from "../(auth)/authContext";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";

const DashboardLayout = ({ children }: { children: React.ReactNode }) => {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [currentUserType, setCurrentUserType] = useState<string | undefined>(undefined);

  // Detect user type from URL path
  useEffect(() => {
    if (pathname.startsWith('/presenter')) {
      setCurrentUserType('presenter');
    } else if (pathname.startsWith('/organizer')) {
      setCurrentUserType('organizer');
    } else {
      setCurrentUserType('attendee');
    }
  }, [pathname]);

  // Redirect non-authenticated users (fallback protection)
  useEffect(() => {
    if (!isLoading && !user) {
      router.replace('/signin');
    }
  }, [user, isLoading, router]);

  // If still loading user data, show loading
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-primary-100">
      <div className="text-center p-8 max-w-md w-full mx-4">
        <div className="relative mb-6">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary-600 mx-auto"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-8 h-8 bg-primary-100 rounded-full animate-pulse"></div>
          </div>
        </div>
        
        <h3 className="text-xl font-semibold text-foreground mb-3">
          Loading...
        </h3>
        
        <p className="text-muted-foreground mb-4">
          Please wait a moment
        </p>

        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-primary-600 h-2 rounded-full transition-all duration-1000 ease-out animate-pulse"
            style={{ width: '70%' }}
          ></div>
        </div>
      </div>
    </div>
    );
  }

  // User should be available here because auth is handled by AuthProvider
  const userRole = user?.roles?.[0] || 'attendee';

  return (
    <SidebarProvider>
      <div className="min-h-screen w-full bg-primary-100 overflow-hidden">
        <NavBar />
        <div style={{ marginTop: `${NAVBAR_HEIGHT}px` }}>
          <main className="flex">
            <Sidebar userType={currentUserType} />
            <div className="flex-grow transition-all duration-300">
              {children}
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default DashboardLayout;