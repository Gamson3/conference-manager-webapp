"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  FileText, 
  Users, 
  LayoutDashboard, 
  Calendar,
  Clock,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Plus,
  Settings,
  BarChart3,
  Eye
} from "lucide-react";
import { useGetAuthUserQuery, useGetOrganizerEventsQuery } from "@/state/api";
import { format } from "date-fns";

const OrganizerDashboard = () => {
  const router = useRouter();
  const { data: authUser, isLoading: userLoading } = useGetAuthUserQuery();
  interface Conference {
    id: string;
    name: string;
    startDate: string;
    endDate: string;
    status: string;
    createdAt?: string;
    pendingReviewsCount?: number;
    _count?: {
      attendances?: number;
      presentations?: number;
    };
  }
  
  const { data: conferences, isLoading: conferencesLoading } = useGetOrganizerEventsQuery(
    { organizerId: authUser?.userInfo?.id },
    { skip: !authUser?.userInfo?.id }
  ) as { data: Conference[] | undefined, isLoading: boolean };

  // Calculate dashboard stats
  const dashboardStats = React.useMemo(() => {
    if (!conferences) return {
      totalEvents: 0,
      upcomingEvents: 0,
      activeEvents: 0,
      draftEvents: 0,
      totalAttendees: 0,
      pendingReviews: 0
    };

    const now = new Date();
    const upcoming = conferences.filter(conference => new Date(conference.startDate) > now);
    const active = conferences.filter(conference => 
      new Date(conference.startDate) <= now && new Date(conference.endDate) >= now
    );
    const drafts = conferences.filter(conference => conference.status === 'draft');
    const totalAttendees = conferences.reduce((sum, conference) => sum + (conference._count?.attendances || 0), 0);
    const pendingReviews = conferences.reduce((sum, conference) => sum + (conference.pendingReviewsCount || 0), 0);

    return {
      totalEvents: conferences.length,
      upcomingEvents: upcoming.length,
      activeEvents: active.length,
      draftEvents: drafts.length,
      totalAttendees,
      pendingReviews
    };
  }, [conferences]);

  // Get recent conferences
  const recentConferences = React.useMemo(() => {
    if (!conferences) return [];
    return [...conferences]
      .sort((a, b) => new Date(b.createdAt || b.startDate).getTime() - new Date(a.createdAt || a.startDate).getTime())
      .slice(0, 3);
  }, [conferences]);

  const quickActions = [
    {
      title: "Create New Event",
      description: "Start planning your next conference",
      href: "/organizer/create-event",
      icon: Plus,
      color: "bg-blue-500",
      hoverColor: "hover:bg-blue-600"
    },
    {
      title: "Review Submissions",
      description: "Review pending presentations",
      href: "/organizer/submissions",
      icon: FileText,
      color: "bg-purple-500",
      hoverColor: "hover:bg-purple-600",
      badge: dashboardStats.pendingReviews > 0 ? dashboardStats.pendingReviews : null
    },
    {
      title: "Manage Events",
      description: "View and edit your conferences",
      href: "/organizer/events",
      icon: LayoutDashboard,
      color: "bg-green-500",
      hoverColor: "hover:bg-green-600"
    },
    {
      title: "Account Settings",
      description: "Manage your profile and preferences",
      href: "/organizer/settings",
      icon: Settings,
      color: "bg-gray-500",
      hoverColor: "hover:bg-gray-600"
    }
  ];

  const statsCards = [
    {
      title: "Total Events",
      value: dashboardStats.totalEvents,
      icon: Calendar,
      color: "text-blue-600",
      bgColor: "bg-blue-50"
    },
    {
      title: "Upcoming Events",
      value: dashboardStats.upcomingEvents,
      icon: Clock,
      color: "text-green-600",
      bgColor: "bg-green-50"
    },
    {
      title: "Active Events",
      value: dashboardStats.activeEvents,
      icon: CheckCircle,
      color: "text-emerald-600",
      bgColor: "bg-emerald-50"
    },
    {
      title: "Draft Events",
      value: dashboardStats.draftEvents,
      icon: AlertCircle,
      color: "text-orange-600",
      bgColor: "bg-orange-50"
    },
    {
      title: "Total Attendees",
      value: dashboardStats.totalAttendees,
      icon: Users,
      color: "text-purple-600",
      bgColor: "bg-purple-50"
    },
    {
      title: "Pending Reviews",
      value: dashboardStats.pendingReviews,
      icon: FileText,
      color: "text-indigo-600",
      bgColor: "bg-indigo-50"
    }
  ];

  if (userLoading || conferencesLoading) {
    return (
      <div className="p-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 p-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Welcome back, {authUser?.userInfo?.name || 'Organizer'}
          </h1>
          <p className="text-gray-600 mt-1">
            Here's what's happening with your conferences today
          </p>
        </div>
        <Button 
          onClick={() => router.push('/organizer/create-event')}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="h-4 w-4 mr-2" />
          Create Event
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {statsCards.map((stat, index) => (
          <Card key={index} className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                </div>
                <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                  <stat.icon className={`h-5 w-5 ${stat.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Quick Actions */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {quickActions.map((action, index) => (
                  <Link key={index} href={action.href}>
                    <Card className="transition-all duration-200 hover:shadow-md hover:-translate-y-1 cursor-pointer border-gray-200">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${action.color} ${action.hoverColor} text-white transition-colors`}>
                            <action.icon className="h-5 w-5" />
                            {action.badge && (
                              <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                                {action.badge}
                              </span>
                            )}
                          </div>
                          <div className="flex-1">
                            <h3 className="font-semibold text-gray-900">{action.title}</h3>
                            <p className="text-sm text-gray-600">{action.description}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Events */}
        <div>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Recent Events
                </CardTitle>
                <Link href="/organizer/events">
                  <Button variant="ghost" size="sm">
                    <Eye className="h-4 w-4 mr-1" />
                    View All
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {recentConferences.length > 0 ? (
                <div className="space-y-3">
                  {recentConferences.map((conference) => (
                    <Link key={conference.id} href={`/organizer/events/${conference.id}`}>
                      <div className="p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors cursor-pointer">
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="font-medium text-sm text-gray-900 truncate">
                            {conference.name}
                          </h4>
                          <Badge 
                            variant={conference.status === 'published' ? 'default' : 'secondary'}
                            className="text-xs"
                          >
                            {conference.status}
                          </Badge>
                        </div>
                        <p className="text-xs text-gray-600">
                          {format(new Date(conference.startDate), "MMM d, yyyy")}
                        </p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {conference._count?.attendances || 0}
                          </span>
                          <span className="flex items-center gap-1">
                            <FileText className="h-3 w-3" />
                            {conference._count?.presentations || 0}
                          </span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6">
                  <Calendar className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                  <p className="text-sm text-gray-600 mb-3">No events yet</p>
                  <Link href="/organizer/create-event">
                    <Button size="sm">Create Your First Event</Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Draft Events Alert */}
      {dashboardStats.draftEvents > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AlertCircle className="h-5 w-5 text-orange-600" />
                <div>
                  <p className="font-medium text-orange-800">
                    You have {dashboardStats.draftEvents} draft event{dashboardStats.draftEvents > 1 ? 's' : ''} 
                  </p>
                  <p className="text-sm text-orange-700">
                    Complete the setup to make them available to attendees
                  </p>
                </div>
              </div>
              <Link href="/organizer/events">
                <Button variant="outline" size="sm" className="border-orange-300 text-orange-700 hover:bg-orange-100">
                  Complete Setup
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default OrganizerDashboard;