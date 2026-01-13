"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Presentation, Clock, MapPin, User, AlertCircle, Search, Calendar, Download } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { API_ENDPOINTS } from "@/lib/api/endpoints";
import apiClient, { handleApiError } from "@/lib/api/client";
import { openSubmissionFile, submissionHasFile } from "@/lib/api/fileAccess";

interface PresentationAuthor {
  id: number;
  name: string;
  email?: string;
  affiliation?: string;
  isPresenter: boolean;
}

interface PresentationItem {
  id: number;
  submissionId?: number | null;
  title: string;
  abstract?: string;
  abstractFileUrl?: string | null;
  abstractFileKey?: string | null;
  abstractFileName?: string | null;
  abstractFileMimeType?: string | null;
  abstractFileSizeBytes?: number | null;
  fullTextFileUrl?: string | null;
  fullTextFileKey?: string | null;
  fullTextFileName?: string | null;
  fullTextFileMimeType?: string | null;
  fullTextFileSizeBytes?: number | null;
  keywords: string[];
  duration?: number;
  order: number;
  status: string;
  submissionType: string;
  authors: PresentationAuthor[];
  section: {
    id: number;
    name: string;
    type: string;
    startTime?: string;
    endTime?: string;
    room?: string;
    day?: {
      id: number;
      name: string;
      date: string;
    } | null;
  };
  isFavorite?: boolean;
  favoriteCount?: number;
}

type StatusFilter = "all" | "draft" | "submitted" | "scheduled" | "locked";

const formatBytes = (bytes?: number | null): string => {
  if (!bytes || bytes <= 0) return "";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const exponent = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1
  );
  const value = bytes / Math.pow(1024, exponent);
  return `${value.toFixed(exponent === 0 ? 0 : 1)} ${units[exponent]}`;
};

export default function PresentationsListPage() {
  const params = useParams();
  const router = useRouter();
  const conferenceId = Number(params?.id);

  const [presentations, setPresentations] = useState<PresentationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const fetchPresentations = useCallback(async () => {
    if (!conferenceId || Number.isNaN(conferenceId)) return;

    setLoading(true);
    setError(null);
    try {
      const { data } = await apiClient.get<PresentationItem[]>(API_ENDPOINTS.ORGANIZER.PRESENTATIONS(conferenceId));
      setPresentations(data);
    } catch (err: unknown) {
      setError(handleApiError(err));
    } finally {
      setLoading(false);
    }
  }, [conferenceId]);

  useEffect(() => {
    fetchPresentations();
  }, [fetchPresentations]);

  // Filter presentations
  const filteredPresentations = presentations.filter((p) => {
    // Status filter
    if (statusFilter !== "all" && p.status !== statusFilter) return false;

    // Search filter
    if (search.trim()) {
      const term = search.toLowerCase();
      const matchesTitle = p.title.toLowerCase().includes(term);
      const matchesAuthor = p.authors.some((a) =>
        a.name.toLowerCase().includes(term)
      );
      const matchesKeyword = p.keywords.some((k) =>
        k.toLowerCase().includes(term)
      );
      if (!matchesTitle && !matchesAuthor && !matchesKeyword) return false;
    }

    return true;
  });

  // Group by day for display
  const groupedByDay = filteredPresentations.reduce(
    (acc, p) => {
      const dayKey = p.section.day?.name || "Unassigned";
      if (!acc[dayKey]) acc[dayKey] = [];
      acc[dayKey].push(p);
      return acc;
    },
    {} as Record<string, PresentationItem[]>
  );

  const formatTime = (isoString?: string) => {
    if (!isoString) return "";
    const date = new Date(isoString);
    return date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "scheduled":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300";
      case "locked":
        return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300";
      case "draft":
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300";
      case "submitted":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300";
    }
  };

  if (!conferenceId || Number.isNaN(conferenceId)) {
    return <p className="text-sm text-red-500">Invalid conference ID.</p>;
  }

  return (
    <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Presentations</h1>
            <p className="text-muted-foreground mt-1 text-sm">
              View all scheduled presentations across your conference program.
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() =>
              router.push(`/organizer/conferences/${conferenceId}/home/program/scheduler`)
            }
          >
            <Calendar className="h-4 w-4 mr-2" />
            Open Scheduler
          </Button>
        </div>

        {error && (
          <div className="rounded border border-destructive/50 bg-destructive/5 px-3 py-2 text-sm text-destructive flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by title, author, or keyword..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select
            value={statusFilter}
            onValueChange={(v) => setStatusFilter(v as StatusFilter)}
          >
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="submitted">Submitted</SelectItem>
              <SelectItem value="scheduled">Scheduled</SelectItem>
              <SelectItem value="locked">Locked</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Summary */}
        <div className="text-sm text-muted-foreground">
          Showing {filteredPresentations.length} of {presentations.length} presentations
        </div>

        {/* Presentations List */}
        {loading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-1/2 mt-2" />
                  <Skeleton className="h-4 w-1/3 mt-2" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredPresentations.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Presentation className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="font-semibold text-lg">No presentations found</h3>
              <p className="text-muted-foreground text-sm mt-1 mb-4 text-center">
                {presentations.length === 0
                  ? "Schedule accepted submissions to create presentations"
                  : "Try adjusting your filters"}
              </p>
              {presentations.length === 0 && (
                <Button
                  onClick={() =>
                    router.push(`/organizer/conferences/${conferenceId}/home/program/scheduler`)
                  }
                >
                  Open Scheduler
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedByDay).map(([dayName, dayPresentations]) => (
              <div key={dayName}>
                <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  {dayName}
                  <Badge variant="secondary" className="ml-2">
                    {dayPresentations.length}
                  </Badge>
                </h2>
                <div className="space-y-3">
                  {dayPresentations.map((presentation) => (
                    <Card
                      key={presentation.id}
                      className="hover:shadow-sm transition-shadow cursor-pointer"
                      onClick={() => {
                        if (presentation.submissionId) {
                          router.push(
                            `/organizer/conferences/${conferenceId}/home/submissions/${presentation.submissionId}`
                          );
                        }
                      }}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-semibold">{presentation.title}</h3>
                              <Badge
                                className={`text-xs capitalize ${getStatusColor(
                                  presentation.status
                                )}`}
                              >
                                {presentation.status}
                              </Badge>
                            </div>

                            {presentation.submissionId && (submissionHasFile(presentation, 'abstract') || submissionHasFile(presentation, 'fulltext')) && (
                              <div
                                className="mt-2 flex flex-wrap gap-2"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {submissionHasFile(presentation, 'abstract') && (
                                  <Button 
                                    variant="outline" 
                                    size="sm" 
                                    className="gap-2"
                                    onClick={() => openSubmissionFile(presentation.submissionId!, 'abstract')}
                                  >
                                    <Download className="h-4 w-4" />
                                    Abstract File
                                    {presentation.abstractFileSizeBytes ? (
                                      <span className="text-muted-foreground">
                                        ({formatBytes(presentation.abstractFileSizeBytes)})
                                      </span>
                                    ) : null}
                                  </Button>
                                )}

                                {submissionHasFile(presentation, 'fulltext') && (
                                  <Button 
                                    variant="outline" 
                                    size="sm" 
                                    className="gap-2"
                                    onClick={() => openSubmissionFile(presentation.submissionId!, 'fulltext')}
                                  >
                                    <Download className="h-4 w-4" />
                                    Full Text
                                    {presentation.fullTextFileSizeBytes ? (
                                      <span className="text-muted-foreground">
                                        ({formatBytes(presentation.fullTextFileSizeBytes)})
                                      </span>
                                    ) : null}
                                  </Button>
                                )}
                              </div>
                            )}

                            {/* Authors */}
                            <div className="flex items-center gap-1 mt-2 text-sm text-muted-foreground">
                              <User className="h-3 w-3" />
                              {presentation.authors.length > 0 ? (
                                <span>
                                  {presentation.authors
                                    .map((a) => a.name + (a.isPresenter ? " *" : ""))
                                    .join(", ")}
                                </span>
                              ) : (
                                <span className="italic">No authors</span>
                              )}
                            </div>

                            {/* Session info */}
                            <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {presentation.section.name}
                                {presentation.section.startTime &&
                                  ` • ${formatTime(presentation.section.startTime)}`}
                              </span>
                              {presentation.section.room && (
                                <span className="flex items-center gap-1">
                                  <MapPin className="h-3 w-3" />
                                  {presentation.section.room}
                                </span>
                              )}
                            </div>

                            {/* Keywords */}
                            {presentation.keywords.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                {presentation.keywords.slice(0, 5).map((kw, i) => (
                                  <Badge
                                    key={i}
                                    variant="outline"
                                    className="text-xs font-normal"
                                  >
                                    {kw}
                                  </Badge>
                                ))}
                                {presentation.keywords.length > 5 && (
                                  <Badge variant="outline" className="text-xs font-normal">
                                    +{presentation.keywords.length - 5}
                                  </Badge>
                                )}
                              </div>
                            )}
                          </div>

                          {presentation.duration && (
                            <div className="text-sm text-muted-foreground whitespace-nowrap">
                              {presentation.duration} min
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
    </div>
  );
}
