"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import apiClient, { handleApiError } from "@/lib/api/client";
import { API_ENDPOINTS } from "@/lib/api/endpoints";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Users,
  Search,
  MoreHorizontal,
  UserCheck,
  UserMinus,
  Clock,
  Mail,
  Building2,
  Download,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Mic,
  PenTool,
  Eye,
  Heart,
  Sparkles,
  RefreshCw,
  Presentation,
  UserCog,
  FileEdit,
  SendHorizontal,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useConference } from "@/features/conferences/context/ConferenceContext";
import { useImpersonation } from "@/features/auth/hooks/useImpersonation";

interface Participant {
  id: number;
  role: string;
  status: string;
  registeredAt: string;
  customResponses: Record<string, unknown> | null;
  user: {
    id: number;
    name: string;
    email: string;
    organization: string | null;
  };
}

interface ParticipantStats {
  total: number;
  registered: number;
  waitlisted: number;
  canceled: number;
  withdrawn: number;
  byRole: Record<string, number>;
}

interface OrganizerParticipantStatsResponse {
  total: number;
  byRole: Record<string, number>;
  byStatus: Record<string, number>;
  registered: number;
  waitlisted: number;
  canceled: number;
  withdrawn: number;
  attendees?: number;
  presenters?: number;
  authors?: number;
  reviewers?: number;
}

const roleConfig: Record<string, { icon: typeof Users; color: string; bgColor: string; label: string }> = {
  attendee: { icon: Users, color: "text-blue-500", bgColor: "bg-blue-500/10", label: "Attendees" },
  presenter: { icon: Presentation, color: "text-purple-500", bgColor: "bg-purple-500/10", label: "Presenters" },
  speaker: { icon: Mic, color: "text-indigo-500", bgColor: "bg-indigo-500/10", label: "Speakers" },
  author: { icon: PenTool, color: "text-green-500", bgColor: "bg-green-500/10", label: "Authors" },
  reviewer: { icon: Eye, color: "text-amber-500", bgColor: "bg-amber-500/10", label: "Reviewers" },
  sponsor: { icon: Heart, color: "text-pink-500", bgColor: "bg-pink-500/10", label: "Sponsors" },
  volunteer: { icon: Sparkles, color: "text-cyan-500", bgColor: "bg-cyan-500/10", label: "Volunteers" },
  organizer: { icon: Users, color: "text-orange-500", bgColor: "bg-orange-500/10", label: "Organizers" },
};

const statusConfig: Record<string, { color: string; icon: typeof CheckCircle2 }> = {
  registered: { color: "bg-green-500/10 text-green-500", icon: CheckCircle2 },
  waitlisted: { color: "bg-amber-500/10 text-amber-500", icon: Clock },
  canceled: { color: "bg-red-500/10 text-red-500", icon: XCircle },
  withdrawn: { color: "bg-gray-500/10 text-gray-500", icon: UserMinus },
};

export default function PeoplePage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const rawId = (params as Record<string, string | string[] | undefined>)?.id;
  const idStr = Array.isArray(rawId) ? rawId[0] : rawId;
  const conferenceIdParam: string | number | null = (() => {
    if (!idStr) return null;
    const asNumber = Number(idStr);
    return Number.isFinite(asNumber) ? asNumber : idStr;
  })();
  const initialRole = searchParams.get("role") || "all";

  // Router for navigation
  const router = useRouter();

  // Conference context for name
  const { conference } = useConference();

  // Impersonation hook
  const { startImpersonation, isImpersonating, loading: impersonationLoading } = useImpersonation();

  const [participants, setParticipants] = useState<Participant[]>([]);
  const [stats, setStats] = useState<ParticipantStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>(initialRole);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [exporting, setExporting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Participant | null>(null);
  const [cancelTarget, setCancelTarget] = useState<Participant | null>(null);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [actionReason, setActionReason] = useState<string>("other");
  const [actionNotes, setActionNotes] = useState<string>("");
  const [blockers, setBlockers] = useState<Array<{ type: string; reason: string; details?: string }> | null>(null);

  // Assistance consent state
  const [assistanceTarget, setAssistanceTarget] = useState<Participant | null>(null);
  const [assistanceMessage, setAssistanceMessage] = useState<string>("");
  const [assistanceLoading, setAssistanceLoading] = useState(false);
  const [consentStatus, setConsentStatus] = useState<Record<number, { hasConsent: boolean; pending: boolean }>>({});

  const fetchData = useCallback(async () => {
    if (!conferenceIdParam) {
      setError("Invalid conference id");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    setParticipants([]);
    setStats(null);

    try {
      const [participantsRes, statsRes] = await Promise.all([
        apiClient.get<Participant[]>(
          API_ENDPOINTS.ORGANIZER.PARTICIPANTS(conferenceIdParam)
        ),
        apiClient.get<OrganizerParticipantStatsResponse>(
          API_ENDPOINTS.ORGANIZER.PARTICIPANT_STATS(conferenceIdParam)
        ),
      ]);

      setParticipants(participantsRes.data);
      setStats({
        total: statsRes.data.total,
        registered: statsRes.data.registered,
        waitlisted: statsRes.data.waitlisted,
        canceled: statsRes.data.canceled,
        withdrawn: statsRes.data.withdrawn,
        byRole: statsRes.data.byRole,
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

  const handleExport = async () => {
    if (!conferenceIdParam) {
      toast.error("Invalid conference id");
      return;
    }
    setExporting(true);
    try {
      const res = await apiClient.post(
        API_ENDPOINTS.ORGANIZER.PARTICIPANTS_EXPORT(conferenceIdParam),
        {},
        { responseType: "blob" }
      );
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `people-${idStr ?? "conference"}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success("Export downloaded successfully");
    } catch (err) {
      toast.error(handleApiError(err));
    } finally {
      setExporting(false);
    }
  };

  const handleApprove = async (participant: Participant) => {
    if (!conferenceIdParam) {
      toast.error("Invalid conference id");
      return;
    }
    setActionLoading(participant.id);
    try {
      await apiClient.post(
        API_ENDPOINTS.ORGANIZER.PARTICIPANT_APPROVE(conferenceIdParam, participant.id)
      );
      toast.success(`${participant.user.name} has been approved`);
      fetchData();
    } catch (err) {
      toast.error(handleApiError(err));
    } finally {
      setActionLoading(null);
    }
  };

  const handleUpdateStatus = async (participant: Participant, newStatus: string) => {
    if (!conferenceIdParam) {
      toast.error("Invalid conference id");
      return;
    }
    setActionLoading(participant.id);
    try {
      await apiClient.put(
        API_ENDPOINTS.ORGANIZER.PARTICIPANT(conferenceIdParam, participant.id),
        { status: newStatus }
      );
      toast.success(`Status updated to ${newStatus}`);
      setCancelTarget(null);
      setActionReason("other");
      setActionNotes("");
      fetchData();
    } catch (err: unknown) {
      const errMsg = handleApiError(err);
      // Check if 409 with blockers
      if (err && typeof err === 'object' && 'response' in err) {
        const resp = (err as { response?: { status?: number; data?: { blockers?: unknown } } }).response;
        if (resp?.status === 409 && resp?.data?.blockers) {
          setBlockers(resp.data.blockers as typeof blockers);
          return;
        }
      }
      toast.error(errMsg);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    if (!conferenceIdParam) {
      toast.error("Invalid conference id");
      return;
    }
    setActionLoading(deleteTarget.id);
    try {
      await apiClient.delete(
        API_ENDPOINTS.ORGANIZER.PARTICIPANT(conferenceIdParam, deleteTarget.id),
        {
          data: {
            reason: actionReason,
            notes: actionNotes || undefined,
          },
        }
      );
      toast.success(`${deleteTarget.user.name} has been removed from active list`);
      setDeleteTarget(null);
      setActionReason("other");
      setActionNotes("");
      setBlockers(null);
      fetchData();
    } catch (err: unknown) {
      const errMsg = handleApiError(err);
      // Check if 409 with blockers
      if (err && typeof err === 'object' && 'response' in err) {
        const resp = (err as { response?: { status?: number; data?: { blockers?: unknown } } }).response;
        if (resp?.status === 409 && resp?.data?.blockers) {
          setBlockers(resp.data.blockers as typeof blockers);
          return;
        }
      }
      toast.error(errMsg);
    } finally {
      setActionLoading(null);
    }
  };

  const handleImpersonate = async (participant: Participant): Promise<void> => {
    if (!conferenceIdParam || typeof conferenceIdParam !== "number") {
      toast.error("Invalid conference id");
      return;
    }
    try {
      await startImpersonation(
        conferenceIdParam,
        participant.user.id,
        conference?.name ?? "Conference"
      );
      toast.success(`Now acting as ${participant.user.name}`);
    } catch (err) {
      toast.error(handleApiError(err));
    }
  };

  // Check consent status for a specific author
  const checkConsentStatus = async (authorId: number): Promise<{ hasConsent: boolean; pending: boolean }> => {
    if (!conferenceIdParam || typeof conferenceIdParam !== "number") {
      return { hasConsent: false, pending: false };
    }
    try {
      const response = await apiClient.get<{ hasConsent: boolean; pendingRequest: boolean }>(
        API_ENDPOINTS.ORGANIZER.ASSISTANCE_CHECK_CONSENT(conferenceIdParam, authorId)
      );
      return { hasConsent: response.data.hasConsent, pending: response.data.pendingRequest };
    } catch {
      return { hasConsent: false, pending: false };
    }
  };

  // Request consent from an author
  const handleRequestConsent = async (): Promise<void> => {
    if (!assistanceTarget || !conferenceIdParam || typeof conferenceIdParam !== "number") return;
    setAssistanceLoading(true);
    try {
      await apiClient.post(
        API_ENDPOINTS.ORGANIZER.ASSISTANCE_REQUEST_CONSENT(conferenceIdParam, assistanceTarget.user.id),
        { message: assistanceMessage || undefined }
      );
      toast.success(`Consent request sent to ${assistanceTarget.user.name}`);
      setConsentStatus((prev) => ({
        ...prev,
        [assistanceTarget.user.id]: { hasConsent: false, pending: true },
      }));
      setAssistanceTarget(null);
      setAssistanceMessage("");
    } catch (err) {
      toast.error(handleApiError(err));
    } finally {
      setAssistanceLoading(false);
    }
  };

  // Open the assistance dialog for an author
  const handleAssistWithSubmission = async (participant: Participant): Promise<void> => {
    if (!conferenceIdParam || typeof conferenceIdParam !== "number") return;
    // First check if we already have consent
    const status = consentStatus[participant.user.id] ?? await checkConsentStatus(participant.user.id);
    setConsentStatus((prev) => ({ ...prev, [participant.user.id]: status }));

    if (status.hasConsent) {
      // Navigate directly to submission wizard with onBehalfOf context
      router.push(`/conferences/${conferenceIdParam}/submit?onBehalfOf=${participant.user.id}`);
    } else if (status.pending) {
      toast.info(`Consent request already pending for ${participant.user.name}`);
    } else {
      // Open dialog to request consent
      setAssistanceTarget(participant);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  // Filter participants
  const filteredParticipants = participants.filter((p) => {
    const matchesSearch =
      searchQuery === "" ||
      p.user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.user.organization?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesRole = roleFilter === "all" || p.role === roleFilter;
    const matchesStatus = statusFilter === "all" || p.status === statusFilter;

    return matchesSearch && matchesRole && matchesStatus;
  });

  // Get unique roles from participants
  const availableRoles = Array.from(new Set(participants.map((p) => p.role)));

  // Calculate role counts
  const roleCounts = participants.reduce((acc, p) => {
    acc[p.role] = (acc[p.role] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

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
            <Users className="h-6 w-6 text-primary" />
            People
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage all conference participants, speakers, and team members
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" onClick={handleExport} disabled={exporting}>
            <Download className="h-4 w-4 mr-2" />
            {exporting ? "Exporting..." : "Export CSV"}
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Users className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.total || 0}</p>
                <p className="text-sm text-muted-foreground">Total</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.registered || 0}</p>
                <p className="text-sm text-muted-foreground">Registered</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10">
                <Clock className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.waitlisted || 0}</p>
                <p className="text-sm text-muted-foreground">Waitlisted</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/10">
                <Mic className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{roleCounts.speaker || roleCounts.presenter || 0}</p>
                <p className="text-sm text-muted-foreground">Speakers</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Role Filter Pills */}
      <div className="flex flex-wrap gap-2">
        {/* All People Pill */}
        <button
          onClick={() => setRoleFilter("all")}
          className={cn(
            "inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200",
            "border-2 hover:shadow-md",
            roleFilter === "all"
              ? "bg-primary text-primary-foreground border-primary shadow-md scale-105"
              : "bg-background border-muted-foreground/20 text-muted-foreground hover:border-primary/50 hover:text-foreground"
          )}
        >
          <Users className="h-4 w-4" />
          <span>All People</span>
          <span className={cn(
            "inline-flex items-center justify-center min-w-[24px] h-6 px-2 rounded-full text-xs font-semibold",
            roleFilter === "all"
              ? "bg-primary-foreground/20 text-primary-foreground"
              : "bg-muted text-muted-foreground"
          )}>
            {participants.length}
          </span>
        </button>

        {/* Divider */}
        {availableRoles.length > 0 && (
          <div className="hidden sm:flex items-center px-2">
            <div className="h-6 w-px bg-border" />
          </div>
        )}

        {/* Role Pills */}
        {availableRoles.map((role) => {
          const config = roleConfig[role] || roleConfig.attendee;
          const Icon = config.icon;
          const count = roleCounts[role] || 0;
          const isActive = roleFilter === role;

          return (
            <button
              key={role}
              onClick={() => setRoleFilter(role)}
              className={cn(
                "inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200",
                "border-2 hover:shadow-md",
                isActive
                  ? `${config.bgColor} ${config.color} border-current shadow-md scale-105`
                  : "bg-background border-muted-foreground/20 text-muted-foreground hover:border-primary/50 hover:text-foreground"
              )}
            >
              <Icon className={cn("h-4 w-4", isActive && config.color)} />
              <span>{config.label}</span>
              <span className={cn(
                "inline-flex items-center justify-center min-w-[24px] h-6 px-2 rounded-full text-xs font-semibold",
                isActive
                  ? `${config.bgColor} ${config.color}`
                  : "bg-muted text-muted-foreground"
              )}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, or organization..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="registered">Registered</SelectItem>
                <SelectItem value="waitlisted">Waitlisted</SelectItem>
                <SelectItem value="canceled">Canceled</SelectItem>
                <SelectItem value="withdrawn">Withdrawn</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* People Table */}
      <Card>
        <CardContent className="p-0">
          {filteredParticipants.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No people found</p>
              {(searchQuery || roleFilter !== "all" || statusFilter !== "all") && (
                <Button
                  variant="link"
                  onClick={() => {
                    setSearchQuery("");
                    setRoleFilter("all");
                    setStatusFilter("all");
                  }}
                >
                  Clear filters
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Person</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Registered</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredParticipants.map((participant) => {
                  const role = roleConfig[participant.role] || roleConfig.attendee;
                  const status = statusConfig[participant.status] || statusConfig.registered;
                  const RoleIcon = role.icon;
                  const StatusIcon = status.icon;

                  return (
                    <TableRow key={participant.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar>
                            <AvatarFallback className="bg-primary/10 text-primary text-sm">
                              {getInitials(participant.user.name)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{participant.user.name}</p>
                            <div className="flex items-center gap-3 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Mail className="h-3 w-3" />
                                {participant.user.email}
                              </span>
                              {participant.user.organization && (
                                <span className="flex items-center gap-1">
                                  <Building2 className="h-3 w-3" />
                                  {participant.user.organization}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={`${role.bgColor} ${role.color} gap-1 capitalize`}>
                          <RoleIcon className="h-3 w-3" />
                          {participant.role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={`${status.color} gap-1 capitalize`}>
                          <StatusIcon className="h-3 w-3" />
                          {participant.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDate(participant.registeredAt)}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              disabled={actionLoading === participant.id}
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {/* Impersonate option - only show if not already impersonating */}
                            {!isImpersonating && (
                              <>
                                <DropdownMenuItem
                                  onClick={() => handleImpersonate(participant)}
                                  disabled={impersonationLoading}
                                >
                                  <UserCog className="h-4 w-4 mr-2" />
                                  Act as this user
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                              </>
                            )}
                            {/* Assist with Submission - only for author role */}
                            {participant.role === "author" && (
                              <DropdownMenuItem
                                onClick={() => handleAssistWithSubmission(participant)}
                              >
                                <FileEdit className="h-4 w-4 mr-2" />
                                Assist with Submission
                                {consentStatus[participant.user.id]?.hasConsent && (
                                  <CheckCircle2 className="h-3 w-3 ml-auto text-green-500" />
                                )}
                                {consentStatus[participant.user.id]?.pending && (
                                  <Clock className="h-3 w-3 ml-auto text-amber-500" />
                                )}
                              </DropdownMenuItem>
                            )}
                            {participant.status === "waitlisted" && (
                              <DropdownMenuItem onClick={() => handleApprove(participant)}>
                                <UserCheck className="h-4 w-4 mr-2" />
                                Approve from Waitlist
                              </DropdownMenuItem>
                            )}
                            {participant.status === "registered" && (
                              <DropdownMenuItem
                                onClick={() => setCancelTarget(participant)}
                              >
                                <XCircle className="h-4 w-4 mr-2" />
                                Cancel Registration
                              </DropdownMenuItem>
                            )}
                            {(participant.status === "canceled" || participant.status === "withdrawn") && (
                              <DropdownMenuItem
                                onClick={() => handleUpdateStatus(participant, "registered")}
                              >
                                <CheckCircle2 className="h-4 w-4 mr-2" />
                                Reinstate Registration
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => setDeleteTarget(participant)}
                            >
                              <UserMinus className="h-4 w-4 mr-2" />
                              Remove from Active List
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Showing count */}
      {filteredParticipants.length > 0 && (
        <p className="text-sm text-muted-foreground text-center">
          Showing {filteredParticipants.length} of {participants.length} people
        </p>
      )}

      {/* Remove from Active List Confirmation Dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => {
        setDeleteTarget(null);
        setActionReason("other");
        setActionNotes("");
        setBlockers(null);
      }}>
        <AlertDialogContent className="max-w-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Remove from Active List</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-4 text-sm text-muted-foreground">
                <p>
                  Are you sure you want to remove <span className="font-semibold">{deleteTarget?.user.name}</span> from this conference&rsquo;s active participant list?
                </p>
                {blockers && blockers.length > 0 ? (
                  <div className="bg-red-50 border border-red-300 rounded p-4 space-y-3">
                    <p className="font-medium text-red-900">⚠️ This action is blocked:</p>
                    <ul className="space-y-2 text-sm text-red-800">
                      {blockers.map((blocker, idx) => (
                        <li key={idx} className="flex flex-col gap-1">
                          <span className="font-medium capitalize">{blocker.type}:</span>
                          <span>{blocker.reason}</span>
                          {blocker.details && <span className="text-xs text-red-700 italic">{blocker.details}</span>}
                        </li>
                      ))}
                    </ul>
                    <p className="text-xs text-red-700 mt-2">Only admins can override these guardrails.</p>
                  </div>
                ) : (
                  <div className="bg-blue-50 border border-blue-200 rounded p-3 text-sm text-blue-900 space-y-2">
                    <p className="font-medium mb-2">What this means:</p>
                    <ul className="list-disc list-inside space-y-1 text-xs">
                      <li>Their participation status will be changed to <span className="font-semibold">canceled</span></li>
                      <li>They can be reinstated to <span className="font-semibold">registered</span> status at any time before the conference ends</li>
                      <li>Their registration record is preserved for audit and reference purposes</li>
                      <li>This does not delete the user account</li>
                    </ul>
                  </div>
                )}
                {!blockers && (
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium mb-2 block">Reason for removal (optional)</label>
                      <Select value={actionReason} onValueChange={setActionReason}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="other">Other</SelectItem>
                          <SelectItem value="duplicate">Duplicate registration</SelectItem>
                          <SelectItem value="spam">Spam account</SelectItem>
                          <SelectItem value="request">User request</SelectItem>
                          <SelectItem value="policy_violation">Policy violation</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">Additional notes (optional)</label>
                      <textarea
                        className="w-full border rounded px-3 py-2 text-sm placeholder:text-muted-foreground"
                        placeholder="Add any notes about this removal..."
                        value={actionNotes}
                        onChange={(e) => setActionNotes(e.target.value)}
                        rows={3}
                      />
                    </div>
                  </div>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            {!blockers && (
              <AlertDialogAction
                onClick={handleDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Remove from Active List
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Cancel Registration Confirmation Dialog */}
      <AlertDialog open={!!cancelTarget} onOpenChange={() => {
        setCancelTarget(null);
        setActionReason("other");
        setActionNotes("");
        setBlockers(null);
      }}>
        <AlertDialogContent className="max-w-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Registration</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-4 text-sm text-muted-foreground">
                <p>
                  Are you sure you want to cancel <span className="font-semibold">{cancelTarget?.user.name}</span>&rsquo;s registration for this conference?
                </p>
                {blockers && blockers.length > 0 ? (
                  <div className="bg-red-50 border border-red-300 rounded p-4 space-y-3">
                    <p className="font-medium text-red-900">⚠️ This action is blocked:</p>
                    <ul className="space-y-2 text-sm text-red-800">
                      {blockers.map((blocker, idx) => (
                        <li key={idx} className="flex flex-col gap-1">
                          <span className="font-medium capitalize">{blocker.type}:</span>
                          <span>{blocker.reason}</span>
                          {blocker.details && <span className="text-xs text-red-700 italic">{blocker.details}</span>}
                        </li>
                      ))}
                    </ul>
                    <p className="text-xs text-red-700 mt-2">Only admins can override these guardrails.</p>
                  </div>
                ) : (
                  <div className="bg-blue-50 border border-blue-200 rounded p-3 text-sm text-blue-900 space-y-2">
                    <p className="font-medium mb-2">What this means:</p>
                    <ul className="list-disc list-inside space-y-1 text-xs">
                      <li>Their status will be changed to <span className="font-semibold">canceled</span></li>
                      <li>They can reinstate their registration at any time before the conference ends</li>
                      <li>Their registration record is preserved for audit purposes</li>
                      <li>This does not delete their account</li>
                    </ul>
                  </div>
                )}
                {!blockers && (
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium mb-2 block">Reason for cancellation (optional)</label>
                      <Select value={actionReason} onValueChange={setActionReason}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="other">Other</SelectItem>
                          <SelectItem value="user_request">User requested cancellation</SelectItem>
                          <SelectItem value="capacity">Capacity constraints</SelectItem>
                          <SelectItem value="duplicate">Duplicate registration</SelectItem>
                          <SelectItem value="no_show_risk">No-show risk</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">Additional notes (optional)</label>
                      <textarea
                        className="w-full border rounded px-3 py-2 text-sm placeholder:text-muted-foreground"
                        placeholder="Add any notes about this cancellation..."
                        value={actionNotes}
                        onChange={(e) => setActionNotes(e.target.value)}
                        rows={3}
                      />
                    </div>
                  </div>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            {!blockers && (
              <AlertDialogAction
                onClick={() => {
                  if (cancelTarget) {
                    handleUpdateStatus(cancelTarget, "canceled");
                  }
                }}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Cancel Registration
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Request Consent Dialog */}
      <Dialog open={!!assistanceTarget} onOpenChange={(open) => {
        if (!open) {
          setAssistanceTarget(null);
          setAssistanceMessage("");
        }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <SendHorizontal className="h-5 w-5 text-primary" />
              Request Consent to Assist
            </DialogTitle>
            <DialogDescription>
              Request permission from <span className="font-semibold">{assistanceTarget?.user.name}</span> to 
              help with their submission. They will receive a notification and can approve or deny your request.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="assistance-message">Message (optional)</Label>
              <Textarea
                id="assistance-message"
                placeholder="Hi, I noticed you haven't submitted yet. I'd be happy to help you complete your submission if you need assistance..."
                value={assistanceMessage}
                onChange={(e) => setAssistanceMessage(e.target.value)}
                rows={4}
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground">
                This message will be included in the consent request notification.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setAssistanceTarget(null);
                setAssistanceMessage("");
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleRequestConsent}
              disabled={assistanceLoading}
            >
              {assistanceLoading ? "Sending..." : "Send Request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
