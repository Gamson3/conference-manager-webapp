"use client";

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { createAuthenticatedApi } from "@/lib/utils";
import { toast } from "sonner";
import { 
  PresentationIcon, 
  CalendarIcon, 
  FileIcon, 
  UserIcon,
  ArrowLeftIcon,
  BellIcon,
  SettingsIcon,
  LogOutIcon,
  HomeIcon,
  TrendingUpIcon,
  BookOpenIcon
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface PresenterData {
  presenter: any;
  userRole: string;
  stats: {
    totalSubmissions: number;
    approvedPresentations: number;
    pendingSubmissions: number;
    scheduledPresentations: number;
  };
}

const navigationItems = [
  {
    name: "Dashboard",
    href: "/presenter/dashboard",
    icon: HomeIcon,
    color: "text-violet-600",
    bgColor: "bg-violet-100",
  },
  {
    name: "Submissions",
    href: "/presenter/submissions",
    icon: FileIcon,
    color: "text-blue-600",
    bgColor: "bg-blue-100",
  },
  {
    name: "Profile",
    href: "/presenter/profile",
    icon: UserIcon,
    color: "text-emerald-600",
    bgColor: "bg-emerald-100",
  },
];

export default function PresenterLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [presenterData, setPresenterData] = useState<PresenterData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  useEffect(() => {
    fetchPresenterData();
  }, []);

  const fetchPresenterData = async () => {
    try {
      const api = await createAuthenticatedApi();
      const response = await api.get('/api/presenter/dashboard');
      setPresenterData(response.data);
    } catch (error: any) {
      console.error('Error fetching presenter data:', error);
      toast.error('Failed to load presenter information');
    } finally {
      setIsLoading(false);
    }
  };

  const getBackNavigationPath = () => {
    if (!presenterData?.userRole) return '/dashboard';
    
    switch (presenterData.userRole) {
      case 'organizer':
        return '/organizer/dashboard';
      case 'attendee':
        return '/attendee/dashboard';
      case 'admin':
        return '/admin/dashboard';
      default:
        return '/dashboard';
    }
  };

  const handleSignOut = () => {
    // Implement sign out logic
    router.push('/auth/signin');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-violet-50 via-blue-50 to-emerald-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-r from-violet-500 to-blue-500 rounded-2xl flex items-center justify-center mx-auto mb-4 animate-pulse">
            <PresentationIcon className="h-8 w-8 text-white" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Loading Presenter Hub</h3>
          <p className="text-gray-600">Preparing your presentation workspace...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-blue-50 to-emerald-50">
      {/* Custom Header */}
      <header className="bg-white/80 backdrop-blur-lg border-b border-gray-200/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Logo and Brand */}
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push(getBackNavigationPath())}
                className="text-gray-600 hover:text-gray-900"
              >
                <ArrowLeftIcon className="h-4 w-4 mr-2" />
                Back to {presenterData?.userRole === 'organizer' ? 'Organizer' : 'Main'} Dashboard
              </Button>
              
              <div className="h-6 w-px bg-gray-300"></div>
              
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-r from-violet-500 to-blue-500 rounded-xl flex items-center justify-center">
                  <PresentationIcon className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h1 className="text-lg font-bold bg-gradient-to-r from-violet-600 to-blue-600 bg-clip-text text-transparent">
                    Presenter Hub
                  </h1>
                  <p className="text-xs text-gray-500">Professional Presentation Management</p>
                </div>
              </div>
            </div>

            {/* Navigation */}
            <nav className="hidden md:flex items-center gap-2">
              {navigationItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Button
                    key={item.name}
                    variant={isActive ? "default" : "ghost"}
                    size="sm"
                    onClick={() => router.push(item.href)}
                    className={`relative ${
                      isActive 
                        ? "bg-gradient-to-r from-violet-500 to-blue-500 text-white shadow-lg" 
                        : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                    }`}
                  >
                    <item.icon className="h-4 w-4 mr-2" />
                    {item.name}
                    {isActive && (
                      <motion.div
                        className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-white rounded-full"
                        layoutId="activeTab"
                      />
                    )}
                  </Button>
                );
              })}
            </nav>

            {/* User Profile & Actions */}
            <div className="flex items-center gap-3">
              {presenterData?.stats && (
                <div className="hidden lg:flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="font-medium text-gray-700">{presenterData.stats.approvedPresentations}</span>
                    <span className="text-gray-500">approved</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                    <span className="font-medium text-gray-700">{presenterData.stats.pendingSubmissions}</span>
                    <span className="text-gray-500">pending</span>
                  </div>
                </div>
              )}
              
              <Button variant="ghost" size="icon" className="relative">
                <BellIcon className="h-4 w-4" />
                <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs bg-red-500">
                  3
                </Badge>
              </Button>
              
              <div className="flex items-center gap-3 pl-3 border-l border-gray-200">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={presenterData?.presenter?.profilePicture} />
                  <AvatarFallback className="bg-gradient-to-r from-violet-500 to-blue-500 text-white text-sm">
                    {presenterData?.presenter?.name?.charAt(0) || 'P'}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden md:block">
                  <p className="text-sm font-medium text-gray-900">
                    {presenterData?.presenter?.name || 'Presenter'}
                  </p>
                  <p className="text-xs text-gray-500">
                    {presenterData?.presenter?.affiliation || 'Academic Presenter'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative">
        <AnimatePresence mode="wait">
          <motion.div
            key={pathname}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Mobile Navigation */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-lg border-t border-gray-200/50 z-40">
        <div className="flex items-center justify-around py-2">
          {navigationItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Button
                key={item.name}
                variant="ghost"
                size="sm"
                onClick={() => router.push(item.href)}
                className={`flex flex-col items-center gap-1 h-auto py-2 ${
                  isActive ? "text-violet-600" : "text-gray-600"
                }`}
              >
                <item.icon className="h-4 w-4" />
                <span className="text-xs">{item.name}</span>
                {isActive && (
                  <div className="w-1 h-1 bg-violet-600 rounded-full"></div>
                )}
              </Button>
            );
          })}
        </div>
      </div>

      {/* Background Elements */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-violet-200/20 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-200/20 rounded-full blur-3xl"></div>
        <div className="absolute top-3/4 left-1/2 w-96 h-96 bg-emerald-200/20 rounded-full blur-3xl"></div>
      </div>
    </div>
  );
}