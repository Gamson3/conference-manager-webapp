"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Calendar, Clock, Users, Presentation, FileText, AlertCircle, type LucideIcon } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { API_ENDPOINTS } from "@/lib/api/endpoints";
import apiClient, { handleApiError } from "@/lib/api/client";

interface ProgramStats {
  days: number;
  sessions: number;
  presentations: number;
  acceptedSubmissions: number;
  unscheduledAccepted: number;
  presentationsByStatus: Record<string, number>;
  sessionsByType: Record<string, number>;
}

export default function ProgramOverviewPage() {
  const params = useParams();
  const router = useRouter();
  const conferenceId = Number(params?.id);

  const [stats, setStats] = useState<ProgramStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!conferenceId || Number.isNaN(conferenceId)) return;

    const fetchStats = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data } = await apiClient.get<ProgramStats>(API_ENDPOINTS.ORGANIZER.PROGRAM_STATS(conferenceId));
        setStats(data);
      } catch (err: unknown) {
        setError(handleApiError(err));
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [conferenceId]);

  if (!conferenceId || Number.isNaN(conferenceId)) {
    return <p className="text-sm text-red-500">Invalid conference ID.</p>;
  }

  const StatCard = ({
    title,
    value,
    description,
    icon: Icon,
    href,
  }: {
    title: string;
    value: number;
    description?: string;
    icon: LucideIcon;
    href?: string;
  }) => (
    <Card
      className={href ? "cursor-pointer hover:shadow-md transition-shadow" : ""}
      onClick={href ? () => router.push(href) : undefined}
    >
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Program Overview</h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Manage your conference schedule, sessions, and presentations.
            </p>
          </div>
        </div>

        {error && (
          <div className="rounded border border-destructive/50 bg-destructive/5 px-3 py-2 text-sm text-destructive flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        )}

        {/* Stats Grid */}
        {loading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <Card key={i}>
                <CardHeader className="pb-2">
                  <Skeleton className="h-4 w-24" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-16" />
                  <Skeleton className="h-3 w-32 mt-2" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : stats ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <StatCard
              title="Days"
              value={stats.days}
              description="Conference days defined"
              icon={Calendar}
              href={`/organizer/conferences/${conferenceId}/program/days`}
            />
            <StatCard
              title="Sessions"
              value={stats.sessions}
              description="Sessions across all days"
              icon={Clock}
              href={`/organizer/conferences/${conferenceId}/program/sessions`}
            />
            <StatCard
              title="Presentations"
              value={stats.presentations}
              description="Scheduled presentations"
              icon={Presentation}
              href={`/organizer/conferences/${conferenceId}/program/presentations`}
            />
            <StatCard
              title="Accepted Submissions"
              value={stats.acceptedSubmissions}
              description={`${stats.unscheduledAccepted} not yet scheduled`}
              icon={FileText}
              href={`/organizer/conferences/${conferenceId}/abstracts/overview?status=accepted`}
            />
          </div>
        ) : null}

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common program management tasks</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push(`/organizer/conferences/${conferenceId}/program/days`)}
            >
              <Calendar className="h-4 w-4 mr-2" />
              Manage Days
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push(`/organizer/conferences/${conferenceId}/program/sessions`)}
            >
              <Clock className="h-4 w-4 mr-2" />
              Manage Sessions
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push(`/organizer/conferences/${conferenceId}/program/presentations`)}
            >
              <Presentation className="h-4 w-4 mr-2" />
              View Presentations
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push(`/organizer/conferences/${conferenceId}/program/scheduler`)}
            >
              <Users className="h-4 w-4 mr-2" />
              Open Scheduler
            </Button>
          </CardContent>
        </Card>

        {/* Status Breakdown */}
        {stats && (
          <div className="grid gap-4 md:grid-cols-2">
            {/* Presentations by Status */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Presentations by Status</CardTitle>
              </CardHeader>
              <CardContent>
                {Object.keys(stats.presentationsByStatus).length > 0 ? (
                  <div className="space-y-2">
                    {Object.entries(stats.presentationsByStatus).map(([status, count]) => (
                      <div key={status} className="flex items-center justify-between">
                        <Badge variant="outline" className="capitalize">
                          {status.replace("_", " ")}
                        </Badge>
                        <span className="font-medium">{count}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No presentations yet</p>
                )}
              </CardContent>
            </Card>

            {/* Sessions by Type */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Sessions by Type</CardTitle>
              </CardHeader>
              <CardContent>
                {Object.keys(stats.sessionsByType).length > 0 ? (
                  <div className="space-y-2">
                    {Object.entries(stats.sessionsByType).map(([type, count]) => (
                      <div key={type} className="flex items-center justify-between">
                        <Badge variant="secondary" className="capitalize">
                          {type.replace("_", " ")}
                        </Badge>
                        <span className="font-medium">{count}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No sessions yet</p>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Getting Started Help */}
        {stats && stats.days === 0 && (
          <Card className="border-dashed">
            <CardHeader>
              <CardTitle className="text-base">Getting Started</CardTitle>
              <CardDescription>
                Build your conference program step by step
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
                  1
                </div>
                <div>
                  <p className="font-medium">Create Days</p>
                  <p className="text-sm text-muted-foreground">
                    Define the days of your conference
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs">
                  2
                </div>
                <div>
                  <p className="font-medium">Add Sessions</p>
                  <p className="text-sm text-muted-foreground">
                    Create time slots and parallel tracks
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs">
                  3
                </div>
                <div>
                  <p className="font-medium">Schedule Presentations</p>
                  <p className="text-sm text-muted-foreground">
                    Assign accepted submissions to sessions
                  </p>
                </div>
              </div>
              <Button
                className="mt-2"
                onClick={() => router.push(`/organizer/conferences/${conferenceId}/program/days`)}
              >
                <Calendar className="h-4 w-4 mr-2" />
                Start with Days
              </Button>
            </CardContent>
          </Card>
        )}
    </div>
  );
}
