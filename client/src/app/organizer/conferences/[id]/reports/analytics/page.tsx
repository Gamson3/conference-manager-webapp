"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import apiClient, { handleApiError } from "@/lib/api/client";
import { API_ENDPOINTS } from "@/lib/api/endpoints";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BarChart3,
  Users,
  FileText,
  Calendar,
  LayoutGrid,
  Target,
  Award,
  AlertCircle,
  RefreshCw,
  PieChart,
  Activity,
  Clock,
  CheckCircle2,
  XCircle,
} from "lucide-react";

interface AnalyticsData {
  overview: {
    totalSubmissions: number;
    totalParticipants: number;
    totalSessions: number;
    totalPresentations: number;
    acceptanceRate: number;
    fillRate: number;
  };
  submissions: {
    byStatus: Record<string, number>;
    byCategory: Array<{ name: string; count: number }>;
    byType: Array<{ name: string; count: number }>;
    trend: Array<{ date: string; count: number }>;
  };
  participants: {
    byRole: Record<string, number>;
    byStatus: Record<string, number>;
    registrationTrend: Array<{ date: string; count: number }>;
  };
  schedule: {
    totalMinutes: number;
    sessionsByType: Record<string, number>;
    roomUtilization: number;
    unscheduledCount: number;
  };
}

const metricCards = [
  {
    key: "submissions",
    title: "Submissions",
    icon: FileText,
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
  },
  {
    key: "participants",
    title: "Participants",
    icon: Users,
    color: "text-green-500",
    bgColor: "bg-green-500/10",
  },
  {
    key: "sessions",
    title: "Sessions",
    icon: LayoutGrid,
    color: "text-purple-500",
    bgColor: "bg-purple-500/10",
  },
  {
    key: "acceptanceRate",
    title: "Acceptance Rate",
    icon: Target,
    color: "text-amber-500",
    bgColor: "bg-amber-500/10",
    isPercentage: true,
  },
];

export default function AnalyticsPage() {
  const params = useParams();
  const conferenceId = Number(params?.id);

  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = useCallback(async () => {
    if (!conferenceId) return;
    setLoading(true);
    setError(null);

    try {
      // Fetch data from multiple endpoints
      const [submissionsRes, regOverviewRes, programStatsRes, sessionsRes] = await Promise.allSettled([
        apiClient.get(API_ENDPOINTS.ORGANIZER.SUBMISSIONS(conferenceId)),
        apiClient.get(API_ENDPOINTS.ORGANIZER.REGISTRATION_OVERVIEW(conferenceId)),
        apiClient.get(API_ENDPOINTS.ORGANIZER.PROGRAM_STATS(conferenceId)),
        apiClient.get(API_ENDPOINTS.ORGANIZER.SESSIONS(conferenceId)),
      ]);

      // Process submissions data
      const submissions = submissionsRes.status === "fulfilled"
        ? (submissionsRes.value.data.submissions || submissionsRes.value.data || [])
        : [];

      const byStatus: Record<string, number> = {};
      const categoryMap = new Map<string, number>();
      const typeMap = new Map<string, number>();
      const submissionDates: Record<string, number> = {};

      submissions.forEach((sub: { status: string; category?: { name: string }; presentationType?: { name: string }; submittedAt: string; createdAt: string }) => {
        byStatus[sub.status] = (byStatus[sub.status] || 0) + 1;
        if (sub.category?.name) {
          categoryMap.set(sub.category.name, (categoryMap.get(sub.category.name) || 0) + 1);
        }
        if (sub.presentationType?.name) {
          typeMap.set(sub.presentationType.name, (typeMap.get(sub.presentationType.name) || 0) + 1);
        }
        const date = new Date(sub.submittedAt || sub.createdAt).toISOString().split("T")[0];
        submissionDates[date] = (submissionDates[date] || 0) + 1;
      });

      // Process registration data
      const regData = regOverviewRes.status === "fulfilled" ? regOverviewRes.value.data : null;
      const byRole = regData?.counts?.byRole || {};
      const participantsByStatus = {
        registered: regData?.counts?.registered || 0,
        waitlisted: regData?.counts?.waitlisted || 0,
        canceled: regData?.counts?.canceled || 0,
      };

      // Process program data
      const programStats = programStatsRes.status === "fulfilled" ? programStatsRes.value.data : {};
      const sessions = sessionsRes.status === "fulfilled" ? sessionsRes.value.data : [];

      const sessionsByType: Record<string, number> = {};
      let totalMinutes = 0;
      sessions.forEach((session: { type: string; startTime?: string; endTime?: string }) => {
        sessionsByType[session.type] = (sessionsByType[session.type] || 0) + 1;
        if (session.startTime && session.endTime) {
          const start = new Date(`1970-01-01T${session.startTime}`);
          const end = new Date(`1970-01-01T${session.endTime}`);
          totalMinutes += (end.getTime() - start.getTime()) / 60000;
        }
      });

      // Calculate metrics
      const totalSubmissions = submissions.length;
      const accepted = byStatus.accepted || 0;
      const rejected = byStatus.rejected || 0;
      const reviewed = accepted + rejected;
      const acceptanceRate = reviewed > 0 ? Math.round((accepted / reviewed) * 100) : 0;

      setAnalytics({
        overview: {
          totalSubmissions,
          totalParticipants: regData?.counts?.total || 0,
          totalSessions: programStats.sessionsCount || 0,
          totalPresentations: programStats.presentationsCount || 0,
          acceptanceRate,
          fillRate: programStats.fillRate || 0,
        },
        submissions: {
          byStatus,
          byCategory: Array.from(categoryMap.entries()).map(([name, count]) => ({ name, count })),
          byType: Array.from(typeMap.entries()).map(([name, count]) => ({ name, count })),
          trend: Object.entries(submissionDates)
            .map(([date, count]) => ({ date, count }))
            .sort((a, b) => a.date.localeCompare(b.date))
            .slice(-14), // Last 14 days
        },
        participants: {
          byRole,
          byStatus: participantsByStatus,
          registrationTrend: regData?.trend?.slice(-14) || [],
        },
        schedule: {
          totalMinutes,
          sessionsByType,
          roomUtilization: programStats.roomUtilization || 0,
          unscheduledCount: programStats.unscheduledCount || 0,
        },
      });
    } catch (err) {
      setError(handleApiError(err));
    } finally {
      setLoading(false);
    }
  }, [conferenceId]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const getMetricValue = (key: string): number => {
    if (!analytics) return 0;
    switch (key) {
      case "submissions":
        return analytics.overview.totalSubmissions;
      case "participants":
        return analytics.overview.totalParticipants;
      case "sessions":
        return analytics.overview.totalSessions;
      case "acceptanceRate":
        return analytics.overview.acceptanceRate;
      default:
        return 0;
    }
  };

  const formatMinutes = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  if (!conferenceId) return null;

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-24" />
        </div>
        <div className="grid gap-4 md:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <Skeleton className="h-80" />
          <Skeleton className="h-80" />
        </div>
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
          <Button variant="outline" className="mt-4" onClick={fetchAnalytics}>
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!analytics) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-primary" />
            Analytics Dashboard
          </h1>
          <p className="text-muted-foreground mt-1">
            Visual insights on submissions, demographics, and workload
          </p>
        </div>
        <Button variant="outline" onClick={fetchAnalytics}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {metricCards.map((metric) => {
          const value = getMetricValue(metric.key);
          const Icon = metric.icon;
          return (
            <Card key={metric.key} className="relative overflow-hidden">
              <div className={`absolute top-0 right-0 w-24 h-24 ${metric.bgColor} rounded-bl-full opacity-50`} />
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{metric.title}</p>
                    <p className="text-3xl font-bold mt-1">
                      {value}
                      {metric.isPercentage && "%"}
                    </p>
                  </div>
                  <div className={`p-2 rounded-lg ${metric.bgColor}`}>
                    <Icon className={`h-5 w-5 ${metric.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Submissions Analysis */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="h-5 w-5 text-primary" />
              Submission Status Distribution
            </CardTitle>
            <CardDescription>Breakdown of all submissions by current status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(analytics.submissions.byStatus)
                .sort((a, b) => b[1] - a[1])
                .map(([status, count]) => {
                  const percentage = Math.round(
                    (count / analytics.overview.totalSubmissions) * 100
                  );
                  const statusColors: Record<string, string> = {
                    draft: "bg-gray-500",
                    submitted: "bg-blue-500",
                    under_review: "bg-amber-500",
                    accepted: "bg-green-500",
                    rejected: "bg-red-500",
                    revision_requested: "bg-orange-500",
                    withdrawn: "bg-gray-400",
                  };
                  const color = statusColors[status] || "bg-gray-500";

                  return (
                    <div key={status} className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="capitalize">{status.replace(/_/g, " ")}</span>
                        <span className="text-muted-foreground">
                          {count} ({percentage}%)
                        </span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full ${color} transition-all`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
            </div>
          </CardContent>
        </Card>

        {/* Categories & Types */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              Category & Type Breakdown
            </CardTitle>
            <CardDescription>Distribution by research area and format</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {analytics.submissions.byCategory.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-3">By Category</h4>
                  <div className="space-y-2">
                    {analytics.submissions.byCategory.slice(0, 5).map((cat) => (
                      <div key={cat.name} className="flex items-center justify-between">
                        <span className="text-sm truncate flex-1 mr-4">{cat.name}</span>
                        <Badge variant="secondary">{cat.count}</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {analytics.submissions.byType.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-3">By Presentation Type</h4>
                  <div className="space-y-2">
                    {analytics.submissions.byType.slice(0, 5).map((type) => (
                      <div key={type.name} className="flex items-center justify-between">
                        <span className="text-sm truncate flex-1 mr-4">{type.name}</span>
                        <Badge variant="outline">{type.count}</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {analytics.submissions.byCategory.length === 0 &&
                analytics.submissions.byType.length === 0 && (
                  <p className="text-center text-muted-foreground py-4">
                    No category/type data available
                  </p>
                )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Participant & Schedule Stats */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Participant Roles */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Participant Roles
            </CardTitle>
            <CardDescription>Distribution of participants by role</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              {Object.entries(analytics.participants.byRole).map(([role, count]) => {
                const roleColors: Record<string, { bg: string; text: string }> = {
                  attendees: { bg: "bg-blue-500/10", text: "text-blue-500" },
                  presenters: { bg: "bg-purple-500/10", text: "text-purple-500" },
                  authors: { bg: "bg-green-500/10", text: "text-green-500" },
                  reviewers: { bg: "bg-amber-500/10", text: "text-amber-500" },
                  sponsors: { bg: "bg-pink-500/10", text: "text-pink-500" },
                  volunteers: { bg: "bg-cyan-500/10", text: "text-cyan-500" },
                };
                const colors = roleColors[role] || { bg: "bg-gray-500/10", text: "text-gray-500" };

                return (
                  <div
                    key={role}
                    className={`p-4 rounded-lg ${colors.bg} flex flex-col items-center justify-center`}
                  >
                    <p className={`text-2xl font-bold ${colors.text}`}>{count}</p>
                    <p className="text-sm text-muted-foreground capitalize">{role}</p>
                  </div>
                );
              })}
            </div>

            {/* Registration Status */}
            <div className="mt-6 pt-6 border-t">
              <h4 className="text-sm font-medium mb-3">Registration Status</h4>
              <div className="flex gap-4">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span className="text-sm">
                    {analytics.participants.byStatus.registered} registered
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-amber-500" />
                  <span className="text-sm">
                    {analytics.participants.byStatus.waitlisted} waitlisted
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <XCircle className="h-4 w-4 text-red-500" />
                  <span className="text-sm">
                    {analytics.participants.byStatus.canceled} canceled
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Schedule Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Schedule Overview
            </CardTitle>
            <CardDescription>Program and session statistics</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Key Stats */}
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 rounded-lg bg-muted/50">
                  <p className="text-2xl font-bold">{analytics.overview.totalPresentations}</p>
                  <p className="text-sm text-muted-foreground">Presentations</p>
                </div>
                <div className="text-center p-4 rounded-lg bg-muted/50">
                  <p className="text-2xl font-bold">{formatMinutes(analytics.schedule.totalMinutes)}</p>
                  <p className="text-sm text-muted-foreground">Total Duration</p>
                </div>
              </div>

              {/* Session Types */}
              {Object.keys(analytics.schedule.sessionsByType).length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-3">Sessions by Type</h4>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(analytics.schedule.sessionsByType).map(([type, count]) => (
                      <Badge key={type} variant="secondary" className="capitalize">
                        {type}: {count}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Unscheduled Alert */}
              {analytics.schedule.unscheduledCount > 0 && (
                <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
                  <div className="flex items-center gap-3">
                    <AlertCircle className="h-5 w-5 text-amber-500" />
                    <div>
                      <p className="font-medium text-amber-600">
                        {analytics.schedule.unscheduledCount} unscheduled presentations
                      </p>
                      <p className="text-sm text-muted-foreground">
                        These need to be assigned to sessions
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Summary Card */}
      <Card className="bg-gradient-to-br from-primary/5 to-background">
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-primary/10">
              <Award className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold">Conference Health Score</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Based on submissions, registrations, and schedule completeness
              </p>
            </div>
            <div className="ml-auto">
              <div className="text-4xl font-bold text-primary">
                {Math.min(
                  100,
                  Math.round(
                    (analytics.overview.totalSubmissions > 0 ? 25 : 0) +
                      (analytics.overview.totalParticipants > 0 ? 25 : 0) +
                      (analytics.overview.totalSessions > 0 ? 25 : 0) +
                      (analytics.schedule.unscheduledCount === 0 ? 25 : 10)
                  )
                )}
                %
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
