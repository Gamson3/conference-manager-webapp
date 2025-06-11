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
  ChevronRightIcon,
  SparklesIcon,
  GraduationCapIcon,
  UsersIcon,
  AwardIcon,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { createAuthenticatedApi } from '@/lib/utils';
import { toast } from 'sonner';
import FavoritesPanel from '@/components/FavoritesPanel';

interface DashboardStats {
  upcomingConferences: number;
  registeredConferences: number;
  completedConferences: number;
  favoritePresentations: number;
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
    favoritePresentations: 0,
    unreadMaterials: 0,
    pendingFeedback: 0,
    connections: 0,
    notifications: 0,
  });
  const [recentConferences, setRecentConferences] = useState<RecentConference[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Enhanced quick actions with more visual appeal
  const quickActions = [
    {
      title: "Discover Conferences",
      description: "Find and register for new academic conferences",
      icon: SearchIcon,
      href: "/attendee/discover",
      color: "text-blue-600",
      bgColor: "bg-gradient-to-br from-blue-50 to-blue-100 hover:from-blue-100 hover:to-blue-200",
      iconBg: "bg-blue-500",
      badge: "Popular",
      badgeColor: "bg-blue-500",
    },
    {
      title: "My Conferences",
      description: "View your registered and completed events",
      icon: CalendarIcon,
      href: "/attendee/view-event",
      color: "text-emerald-600",
      bgColor: "bg-gradient-to-br from-emerald-50 to-emerald-100 hover:from-emerald-100 hover:to-emerald-200",
      iconBg: "bg-emerald-500",
      badge: stats.upcomingConferences > 0 ? `${stats.upcomingConferences} upcoming` : null,
      badgeColor: "bg-emerald-500",
    },
    {
      title: "Favorites",
      description: "Access your saved presentations and sessions",
      icon: HeartIcon,
      href: "/attendee/favorites",
      color: "text-rose-600",
      bgColor: "bg-gradient-to-br from-rose-50 to-rose-100 hover:from-rose-100 hover:to-rose-200",
      iconBg: "bg-rose-500",
      badge: stats.favoritePresentations > 0 ? `${stats.favoritePresentations} saved` : null,
      badgeColor: "bg-rose-500",
    },
    {
      title: "Academic Resources",
      description: "Download conference materials and papers",
      icon: BookOpenIcon,
      href: "/attendee/materials",
      color: "text-purple-600",
      bgColor: "bg-gradient-to-br from-purple-50 to-purple-100 hover:from-purple-100 hover:to-purple-200",
      iconBg: "bg-purple-500",
      badge: stats.unreadMaterials > 0 ? "New" : null,
      badgeColor: "bg-purple-500",
    },
  ];

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setIsLoading(true);
        const api = await createAuthenticatedApi();
        
        // Fetch user profile
        const userResponse = await api.get('/api/attendee/profile');
        setUser(userResponse.data);
        
        // Fetch dashboard stats
        const statsResponse = await api.get('/api/attendee/dashboard-stats');
        setStats(statsResponse.data || stats);
        
        // Fetch recent conferences
        const recentResponse = await api.get('/api/attendee/recent-conferences');
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <div className="max-w-7xl mx-auto p-6">
        {/* Enhanced Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-primary-600 via-primary-700 to-primary-800 rounded-3xl"></div>
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 via-purple-600/20 to-pink-600/20 rounded-3xl"></div>
          <div className="relative p-8 md:p-12 text-white rounded-3xl">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
              <div className="flex items-start mb-6 md:mb-0">
                <div className="relative">
                  <Avatar className="h-20 w-20 mr-6 ring-4 ring-white/20">
                    <AvatarImage 
                      src={user?.avatarUrl || '/placeholder-avatar.svg'} 
                      alt={user?.name}
                    />
                    <AvatarFallback className="bg-white/20 text-white text-2xl font-bold">
                      {user?.name?.charAt(0) || 'A'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="absolute -bottom-1 bg-green-400 w-6 h-6 rounded-full border-2 border-white flex items-center justify-center">
                    <SparklesIcon className="h-3 w-3 text-white" />
                  </div>
                </div>
                <div>
                  <h1 className="text-2xl md:text-3xl font-bold">
                    Welcome back, {user?.name?.split(' ')[0] || 'Scholar'}! 
                  </h1>
                  <p className="text-base text-white/90 mb-3">
                    Ready to discover amazing academic content?
                  </p>
                  <div className="flex items-center gap-4 text-white/80">
                    <div className="flex items-center gap-2">
                      <GraduationCapIcon className="h-5 w-5" />
                      <span className="font-medium">{stats.registeredConferences} conferences</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <HeartIcon className="h-5 w-5" />
                      <span className="font-medium">{stats.favoritePresentations} favorites</span>
                    </div>
                    {stats.upcomingConferences > 0 && (
                      <div className="flex items-center gap-2">
                        <CalendarIcon className="h-5 w-5" />
                        <span className="font-medium text-yellow-300">
                          {stats.upcomingConferences} upcoming
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  onClick={() => router.push('/attendee/discover')}
                  className="bg-white text-primary-700 hover:bg-white/90 font-semibold px-6 py-3 rounded-xl shadow-lg transition-all duration-200 hover:shadow-xl"
                >
                  <SearchIcon className="h-5 w-5 mr-2" />
                  Discover Events
                </Button>
                
                <Button
                  variant="outline"
                  onClick={() => router.push('/attendee/notifications')}
                  className="relative border-white/30 text-white hover:bg-white/10 font-semibold px-6 py-3 rounded-xl"
                >
                  <BellIcon className="h-5 w-5" />
                  {stats.notifications > 0 && (
                    <Badge className="absolute -top-2 -right-2 h-6 w-6 p-0 flex items-center justify-center text-xs bg-yellow-400 text-yellow-900">
                      {stats.notifications}
                    </Badge>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Enhanced Stats Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-8"
        >
          {[
            {
              label: "Upcoming Events",
              value: stats.upcomingConferences,
              icon: ClockIcon,
              color: "text-blue-600",
              bgColor: "from-blue-500 to-blue-600",
              change: "This month"
            },
            {
              label: "Total Registered",
              value: stats.registeredConferences,
              icon: CalendarIcon,
              color: "text-emerald-600",
              bgColor: "from-emerald-500 to-emerald-600",
              change: "All time"
            },
            {
              label: "Saved Favorites",
              value: stats.favoritePresentations,
              icon: HeartIcon,
              color: "text-rose-600",
              bgColor: "from-rose-500 to-rose-600",
              change: "+5 this month"
            },
            {
              label: "Resources",
              value: stats.unreadMaterials,
              icon: BookOpenIcon,
              color: "text-purple-600",
              bgColor: "from-purple-500 to-purple-600",
              change: "Available"
            }
          ].map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 + index * 0.1 }}
            >
              <Card className="relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-101">
                <div className={`absolute inset-0 bg-gradient-to-br ${stat.bgColor} opacity-10`}></div>
                <CardContent className="p-6 relative">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600 mb-1">{stat.label}</p>
                      <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
                      <p className="text-xs text-gray-500 mt-1">{stat.change}</p>
                    </div>
                    <div className={`p-3 rounded-2xl bg-gradient-to-br ${stat.bgColor} text-white shadow-lg`}>
                      <stat.icon className="h-6 w-6" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>

        <div className="space-y-8 mt-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
            {/* Enhanced Quick Actions */}
            <div className="lg:col-span-2">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
              >
                <Card className="border-0 shadow-xl bg-white/70 backdrop-blur-sm">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-2xl font-bold flex items-center gap-3">
                      <div className="p-2 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl text-white">
                        <TrendingUpIcon className="h-6 w-6" />
                      </div>
                      Quick Actions
                    </CardTitle>
                    <p className="text-gray-600">Everything you need at your fingertips</p>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {quickActions.map((action, index) => (
                        <motion.div
                          key={action.title}
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ duration: 0.4, delay: 0.4 + index * 0.1 }}
                          // whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          <Card 
                            className={`cursor-pointer transition-all duration-300 hover:shadow-lg border-0 overflow-hidden group ${action.bgColor}`}
                            onClick={() => router.push(action.href)}
                          >
                            <CardContent className="p-6 relative">
                              {action.badge && (
                                <Badge className={`absolute top-3 right-3 ${action.badgeColor} text-white text-xs px-2 py-1`}>
                                  {action.badge}
                                </Badge>
                              )}
                              <div className="flex items-start gap-4">
                                <div className={`p-3 rounded-2xl ${action.iconBg} text-white shadow-lg group-hover:scale-100 transition-transform duration-300`}>
                                  <action.icon className="h-6 w-6" />
                                </div>
                                <div className="flex-1">
                                  <h3 className="font-bold text-gray-900 mb-2 text-lg group-hover:text-primary-700 transition-colors">
                                    {action.title}
                                  </h3>
                                  <p className="text-sm text-gray-600 mb-3 leading-relaxed">
                                    {action.description}
                                  </p>
                                  <div className="flex items-center text-sm font-medium text-primary-600 group-hover:text-primary-700">
                                    Get started
                                    <ArrowRightIcon className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
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
            {/* Enhanced Sidebar */}
            <div className="space-y-6">
              {/* Achievement Card */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.5 }}
              >
                <Card className="border-0 shadow-xl bg-gradient-to-br from-yellow-50 to-orange-50">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-lg font-bold flex items-center gap-2">
                      <AwardIcon className="h-5 w-5 text-yellow-600" />
                      Your Progress
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-700">Conferences Attended</span>
                        <span className="text-2xl font-bold text-yellow-600">{stats.completedConferences}</span>
                      </div>
                      <div className="w-full bg-yellow-200 rounded-full h-2">
                        <div 
                          className="bg-gradient-to-r from-yellow-400 to-orange-400 h-2 rounded-full transition-all duration-500"
                          style={{ width: `${Math.min((stats.completedConferences / 10) * 100, 100)}%` }}
                        ></div>
                      </div>
                      <p className="text-xs text-gray-600">
                        {10 - stats.completedConferences > 0 
                          ? `${10 - stats.completedConferences} more to unlock Scholar Badge!`
                          : "🎉 Scholar Badge Unlocked!"
                        }
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
              {/* Enhanced Recent Activity */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.6 }}
              >
                <Card className="border-0 shadow-xl bg-white/70 backdrop-blur-sm">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-lg font-bold flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <ClockIcon className="h-5 w-5 text-gray-600" />
                        Recent Activity
                      </span>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => router.push('/attendee/view-event')}
                        className="hover:bg-primary-50"
                      >
                        <EyeIcon className="h-4 w-4" />
                      </Button>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {recentConferences.length > 0 ? (
                      <div className="space-y-3">
                        {recentConferences.slice(0, 3).map((conference, index) => (
                          <motion.div
                            key={conference.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.7 + index * 0.1 }}
                            className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl hover:from-primary-50 hover:to-primary-100 cursor-pointer transition-all duration-300 hover:shadow-md"
                            onClick={() => router.push(`/attendee/conferences/${conference.id}`)}
                          >
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-sm truncate text-gray-900">
                                {conference.name}
                              </p>
                              <div className="flex items-center gap-2 mt-1">
                                <CalendarIcon className="h-3 w-3 text-gray-400" />
                                <span className="text-xs text-gray-500">
                                  {new Date(conference.date).toLocaleDateString()}
                                </span>
                              </div>
                            </div>
                            <ChevronRightIcon className="h-4 w-4 text-gray-400" />
                          </motion.div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-blue-200 rounded-full flex items-center justify-center mx-auto mb-4">
                          <CalendarIcon className="h-8 w-8 text-blue-600" />
                        </div>
                        <p className="text-sm text-gray-500 mb-4">No recent activity</p>
                        <Button 
                          size="sm" 
                          onClick={() => router.push('/attendee/discover')}
                          className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
                        >
                          <PlusIcon className="h-4 w-4 mr-2" />
                          Discover Events
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            </div>
          </div>
          {/* Full-width Favorites Panel */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.7 }}
            className="w-full border-0 shadow-xl bg-white/70 backdrop-blur-sm"
          >
            <FavoritesPanel />
          </motion.div>
        </div>
      </div>
    </div>
  );
}