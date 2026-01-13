"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import apiClient, { handleApiError } from "@/lib/api/client";
import { API_ENDPOINTS } from "@/lib/api/endpoints";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
  Users,
  UserPlus,
  Clock,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Settings,
  FileText,
  HelpCircle,
  ArrowRight,
  TrendingUp,
  UserCheck,
  UserX,
  Download,
  Mic,
  PenTool,
  Eye,
  Heart,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

interface RegistrationOverview {
  conference: {
    id: number;
    name: string;
    registrationEnabled: boolean;
    maxAttendees: number | null;
    waitlistEnabled: boolean;
    requireApproval: boolean;
    windowStatus: "not_started" | "open" | "closed";
    registrationOpenFrom: string | null;
    registrationOpenUntil: string | null;
  };
  counts: {
    total: number;
    registered: number;
    waitlisted: number;
    canceled: number;
    byRole: {
      attendees: number;
      presenters: number;
      authors: number;
      reviewers: number;
      sponsors: number;
      volunteers: number;
    };
    capacityUsed: number | null;
  };
  recentRegistrations: Array<{
    id: number;
    role: string;
    status: string;
    registeredAt: string;
    user: {
      id: number;
      name: string;
      email: string;
      organization: string | null;
    };
  }>;
  trend: Array<{
    registeredAt: string;
    _count: { id: number };
  }>;
}

const quickActions = [
  {
    title: "Registration Settings",
    description: "Configure window dates, capacity, and fees",
    icon: Settings,
    href: "settings",
    color: "bg-blue-500/10 text-blue-500",
  },
  {
    title: "Form Builder",
    description: "Design your registration form layout",
    icon: FileText,
    href: "form",
    color: "bg-purple-500/10 text-purple-500",
  },
  {
    title: "Custom Questions",
    description: "Add dietary, accessibility, and other fields",
    icon: HelpCircle,
    href: "custom-questions",
    color: "bg-amber-500/10 text-amber-500",
  },
  {
    title: "Deadlines",
    description: "Manage registration periods",
    icon: Calendar,
    href: "deadlines",
    color: "bg-green-500/10 text-green-500",
  },
];

const roleIcons: Record<string, typeof Users> = {
  attendees: Users,
  presenters: Mic,
  authors: PenTool,
  reviewers: Eye,
  sponsors: Heart,
  volunteers: Sparkles,
};

const roleColors: Record<string, string> = {
  attendees: "bg-blue-500",
  presenters: "bg-purple-500",
  authors: "bg-green-500",
  reviewers: "bg-amber-500",
  sponsors: "bg-pink-500",
  volunteers: "bg-cyan-500",
};

export default function RegistrationOverviewPage() {
  const params = useParams();
  const conferenceId = Number(params?.id);

  const [overview, setOverview] = useState<RegistrationOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const fetchOverview = useCallback(async () => {
    if (!conferenceId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get(API_ENDPOINTS.ORGANIZER.REGISTRATION_OVERVIEW(conferenceId));
      setOverview(res.data);
    } catch (err) {
      setError(handleApiError(err));
    } finally {
      setLoading(false);
    }
  }, [conferenceId]);

  useEffect(() => {
    fetchOverview();
  }, [fetchOverview]);

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await apiClient.post(
        API_ENDPOINTS.ORGANIZER.PARTICIPANTS_EXPORT(conferenceId),
        {},
        { responseType: "blob" }
      );
      // Create download link
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `participants-${conferenceId}.csv`);
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatShortDate = (dateString: string | null) => {
    if (!dateString) return "Not set";
    return new Date(dateString).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const getWindowStatusBadge = () => {
    if (!overview) return null;
    
    switch (overview.conference.windowStatus) {
      case "open":
        return (
          <Badge className="bg-green-500/10 text-green-500 hover:bg-green-500/20 gap-1">
            <CheckCircle2 className="h-3 w-3" />
            Registration Open
          </Badge>
        );
      case "closed":
        return (
          <Badge variant="secondary" className="gap-1">
            <AlertCircle className="h-3 w-3" />
            Registration Closed
          </Badge>
        );
      case "not_started":
        return (
          <Badge className="bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 gap-1">
            <Clock className="h-3 w-3" />
            Opening Soon
          </Badge>
        );
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

  if (!conferenceId) return null;

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-64 mt-2" />
          </div>
        </div>
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
            <p className="text-destructive">{error}</p>
            <Button variant="outline" className="mt-4" onClick={fetchOverview}>
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!overview) return null;

  const { conference, counts, recentRegistrations } = overview;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold">Registration</h1>
            {getWindowStatusBadge()}
          </div>
          <p className="text-muted-foreground mt-1">
            {conference.registrationEnabled
              ? "Manage registrations, custom forms, and participant data"
              : "Registration is currently disabled"}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExport} disabled={exporting}>
            <Download className="h-4 w-4 mr-2" />
            {exporting ? "Exporting..." : "Export CSV"}
          </Button>
          <Link href={`/organizer/conferences/${conferenceId}/registration/settings`}>
            <Button>
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-blue-500/10 to-transparent rounded-bl-full" />
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Users className="h-4 w-4" />
              Total Registered
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{counts.registered}</div>
            {counts.waitlisted > 0 && (
              <p className="text-sm text-amber-500 mt-1">
                +{counts.waitlisted} on waitlist
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-green-500/10 to-transparent rounded-bl-full" />
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <UserCheck className="h-4 w-4" />
              Confirmed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-500">{counts.registered}</div>
            <p className="text-sm text-muted-foreground mt-1">Active participants</p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-amber-500/10 to-transparent rounded-bl-full" />
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Waitlisted
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-amber-500">{counts.waitlisted}</div>
            <p className="text-sm text-muted-foreground mt-1">
              {conference.requireApproval ? "Pending approval" : "At capacity"}
            </p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-red-500/10 to-transparent rounded-bl-full" />
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <UserX className="h-4 w-4" />
              Canceled
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-muted-foreground">{counts.canceled}</div>
            <p className="text-sm text-muted-foreground mt-1">Withdrawn registrations</p>
          </CardContent>
        </Card>
      </div>

      {/* Capacity Progress */}
      {conference.maxAttendees && counts.capacityUsed !== null && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Capacity</CardTitle>
              <span className="text-sm text-muted-foreground">
                {counts.byRole.attendees} / {conference.maxAttendees} attendees
              </span>
            </div>
          </CardHeader>
          <CardContent>
            <Progress value={counts.capacityUsed} className="h-3" />
            <p className="text-sm text-muted-foreground mt-2">
              {counts.capacityUsed}% capacity used
              {counts.capacityUsed >= 90 && (
                <span className="text-amber-500 ml-2">• Almost full!</span>
              )}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Role Breakdown & Quick Actions */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Role Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Participants by Role
            </CardTitle>
            <CardDescription>Distribution of registered participants</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              {Object.entries(counts.byRole).map(([role, count]) => {
                const Icon = roleIcons[role] || Users;
                const color = roleColors[role] || "bg-gray-500";
                return (
                  <div
                    key={role}
                    className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                  >
                    <div className={`p-2 rounded-full ${color} bg-opacity-10`}>
                      <Icon className={`h-4 w-4 ${color.replace('bg-', 'text-')}`} />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{count}</p>
                      <p className="text-sm text-muted-foreground capitalize">{role}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Manage your registration configuration</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            {quickActions.map((action) => (
              <Link
                key={action.href}
                href={`/organizer/conferences/${conferenceId}/registration/${action.href}`}
              >
                <div className="flex items-center gap-4 p-3 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer group">
                  <div className={`p-2 rounded-lg ${action.color}`}>
                    <action.icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{action.title}</p>
                    <p className="text-sm text-muted-foreground">{action.description}</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Registration Window Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Registration Window
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-6">
            <div className="flex-1">
              <p className="text-sm text-muted-foreground mb-1">Opens</p>
              <p className="font-medium">{formatShortDate(conference.registrationOpenFrom)}</p>
            </div>
            <div className="hidden sm:block w-px bg-border" />
            <div className="flex-1">
              <p className="text-sm text-muted-foreground mb-1">Closes</p>
              <p className="font-medium">{formatShortDate(conference.registrationOpenUntil)}</p>
            </div>
            <div className="hidden sm:block w-px bg-border" />
            <div className="flex-1">
              <p className="text-sm text-muted-foreground mb-1">Status</p>
              {getWindowStatusBadge()}
            </div>
            <div className="hidden sm:block w-px bg-border" />
            <div className="flex-1">
              <p className="text-sm text-muted-foreground mb-1">Approval Required</p>
              <Badge variant={conference.requireApproval ? "default" : "secondary"}>
                {conference.requireApproval ? "Yes" : "No"}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Registrations */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Recent Registrations
            </CardTitle>
            <CardDescription>Latest participants who registered</CardDescription>
          </div>
          <Link href={`/organizer/conferences/${conferenceId}/home/people`}>
            <Button variant="outline" size="sm">
              View All
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {recentRegistrations.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No registrations yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                Participants will appear here when they register
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {recentRegistrations.map((reg) => (
                <div
                  key={reg.id}
                  className="flex items-center gap-4 p-3 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <Avatar>
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {getInitials(reg.user.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{reg.user.name}</p>
                    <p className="text-sm text-muted-foreground truncate">{reg.user.email}</p>
                  </div>
                  <div className="text-right">
                    <Badge variant="secondary" className="capitalize">
                      {reg.role}
                    </Badge>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDate(reg.registeredAt)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
