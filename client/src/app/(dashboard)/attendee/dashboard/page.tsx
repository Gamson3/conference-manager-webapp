"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  CalendarIcon, 
  BellIcon, 
  UserIcon, 
  BookOpenIcon,
  MessageSquareIcon,
  SearchIcon,
  HeartIcon,
  SettingsIcon,
  TrendingUpIcon,
  ClockIcon,
  MapPinIcon,
  StarIcon,
  ArrowRightIcon,
  PlusIcon,
  EyeIcon,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { createAuthenticatedApi } from '@/lib/utils';
import { toast } from 'sonner';

interface DashboardStats {
  upcomingConferences: number;
  registeredConferences: number;
  completedConferences: number;
  favoriteConferences: number;
  unreadMaterials: number;
  pendingFeedback: number;
  connections: number;
  notifications: number;
}

interface RecentConference {
  id: number;
  name: string;
  date: string;
  location: string;
  status: 'upcoming' | 'active' | 'completed';
}

interface QuickAction {
  title: string;
  description: string;
  icon: React.ElementType;
  href: string;
  color: string;
  bgColor: string;
}

export default function AttendeeDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [stats, setStats] = useState<DashboardStats>({
    upcomingConferences: 0,
    registeredConferences: 0,
    completedConferences: 0,
    favoriteConferences: 0,
    unreadMaterials: 0,
    pendingFeedback: 0,
    connections: 0,
    notifications: 0,
  });
  const [recentConferences, setRecentConferences] = useState<RecentConference[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Quick action cards - similar to organizer dashboard
  const quickActions: QuickAction[] = [
    {
      title: "Discover Conferences",
      description: "Find and register for new conferences",
      icon: SearchIcon,
      href: "/attendee/discover",
      color: "text-blue-600",
      bgColor: "bg-blue-50 hover:bg-blue-100",
    },
    {
      title: "My Conferences",
      description: "View your registered and completed events",
      icon: CalendarIcon,
      href: "/attendee/view-event",
      color: "text-green-600",
      bgColor: "bg-green-50 hover:bg-green-100",
    },
    {
      title: "Favorites",
      description: "Access your saved conferences and sessions",
      icon: HeartIcon,
      href: "/attendee/favorites",
      color: "text-red-600",
      bgColor: "bg-red-50 hover:bg-red-100",
    },
    {
      title: "Materials",
      description: "Download conference materials and resources",
      icon: BookOpenIcon,
      href: "/attendee/materials",
      color: "text-purple-600",
      bgColor: "bg-purple-50 hover:bg-purple-100",
    },
    {
      title: "Provide Feedback",
      description: "Rate and review attended conferences",
      icon: MessageSquareIcon,
      href: "/attendee/feedback",
      color: "text-orange-600",
      bgColor: "bg-orange-50 hover:bg-orange-100",
    },
    {
      title: "Settings",
      description: "Manage your profile and preferences",
      icon: SettingsIcon,
      href: "/attendee/settings",
      color: "text-gray-600",
      bgColor: "bg-gray-50 hover:bg-gray-100",
    },
  ];

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setIsLoading(true);
        const api = await createAuthenticatedApi();
        
        // Fetch user profile
        const userResponse = await api.get('/attendee/profile');
        setUser(userResponse.data);
        
        // Fetch dashboard stats
        const statsResponse = await api.get('/attendee/dashboard-stats');
        setStats(statsResponse.data || stats);
        
        // Fetch recent conferences
        const recentResponse = await api.get('/attendee/recent-conferences');
        setRecentConferences(recentResponse.data || []);
        
      } catch (error: any) {
        console.error('Error fetching dashboard data:', error);
        setError(error.response?.data?.message || 'Failed to load dashboard');
        // Don't show toast error for dashboard, just log it
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        {/* Loading skeleton */}
        <div className="flex items-center justify-between mb-8 bg-gray-100 p-6 rounded-lg">
          <div className="flex items-center">
            <Skeleton className="h-16 w-16 rounded-full" />
            <div className="ml-4">
              <Skeleton className="h-7 w-40 mb-2" />
              <Skeleton className="h-5 w-24" />
            </div>
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-10 w-36" />
            <Skeleton className="h-10 w-10 rounded-full" />
          </div>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24 rounded-lg" />
          ))}
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-32 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Dashboard Header */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="bg-gradient-to-r from-primary-50 to-primary-100 rounded-lg p-6 mb-8 shadow-sm">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
            <div className="flex items-center mb-4 md:mb-0">
              <Avatar className="h-16 w-16 mr-4">
                <AvatarImage 
                  src={user?.avatarUrl || '/placeholder-avatar.png'} 
                  alt={user?.name}
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/placeholder-avatar.png';
                  }}
                />
                <AvatarFallback>{user?.name?.charAt(0) || 'A'}</AvatarFallback>
              </Avatar>
              <div>
                <h1 className="text-3xl font-bold tracking-tight mb-2">
                  Welcome back, {user?.name || 'Attendee'}!
                </h1>
                <p className="text-gray-600 flex items-center gap-2">
                  <CalendarIcon className="h-4 w-4" />
                  {stats.registeredConferences} conferences registered
                  {stats.upcomingConferences > 0 && (
                    <>
                      <span className="text-gray-400">•</span>
                      <span className="text-primary-600 font-medium">
                        {stats.upcomingConferences} upcoming
                      </span>
                    </>
                  )}
                </p>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                onClick={() => router.push('/attendee/discover')}
                className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700"
              >
                <SearchIcon className="h-4 w-4" />
                Discover Conferences
              </Button>
              
              <Button
                variant="outline"
                onClick={() => router.push('/attendee/notifications')}
                className="relative"
              >
                <BellIcon className="h-4 w-4" />
                {stats.notifications > 0 && (
                  <Badge className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-xs">
                    {stats.notifications}
                  </Badge>
                )}
              </Button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Dashboard Stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="mb-8"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="bg-white border-none shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Upcoming</p>
                  <p className="text-3xl font-bold text-blue-600">{stats.upcomingConferences}</p>
                </div>
                <div className="p-3 bg-blue-50 text-blue-600 rounded-full">
                  <ClockIcon className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-white border-none shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Registered</p>
                  <p className="text-3xl font-bold text-green-600">{stats.registeredConferences}</p>
                </div>
                <div className="p-3 bg-green-50 text-green-600 rounded-full">
                  <CalendarIcon className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-white border-none shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Favorites</p>
                  <p className="text-3xl font-bold text-red-600">{stats.favoriteConferences}</p>
                </div>
                <div className="p-3 bg-red-50 text-red-600 rounded-full">
                  <HeartIcon className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-white border-none shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Materials</p>
                  <p className="text-3xl font-bold text-purple-600">{stats.unreadMaterials}</p>
                </div>
                <div className="p-3 bg-purple-50 text-purple-600 rounded-full">
                  <BookOpenIcon className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Quick Actions - Main Content */}
        <div className="lg:col-span-2">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
          >
            <Card className="mb-8">
              <CardHeader className="pb-4">
                <CardTitle className="text-xl font-semibold flex items-center gap-2">
                  <TrendingUpIcon className="h-5 w-5 text-primary-600" />
                  Quick Actions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {quickActions.map((action, index) => (
                    <motion.div
                      key={action.title}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: 0.3 + index * 0.05 }}
                    >
                      <Card 
                        className={`cursor-pointer transition-all duration-200 hover:shadow-md border-l-4 border-l-transparent hover:border-l-primary-500 ${action.bgColor}`}
                        onClick={() => router.push(action.href)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            <div className={`p-2 rounded-lg ${action.color}`}>
                              <action.icon className="h-5 w-5" />
                            </div>
                            <div className="flex-1">
                              <h3 className="font-semibold text-gray-900 mb-1">
                                {action.title}
                              </h3>
                              <p className="text-sm text-gray-600 mb-2">
                                {action.description}
                              </p>
                              <div className="flex items-center text-xs text-primary-600 font-medium">
                                Learn more
                                <ArrowRightIcon className="h-3 w-3 ml-1" />
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Recent Activity */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: 0.4 }}
          >
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-semibold flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <ClockIcon className="h-5 w-5 text-gray-600" />
                    Recent Activity
                  </span>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => router.push('/attendee/view-event')}
                  >
                    <EyeIcon className="h-4 w-4" />
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {recentConferences.length > 0 ? (
                  <div className="space-y-3">
                    {recentConferences.slice(0, 3).map((conference, index) => (
                      <div
                        key={conference.id}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors"
                        onClick={() => router.push(`/attendee/conferences/${conference.id}`)}
                      >
                        <div className="flex-1">
                          <p className="font-medium text-sm truncate">
                            {conference.name}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <CalendarIcon className="h-3 w-3 text-gray-400" />
                            <span className="text-xs text-gray-500">
                              {new Date(conference.date).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                        <Badge 
                          variant={
                            conference.status === 'upcoming' ? 'default' :
                            conference.status === 'active' ? 'destructive' : 'secondary'
                          }
                          className="text-xs"
                        >
                          {conference.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <CalendarIcon className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                    <p className="text-sm text-gray-500 mb-3">
                      No recent activity
                    </p>
                    <Button 
                      size="sm" 
                      onClick={() => router.push('/attendee/discover')}
                    >
                      <PlusIcon className="h-4 w-4 mr-1" />
                      Find Conferences
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Pending Tasks */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: 0.5 }}
          >
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <MessageSquareIcon className="h-5 w-5 text-orange-600" />
                  Pending Tasks
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {stats.pendingFeedback > 0 && (
                    <div 
                      className="flex items-center justify-between p-3 bg-orange-50 rounded-lg cursor-pointer hover:bg-orange-100 transition-colors"
                      onClick={() => router.push('/attendee/feedback')}
                    >
                      <div className="flex items-center gap-3">
                        <MessageSquareIcon className="h-4 w-4 text-orange-600" />
                        <span className="text-sm font-medium">Feedback Required</span>
                      </div>
                      <Badge variant="secondary">{stats.pendingFeedback}</Badge>
                    </div>
                  )}
                  
                  {stats.unreadMaterials > 0 && (
                    <div 
                      className="flex items-center justify-between p-3 bg-purple-50 rounded-lg cursor-pointer hover:bg-purple-100 transition-colors"
                      onClick={() => router.push('/attendee/materials')}
                    >
                      <div className="flex items-center gap-3">
                        <BookOpenIcon className="h-4 w-4 text-purple-600" />
                        <span className="text-sm font-medium">New Materials</span>
                      </div>
                      <Badge variant="secondary">{stats.unreadMaterials}</Badge>
                    </div>
                  )}
                  
                  {stats.pendingFeedback === 0 && stats.unreadMaterials === 0 && (
                    <div className="text-center py-4">
                      <StarIcon className="h-8 w-8 mx-auto text-green-500 mb-2" />
                      <p className="text-sm text-gray-500">
                        All caught up! 🎉
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
}