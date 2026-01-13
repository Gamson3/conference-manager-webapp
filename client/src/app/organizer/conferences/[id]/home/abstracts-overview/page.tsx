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
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Eye,
  ArrowRight,
  TrendingUp,
  Calendar,
  Users,
  Target,
  ChevronRight,
  BarChart3,
  PieChart,
  Filter,
  Download,
} from "lucide-react";

interface Submission {
  id: number;
  title: string;
  status: string;
  submittedAt: string | null;
  createdAt: string;
  author: {
    id: number;
    name: string;
    email: string;
  };
  category?: {
    id: number;
    name: string;
  };
  presentationType?: {
    id: number;
    name: string;
  };
}

interface SubmissionStats {
  total: number;
  byStatus: {
    draft: number;
    submitted: number;
    under_review: number;
    accepted: number;
    rejected: number;
    revision_requested: number;
    withdrawn: number;
  };
  byCategory: Array<{ name: string; count: number }>;
  byType: Array<{ name: string; count: number }>;
  recentSubmissions: Submission[];
}

const statusConfig: Record<string, { color: string; bgColor: string; icon: typeof Clock }> = {
  draft: { color: "text-gray-500", bgColor: "bg-gray-500/10", icon: FileText },
  submitted: { color: "text-blue-500", bgColor: "bg-blue-500/10", icon: Clock },
  under_review: { color: "text-amber-500", bgColor: "bg-amber-500/10", icon: Eye },
  accepted: { color: "text-green-500", bgColor: "bg-green-500/10", icon: CheckCircle2 },
  rejected: { color: "text-red-500", bgColor: "bg-red-500/10", icon: XCircle },
  revision_requested: { color: "text-orange-500", bgColor: "bg-orange-500/10", icon: AlertCircle },
  withdrawn: { color: "text-gray-400", bgColor: "bg-gray-400/10", icon: XCircle },
};

export default function AbstractsOverviewPage() {
  const params = useParams();
  const conferenceId = Number(params?.id);

  const [stats, setStats] = useState<SubmissionStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!conferenceId) return;
    setLoading(true);
    setError(null);

    try {
      // Fetch all submissions
      const res = await apiClient.get(API_ENDPOINTS.ORGANIZER.SUBMISSIONS(conferenceId));
      const submissions: Submission[] = res.data.submissions || res.data || [];

      // Calculate stats
      const byStatus = {
        draft: 0,
        submitted: 0,
        under_review: 0,
        accepted: 0,
        rejected: 0,
        revision_requested: 0,
        withdrawn: 0,
      };

      const categoryMap = new Map<string, number>();
      const typeMap = new Map<string, number>();

      submissions.forEach((sub) => {
        // Count by status
        const status = sub.status as keyof typeof byStatus;
        if (status in byStatus) {
          byStatus[status]++;
        }

        // Count by category
        if (sub.category?.name) {
          categoryMap.set(sub.category.name, (categoryMap.get(sub.category.name) || 0) + 1);
        }

        // Count by type
        if (sub.presentationType?.name) {
          typeMap.set(sub.presentationType.name, (typeMap.get(sub.presentationType.name) || 0) + 1);
        }
      });

      // Get recent submissions (last 5)
      const recentSubmissions = [...submissions]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 5);

      setStats({
        total: submissions.length,
        byStatus,
        byCategory: Array.from(categoryMap.entries()).map(([name, count]) => ({ name, count })),
        byType: Array.from(typeMap.entries()).map(([name, count]) => ({ name, count })),
        recentSubmissions,
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

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Not submitted";
    return new Date(dateString).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const getProgressPercentage = (completed: number, total: number) => {
    if (total === 0) return 0;
    return Math.round((completed / total) * 100);
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
            <Skeleton key={i} className="h-28" />
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
          <Button variant="outline" className="mt-4" onClick={fetchData}>
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!stats) return null;

  const reviewedCount = stats.byStatus.accepted + stats.byStatus.rejected;
  const pendingReview = stats.byStatus.submitted + stats.byStatus.under_review;
  const reviewProgress = getProgressPercentage(reviewedCount, stats.total - stats.byStatus.draft - stats.byStatus.withdrawn);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <FileText className="h-6 w-6 text-primary" />
            Abstracts Overview
          </h1>
          <p className="text-muted-foreground mt-1">
            Snapshot of submission counts and statuses
          </p>
        </div>
        <div className="flex gap-2">
          <Link href={`/organizer/conferences/${conferenceId}/abstracts/overview`}>
            <Button variant="outline">
              <Filter className="h-4 w-4 mr-2" />
              View All
            </Button>
          </Link>
          <Link href={`/organizer/conferences/${conferenceId}/abstracts/export`}>
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </Link>
        </div>
      </div>

      {/* Main Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="relative overflow-hidden">
          <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-blue-500/10 to-transparent rounded-bl-full" />
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-blue-500/10">
                <FileText className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-3xl font-bold">{stats.total}</p>
                <p className="text-sm text-muted-foreground">Total Submissions</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-amber-500/10 to-transparent rounded-bl-full" />
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-amber-500/10">
                <Clock className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="text-3xl font-bold">{pendingReview}</p>
                <p className="text-sm text-muted-foreground">Pending Review</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-green-500/10 to-transparent rounded-bl-full" />
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-green-500/10">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-3xl font-bold">{stats.byStatus.accepted}</p>
                <p className="text-sm text-muted-foreground">Accepted</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-red-500/10 to-transparent rounded-bl-full" />
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-red-500/10">
                <XCircle className="h-5 w-5 text-red-500" />
              </div>
              <div>
                <p className="text-3xl font-bold">{stats.byStatus.rejected}</p>
                <p className="text-sm text-muted-foreground">Rejected</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Review Progress */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              Review Progress
            </CardTitle>
            <span className="text-sm text-muted-foreground">
              {reviewedCount} of {stats.total - stats.byStatus.draft - stats.byStatus.withdrawn} reviewed
            </span>
          </div>
        </CardHeader>
        <CardContent>
          <Progress value={reviewProgress} className="h-3" />
          <div className="flex justify-between mt-3 text-sm">
            <span className="text-muted-foreground">{reviewProgress}% complete</span>
            {pendingReview > 0 && (
              <Link
                href={`/organizer/conferences/${conferenceId}/abstracts/overview`}
                className="text-primary hover:underline flex items-center gap-1"
              >
                Review pending submissions <ChevronRight className="h-4 w-4" />
              </Link>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Status Breakdown & Distribution */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Status Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              Status Breakdown
            </CardTitle>
            <CardDescription>Distribution of submissions by status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(stats.byStatus)
                .filter(([_, count]) => count > 0)
                .sort((a, b) => b[1] - a[1])
                .map(([status, count]) => {
                  const config = statusConfig[status] || statusConfig.submitted;
                  const Icon = config.icon;
                  const percentage = getProgressPercentage(count, stats.total);

                  return (
                    <div key={status} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className={`p-1.5 rounded ${config.bgColor}`}>
                            <Icon className={`h-3.5 w-3.5 ${config.color}`} />
                          </div>
                          <span className="capitalize text-sm font-medium">
                            {status.replace(/_/g, " ")}
                          </span>
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {count} ({percentage}%)
                        </span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full ${config.bgColor.replace("/10", "/40")} transition-all`}
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
              <PieChart className="h-5 w-5 text-primary" />
              Categories & Types
            </CardTitle>
            <CardDescription>Distribution by category and presentation type</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Categories */}
              {stats.byCategory.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-3">By Category</h4>
                  <div className="flex flex-wrap gap-2">
                    {stats.byCategory.map((cat) => (
                      <Badge
                        key={cat.name}
                        variant="secondary"
                        className="text-sm py-1.5 px-3"
                      >
                        {cat.name}
                        <span className="ml-2 text-muted-foreground">({cat.count})</span>
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Types */}
              {stats.byType.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-3">By Presentation Type</h4>
                  <div className="flex flex-wrap gap-2">
                    {stats.byType.map((type) => (
                      <Badge
                        key={type.name}
                        variant="outline"
                        className="text-sm py-1.5 px-3"
                      >
                        {type.name}
                        <span className="ml-2 text-muted-foreground">({type.count})</span>
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {stats.byCategory.length === 0 && stats.byType.length === 0 && (
                <div className="text-center py-6 text-muted-foreground">
                  <p>No category or type data available</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Submissions */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Recent Submissions
            </CardTitle>
            <CardDescription>Latest abstracts submitted</CardDescription>
          </div>
          <Link href={`/organizer/conferences/${conferenceId}/abstracts/overview`}>
            <Button variant="outline" size="sm">
              View All <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {stats.recentSubmissions.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No submissions yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                Submissions will appear here when authors submit their abstracts
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {stats.recentSubmissions.map((sub) => {
                const config = statusConfig[sub.status] || statusConfig.submitted;
                const Icon = config.icon;

                return (
                  <Link
                    key={sub.id}
                    href={`/organizer/conferences/${conferenceId}/submissions/${sub.id}`}
                  >
                    <div className="flex items-start gap-4 p-4 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer border">
                      <div className={`p-2 rounded-lg ${config.bgColor} shrink-0`}>
                        <Icon className={`h-4 w-4 ${config.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{sub.title}</p>
                        <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {sub.author.name}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {formatDate(sub.submittedAt || sub.createdAt)}
                          </span>
                        </div>
                      </div>
                      <Badge className={`${config.bgColor} ${config.color} capitalize shrink-0`}>
                        {sub.status.replace(/_/g, " ")}
                      </Badge>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
