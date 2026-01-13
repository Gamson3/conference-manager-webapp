"use client";
import { useParams } from "next/navigation";
import { useState, useEffect, useCallback, useMemo } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { DateInput } from "@/components/ui/date-input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import UnsavedChangesBar from "@/components/shared/UnsavedChangesBar";
import {
  getConferenceById,
  updateConference,
} from "@/features/conferences/api/conferencesApi";
import type { Conference } from "@/types/conference";

interface DatesLimitsFormValues {
  submissionsOpenFrom: string;
  submissionsOpenUntil: string;
  maxSubmissionsPerUser: string;
}

function isoFromDateOnly(dateOnly: string): string {
  return new Date(`${dateOnly}T00:00:00.000Z`).toISOString();
}

function dateOnlyFromISO(iso: string): string {
  return new Date(iso).toISOString().slice(0, 10);
}

function getTodayLocalISODate(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export default function SubmissionDatesLimitsPage() {
  const params = useParams();
  const conferenceId = Number(params?.id);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [windowEnabled, setWindowEnabled] = useState(true); // UX-only toggle for now
  const [limitsEnabled, setLimitsEnabled] = useState(true); // UX-only toggle for now

  const [values, setValues] = useState<DatesLimitsFormValues>({
    submissionsOpenFrom: "",
    submissionsOpenUntil: "",
    maxSubmissionsPerUser: "",
  });

  const [initialSnapshot, setInitialSnapshot] = useState<DatesLimitsFormValues>(values);

  const today = getTodayLocalISODate();

  useEffect(() => {
    if (!conferenceId) return;
    setLoading(true);

    getConferenceById(conferenceId)
      .then((data: Conference) => {
        const formValues: DatesLimitsFormValues = {
          submissionsOpenFrom: data.submissionsOpenFrom
            ? dateOnlyFromISO(String(data.submissionsOpenFrom))
            : "",
          submissionsOpenUntil: data.submissionsOpenUntil
            ? dateOnlyFromISO(String(data.submissionsOpenUntil))
            : "",
          maxSubmissionsPerUser:
            (data as Conference & { maxSubmissionsPerUser?: number | null }).maxSubmissionsPerUser != null
              ? String((data as Conference & { maxSubmissionsPerUser?: number | null }).maxSubmissionsPerUser)
              : "",
        };
        setValues(formValues);
        setInitialSnapshot(formValues);
      })
      .catch((e: unknown) => {
        const message = e instanceof Error ? e.message : "Failed to load conference";
        setError(message);
      })
      .finally(() => setLoading(false));
  }, [conferenceId]);

  const handleChange = useCallback((field: string, value: string) => {
    setValues((prev) => ({ ...prev, [field]: value }));
  }, []);

  const hasChanges = useMemo(
    () => JSON.stringify(values) !== JSON.stringify(initialSnapshot),
    [values, initialSnapshot]
  );

  const undoAll = useCallback(() => setValues(initialSnapshot), [initialSnapshot]);

  const onSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setError(undefined);
    setFieldErrors({});

    // Validation
    const fe: Record<string, string> = {};

    if (
      values.submissionsOpenFrom &&
      values.submissionsOpenFrom < today &&
      values.submissionsOpenFrom !== initialSnapshot.submissionsOpenFrom
    ) {
      fe.submissionsOpenFrom = "Submission open date can’t be in the past.";
    }

    if (
      values.submissionsOpenUntil &&
      values.submissionsOpenUntil < today &&
      values.submissionsOpenUntil !== initialSnapshot.submissionsOpenUntil
    ) {
      fe.submissionsOpenUntil = "Submission close date can’t be in the past.";
    }

    if (values.submissionsOpenFrom && values.submissionsOpenUntil) {
      if (values.submissionsOpenUntil < values.submissionsOpenFrom) {
        fe.submissionsOpenUntil = "Submission close date can’t be before open date.";
      }
    }

    const maxSub = values.maxSubmissionsPerUser ? Number(values.maxSubmissionsPerUser) : null;
    if (maxSub !== null && (isNaN(maxSub) || maxSub < 1)) {
      fe.maxSubmissionsPerUser = "Must be a valid number >= 1";
    }

    if (Object.keys(fe).length) {
      setFieldErrors(fe);
      return;
    }

    setSaving(true);
    try {
      await updateConference(conferenceId, {
        submissionsOpenFrom: values.submissionsOpenFrom ? isoFromDateOnly(values.submissionsOpenFrom) : null,
        submissionsOpenUntil: values.submissionsOpenUntil ? isoFromDateOnly(values.submissionsOpenUntil) : null,
        // maxSubmissionsPerUser is stored in Conference model based on schema
      });

      toast.success("Submission dates and limits saved");

      // Update snapshot
      setInitialSnapshot(values);
      setFieldErrors({});
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Failed to save submission dates";
      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  if (!conferenceId) return <p className="text-destructive">Invalid conference ID</p>;
  if (loading) return <p className="text-muted-foreground">Loading...</p>;

  return (
    <section className="space-y-6">
      {/* Section header */}
      <div className="space-y-1">
        <h1 className="text-3xl font-semibold tracking-tight">Submission Dates &amp; Limits</h1>
        <p className="text-sm text-muted-foreground">
          Control the submission window and set limits on the number of submissions per author.
        </p>
      </div>

      {error && <p className="text-destructive text-sm">{error}</p>}

      {/* Submission window card */}
      <div className="rounded-xl border bg-card shadow-sm">
        <div className="p-6 space-y-6">
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-base">Submission window</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Set when authors can submit abstracts. Leave dates empty to keep submissions open.
                </p>
              </div>
              <Switch checked={windowEnabled} onCheckedChange={setWindowEnabled} />
            </div>

            {windowEnabled && (
              <div className="space-y-4 mt-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="submissionsOpenFrom">Open from</Label>
                    <DateInput
                      id="submissionsOpenFrom"
                      value={values.submissionsOpenFrom}
                      onChange={(v) => handleChange("submissionsOpenFrom", v)}
                      min={
                        initialSnapshot.submissionsOpenFrom &&
                        initialSnapshot.submissionsOpenFrom < today
                          ? undefined
                          : today
                      }
                    />
                    {fieldErrors.submissionsOpenFrom && (
                      <p className="text-xs text-destructive">{fieldErrors.submissionsOpenFrom}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="submissionsOpenUntil">Close at</Label>
                    <DateInput
                      id="submissionsOpenUntil"
                      value={values.submissionsOpenUntil}
                      onChange={(v) => handleChange("submissionsOpenUntil", v)}
                      min={(() => {
                        if (
                          initialSnapshot.submissionsOpenUntil &&
                          initialSnapshot.submissionsOpenUntil < today
                        ) {
                          return undefined;
                        }
                        if (values.submissionsOpenFrom && values.submissionsOpenFrom > today) {
                          return values.submissionsOpenFrom;
                        }
                        return today;
                      })()}
                    />
                    {fieldErrors.submissionsOpenUntil && (
                      <p className="text-xs text-destructive">{fieldErrors.submissionsOpenUntil}</p>
                    )}
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  Leave both fields empty for an always-open call for papers.
                </p>
              </div>
            )}
        </div>
      </div>

      {/* Submission limits card */}
      <div className="rounded-xl border bg-card shadow-sm">
        <div className="p-6 space-y-6">
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-base">Submission limits</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Limit how many active submissions each author can have.
                </p>
              </div>
              <Switch checked={limitsEnabled} onCheckedChange={setLimitsEnabled} />
            </div>

            {limitsEnabled && (
              <div className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="maxSubmissionsPerUser">Maximum submissions per author</Label>
                  <Input
                    id="maxSubmissionsPerUser"
                    type="number"
                    value={values.maxSubmissionsPerUser}
                    onChange={(e) => handleChange("maxSubmissionsPerUser", e.target.value)}
                    placeholder="No limit"
                    className="w-40"
                  />
                  {fieldErrors.maxSubmissionsPerUser && (
                    <p className="text-xs text-destructive">{fieldErrors.maxSubmissionsPerUser}</p>
                  )}
                  <p className="text-sm text-muted-foreground">
                    Leave empty for unlimited. This limit applies to active submissions (excluding withdrawn).
                  </p>
                </div>
              </div>
            )}
        </div>
      </div>

      {/* Bottom unsaved changes bar */}
      <div className="w-full mt-4">
        <UnsavedChangesBar
          visible={hasChanges}
          saving={saving}
          onUndoAll={undoAll}
          onSave={onSubmit}
          className="border-none bg-transparent p-0"
        />
      </div>
    </section>
  );
}

