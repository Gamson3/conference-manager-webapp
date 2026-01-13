"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Plus, Clock, Trash2, Edit, AlertCircle, MapPin, Calendar } from "lucide-react";

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
import endpoints from "@/lib/api/endpoints";
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
  dayId: string;
}

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
  const router = useRouter();
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
    dayId: "",
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
        apiClient.get<Session[]>(endpoints.ORGANIZER.SESSIONS(conferenceId)),
        apiClient.get<Day[]>(endpoints.ORGANIZER.DAYS(conferenceId)),
      ]);

      setSessions(sessionsRes.data);
      setDays(daysRes.data);
    } catch (err: unknown) {
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
      await apiClient.post(endpoints.ORGANIZER.SESSION_CREATE, {
        ...formData,
        conferenceId,
        capacity: formData.capacity ? Number(formData.capacity) : null,
        startTime: formData.startTime || null,
        endTime: formData.endTime || null,
        dayId: formData.dayId ? Number(formData.dayId) : null,
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
      await apiClient.put(endpoints.ORGANIZER.SESSION(selectedSession.id), {
        ...formData,
        capacity: formData.capacity ? Number(formData.capacity) : null,
        startTime: formData.startTime || null,
        endTime: formData.endTime || null,
        dayId: formData.dayId ? Number(formData.dayId) : null,
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
        ? `${endpoints.ORGANIZER.SESSION(selectedSession.id)}?force=true`
        : endpoints.ORGANIZER.SESSION(selectedSession.id);

      await apiClient.delete(url);
      setIsDeleteOpen(false);
      setSelectedSession(null);
      setDeleteInfo(null);
      fetchData();
    } catch (err: unknown) {
      // Check if requires confirmation
      const axiosErr = err as { response?: { data?: { requiresConfirmation?: boolean; presentationCount?: number; message?: string } }; message?: string };
      const body = axiosErr?.response?.data;
      if (body?.requiresConfirmation) {
        setDeleteInfo({ presentationCount: body.presentationCount || 0 });
        setSubmitting(false);
        return;
      }
      console.error("Error deleting session:", err);
      setError(body?.message || axiosErr?.message || "Failed to delete session");
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
      dayId: "",
    });
    setFormError(null);
  };

  const openEditDialog = (session: Session) => {
    setSelectedSession(session);
    const startTime = session.startTime 
      ? (session.startTime.includes('T') ? session.startTime.split('T')[1].slice(0, 5) : session.startTime.slice(0, 5))
      : "";
    const endTime = session.endTime 
      ? (session.endTime.includes('T') ? session.endTime.split('T')[1].slice(0, 5) : session.endTime.slice(0, 5))
      : "";
    setFormData({
      name: session.name,
      type: session.type,
      startTime,
      endTime,
      room: session.room || "",
      capacity: session.capacity?.toString() || "",
      description: session.description || "",
      dayId: session.dayId?.toString() || "",
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

  const getDayName = (dayId: number | null) => {
    if (!dayId) return null;
    const day = days.find((d) => d.id === dayId);
    return day?.name || null;
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
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => router.push(`/organizer/conferences/${conferenceId}/home/program/scheduler`)}
          >
            Open Scheduler
          </Button>
          <Button onClick={openCreateDialog}>
            <Plus className="h-4 w-4 mr-2" />
            Add Session
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded border border-destructive/50 bg-destructive/5 px-3 py-2 text-sm text-destructive flex items-center gap-2">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      {days.length === 0 && !loading && (
        <div className="rounded border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800 px-3 py-2 text-sm text-amber-800 dark:text-amber-200">
          💡 Conference days are automatically generated from your conference dates set in Settings → Conference Basics.
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
                      {getDayName(session.dayId) && (
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {getDayName(session.dayId)}
                        </span>
                      )}
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
                    <Button variant="ghost" size="icon" onClick={() => openEditDialog(session)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => openDeleteDialog(session)}>
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
        <DialogContent className="max-w-2xl max-h-screen overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isEditOpen ? "Edit Session" : "Add Session"}</DialogTitle>
            <DialogDescription>
              {isEditOpen
                ? "Update session details."
                : "Create a new session for your conference."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
              <div className="space-y-2">
                <Label htmlFor="session-day">Day</Label>
                <Select
                  value={formData.dayId}
                  onValueChange={(value) => setFormData({ ...formData, dayId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select day" />
                  </SelectTrigger>
                  <SelectContent>
                    {days.map((day) => (
                      <SelectItem key={day.id} value={day.id.toString()}>
                        {day.name} ({new Date(day.date).toLocaleDateString()})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start-time">Start Time</Label>
                <Input
                  id="start-time"
                  type="time"
                  value={formData.startTime ? formData.startTime.slice(11, 16) : ""}
                  onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end-time">End Time</Label>
                <Input
                  id="end-time"
                  type="time"
                  value={formData.endTime ? formData.endTime.slice(11, 16) : ""}
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
