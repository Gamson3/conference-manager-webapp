"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import apiClient, { handleApiError } from "@/lib/api/client";
import { API_ENDPOINTS } from "@/lib/api/endpoints";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  LayoutGrid,
  Calendar,
  Clock,
  MapPin,
  AlertTriangle,
  ArrowRight,
  Presentation,
  RefreshCw,
  AlertCircle,
} from "lucide-react";

interface Day {
  id: number;
  name: string;
  date: string;
}

interface Session {
  id: number;
  name: string;
  type: string;
  dayId: number;
  startTime?: string;
  endTime?: string;
  room?: string;
  capacity?: number;
  _count?: {
    presentations: number;
  };
}

interface ProgramStats {
  daysCount: number;
  sessionsCount: number;
  presentationsCount: number;
  scheduledCount: number;
  unscheduledCount: number;
  totalCapacity: number;
  roomsUsed: number;
}

interface ProgramStatsResponse {
  daysCount?: number;
  sessionsCount?: number;
  presentationsCount?: number;
  acceptedSubmissions?: number;
  unscheduledAccepted?: number;
}

export default function ProgramOverviewPage() {
  const params = useParams();
  const conferenceId = Number(params?.id);

  const [days, setDays] = useState<Day[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [stats, setStats] = useState<ProgramStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!conferenceId) return;
    setLoading(true);
    setError(null);

    try {
      const [daysRes, sessionsRes, statsRes] = await Promise.allSettled([
        apiClient.get(API_ENDPOINTS.ORGANIZER.DAYS(conferenceId)),
        apiClient.get(API_ENDPOINTS.ORGANIZER.SESSIONS(conferenceId)),
        apiClient.get(API_ENDPOINTS.ORGANIZER.PROGRAM_STATS(conferenceId)),
      ]);

      const daysData = daysRes.status === "fulfilled" ? daysRes.value.data : [];
      const sessionsData = sessionsRes.status === "fulfilled" ? sessionsRes.value.data : [];
      const programStats: ProgramStatsResponse = statsRes.status === "fulfilled" ? statsRes.value.data : {};

      setDays(daysData);
      setSessions(sessionsData);

      // Calculate stats
      const rooms = new Set(sessionsData.map((s: Session) => s.room).filter(Boolean));
      const totalPresentations = sessionsData.reduce(
        (sum: number, s: Session) => sum + (s._count?.presentations || 0),
        0
      );

      setStats({
        daysCount: daysData.length,
        sessionsCount: sessionsData.length,
        presentationsCount: programStats.presentationsCount || totalPresentations,
        scheduledCount: programStats.presentationsCount || totalPresentations,
        unscheduledCount: programStats.unscheduledAccepted || 0,
        totalCapacity: sessionsData.reduce((sum: number, s: Session) => sum + (s.capacity || 0), 0),
        roomsUsed: rooms.size,
      });
    } catch (err) {
      setError(handleApiError(err));
    } finally {
      setLoading(false);
    }
  }, [conferenceId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(undefined, {
      weekday: "long",
      month: "long",
      day: "numeric",
    });
  };

  const formatTime = (time?: string) => {
    if (!time) return "—";
    // If it's an ISO datetime string (e.g., "2026-06-15T10:30:00.000Z"), extract the time part
    if (time.includes('T')) {
      return time.split('T')[1].slice(0, 5); // Returns "HH:MM"
    }
    // If it's already just a time string (e.g., "10:30"), return it
    return time.slice(0, 5);
  };

  const getSessionTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      regular: "bg-blue-500/10 text-blue-600",
      keynote: "bg-purple-500/10 text-purple-600",
      workshop: "bg-green-500/10 text-green-600",
      panel: "bg-amber-500/10 text-amber-600",
      poster: "bg-pink-500/10 text-pink-600",
      break: "bg-gray-500/10 text-gray-600",
    };
    return colors[type] || colors.regular;
  };

  if (!conferenceId) return null;

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid gap-4 md:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3 text-destructive">
            <AlertCircle className="h-5 w-5" />
            <p>{error}</p>
          </div>
          <Button variant="outline" className="mt-4" onClick={fetchData}>
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  const scheduleProgress = stats && stats.presentationsCount > 0
    ? Math.round((stats.scheduledCount / (stats.scheduledCount + stats.unscheduledCount)) * 100)
    : 100;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <LayoutGrid className="h-6 w-6 text-primary" />
            Program Overview
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage sessions, schedule, and presentations
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Link href={`/organizer/conferences/${conferenceId}/home/program/scheduler`}>
            <Button>
              <Calendar className="h-4 w-4 mr-2" />
              Open Scheduler
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="relative overflow-hidden">
            <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-blue-500/10 to-transparent rounded-bl-full" />
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <Calendar className="h-4 w-4 text-blue-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.daysCount}</p>
                  <p className="text-xs text-muted-foreground">Conference Days</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden">
            <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-purple-500/10 to-transparent rounded-bl-full" />
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-500/10">
                  <LayoutGrid className="h-4 w-4 text-purple-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.sessionsCount}</p>
                  <p className="text-xs text-muted-foreground">Sessions</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden">
            <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-green-500/10 to-transparent rounded-bl-full" />
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-500/10">
                  <Presentation className="h-4 w-4 text-green-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.presentationsCount}</p>
                  <p className="text-xs text-muted-foreground">Presentations</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden">
            <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-amber-500/10 to-transparent rounded-bl-full" />
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-500/10">
                  <MapPin className="h-4 w-4 text-amber-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.roomsUsed}</p>
                  <p className="text-xs text-muted-foreground">Rooms Used</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Schedule Progress */}
      {stats && stats.unscheduledCount > 0 && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-amber-500/10">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium">Unscheduled Presentations</h3>
                  <span className="text-sm text-muted-foreground">
                    {stats.scheduledCount} of {stats.scheduledCount + stats.unscheduledCount} scheduled
                  </span>
                </div>
                <Progress value={scheduleProgress} className="h-2" />
                <p className="text-sm text-muted-foreground mt-2">
                  {stats.unscheduledCount} presentations still need to be assigned to sessions
                </p>
              </div>
              <Link href={`/organizer/conferences/${conferenceId}/home/program/scheduler`}>
                <Button variant="outline" size="sm">
                  Schedule Now <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-3">
        <Link href={`/organizer/conferences/${conferenceId}/home/program/sessions`}>
          <Card className="h-full hover:bg-muted/50 transition-colors cursor-pointer">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-purple-500/10">
                  <LayoutGrid className="h-6 w-6 text-purple-500" />
                </div>
                <div>
                  <h3 className="font-semibold">Manage Sessions</h3>
                  <p className="text-sm text-muted-foreground">
                    Create and edit sessions, set times and rooms
                  </p>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground ml-auto" />
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href={`/organizer/conferences/${conferenceId}/home/program/scheduler`}>
          <Card className="h-full hover:bg-muted/50 transition-colors cursor-pointer">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-blue-500/10">
                  <Calendar className="h-6 w-6 text-blue-500" />
                </div>
                <div>
                  <h3 className="font-semibold">Schedule Builder</h3>
                  <p className="text-sm text-muted-foreground">
                    Drag and drop presentations into sessions
                  </p>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground ml-auto" />
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href={`/organizer/conferences/${conferenceId}/home/program/presentations`}>
          <Card className="h-full hover:bg-muted/50 transition-colors cursor-pointer">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-green-500/10">
                  <Presentation className="h-6 w-6 text-green-500" />
                </div>
                <div>
                  <h3 className="font-semibold">All Presentations</h3>
                  <p className="text-sm text-muted-foreground">
                    View and manage all scheduled presentations
                  </p>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground ml-auto" />
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Days & Sessions Grid */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Schedule by Day
          </CardTitle>
          <CardDescription>
            Overview of sessions organized by conference day
          </CardDescription>
        </CardHeader>
        <CardContent>
          {days.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-medium mb-2">No conference days configured</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Days are automatically generated based on your conference dates
              </p>
              <Link href={`/organizer/conferences/${conferenceId}/settings/basics`}>
                <Button variant="outline">
                  Configure Conference Dates
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-6">
              {days.map((day) => {
                const daySessions = sessions.filter((s) => s.dayId === day.id);
                return (
                  <div key={day.id} className="space-y-3">
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="text-sm py-1">
                        {formatDate(day.date)}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {daySessions.length} sessions
                      </span>
                    </div>

                    {daySessions.length === 0 ? (
                      <p className="text-sm text-muted-foreground pl-4">
                        No sessions scheduled for this day
                      </p>
                    ) : (
                      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                        {daySessions
                          .sort((a, b) => (a.startTime || "").localeCompare(b.startTime || ""))
                          .map((session) => (
                            <div
                              key={session.id}
                              className="p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                  <h4 className="font-medium text-sm truncate">{session.name}</h4>
                                  <div className="flex flex-wrap items-center gap-2 mt-1">
                                    <Badge className={getSessionTypeColor(session.type)} variant="secondary">
                                      {session.type}
                                    </Badge>
                                    {session.startTime && (
                                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                                        <Clock className="h-3 w-3" />
                                        {formatTime(session.startTime)} - {formatTime(session.endTime)}
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                                    {session.room && (
                                      <span className="flex items-center gap-1">
                                        <MapPin className="h-3 w-3" />
                                        {session.room}
                                      </span>
                                    )}
                                    <span className="flex items-center gap-1">
                                      <Presentation className="h-3 w-3" />
                                      {session._count?.presentations || 0} talks
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
