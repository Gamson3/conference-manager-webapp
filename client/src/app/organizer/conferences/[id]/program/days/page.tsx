"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { Plus, Calendar, Trash2, Edit, GripVertical, AlertCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { DateInput } from "@/components/ui/date-input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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

interface Day {
  id: number;
  conferenceId: number;
  name: string;
  date: string; // YYYY-MM-DD
  order: number;
  sessionsCount: number;
}

interface DayFormData {
  name: string;
  date: string;
}

type DeleteConfirmationBody = {
  requiresConfirmation?: boolean;
  sessionsCount?: number;
  presentationsCount?: number;
  message?: string;
};

const getErrorResponseData = (err: unknown): unknown => {
  return (err as { response?: { data?: unknown } })?.response?.data;
};

function getTodayLocalISODate(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export default function DaysManagementPage() {
  const params = useParams();
  const conferenceId = Number(params?.id);

  const [days, setDays] = useState<Day[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Dialog states
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedDay, setSelectedDay] = useState<Day | null>(null);
  const [formData, setFormData] = useState<DayFormData>({ name: "", date: "" });
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleteInfo, setDeleteInfo] = useState<{
    sessionsCount: number;
    presentationsCount: number;
  } | null>(null);

  const today = getTodayLocalISODate();

  const fetchDays = useCallback(async () => {
    if (!conferenceId || Number.isNaN(conferenceId)) return;

    setLoading(true);
    setError(null);
    try {
      const { data } = await apiClient.get<Day[]>(API_ENDPOINTS.ORGANIZER.DAYS(conferenceId));
      setDays(data);
    } catch (err: unknown) {
      setError(handleApiError(err));
    } finally {
      setLoading(false);
    }
  }, [conferenceId]);

  useEffect(() => {
    fetchDays();
  }, [fetchDays]);

  const handleCreate = async () => {
    if (!formData.name.trim() || !formData.date) {
      setFormError("Name and date are required");
      return;
    }

    if (formData.date < today) {
      setFormError("Date can’t be in the past. Choose today or later.");
      return;
    }

    setSubmitting(true);
    setFormError(null);
    try {
      await apiClient.post(API_ENDPOINTS.ORGANIZER.DAYS(conferenceId), formData);
      setIsCreateOpen(false);
      setFormData({ name: "", date: "" });
      fetchDays();
    } catch (err: unknown) {
      setFormError(handleApiError(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async () => {
    if (!selectedDay) return;
    if (!formData.name.trim() || !formData.date) {
      setFormError("Name and date are required");
      return;
    }

    if (formData.date < today && formData.date !== selectedDay.date) {
      setFormError("Date can’t be in the past. Choose today or later.");
      return;
    }

    setSubmitting(true);
    setFormError(null);
    try {
      await apiClient.put(API_ENDPOINTS.ORGANIZER.DAY(conferenceId, selectedDay.id), formData);
      setIsEditOpen(false);
      setSelectedDay(null);
      setFormData({ name: "", date: "" });
      fetchDays();
    } catch (err: unknown) {
      setFormError(handleApiError(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (force = false) => {
    if (!selectedDay) return;

    setSubmitting(true);
    try {
      const url = force
        ? `${API_ENDPOINTS.ORGANIZER.DAY(conferenceId, selectedDay.id)}?force=true`
        : API_ENDPOINTS.ORGANIZER.DAY(conferenceId, selectedDay.id);

      await apiClient.delete(url);
      setIsDeleteOpen(false);
      setSelectedDay(null);
      setDeleteInfo(null);
      fetchDays();
    } catch (err: unknown) {
      const data = getErrorResponseData(err);
      const body = typeof data === "object" && data !== null ? (data as DeleteConfirmationBody) : undefined;
      if (body?.requiresConfirmation) {
        setDeleteInfo({
          sessionsCount: body.sessionsCount || 0,
          presentationsCount: body.presentationsCount || 0,
        });
        return;
      }
      setError(body?.message ?? handleApiError(err));
    } finally {
      setSubmitting(false);
    }
  };

  const openEditDialog = (day: Day) => {
    setSelectedDay(day);
    setFormData({ name: day.name, date: day.date });
    setFormError(null);
    setIsEditOpen(true);
  };

  const openDeleteDialog = (day: Day) => {
    setSelectedDay(day);
    setDeleteInfo(null);
    setIsDeleteOpen(true);
  };

  const openCreateDialog = () => {
    setFormData({ name: "", date: "" });
    setFormError(null);
    setIsCreateOpen(true);
  };

  if (!conferenceId || Number.isNaN(conferenceId)) {
    return <p className="text-sm text-red-500">Invalid conference ID.</p>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Days</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Define the days of your conference. Each day can contain multiple sessions.
          </p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="h-4 w-4 mr-2" />
          Add Day
        </Button>
      </div>

      {error && (
        <div className="rounded border border-destructive/50 bg-destructive/5 px-3 py-2 text-sm text-destructive flex items-center gap-2">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

        {/* Days List */}
        {loading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <Skeleton className="h-10 w-10 rounded" />
                    <div className="flex-1">
                      <Skeleton className="h-5 w-32" />
                      <Skeleton className="h-4 w-24 mt-1" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : days.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="font-semibold text-lg">No days defined</h3>
              <p className="text-muted-foreground text-sm mt-1 mb-4">
                Start by adding the first day of your conference
              </p>
              <Button onClick={openCreateDialog}>
                <Plus className="h-4 w-4 mr-2" />
                Add Day
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {days.map((day) => (
              <Card key={day.id} className="hover:shadow-sm transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center justify-center h-10 w-10 rounded bg-primary/10 text-primary">
                      <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold truncate">{day.name}</h3>
                        <Badge variant="secondary" className="text-xs">
                          {day.sessionsCount} session{day.sessionsCount !== 1 ? "s" : ""}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {new Date(day.date + "T00:00:00").toLocaleDateString(undefined, {
                          weekday: "long",
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditDialog(day)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openDeleteDialog(day)}
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
      {/* Create Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Day</DialogTitle>
            <DialogDescription>
              Create a new day for your conference schedule.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {formError && (
              <div className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded">
                {formError}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="name">Day Name</Label>
              <Input
                id="name"
                placeholder="e.g., Day 1, Workshop Day"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <DateInput
                value={formData.date}
                onChange={(v) => setFormData({ ...formData, date: v })}
                min={today}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={submitting}>
              {submitting ? "Creating..." : "Create Day"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Day</DialogTitle>
            <DialogDescription>
              Update the day name or date.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {formError && (
              <div className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded">
                {formError}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="edit-name">Day Name</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-date">Date</Label>
              <DateInput
                value={formData.date}
                onChange={(v) => setFormData({ ...formData, date: v })}
                min={selectedDay && selectedDay.date < today ? undefined : today}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdate} disabled={submitting}>
              {submitting ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Day</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteInfo ? (
                <>
                  This day contains {deleteInfo.sessionsCount} session(s) with{" "}
                  {deleteInfo.presentationsCount} presentation(s). Deleting it will
                  remove all associated data. This action cannot be undone.
                </>
              ) : (
                <>
                  Are you sure you want to delete &quot;{selectedDay?.name}&quot;? This
                  action cannot be undone.
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
