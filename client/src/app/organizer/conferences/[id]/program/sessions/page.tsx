"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { Plus, Clock, Trash2, Edit, AlertCircle, MapPin } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { API_ENDPOINTS } from "@/lib/api/endpoints";
import apiClient, { handleApiError } from "@/lib/api/client";

interface Session {
  id: number;
  name: string;
  type: string;
  startTime: string | null;
  endTime: string | null;
  room: string | null;
  capacity: number | null;
  description: string | null;
  dayId: number | null;
  _count?: { presentations: number; attendees: number };
}

interface Day {
  id: number;
  name: string;
  date: string;
}

interface SessionFormData {
  name: string;
  type: string;
  startTime: string;
  endTime: string;
  room: string;
  capacity: string;
  description: string;
}

type DeleteConfirmationBody = {
  requiresConfirmation?: boolean;
  presentationCount?: number;
  message?: string;
};

const getErrorResponseData = (err: unknown): unknown => {
  return (err as { response?: { data?: unknown } })?.response?.data;
};

const SESSION_TYPES = [
  { value: "presentation", label: "Presentation" },
  { value: "keynote", label: "Keynote" },
  { value: "workshop", label: "Workshop" },
  { value: "panel", label: "Panel" },
  { value: "break", label: "Break" },
  { value: "networking", label: "Networking" },
];

export default function SessionsManagementPage() {
  const params = useParams();
  const conferenceId = Number(params?.id);

  const [sessions, setSessions] = useState<Session[]>([]);
  const [days, setDays] = useState<Day[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Dialog states
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [formData, setFormData] = useState<SessionFormData>({
    name: "",
    type: "presentation",
    startTime: "",
    endTime: "",
    room: "",
    capacity: "",
    description: "",
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleteInfo, setDeleteInfo] = useState<{ presentationCount: number } | null>(null);

  const fetchData = useCallback(async () => {
    if (!conferenceId || Number.isNaN(conferenceId)) return;

    setLoading(true);
    setError(null);
    try {
      const [sessionsRes, daysRes] = await Promise.all([
        apiClient.get<Session[]>(API_ENDPOINTS.ORGANIZER.SESSIONS(conferenceId)),
        apiClient.get<Day[]>(API_ENDPOINTS.ORGANIZER.DAYS(conferenceId)),
      ]);

      setSessions(sessionsRes.data);
      setDays(daysRes.data);
    } catch (err) {
      console.error("Error fetching data:", err);
      setError(handleApiError(err));
    } finally {
      setLoading(false);
    }
  }, [conferenceId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCreate = async () => {
    if (!formData.name.trim()) {
      setFormError("Session name is required");
      return;
    }

    setSubmitting(true);
    setFormError(null);
    try {
      await apiClient.post(API_ENDPOINTS.ORGANIZER.SESSION_CREATE, {
        ...formData,
        conferenceId,
        capacity: formData.capacity ? Number(formData.capacity) : null,
        startTime: formData.startTime || null,
        endTime: formData.endTime || null,
      });

      setIsCreateOpen(false);
      resetForm();
      fetchData();
    } catch (err) {
      console.error("Error creating session:", err);
      setFormError(handleApiError(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async () => {
    if (!selectedSession) return;
    if (!formData.name.trim()) {
      setFormError("Session name is required");
      return;
    }

    setSubmitting(true);
    setFormError(null);
    try {
      await apiClient.put(API_ENDPOINTS.ORGANIZER.SESSION(selectedSession.id), {
        ...formData,
        capacity: formData.capacity ? Number(formData.capacity) : null,
        startTime: formData.startTime || null,
        endTime: formData.endTime || null,
      });

      setIsEditOpen(false);
      setSelectedSession(null);
      resetForm();
      fetchData();
    } catch (err) {
      console.error("Error updating session:", err);
      setFormError(handleApiError(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (force = false) => {
    if (!selectedSession) return;

    setSubmitting(true);
    try {
      const url = force
        ? `${API_ENDPOINTS.ORGANIZER.SESSION(selectedSession.id)}?force=true`
        : API_ENDPOINTS.ORGANIZER.SESSION(selectedSession.id);

      await apiClient.delete(url);
      setIsDeleteOpen(false);
      setSelectedSession(null);
      setDeleteInfo(null);
      fetchData();
    } catch (err) {
      const data = getErrorResponseData(err);
      const body = typeof data === "object" && data !== null ? (data as DeleteConfirmationBody) : undefined;
      if (body?.requiresConfirmation) {
        setDeleteInfo({ presentationCount: body.presentationCount || 0 });
        return;
      }
      console.error("Error deleting session:", err);
      setError(body?.message ?? handleApiError(err));
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      type: "presentation",
      startTime: "",
      endTime: "",
      room: "",
      capacity: "",
      description: "",
    });
    setFormError(null);
  };

  const openEditDialog = (session: Session) => {
    setSelectedSession(session);
    setFormData({
      name: session.name,
      type: session.type,
      startTime: session.startTime?.slice(0, 16) || "",
      endTime: session.endTime?.slice(0, 16) || "",
      room: session.room || "",
      capacity: session.capacity?.toString() || "",
      description: session.description || "",
    });
    setFormError(null);
    setIsEditOpen(true);
  };

  const openDeleteDialog = (session: Session) => {
    setSelectedSession(session);
    setDeleteInfo(null);
    setIsDeleteOpen(true);
  };

  const openCreateDialog = () => {
    resetForm();
    setIsCreateOpen(true);
  };

  const formatTime = (isoString: string | null) => {
    if (!isoString) return "—";
    const date = new Date(isoString);
    return date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  };

  if (!conferenceId || Number.isNaN(conferenceId)) {
    return <p className="text-sm text-red-500">Invalid conference ID.</p>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Sessions</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Create and manage sessions (time blocks) for your conference.
          </p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="h-4 w-4 mr-2" />
          Add Session
        </Button>
      </div>

      {error && (
        <div className="rounded border border-destructive/50 bg-destructive/5 px-3 py-2 text-sm text-destructive flex items-center gap-2">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

        {days.length === 0 && !loading && (
          <div className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            💡 Tip: Create days first before adding sessions. Sessions will be automatically assigned to days based on their start time.
          </div>
        )}

        {/* Sessions List */}
        {loading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <Skeleton className="h-10 w-10 rounded" />
                    <div className="flex-1">
                      <Skeleton className="h-5 w-40" />
                      <Skeleton className="h-4 w-32 mt-1" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : sessions.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Clock className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="font-semibold text-lg">No sessions yet</h3>
              <p className="text-muted-foreground text-sm mt-1 mb-4">
                Create your first session to start building your schedule
              </p>
              <Button onClick={openCreateDialog}>
                <Plus className="h-4 w-4 mr-2" />
                Add Session
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {sessions.map((session) => (
              <Card key={session.id} className="hover:shadow-sm transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold truncate">{session.name}</h3>
                        <Badge variant="secondary" className="capitalize text-xs">
                          {session.type}
                        </Badge>
                        {session._count && (
                          <Badge variant="outline" className="text-xs">
                            {session._count.presentations} presentation
                            {session._count.presentations !== 1 ? "s" : ""}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatTime(session.startTime)} - {formatTime(session.endTime)}
                        </span>
                        {session.room && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {session.room}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditDialog(session)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openDeleteDialog(session)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      {/* Create/Edit Dialog */}
      <Dialog
        open={isCreateOpen || isEditOpen}
        onOpenChange={(open) => {
          if (!open) {
            setIsCreateOpen(false);
            setIsEditOpen(false);
          }
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{isEditOpen ? "Edit Session" : "Add Session"}</DialogTitle>
            <DialogDescription>
              {isEditOpen
                ? "Update session details."
                : "Create a new session for your conference."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
            {formError && (
              <div className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded">
                {formError}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="session-name">Session Name *</Label>
              <Input
                id="session-name"
                placeholder="e.g., Opening Keynote, AI Track"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="session-type">Type</Label>
              <Select
                value={formData.type}
                onValueChange={(value) => setFormData({ ...formData, type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SESSION_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start-time">Start Time</Label>
                <Input
                  id="start-time"
                  type="datetime-local"
                  value={formData.startTime}
                  onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end-time">End Time</Label>
                <Input
                  id="end-time"
                  type="datetime-local"
                  value={formData.endTime}
                  onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="room">Room</Label>
                <Input
                  id="room"
                  placeholder="e.g., Room A"
                  value={formData.room}
                  onChange={(e) => setFormData({ ...formData, room: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="capacity">Capacity</Label>
                <Input
                  id="capacity"
                  type="number"
                  placeholder="e.g., 100"
                  value={formData.capacity}
                  onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                placeholder="Optional description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsCreateOpen(false);
                setIsEditOpen(false);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={isEditOpen ? handleUpdate : handleCreate}
              disabled={submitting}
            >
              {submitting
                ? isEditOpen
                  ? "Saving..."
                  : "Creating..."
                : isEditOpen
                ? "Save Changes"
                : "Create Session"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Session</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteInfo ? (
                <>
                  This session contains {deleteInfo.presentationCount} presentation(s).
                  Deleting it will remove all presentations. This action cannot be undone.
                </>
              ) : (
                <>
                  Are you sure you want to delete &quot;{selectedSession?.name}&quot;?
                  This action cannot be undone.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => handleDelete(deleteInfo !== null)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={submitting}
            >
              {submitting ? "Deleting..." : deleteInfo ? "Delete Everything" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
