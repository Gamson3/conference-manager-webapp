"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import apiClient, { handleApiError } from "@/lib/api/client";
import { API_ENDPOINTS } from "@/lib/api/endpoints";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Eye,
  Search,
  MoreHorizontal,
  RefreshCw,
  Download,
  Target,
  Users,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Filter,
  Mail,
  Lock,
} from "lucide-react";
import { toast } from "sonner";

interface Submission {
  id: number;
  title: string;
  abstract?: string;
  keywords?: string[];
  status: string;
  createdAt: string;
  submittedAt: string | null;
  isLocked: boolean;
  lockedAt: string | null;
  lockedReason: string | null;
  author: {
    id: number;
    name: string;
    email: string;
  };
  category?: {
    id: number;
    name: string;
  };
  type?: {
    id: number;
    name: string;
  };
  // Back-compat: older payloads used `presentationType`
  presentationType?: {
    id: number;
    name: string;
  };
}

type SubmissionsResponse = Submission[] | { submissions: Submission[] };

interface SubmissionStats {
  total: number;
  byStatus: Record<string, number>;
  pendingReview: number;
  reviewed: number;
  acceptanceRate: number;
}

type StatusFilter = "all" | "submitted" | "under_review" | "accepted" | "rejected" | "revision_requested" | "withdrawn";
type SortField = "title" | "status" | "createdAt" | "submittedAt" | "author";
type SortOrder = "asc" | "desc";

const statusConfig: Record<string, { color: string; bgColor: string; icon: typeof Clock; label: string }> = {
  submitted: { color: "text-blue-500", bgColor: "bg-blue-500/10", icon: Clock, label: "Submitted" },
  under_review: { color: "text-amber-500", bgColor: "bg-amber-500/10", icon: Eye, label: "Under Review" },
  accepted: { color: "text-green-500", bgColor: "bg-green-500/10", icon: CheckCircle2, label: "Accepted" },
  rejected: { color: "text-red-500", bgColor: "bg-red-500/10", icon: XCircle, label: "Rejected" },
  revision_requested: { color: "text-orange-500", bgColor: "bg-orange-500/10", icon: AlertCircle, label: "Revision Requested" },
  withdrawn: { color: "text-gray-400", bgColor: "bg-gray-400/10", icon: XCircle, label: "Withdrawn" },
};

export default function SubmissionsPage() {
  const params = useParams();
  const router = useRouter();
  const rawId = (params as Record<string, string | string[] | undefined>)?.id;
  const idStr = Array.isArray(rawId) ? rawId[0] : rawId;
  const conferenceIdParam: string | number | null = (() => {
    if (!idStr) return null;
    const asNumber = Number(idStr);
    return Number.isFinite(asNumber) ? asNumber : idStr;
  })();

  // Data state
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [stats, setStats] = useState<SubmissionStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter & pagination state
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortField, setSortField] = useState<SortField>("createdAt");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);

  // Action states
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  const fetchData = useCallback(async () => {
    if (!conferenceIdParam) {
      setError("Invalid conference id");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    setSubmissions([]);
    setStats(null);

    try {
      const res = await apiClient.get<SubmissionsResponse>(
        API_ENDPOINTS.ORGANIZER.SUBMISSIONS(conferenceIdParam)
      );
      const data = Array.isArray(res.data) ? res.data : res.data.submissions;
      setSubmissions(data);

      // Calculate stats
      const byStatus: Record<string, number> = {};
      data.forEach((sub) => {
        byStatus[sub.status] = (byStatus[sub.status] || 0) + 1;
      });

      const accepted = byStatus.accepted || 0;
      const rejected = byStatus.rejected || 0;
      const reviewed = accepted + rejected;
      const pendingReview = (byStatus.submitted || 0) + (byStatus.under_review || 0);

      setStats({
        total: data.length,
        byStatus,
        pendingReview,
        reviewed,
        acceptanceRate: reviewed > 0 ? Math.round((accepted / reviewed) * 100) : 0,
      });
    } catch (err) {
      setError(handleApiError(err));
    } finally {
      setLoading(false);
    }
  }, [conferenceIdParam]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Filter and sort submissions
  const filteredSubmissions = useMemo(() => {
    let result = [...submissions];

    // Apply status filter
    if (statusFilter !== "all") {
      result = result.filter((s) => s.status === statusFilter);
    }

    // Apply search filter
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (s) =>
          s.title.toLowerCase().includes(q) ||
          s.author?.name?.toLowerCase().includes(q) ||
          s.author?.email?.toLowerCase().includes(q) ||
          s.category?.name?.toLowerCase().includes(q) ||
          s.keywords?.some((k) => k.toLowerCase().includes(q))
      );
    }

    // Apply sorting
    result.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case "title":
          comparison = a.title.localeCompare(b.title);
          break;
        case "status":
          comparison = a.status.localeCompare(b.status);
          break;
        case "author":
          comparison = (a.author?.name || "").localeCompare(b.author?.name || "");
          break;
        case "submittedAt":
          const aDate = a.submittedAt ? new Date(a.submittedAt).getTime() : 0;
          const bDate = b.submittedAt ? new Date(b.submittedAt).getTime() : 0;
          comparison = aDate - bDate;
          break;
        case "createdAt":
        default:
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
      }
      return sortOrder === "asc" ? comparison : -comparison;
    });

    return result;
  }, [submissions, statusFilter, search, sortField, sortOrder]);

  // Pagination
  const totalPages = Math.ceil(filteredSubmissions.length / pageSize);
  const paginatedSubmissions = filteredSubmissions.slice(
    (page - 1) * pageSize,
    page * pageSize
  );

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [search, statusFilter]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("desc");
    }
  };

  const handleDecision = async (submissionId: number, decision: "accepted" | "rejected") => {
    setActionLoading(submissionId);
    try {
      await apiClient.post(API_ENDPOINTS.ORGANIZER.SUBMISSION_DECISION(submissionId), { decision });
      toast.success(`Submission ${decision}`);
      fetchData();
    } catch (err) {
      toast.error(handleApiError(err));
    } finally {
      setActionLoading(null);
    }
  };

  const handleExport = async () => {
    if (!conferenceIdParam) return;
    try {
      const response = await apiClient.get(
        API_ENDPOINTS.ORGANIZER.SUBMISSIONS_EXPORT(conferenceIdParam) + "?format=csv",
        { responseType: "blob" }
      );
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `submissions-${idStr ?? "conference"}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success("Submissions exported");
    } catch (err) {
      toast.error(handleApiError(err));
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "—";
    return new Date(dateString).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  if (!idStr) return null;

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
        <Skeleton className="h-96" />
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <FileText className="h-6 w-6 text-primary" />
            Submissions
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage abstracts, reviews, and decisions
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
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
                  <FileText className="h-4 w-4 text-blue-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.total}</p>
                  <p className="text-xs text-muted-foreground">Total Submissions</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden">
            <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-amber-500/10 to-transparent rounded-bl-full" />
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-500/10">
                  <Clock className="h-4 w-4 text-amber-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.pendingReview}</p>
                  <p className="text-xs text-muted-foreground">Pending Review</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden">
            <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-green-500/10 to-transparent rounded-bl-full" />
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-500/10">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.byStatus.accepted || 0}</p>
                  <p className="text-xs text-muted-foreground">Accepted</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden">
            <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-purple-500/10 to-transparent rounded-bl-full" />
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-500/10">
                  <Target className="h-4 w-4 text-purple-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.acceptanceRate}%</p>
                  <p className="text-xs text-muted-foreground">Acceptance Rate</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Review Progress */}
      {stats && stats.total > 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">Review Progress</span>
              </div>
              <span className="text-sm text-muted-foreground">
                {stats.reviewed} of {stats.total - (stats.byStatus.withdrawn || 0)} reviewed
              </span>
            </div>
            <Progress
              value={
                stats.total - (stats.byStatus.withdrawn || 0) > 0
                  ? (stats.reviewed / (stats.total - (stats.byStatus.withdrawn || 0))) * 100
                  : 0
              }
              className="h-2"
            />
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by title, author, category, or keyword..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
              <SelectTrigger className="w-[180px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {Object.entries(statusConfig).map(([key, config]) => (
                  <SelectItem key={key} value={key}>
                    {config.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Submissions Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead 
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleSort("title")}
                >
                  <div className="flex items-center gap-2">
                    Title
                    <ArrowUpDown className="h-3 w-3" />
                  </div>
                </TableHead>
                <TableHead
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleSort("author")}
                >
                  <div className="flex items-center gap-2">
                    Author
                    <ArrowUpDown className="h-3 w-3" />
                  </div>
                </TableHead>
                <TableHead className="hidden md:table-cell">Category</TableHead>
                <TableHead
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleSort("status")}
                >
                  <div className="flex items-center gap-2">
                    Status
                    <ArrowUpDown className="h-3 w-3" />
                  </div>
                </TableHead>
                <TableHead
                  className="hidden lg:table-cell cursor-pointer hover:bg-muted/50"
                  onClick={() => handleSort("submittedAt")}
                >
                  <div className="flex items-center gap-2">
                    Submitted
                    <ArrowUpDown className="h-3 w-3" />
                  </div>
                </TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedSubmissions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center">
                    <div className="flex flex-col items-center justify-center text-muted-foreground">
                      <FileText className="h-8 w-8 mb-2" />
                      <p>No submissions found</p>
                      {(search || statusFilter !== "all") && (
                        <p className="text-sm">Try adjusting your filters</p>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                paginatedSubmissions.map((submission) => {
                  const config = statusConfig[submission.status] || statusConfig.submitted;
                  const Icon = config.icon;
                  const submissionType = submission.type ?? submission.presentationType;

                  return (
                    <TableRow
                      key={submission.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => router.push(`/organizer/conferences/${idStr}/home/submissions/${submission.id}`)}
                    >
                      <TableCell>
                        <div className="font-medium line-clamp-1">{submission.title}</div>
                        {submissionType && (
                          <Badge variant="outline" className="text-[10px] mt-1">
                            {submissionType.name}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Users className="h-3 w-3 text-muted-foreground" />
                          <span className="text-sm">{submission.author?.name || "Unknown"}</span>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {submission.category?.name ? (
                          <Badge variant="secondary" className="text-xs">
                            {submission.category.name}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Badge className={`${config.bgColor} ${config.color}`}>
                            <Icon className="h-3 w-3 mr-1" />
                            {config.label}
                          </Badge>
                          {submission.isLocked && (
                            <span title={submission.lockedReason || 'Locked'}>
                              <Lock className="h-3.5 w-3.5 text-yellow-600" aria-hidden="true" />
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                        {formatDate(submission.submittedAt)}
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => router.push(`/organizer/conferences/${idStr}/home/submissions/${submission.id}`)}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            {submission.author?.email && (
                              <DropdownMenuItem
                                onClick={() => window.open(`mailto:${submission.author.email}`, "_blank")}
                              >
                                <Mail className="h-4 w-4 mr-2" />
                                Email Author
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            {(submission.status === "submitted" || submission.status === "under_review") && (
                              <>
                                <DropdownMenuItem
                                  onClick={() => handleDecision(submission.id, "accepted")}
                                  disabled={actionLoading === submission.id}
                                  className="text-green-600"
                                >
                                  <CheckCircle2 className="h-4 w-4 mr-2" />
                                  Accept
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleDecision(submission.id, "rejected")}
                                  disabled={actionLoading === submission.id}
                                  className="text-red-600"
                                >
                                  <XCircle className="h-4 w-4 mr-2" />
                                  Reject
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {(page - 1) * pageSize + 1}-{Math.min(page * pageSize, filteredSubmissions.length)} of{" "}
            {filteredSubmissions.length} submissions
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </Button>
            <span className="text-sm text-muted-foreground px-2">
              Page {page} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
            >
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
