"use client";

import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import apiClient from "@/lib/api/client";
import { API_ENDPOINTS } from "@/lib/api/endpoints";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  UserCheck,
  UserX,
  Clock,
  Shield,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Calendar,
  Building2,
  Mail,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

// ===================== TYPES =====================

interface AssistanceRequest {
  id: number;
  conferenceId: number;
  organizerId: number;
  message: string | null;
  status: "pending" | "approved" | "denied" | "expired";
  createdAt: string;
  respondedAt: string | null;
  responseNote: string | null;
  conference: {
    id: number;
    name: string;
    slug: string;
  };
  organizer: {
    id: number;
    name: string;
    email: string;
  };
}

interface AssistanceConsent {
  id: number;
  conferenceId: number;
  organizerId: number;
  grantedAt: string;
  revokedAt: string | null;
  expiresAt: string | null;
  conference: {
    id: number;
    name: string;
    slug: string;
  };
  organizer: {
    id: number;
    name: string;
    email: string;
  };
}

// ===================== COMPONENTS =====================

function RequestCard({
  request,
  onRespond,
  isResponding,
}: {
  request: AssistanceRequest;
  onRespond: (requestId: number, action: "approve" | "deny", responseNote?: string) => void;
  isResponding: boolean;
}): React.ReactElement {
  const [responseNote, setResponseNote] = React.useState("");
  const [showDenyDialog, setShowDenyDialog] = React.useState(false);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              {request.conference.name}
            </CardTitle>
            <CardDescription className="flex items-center gap-2">
              <Mail className="h-3.5 w-3.5" />
              {request.organizer.name} ({request.organizer.email})
            </CardDescription>
          </div>
          <Badge variant="outline" className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {formatDistanceToNow(new Date(request.createdAt), { addSuffix: true })}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {request.message && (
          <div className="bg-muted/50 rounded-md p-3 text-sm">
            <p className="text-muted-foreground font-medium mb-1">Message from organizer:</p>
            <p>{request.message}</p>
          </div>
        )}
        <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-md p-3 text-sm">
          <p className="text-amber-800 dark:text-amber-200">
            <strong>What this means:</strong> If you approve, this organizer will be able to create, edit, and submit abstracts on your behalf for this conference. You can revoke this permission at any time.
          </p>
        </div>
        <div className="flex gap-2 pt-2">
          <Button
            onClick={() => onRespond(request.id, "approve")}
            disabled={isResponding}
            className="flex-1"
          >
            <CheckCircle2 className="h-4 w-4 mr-2" />
            Approve
          </Button>
          <AlertDialog open={showDenyDialog} onOpenChange={setShowDenyDialog}>
            <AlertDialogTrigger asChild>
              <Button variant="outline" disabled={isResponding} className="flex-1">
                <XCircle className="h-4 w-4 mr-2" />
                Deny
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Deny assistance request?</AlertDialogTitle>
                <AlertDialogDescription>
                  You can optionally provide a note explaining why you are denying this request.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <Textarea
                placeholder="Optional note (e.g., 'I prefer to manage my own submissions')"
                value={responseNote}
                onChange={(e) => setResponseNote(e.target.value)}
                className="min-h-[80px]"
              />
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => {
                    onRespond(request.id, "deny", responseNote || undefined);
                    setShowDenyDialog(false);
                    setResponseNote("");
                  }}
                >
                  Deny Request
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardContent>
    </Card>
  );
}

function ConsentCard({
  consent,
  onRevoke,
  isRevoking,
}: {
  consent: AssistanceConsent;
  onRevoke: (consentId: number) => void;
  isRevoking: boolean;
}): React.ReactElement {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              {consent.conference.name}
            </CardTitle>
            <CardDescription className="flex items-center gap-2">
              <UserCheck className="h-3.5 w-3.5 text-green-600" />
              {consent.organizer.name} ({consent.organizer.email})
            </CardDescription>
          </div>
          <Badge variant="default" className="bg-green-100 text-green-800 hover:bg-green-100">
            <Shield className="h-3 w-3 mr-1" />
            Active
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-muted-foreground flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          Granted {format(new Date(consent.grantedAt), "PPP")}
          {consent.expiresAt && (
            <span className="text-amber-600">
              · Expires {format(new Date(consent.expiresAt), "PPP")}
            </span>
          )}
        </div>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" size="sm" disabled={isRevoking}>
              <UserX className="h-4 w-4 mr-2" />
              Revoke Access
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Revoke organizer access?</AlertDialogTitle>
              <AlertDialogDescription>
                This will immediately prevent {consent.organizer.name} from creating or editing submissions on your behalf for {consent.conference.name}. Any in-progress work may be affected.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => onRevoke(consent.id)}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Revoke Access
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}

function EmptyState({ type }: { type: "requests" | "consents" }): React.ReactElement {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      {type === "requests" ? (
        <>
          <Clock className="h-12 w-12 text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-medium text-muted-foreground">No pending requests</h3>
          <p className="text-sm text-muted-foreground/70 mt-1 max-w-sm">
            When conference organizers request to help you with submissions, they will appear here.
          </p>
        </>
      ) : (
        <>
          <Shield className="h-12 w-12 text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-medium text-muted-foreground">No active permissions</h3>
          <p className="text-sm text-muted-foreground/70 mt-1 max-w-sm">
            You haven&apos;t granted any organizers permission to assist with your submissions.
          </p>
        </>
      )}
    </div>
  );
}

function LoadingSkeleton(): React.ReactElement {
  return (
    <div className="space-y-4">
      {[1, 2].map((i) => (
        <Card key={i}>
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <Skeleton className="h-5 w-48" />
                <Skeleton className="h-4 w-32" />
              </div>
              <Skeleton className="h-6 w-20" />
            </div>
          </CardHeader>
          <CardContent>
            <Skeleton className="h-20 w-full" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ===================== MAIN PAGE =====================

export default function AssistanceConsentPage(): React.ReactElement {
  const queryClient = useQueryClient();

  // Fetch pending requests
  const {
    data: requests,
    isLoading: requestsLoading,
    error: requestsError,
  } = useQuery<AssistanceRequest[]>({
    queryKey: ["assistance-requests"],
    queryFn: async () => {
      const response = await apiClient.get(API_ENDPOINTS.ACCOUNT.ASSISTANCE_REQUESTS);
      return response.data;
    },
  });

  // Fetch active consents
  const {
    data: consents,
    isLoading: consentsLoading,
    error: consentsError,
  } = useQuery<AssistanceConsent[]>({
    queryKey: ["assistance-consents"],
    queryFn: async () => {
      const response = await apiClient.get(API_ENDPOINTS.ACCOUNT.ASSISTANCE_CONSENTS);
      return response.data;
    },
  });

  // Respond to request mutation
  const respondMutation = useMutation({
    mutationFn: async ({
      requestId,
      action,
      responseNote,
    }: {
      requestId: number;
      action: "approve" | "deny";
      responseNote?: string;
    }) => {
      const response = await apiClient.post(
        API_ENDPOINTS.ACCOUNT.ASSISTANCE_RESPOND(requestId),
        { action, responseNote }
      );
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["assistance-requests"] });
      queryClient.invalidateQueries({ queryKey: ["assistance-consents"] });
      toast.success(
        variables.action === "approve"
          ? "Request approved. The organizer can now assist with your submissions."
          : "Request denied."
      );
    },
    onError: (error: Error) => {
      toast.error(`Failed to respond: ${error.message}`);
    },
  });

  // Revoke consent mutation
  const revokeMutation = useMutation({
    mutationFn: async (consentId: number) => {
      const response = await apiClient.delete(
        API_ENDPOINTS.ACCOUNT.ASSISTANCE_REVOKE(consentId)
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assistance-consents"] });
      toast.success("Access revoked. The organizer can no longer assist with your submissions.");
    },
    onError: (error: Error) => {
      toast.error(`Failed to revoke: ${error.message}`);
    },
  });

  const handleRespond = (requestId: number, action: "approve" | "deny", responseNote?: string): void => {
    respondMutation.mutate({ requestId, action, responseNote });
  };

  const handleRevoke = (consentId: number): void => {
    revokeMutation.mutate(consentId);
  };

  const pendingCount = requests?.length ?? 0;

  if (requestsError || consentsError) {
    return (
      <section className="space-y-6">
        <div className="flex flex-col items-center justify-center py-12">
          <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Failed to load data</h2>
          <p className="text-gray-500">
            {(requestsError as Error)?.message || (consentsError as Error)?.message}
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-semibold">Submission Assistance</h1>
        <p className="text-muted-foreground mt-1">
          Manage permissions for conference organizers to help with your abstract submissions.
        </p>
      </div>

      <Tabs defaultValue="requests" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="requests" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Pending Requests
            {pendingCount > 0 && (
              <Badge variant="destructive" className="ml-1 h-5 px-1.5">
                {pendingCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="consents" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Active Permissions
          </TabsTrigger>
        </TabsList>

        <TabsContent value="requests" className="mt-4 space-y-4">
          {requestsLoading ? (
            <LoadingSkeleton />
          ) : requests && requests.length > 0 ? (
            requests.map((request) => (
              <RequestCard
                key={request.id}
                request={request}
                onRespond={handleRespond}
                isResponding={respondMutation.isPending}
              />
            ))
          ) : (
            <EmptyState type="requests" />
          )}
        </TabsContent>

        <TabsContent value="consents" className="mt-4 space-y-4">
          {consentsLoading ? (
            <LoadingSkeleton />
          ) : consents && consents.length > 0 ? (
            consents.map((consent) => (
              <ConsentCard
                key={consent.id}
                consent={consent}
                onRevoke={handleRevoke}
                isRevoking={revokeMutation.isPending}
              />
            ))
          ) : (
            <EmptyState type="consents" />
          )}
        </TabsContent>
      </Tabs>
    </section>
  );
}
