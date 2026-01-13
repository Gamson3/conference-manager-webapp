"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import apiClient, { handleApiError } from "@/lib/api/client";
import { API_ENDPOINTS } from "@/lib/api/endpoints";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CalendarDays,
  Users,
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Settings,
  Sparkles,
  Calendar,
  MapPin,
  Globe,
  Zap,
  Target,
  PenTool,
  Presentation,
  LayoutGrid,
  AlertTriangle,
  ChevronRight,
  Play,
  Eye,
  EyeOff,
} from "lucide-react";

import {
  type DashboardStats,
  type OrganizerConferenceDashboardStatsResponse,
} from "./dashboardStats";

interface ConferenceData {
  id: number;
  name: string;
  description: string | null;
  startDate: string;
  endDate: string;
  timezone: string;
  status: string;
  isPublic: boolean;
  venue: string | null;
  location: string | null;
  registrationEnabled: boolean;
  registrationOpenFrom: string | null;
  registrationOpenUntil: string | null;
  submissionsOpenFrom: string | null;
  submissionsOpenUntil: string | null;
  schedulePublishedAt: string | null;
}


interface TimelineEvent {
  id: string;
  title: string;
  date: string | null;
  type: "submission" | "registration" | "conference" | "deadline";
  status: "past" | "active" | "upcoming" | "not_set";
  icon: typeof CalendarDays;
}

const quickActions = [
  {
    title: "Manage Submissions",
    description: "Review and process abstract submissions",
    icon: FileText,
    href: "abstracts/overview",
    color: "from-blue-500/20 to-blue-600/10",
    iconColor: "text-blue-500",
  },
  {
    title: "Build Schedule",
    description: "Arrange presentations into sessions",
    icon: LayoutGrid,
    href: "program/scheduler",
    color: "from-purple-500/20 to-purple-600/10",
    iconColor: "text-purple-500",
  },
  {
    title: "Registration",
    description: "Manage participant registrations",
    icon: Users,
    href: "registration/overview",
    color: "from-green-500/20 to-green-600/10",
    iconColor: "text-green-500",
  },
  {
    title: "Conference Settings",
    description: "Configure dates, venue, and details",
    icon: Settings,
    href: "settings/basics",
    color: "from-amber-500/20 to-amber-600/10",
    iconColor: "text-amber-500",
  },
];

export default function ConferenceHomePage() {
  const params = useParams();
  const rawId = (params as Record<string, string | string[] | undefined>)?.id;
  const idStr = Array.isArray(rawId) ? rawId[0] : rawId;
  const conferenceIdParam: string | number | null = (() => {
    if (!idStr) return null;
    const asNumber = Number(idStr);
    return Number.isFinite(asNumber) ? asNumber : idStr;
  })();

  const [conference, setConference] = useState<ConferenceData | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = useCallback(async () => {
    if (!conferenceIdParam) {
      setError("Invalid conference id");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    setStats(null);

    try {
      const [confRes, dashboardRes] = await Promise.all([
        apiClient.get<ConferenceData>(API_ENDPOINTS.ORGANIZER.CONFERENCE(conferenceIdParam)),
        apiClient.get<OrganizerConferenceDashboardStatsResponse>(
          API_ENDPOINTS.ORGANIZER.DASHBOARD_STATS(conferenceIdParam)
        ),
      ]);

      setConference(confRes.data);

      setStats({
        submissions: {
          total: dashboardRes.data.submissions.total,
          pending: dashboardRes.data.submissions.pending,
          accepted: dashboardRes.data.submissions.accepted,
          rejected: dashboardRes.data.submissions.rejected,
          underReview: dashboardRes.data.submissions.underReview,
        },
        participants: {
          total: dashboardRes.data.participants.total,
          registered: dashboardRes.data.participants.registered,
          waitlisted: dashboardRes.data.participants.waitlisted,
          byRole: dashboardRes.data.participants.byRole,
        },
        program: {
          days: dashboardRes.data.program.daysCount,
          sessions: dashboardRes.data.program.sessionsCount,
          presentations: dashboardRes.data.program.presentationsCount,
          unscheduled: dashboardRes.data.program.unscheduledAccepted,
        },
      });
    } catch (err) {
      setError(handleApiError(err));
    } finally {
      setLoading(false);
    }
  }, [conferenceIdParam]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const getTimelineEvents = (): TimelineEvent[] => {
    if (!conference) return [];
    const now = new Date();
    const events: TimelineEvent[] = [];

    const getStatus = (start: string | null, end: string | null): "past" | "active" | "upcoming" | "not_set" => {
      if (!start && !end) return "not_set";
      const startDate = start ? new Date(start) : null;
      const endDate = end ? new Date(end) : null;
      if (endDate && now > endDate) return "past";
      if (startDate && now >= startDate && (!endDate || now <= endDate)) return "active";
      if (startDate && now < startDate) return "upcoming";
      return "not_set";
    };

    events.push({
      id: "submissions",
      title: "Submissions Window",
      date: conference.submissionsOpenFrom,
      type: "submission",
      status: getStatus(conference.submissionsOpenFrom, conference.submissionsOpenUntil),
      icon: FileText,
    });

    events.push({
      id: "registration",
      title: "Registration Window",
      date: conference.registrationOpenFrom,
      type: "registration",
      status: getStatus(conference.registrationOpenFrom, conference.registrationOpenUntil),
      icon: Users,
    });

    events.push({
      id: "conference",
      title: "Conference Dates",
      date: conference.startDate,
      type: "conference",
      status: getStatus(conference.startDate, conference.endDate),
      icon: CalendarDays,
    });

    return events;
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Not set";
    return new Date(dateString).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const getDaysUntilConference = () => {
    if (!conference?.startDate) return null;
    const start = new Date(conference.startDate);
    const now = new Date();
    const diff = Math.ceil((start.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { color: string; icon: typeof CheckCircle2 }> = {
      draft: { color: "bg-gray-500/10 text-gray-500", icon: PenTool },
      published: { color: "bg-green-500/10 text-green-500", icon: CheckCircle2 },
      active: { color: "bg-blue-500/10 text-blue-500", icon: Play },
      completed: { color: "bg-purple-500/10 text-purple-500", icon: CheckCircle2 },
      cancelled: { color: "bg-red-500/10 text-red-500", icon: AlertCircle },
    };
    const config = statusConfig[status] || statusConfig.draft;
    const Icon = config.icon;
    return (
      <Badge className={`${config.color} gap-1 capitalize`}>
        <Icon className="h-3 w-3" />
        {status}
      </Badge>
    );
  };

  const getTimelineStatusBadge = (status: TimelineEvent["status"]) => {
    switch (status) {
      case "active":
        return <Badge className="bg-green-500/10 text-green-500">Active</Badge>;
      case "upcoming":
        return <Badge className="bg-blue-500/10 text-blue-500">Upcoming</Badge>;
      case "past":
        return <Badge variant="secondary">Ended</Badge>;
      default:
        return <Badge variant="outline">Not Set</Badge>;
    }
  };

  if (!idStr) return null;

  if (loading) {
    return (
      <div className="space-y-8">
        {/* Hero Skeleton */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/5 via-primary/10 to-background p-8">
          <Skeleton className="h-10 w-96 mb-4" />
          <Skeleton className="h-6 w-64" />
        </div>
        {/* Stats Skeleton */}
        <div className="grid gap-4 md:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4">
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 text-destructive">
              <AlertCircle className="h-5 w-5" />
              <p>{error}</p>
            </div>
            <Button variant="outline" className="mt-4" onClick={fetchDashboardData}>
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!conference) return null;

  const daysUntil = getDaysUntilConference();
  const timelineEvents = getTimelineEvents();

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/5 via-primary/10 to-background border">
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-primary/20 to-transparent rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-blue-500/10 to-transparent rounded-full blur-2xl translate-y-1/2 -translate-x-1/2" />
        
        <div className="relative p-8">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
            <div className="space-y-4">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-3xl font-bold tracking-tight">{conference.name}</h1>
                {getStatusBadge(conference.status)}
                {conference.isPublic ? (
                  <Badge variant="outline" className="gap-1">
                    <Eye className="h-3 w-3" /> Public
                  </Badge>
                ) : (
                  <Badge variant="outline" className="gap-1 text-muted-foreground">
                    <EyeOff className="h-3 w-3" /> Draft
                  </Badge>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <Calendar className="h-4 w-4" />
                  <span>
                    {formatDate(conference.startDate)} - {formatDate(conference.endDate)}
                  </span>
                </div>
                {conference.venue && (
                  <div className="flex items-center gap-1.5">
                    <MapPin className="h-4 w-4" />
                    <span>{conference.venue}</span>
                  </div>
                )}
                {conference.location && (
                  <div className="flex items-center gap-1.5">
                    <Globe className="h-4 w-4" />
                    <span>{conference.location}</span>
                  </div>
                )}
              </div>

              {conference.description && (
                <p className="text-muted-foreground max-w-2xl line-clamp-2">
                  {conference.description}
                </p>
              )}
            </div>

            {/* Countdown Card */}
            {daysUntil !== null && daysUntil > 0 && (
              <Card className="bg-background/80 backdrop-blur-sm border-primary/20 min-w-[200px]">
                <CardContent className="pt-6 text-center">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <Sparkles className="h-5 w-5 text-primary animate-pulse" />
                  </div>
                  <div className="text-4xl font-bold text-primary">{daysUntil}</div>
                  <div className="text-sm text-muted-foreground">days until event</div>
                </CardContent>
              </Card>
            )}
            {daysUntil !== null && daysUntil <= 0 && daysUntil >= -((new Date(conference.endDate).getTime() - new Date(conference.startDate).getTime()) / (1000 * 60 * 60 * 24)) && (
              <Card className="bg-green-500/10 border-green-500/20 min-w-[200px]">
                <CardContent className="pt-6 text-center">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <Zap className="h-5 w-5 text-green-500 animate-bounce" />
                  </div>
                  <div className="text-xl font-bold text-green-600">LIVE NOW</div>
                  <div className="text-sm text-green-600/80">Event in progress</div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Submissions */}
        <Card className="relative overflow-hidden group hover:shadow-lg transition-shadow">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <FileText className="h-4 w-4 text-blue-500" />
              Submissions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats?.submissions.total || 0}</div>
            <div className="flex items-center gap-4 mt-2 text-xs">
              <span className="text-amber-500">{stats?.submissions.pending || 0} pending</span>
              <span className="text-green-500">{stats?.submissions.accepted || 0} accepted</span>
            </div>
            <Link href={`/organizer/conferences/${idStr}/abstracts/overview`}>
              <Button variant="ghost" size="sm" className="mt-3 -ml-2 text-blue-500 hover:text-blue-600">
                View all <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Participants */}
        <Card className="relative overflow-hidden group hover:shadow-lg transition-shadow">
          <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Users className="h-4 w-4 text-green-500" />
              Participants
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats?.participants.total || 0}</div>
            <div className="flex items-center gap-4 mt-2 text-xs">
              <span className="text-green-500">{stats?.participants.registered || 0} registered</span>
              {(stats?.participants.waitlisted || 0) > 0 && (
                <span className="text-amber-500">{stats?.participants.waitlisted || 0} waitlisted</span>
              )}
            </div>
            <Link href={`/organizer/conferences/${idStr}/registration/overview`}>
              <Button variant="ghost" size="sm" className="mt-3 -ml-2 text-green-500 hover:text-green-600">
                View all <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Sessions */}
        <Card className="relative overflow-hidden group hover:shadow-lg transition-shadow">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <LayoutGrid className="h-4 w-4 text-purple-500" />
              Schedule
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats?.program.sessions || 0}</div>
            <div className="flex items-center gap-4 mt-2 text-xs">
              <span>{stats?.program.days || 0} days</span>
              <span className="text-purple-500">{stats?.program.presentations || 0} presentations</span>
            </div>
            <Link href={`/organizer/conferences/${idStr}/program/overview`}>
              <Button variant="ghost" size="sm" className="mt-3 -ml-2 text-purple-500 hover:text-purple-600">
                View schedule <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Progress */}
        <Card className="relative overflow-hidden group hover:shadow-lg transition-shadow">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Target className="h-4 w-4 text-amber-500" />
              Setup Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            {(() => {
              const checks = [
                !!conference.startDate,
                !!conference.venue,
                (stats?.submissions.total || 0) > 0,
                (stats?.program.sessions || 0) > 0,
                !!conference.schedulePublishedAt,
              ];
              const completed = checks.filter(Boolean).length;
              const progress = Math.round((completed / checks.length) * 100);
              return (
                <>
                  <div className="text-3xl font-bold">{progress}%</div>
                  <Progress value={progress} className="mt-2 h-2" />
                  <p className="text-xs text-muted-foreground mt-2">
                    {completed}/{checks.length} tasks completed
                  </p>
                </>
              );
            })()}
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Quick Actions */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" />
              Quick Actions
            </CardTitle>
            <CardDescription>Common tasks to manage your conference</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2">
              {quickActions.map((action) => (
                <Link
                  key={action.href}
                  href={`/organizer/conferences/${idStr}/${action.href}`}
                >
                  <div className={`relative overflow-hidden rounded-xl border p-4 hover:shadow-md transition-all cursor-pointer group bg-gradient-to-br ${action.color}`}>
                    <div className="flex items-start gap-4">
                      <div className={`p-2.5 rounded-lg bg-background/80 ${action.iconColor}`}>
                        <action.icon className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium">{action.title}</p>
                        <p className="text-sm text-muted-foreground mt-0.5">{action.description}</p>
                      </div>
                      <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Timeline */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              Key Dates
            </CardTitle>
            <CardDescription>Important milestones and windows</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {timelineEvents.map((event) => (
                <div
                  key={event.id}
                  className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                >
                  <div className={`p-2 rounded-lg ${
                    event.status === "active" ? "bg-green-500/10 text-green-500" :
                    event.status === "upcoming" ? "bg-blue-500/10 text-blue-500" :
                    event.status === "past" ? "bg-muted text-muted-foreground" :
                    "bg-muted text-muted-foreground"
                  }`}>
                    <event.icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium text-sm">{event.title}</p>
                      {getTimelineStatusBadge(event.status)}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {event.date ? formatDate(event.date) : "Not configured"}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <Link href={`/organizer/conferences/${idStr}/settings/deadlines`}>
              <Button variant="outline" size="sm" className="w-full mt-4">
                Manage Deadlines
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Alerts & Notifications */}
      {((stats?.program.unscheduled || 0) > 0 || !conference.schedulePublishedAt) && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-amber-600">
              <AlertTriangle className="h-5 w-5" />
              Action Required
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {(stats?.program.unscheduled || 0) > 0 && (
                <div className="flex items-center justify-between p-3 rounded-lg bg-background/50">
                  <div className="flex items-center gap-3">
                    <Presentation className="h-5 w-5 text-amber-500" />
                    <div>
                      <p className="font-medium text-sm">{stats?.program.unscheduled} unscheduled presentations</p>
                      <p className="text-xs text-muted-foreground">Assign presentations to sessions</p>
                    </div>
                  </div>
                  <Link href={`/organizer/conferences/${idStr}/program/scheduler`}>
                    <Button size="sm" variant="outline">Schedule Now</Button>
                  </Link>
                </div>
              )}
              {!conference.schedulePublishedAt && (
                <div className="flex items-center justify-between p-3 rounded-lg bg-background/50">
                  <div className="flex items-center gap-3">
                    <Globe className="h-5 w-5 text-amber-500" />
                    <div>
                      <p className="font-medium text-sm">Schedule not published</p>
                      <p className="text-xs text-muted-foreground">Attendees cannot view the program</p>
                    </div>
                  </div>
                  <Link href={`/organizer/conferences/${idStr}/program/scheduler`}>
                    <Button size="sm" variant="outline">Publish</Button>
                  </Link>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
