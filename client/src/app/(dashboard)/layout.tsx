"use client";

import NavBar from "@/components/NavBar";
import { SidebarProvider } from "@/components/ui/sidebar";
import Sidebar from "@/components/AppSidebar";
import { NAVBAR_HEIGHT } from "@/lib/constants";
import { useGetAuthUserQuery } from "@/state/api";

const DashboardLayout = ({ children }: { children: React.ReactNode }) => {
  const { data: authUser, isLoading } = useGetAuthUserQuery();

  // If still loading user data, show loading
  // if (isLoading) {
  //   return (
  //     <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-primary-100">
  //       <div className="text-center bg-white p-8 rounded-2xl shadow-xl">
  //         <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
  //         <h3 className="text-lg font-semibold text-gray-900 mb-2">
  //           Loading Dashboard...
  //         </h3>
  //         <p className="text-gray-600">Please wait a moment</p>
  //       </div>
  //     </div>
  //   );
  // }

  // Simple layout without auth logic (middleware handles it)
  const userRole = authUser?.userRole?.toLowerCase() || 'attendee';

  return (
    <SidebarProvider>
      <div className="min-h-screen w-full bg-primary-100 overflow-hidden">
        <NavBar />
        <div style={{ marginTop: `${NAVBAR_HEIGHT}px` }}>
          <main className="flex">
            <Sidebar userType={userRole as "organizer" | "attendee"} />
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