"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useParams } from "next/navigation";
import {
  getConferenceById,
  updateConference,
  openCfpWindow,
  closeCfpWindow,
  openRegistrationWindow,
  closeRegistrationWindow,
} from "@/features/conferences/api/conferencesApi";
import {
  listMilestones,
  createMilestone,
  updateMilestone,
  deleteMilestone,
} from "@/features/conferences/api/conferenceSetupApi";
import { Input } from "@/components/ui/input";
import { DateInput } from "@/components/ui/date-input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import UnsavedChangesBar from "@/components/shared/UnsavedChangesBar";
import { toast } from "sonner";
import { deadlinesSchema } from "@/lib/schemas";
import { GripVertical, Plus, Trash2 } from "lucide-react";

type MilestoneDraft = {
  id: number | string;
  name: string;
  date: string; // YYYY-MM-DD
  description: string;
  type?: string;
};

function isoFromDateOnly(dateOnly: string): string {
  // Use noon UTC to avoid timezone shifting when converting to/from ISO.
  return `${dateOnly}T12:00:00.000Z`;
}

function isoFromDateTimeLocal(dateTimeLocal: string): string {
  // Interpret the datetime-local value as local time, then convert to a timezone-safe ISO string.
  return new Date(dateTimeLocal).toISOString();
}

function dateTimeLocalFromISO(iso: string): string {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${y}-${m}-${day}T${hh}:${mm}`;
}

function nowLocalDateTimeValue(): string {
  return dateTimeLocalFromISO(new Date().toISOString());
}

function dateOnlyFromISO(iso: string): string {
  const d = new Date(iso);
  // Normalize to UTC date component.
  return d.toISOString().slice(0, 10);
}

function getTodayLocalISODate(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export default function DeadlinesPage() {
  const params = useParams();
  const conferenceId = Number(params?.id);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const [values, setValues] = useState({
    submissionsOpenFrom: "",
    submissionsOpenUntil: "",
    reviewStartsAt: "",
    reviewEndsAt: "",
    registrationOpenFrom: "",
    registrationOpenUntil: "",
  });

  const [initialSnapshot, setInitialSnapshot] = useState(values);

  const [milestones, setMilestones] = useState<MilestoneDraft[]>([]);
  const [initialMilestonesSnapshot, setInitialMilestonesSnapshot] = useState<MilestoneDraft[]>([]);
  const [deletedMilestoneIds, setDeletedMilestoneIds] = useState<Set<number>>(new Set());

  const today = useMemo(() => getTodayLocalISODate(), []);
  const nowLocal = useMemo(() => nowLocalDateTimeValue(), []);

  useEffect(() => {
    if (!conferenceId) return;
    setLoading(true);

    Promise.all([
      getConferenceById(conferenceId),
      listMilestones(conferenceId),
    ])
      .then(([data, ms]) => {
        const snapshot = {
          submissionsOpenFrom: data.submissionsOpenFrom ? dateTimeLocalFromISO(String(data.submissionsOpenFrom)) : "",
          submissionsOpenUntil: data.submissionsOpenUntil ? dateTimeLocalFromISO(String(data.submissionsOpenUntil)) : "",
          reviewStartsAt: data.reviewStartsAt ? dateTimeLocalFromISO(String(data.reviewStartsAt)) : "",
          reviewEndsAt: data.reviewEndsAt ? dateTimeLocalFromISO(String(data.reviewEndsAt)) : "",
          registrationOpenFrom: data.registrationOpenFrom ? dateTimeLocalFromISO(String(data.registrationOpenFrom)) : "",
          registrationOpenUntil: data.registrationOpenUntil ? dateTimeLocalFromISO(String(data.registrationOpenUntil)) : "",
        };

        const milestoneDrafts: MilestoneDraft[] = (ms || []).map((m) => ({
          id: m.id,
          name: m.name || "",
          date: dateOnlyFromISO(String(m.date)),
          description: (m.description as string | null) || "",
          type: (m.type as string | null) || undefined,
        }));

        setValues(snapshot);
        setInitialSnapshot(snapshot);
        setMilestones(milestoneDrafts);
        setInitialMilestonesSnapshot(milestoneDrafts);
        setDeletedMilestoneIds(new Set());
      })
      .catch((e: unknown) => {
        const message = e instanceof Error ? e.message : "Failed to load deadlines";
        setError(message);
      })
      .finally(() => setLoading(false));
  }, [conferenceId]);

  const handleChange = useCallback((field: string, value: string) => {
    setValues((prev) => ({ ...prev, [field]: value }));
  }, []);

  const hasChanges = useMemo(
    () => {
      const coreChanged = JSON.stringify(values) !== JSON.stringify(initialSnapshot);
      const milestonesChanged = JSON.stringify(milestones) !== JSON.stringify(initialMilestonesSnapshot);
      const deletionsChanged = deletedMilestoneIds.size > 0;
      return coreChanged || milestonesChanged || deletionsChanged;
    },
    [values, initialSnapshot, milestones, initialMilestonesSnapshot, deletedMilestoneIds]
  );

  const undoAll = useCallback(() => {
    setValues(initialSnapshot);
    setMilestones(initialMilestonesSnapshot);
    setDeletedMilestoneIds(new Set());
  }, [initialSnapshot, initialMilestonesSnapshot]);

  const addMilestone = useCallback(() => {
    const today = new Date().toISOString().slice(0, 10);
    setMilestones((prev) => [
      ...prev,
      { id: `new-${Date.now()}`, name: "", date: today, description: "" },
    ]);
  }, []);

  const updateMilestoneDraft = useCallback((id: number | string, field: keyof MilestoneDraft, value: string) => {
    setMilestones((prev) => prev.map((m) => (m.id === id ? { ...m, [field]: value } : m)));
  }, []);

  const removeMilestoneDraft = useCallback((id: number | string) => {
    setMilestones((prev) => prev.filter((m) => m.id !== id));
    if (typeof id === "number") {
      setDeletedMilestoneIds((prev) => {
        const next = new Set(prev);
        next.add(id);
        return next;
      });
    }
  }, []);

  const onSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setError(undefined);
    setFieldErrors({});

    // Derived validations (no silent correction):
    // - No new past dates (allow unchanged existing past values)
    // - End/close >= start/open
    const derivedErrors: Record<string, string> = {};
    const fieldsToCheck = [
      "submissionsOpenFrom",
      "submissionsOpenUntil",
      "reviewStartsAt",
      "reviewEndsAt",
      "registrationOpenFrom",
      "registrationOpenUntil",
    ] as const;
    for (const f of fieldsToCheck) {
      const v = values[f];
      const initial = initialSnapshot[f];
      if (v && v !== initial) {
        const parsed = new Date(v);
        if (Number.isNaN(parsed.getTime())) {
          derivedErrors[f] = "Please enter a valid date and time.";
        } else if (parsed.getTime() < Date.now()) {
          derivedErrors[f] = "Date/time can’t be in the past. Choose now or later.";
        }
      }
    }
    if (
      values.submissionsOpenFrom &&
      values.submissionsOpenUntil &&
      new Date(values.submissionsOpenUntil).getTime() < new Date(values.submissionsOpenFrom).getTime()
    ) {
      derivedErrors.submissionsOpenUntil = "Close date can’t be before the open date.";
    }
    if (
      values.reviewStartsAt &&
      values.reviewEndsAt &&
      new Date(values.reviewEndsAt).getTime() < new Date(values.reviewStartsAt).getTime()
    ) {
      derivedErrors.reviewEndsAt = "End date can’t be before the start date.";
    }
    if (
      values.registrationOpenFrom &&
      values.registrationOpenUntil &&
      new Date(values.registrationOpenUntil).getTime() < new Date(values.registrationOpenFrom).getTime()
    ) {
      derivedErrors.registrationOpenUntil = "Close date can’t be before the open date.";
    }

    // Validate form
    const validation = deadlinesSchema.safeParse(values);
    if (!validation.success) {
      const errors: Record<string, string> = {};
      validation.error.errors.forEach((err) => {
        if (err.path[0]) {
          errors[err.path[0] as string] = err.message;
        }
      });
      setFieldErrors({ ...errors, ...derivedErrors });
      setError("Please correct the highlighted date ranges");
      return;
    }

    if (Object.keys(derivedErrors).length > 0) {
      setFieldErrors(derivedErrors);
      setError("Please correct the highlighted date ranges");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        submissionsOpenFrom: values.submissionsOpenFrom ? isoFromDateTimeLocal(values.submissionsOpenFrom) : null,
        submissionsOpenUntil: values.submissionsOpenUntil ? isoFromDateTimeLocal(values.submissionsOpenUntil) : null,
        reviewStartsAt: values.reviewStartsAt ? isoFromDateTimeLocal(values.reviewStartsAt) : null,
        reviewEndsAt: values.reviewEndsAt ? isoFromDateTimeLocal(values.reviewEndsAt) : null,
        registrationOpenFrom: values.registrationOpenFrom ? isoFromDateTimeLocal(values.registrationOpenFrom) : null,
        registrationOpenUntil: values.registrationOpenUntil ? isoFromDateTimeLocal(values.registrationOpenUntil) : null,
      };

      // 1) Save core system windows
      await updateConference(conferenceId, payload);

      // 2) Apply milestone deletions
      const deletions = Array.from(deletedMilestoneIds);
      for (const milestoneId of deletions) {
        await deleteMilestone(conferenceId, milestoneId);
      }

      // 3) Upsert milestones (create new, update existing)
      for (const m of milestones) {
        if (!m.name.trim()) continue; // ignore empty rows
        if (!m.date) continue;
        const milestonePayload = {
          name: m.name.trim(),
          date: isoFromDateOnly(m.date),
          description: m.description?.trim() || undefined,
          type: m.type?.trim() || undefined,
        };
        if (typeof m.id === "string") {
          await createMilestone(conferenceId, milestonePayload);
        } else {
          await updateMilestone(conferenceId, m.id, milestonePayload);
        }
      }

      // 4) Reload milestones for clean state + IDs
      const ms = await listMilestones(conferenceId);
      const milestoneDrafts: MilestoneDraft[] = (ms || []).map((x) => ({
        id: x.id,
        name: x.name || "",
        date: dateOnlyFromISO(String(x.date)),
        description: (x.description as string | null) || "",
        type: (x.type as string | null) || undefined,
      }));

      toast.success("Timeline updated");
      setInitialSnapshot(values);
      setMilestones(milestoneDrafts);
      setInitialMilestonesSnapshot(milestoneDrafts);
      setDeletedMilestoneIds(new Set());
      setFieldErrors({});
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Failed to save";
      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const handleQuickAction = async (action: "openCfp" | "closeCfp" | "openReg" | "closeReg") => {
    try {
      setSaving(true);
      if (action === "openCfp") await openCfpWindow(conferenceId);
      else if (action === "closeCfp") await closeCfpWindow(conferenceId);
      else if (action === "openReg") await openRegistrationWindow(conferenceId);
      else if (action === "closeReg") await closeRegistrationWindow(conferenceId);

      toast.success("Updated successfully");
      // Reload data
      const data = await getConferenceById(conferenceId);
      const snapshot = {
        submissionsOpenFrom: data.submissionsOpenFrom ? dateTimeLocalFromISO(String(data.submissionsOpenFrom)) : "",
        submissionsOpenUntil: data.submissionsOpenUntil ? dateTimeLocalFromISO(String(data.submissionsOpenUntil)) : "",
        reviewStartsAt: data.reviewStartsAt ? dateTimeLocalFromISO(String(data.reviewStartsAt)) : "",
        reviewEndsAt: data.reviewEndsAt ? dateTimeLocalFromISO(String(data.reviewEndsAt)) : "",
        registrationOpenFrom: data.registrationOpenFrom ? dateTimeLocalFromISO(String(data.registrationOpenFrom)) : "",
        registrationOpenUntil: data.registrationOpenUntil ? dateTimeLocalFromISO(String(data.registrationOpenUntil)) : "",
      };
      setValues(snapshot);
      setInitialSnapshot(snapshot);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Action failed";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  if (!conferenceId) return null;
  if (loading) return <p className="text-muted-foreground">Loading…</p>;

  return (
    <section className="space-y-10">
      {/* HEADER */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Key Dates & Deadlines</h1>
        <p className="text-muted-foreground">
          System windows control platform behavior. Timeline milestones communicate dates to authors.
        </p>
      </div>

      {/* INFO BANNER */}
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
        <p className="text-sm text-blue-900">
          <strong>Note:</strong> Submission window can also be configured in <strong>Abstracts → Submission Dates & Limits</strong>. Registration window can also be configured in <strong>Registration → Settings</strong>.
        </p>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <form onSubmit={onSubmit} className="space-y-10">
        {/* CFP WINDOW */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Call for Papers (CFP)</h2>
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={saving}
                onClick={() => handleQuickAction("openCfp")}
              >
                Open Now
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={saving}
                onClick={() => handleQuickAction("closeCfp")}
              >
                Close Now
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex flex-col space-y-2">
              <Label>Submissions Open From</Label>
              <Input
                type="datetime-local"
                value={values.submissionsOpenFrom}
                onChange={(e) => handleChange("submissionsOpenFrom", e.target.value)}
                min={
                  initialSnapshot.submissionsOpenFrom &&
                  new Date(initialSnapshot.submissionsOpenFrom).getTime() < Date.now()
                    ? undefined
                    : nowLocal
                }
                aria-invalid={!!fieldErrors.submissionsOpenFrom}
                className={fieldErrors.submissionsOpenFrom ? "border-destructive" : ""}
              />
              {fieldErrors.submissionsOpenFrom ? (
                <p className="text-xs text-destructive">{fieldErrors.submissionsOpenFrom}</p>
              ) : (
                <p className="text-xs text-muted-foreground">When authors can start submitting</p>
              )}
            </div>

            <div className="flex flex-col space-y-2">
              <Label>Submissions Close At</Label>
              <Input
                type="datetime-local"
                value={values.submissionsOpenUntil}
                onChange={(e) => handleChange("submissionsOpenUntil", e.target.value)}
                min={(() => {
                  if (
                    initialSnapshot.submissionsOpenUntil &&
                    new Date(initialSnapshot.submissionsOpenUntil).getTime() < Date.now()
                  ) {
                    return undefined;
                  }
                  const start = values.submissionsOpenFrom;
                  if (start) {
                    const startTime = new Date(start).getTime();
                    const nowTime = Date.now();
                    return startTime > nowTime ? start : nowLocal;
                  }
                  return nowLocal;
                })()}
                aria-invalid={!!fieldErrors.submissionsOpenUntil}
                className={fieldErrors.submissionsOpenUntil ? "border-destructive" : ""}
              />
              {fieldErrors.submissionsOpenUntil ? (
                <p className="text-xs text-destructive">{fieldErrors.submissionsOpenUntil}</p>
              ) : (
                <p className="text-xs text-muted-foreground">Last date for new submissions</p>
              )}
            </div>
          </div>
        </div>

        <Separator />

        {/* REVIEW WINDOW */}
        <div className="space-y-6">
          <h2 className="text-xl font-semibold">Review Period</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex flex-col space-y-2">
              <Label>Review Starts</Label>
              <Input
                type="datetime-local"
                value={values.reviewStartsAt}
                onChange={(e) => handleChange("reviewStartsAt", e.target.value)}
                min={
                  initialSnapshot.reviewStartsAt && new Date(initialSnapshot.reviewStartsAt).getTime() < Date.now()
                    ? undefined
                    : nowLocal
                }
                aria-invalid={!!fieldErrors.reviewStartsAt}
                className={fieldErrors.reviewStartsAt ? "border-destructive" : ""}
              />
              {fieldErrors.reviewStartsAt ? (
                <p className="text-xs text-destructive">{fieldErrors.reviewStartsAt}</p>
              ) : (
                <p className="text-xs text-muted-foreground">When reviewers can start</p>
              )}
            </div>

            <div className="flex flex-col space-y-2">
              <Label>Review Ends</Label>
              <Input
                type="datetime-local"
                value={values.reviewEndsAt}
                onChange={(e) => handleChange("reviewEndsAt", e.target.value)}
                min={(() => {
                  if (initialSnapshot.reviewEndsAt && new Date(initialSnapshot.reviewEndsAt).getTime() < Date.now()) {
                    return undefined;
                  }
                  const start = values.reviewStartsAt;
                  if (start) {
                    const startTime = new Date(start).getTime();
                    const nowTime = Date.now();
                    return startTime > nowTime ? start : nowLocal;
                  }
                  return nowLocal;
                })()}
                aria-invalid={!!fieldErrors.reviewEndsAt}
                className={fieldErrors.reviewEndsAt ? "border-destructive" : ""}
              />
              {fieldErrors.reviewEndsAt ? (
                <p className="text-xs text-destructive">{fieldErrors.reviewEndsAt}</p>
              ) : (
                <p className="text-xs text-muted-foreground">Review deadline</p>
              )}
            </div>
          </div>
        </div>

        <Separator />

        {/* REGISTRATION WINDOW */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Registration</h2>
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={saving}
                onClick={() => handleQuickAction("openReg")}
              >
                Open Now
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={saving}
                onClick={() => handleQuickAction("closeReg")}
              >
                Close Now
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex flex-col space-y-2">
              <Label>Registration Opens</Label>
              <Input
                type="datetime-local"
                value={values.registrationOpenFrom}
                onChange={(e) => handleChange("registrationOpenFrom", e.target.value)}
                min={
                  initialSnapshot.registrationOpenFrom &&
                  new Date(initialSnapshot.registrationOpenFrom).getTime() < Date.now()
                    ? undefined
                    : nowLocal
                }
                aria-invalid={!!fieldErrors.registrationOpenFrom}
                className={fieldErrors.registrationOpenFrom ? "border-destructive" : ""}
              />
              {fieldErrors.registrationOpenFrom ? (
                <p className="text-xs text-destructive">{fieldErrors.registrationOpenFrom}</p>
              ) : (
                <p className="text-xs text-muted-foreground">When attendees can register</p>
              )}
            </div>

            <div className="flex flex-col space-y-2">
              <Label>Registration Closes</Label>
              <Input
                type="datetime-local"
                value={values.registrationOpenUntil}
                onChange={(e) => handleChange("registrationOpenUntil", e.target.value)}
                min={(() => {
                  if (
                    initialSnapshot.registrationOpenUntil &&
                    new Date(initialSnapshot.registrationOpenUntil).getTime() < Date.now()
                  ) {
                    return undefined;
                  }
                  const start = values.registrationOpenFrom;
                  if (start) {
                    const startTime = new Date(start).getTime();
                    const nowTime = Date.now();
                    return startTime > nowTime ? start : nowLocal;
                  }
                  return nowLocal;
                })()}
                aria-invalid={!!fieldErrors.registrationOpenUntil}
                className={fieldErrors.registrationOpenUntil ? "border-destructive" : ""}
              />
              {fieldErrors.registrationOpenUntil ? (
                <p className="text-xs text-destructive">{fieldErrors.registrationOpenUntil}</p>
              ) : (
                <p className="text-xs text-muted-foreground">Last date to register</p>
              )}
            </div>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GripVertical className="h-5 w-5" />
              Additional Deadlines
            </CardTitle>
            <CardDescription>
              These show up on the public conference page as part of “Important Dates”. Sorted chronologically by date.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {milestones.length === 0 ? (
              <p className="text-sm text-muted-foreground">No milestones yet. Add dates like “Camera-ready deadline”.</p>
            ) : (
              <div className="space-y-4">
                {milestones.map((m) => (
                  <div
                    key={String(m.id)}
                    className="flex gap-3 items-start p-4 border rounded-lg bg-muted/30"
                  >
                    {/* Drag Handle (future-proof, visual only) */}
                    <GripVertical className="h-5 w-5 text-muted-foreground mt-2 cursor-grab" />
                
                    <div className="flex-1 space-y-4">
                      {/* Label + Date */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <Input
                          placeholder="Label (e.g., Camera-ready deadline)"
                          value={m.name}
                          onChange={(e) =>
                            updateMilestoneDraft(m.id, "name", e.target.value)
                          }
                          className="border rounded-sm"
                        />
        
                        <DateInput
                          value={m.date}
                          onChange={(v) => updateMilestoneDraft(m.id, "date", v)}
                          min={(() => {
                            const initial = initialMilestonesSnapshot.find((x) => x.id === m.id)?.date;
                            if (initial && initial < today) return undefined;
                            return today;
                          })()}
                          className="border rounded-sm"
                        />
                      </div>
                        
                      {/* Optional Note */}
                      <Input
                        placeholder="Note (optional, e.g., 'NO EXTENSIONS')"
                        value={m.description}
                        onChange={(e) =>
                          updateMilestoneDraft(m.id, "description", e.target.value)
                        }
                        className="border rounded-sm"
                      />
                    </div>
                      
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="text-destructive"
                      onClick={() => removeMilestoneDraft(m.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            <Button type="button" variant="outline" onClick={addMilestone}>
              <Plus className="h-4 w-4 mr-2" />
              Add Milestone
            </Button>
          </CardContent>
        </Card>

        <UnsavedChangesBar visible={hasChanges} saving={saving} onUndoAll={undoAll} onSave={onSubmit} />

        <div className="flex justify-end">
          <Button type="submit" disabled={saving} className="px-6">
            {saving ? "Saving…" : "Save Changes"}
          </Button>
        </div>
      </form>
    </section>
  );
}
