"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import apiClient, { handleApiError } from "@/lib/api/client";
import { API_ENDPOINTS } from "@/lib/api/endpoints";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import UnsavedChangesBar from "@/components/shared/UnsavedChangesBar";
import {
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  PlayCircle,
  PauseCircle,
  CalendarCheck,
  CalendarX,
  Timer,
} from "lucide-react";
import { toast } from "sonner";

interface DeadlineSettings {
  registrationOpenFrom: string | null;
  registrationOpenUntil: string | null;
  registrationEnabled: boolean;
}

type DeadlineDateFieldKey = "registrationOpenFrom" | "registrationOpenUntil";

function isoFromDateTimeLocal(dateTimeLocal: string): string {
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

function hasFormChanges(next: Record<DeadlineDateFieldKey, string>, baseline: Record<DeadlineDateFieldKey, string> | null): boolean {
  if (!baseline) return true;
  return (Object.keys(next) as DeadlineDateFieldKey[]).some((k) => next[k] !== baseline[k]);
}

export default function RegistrationDeadlinesPage() {
  const params = useParams();
  const conferenceId = Number(params?.id);

  const [settings, setSettings] = useState<DeadlineSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<DeadlineDateFieldKey, string>>>({});
  const [initialSnapshot, setInitialSnapshot] = useState<Record<DeadlineDateFieldKey, string> | null>(null);

  const nowLocal = nowLocalDateTimeValue();

  const [formValues, setFormValues] = useState({
    registrationOpenFrom: "",
    registrationOpenUntil: "",
  });

  const fetchSettings = useCallback(async () => {
    if (!conferenceId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get(API_ENDPOINTS.ORGANIZER.REGISTRATION_SETTINGS(conferenceId));
      setSettings(res.data);
      const nextValues = {
        registrationOpenFrom: res.data.registrationOpenFrom
          ? dateTimeLocalFromISO(String(res.data.registrationOpenFrom))
          : "",
        registrationOpenUntil: res.data.registrationOpenUntil
          ? dateTimeLocalFromISO(String(res.data.registrationOpenUntil))
          : "",
      };
      setFormValues(nextValues);
      setInitialSnapshot(nextValues);
      setFieldErrors({});
      setHasChanges(false);
    } catch (err) {
      setError(handleApiError(err));
    } finally {
      setLoading(false);
    }
  }, [conferenceId]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const updateFormValue = (key: DeadlineDateFieldKey, value: string) => {
    setFormValues((prev) => {
      const next = { ...prev, [key]: value } as Record<DeadlineDateFieldKey, string>;
      setHasChanges(hasFormChanges(next, initialSnapshot));
      return next;
    });
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const handleSave = async () => {
    const fe: Partial<Record<DeadlineDateFieldKey, string>> = {};

    const now = new Date();

    const openFromDate = formValues.registrationOpenFrom ? new Date(formValues.registrationOpenFrom) : null;
    const openUntilDate = formValues.registrationOpenUntil ? new Date(formValues.registrationOpenUntil) : null;

    if (openFromDate && Number.isNaN(openFromDate.getTime())) {
      fe.registrationOpenFrom = "Registration open date/time must be valid.";
    }
    if (openUntilDate && Number.isNaN(openUntilDate.getTime())) {
      fe.registrationOpenUntil = "Registration close date/time must be valid.";
    }

    if (
      formValues.registrationOpenFrom &&
      openFromDate !== null &&
      !Number.isNaN(openFromDate.getTime()) &&
      openFromDate.getTime() < now.getTime() &&
      formValues.registrationOpenFrom !== (initialSnapshot?.registrationOpenFrom ?? "")
    ) {
      fe.registrationOpenFrom = "Registration open date/time can’t be in the past.";
    }

    if (
      formValues.registrationOpenUntil &&
      openUntilDate !== null &&
      !Number.isNaN(openUntilDate.getTime()) &&
      openUntilDate.getTime() < now.getTime() &&
      formValues.registrationOpenUntil !== (initialSnapshot?.registrationOpenUntil ?? "")
    ) {
      fe.registrationOpenUntil = "Registration close date/time can’t be in the past.";
    }

    if (formValues.registrationOpenFrom && formValues.registrationOpenUntil) {
      if (
        openFromDate &&
        openUntilDate &&
        !Number.isNaN(openFromDate.getTime()) &&
        !Number.isNaN(openUntilDate.getTime()) &&
        openUntilDate.getTime() < openFromDate.getTime()
      ) {
        fe.registrationOpenUntil = "Registration close date/time can’t be before open date/time.";
      }
    }

    if (Object.keys(fe).length > 0) {
      setFieldErrors(fe);
      toast.error("Please fix the highlighted date fields.");
      return;
    }

    setSaving(true);
    try {
      await apiClient.put(API_ENDPOINTS.ORGANIZER.REGISTRATION_SETTINGS(conferenceId), {
        registrationOpenFrom: formValues.registrationOpenFrom
          ? isoFromDateTimeLocal(formValues.registrationOpenFrom)
          : null,
        registrationOpenUntil: formValues.registrationOpenUntil
          ? isoFromDateTimeLocal(formValues.registrationOpenUntil)
          : null,
      });
      toast.success("Deadlines saved successfully");
      setHasChanges(false);
      setFieldErrors({});
      fetchSettings();
    } catch (err) {
      toast.error(handleApiError(err));
    } finally {
      setSaving(false);
    }
  };

  const getWindowStatus = () => {
    if (!settings) return null;
    const now = new Date();
    const openFrom = formValues.registrationOpenFrom ? new Date(formValues.registrationOpenFrom) : null;
    const openUntil = formValues.registrationOpenUntil ? new Date(formValues.registrationOpenUntil) : null;

    if (!settings.registrationEnabled) {
      return { status: "disabled", label: "Registration Disabled", color: "bg-gray-500/10 text-gray-500", icon: PauseCircle };
    }
    if (openFrom && openFrom > now) {
      return { status: "scheduled", label: "Scheduled to Open", color: "bg-blue-500/10 text-blue-500", icon: Clock };
    }
    if (openUntil && openUntil < now) {
      return { status: "closed", label: "Registration Closed", color: "bg-red-500/10 text-red-500", icon: CalendarX };
    }
    return { status: "open", label: "Registration Open", color: "bg-green-500/10 text-green-500", icon: CheckCircle2 };
  };

  const getTimeUntil = (dateString: string | null) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    const now = new Date();
    const diff = date.getTime() - now.getTime();
    
    if (diff < 0) return "Past";
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h`;
    return "< 1h";
  };

  const formatDisplayDate = (dateString: string | null) => {
    if (!dateString) return "Not set";
    return new Date(dateString).toLocaleString(undefined, {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (!conferenceId) return null;

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-6 md:grid-cols-2">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      </div>
    );
  }

  const windowStatus = getWindowStatus();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold">Registration Deadlines</h1>
            {windowStatus && (
              <Badge className={windowStatus.color}>
                <windowStatus.icon className="h-3 w-3 mr-1" />
                {windowStatus.label}
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground mt-1">
            Manage when registration opens and closes.
          </p>
        </div>
      </div>

      {error && (
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              <p>{error}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Timeline Visual */}
      <Card className="overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent">
          <CardTitle className="flex items-center gap-2">
            <Timer className="h-5 w-5" />
            Registration Timeline
          </CardTitle>
          <CardDescription>Visual overview of your registration schedule</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="relative">
            {/* Timeline Line */}
            <div className="absolute top-6 left-6 right-6 h-1 bg-muted rounded-full" />
            
            {/* Timeline Points */}
            <div className="relative flex justify-between items-start">
              {/* Opening */}
              <div className="flex flex-col items-center z-10">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                  formValues.registrationOpenFrom 
                    ? "bg-green-500/20 text-green-500" 
                    : "bg-muted text-muted-foreground"
                }`}>
                  <PlayCircle className="h-6 w-6" />
                </div>
                <p className="text-sm font-medium mt-2">Opens</p>
                <p className="text-xs text-muted-foreground mt-1 text-center max-w-[120px]">
                  {formValues.registrationOpenFrom
                    ? new Date(formValues.registrationOpenFrom).toLocaleString(undefined, {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "Not set"}
                </p>
                {formValues.registrationOpenFrom && (
                  <Badge variant="secondary" className="mt-1 text-xs">
                    {getTimeUntil(formValues.registrationOpenFrom)}
                  </Badge>
                )}
              </div>

              {/* Closing */}
              <div className="flex flex-col items-center z-10">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                  formValues.registrationOpenUntil 
                    ? "bg-red-500/20 text-red-500" 
                    : "bg-muted text-muted-foreground"
                }`}>
                  <PauseCircle className="h-6 w-6" />
                </div>
                <p className="text-sm font-medium mt-2">Closes</p>
                <p className="text-xs text-muted-foreground mt-1 text-center max-w-[120px]">
                  {formValues.registrationOpenUntil
                    ? new Date(formValues.registrationOpenUntil).toLocaleString(undefined, {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "Not set"}
                </p>
                {formValues.registrationOpenUntil && (
                  <Badge variant="secondary" className="mt-1 text-xs">
                    {getTimeUntil(formValues.registrationOpenUntil)}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Deadline Cards */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Registration Opens */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <CalendarCheck className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <CardTitle className="text-base">Registration Opens</CardTitle>
                <CardDescription>When users can start registering</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="openFrom">Date/Time</Label>
              <Input
                id="openFrom"
                type="datetime-local"
                value={formValues.registrationOpenFrom}
                onChange={(e) => updateFormValue("registrationOpenFrom", e.target.value)}
                min={(() => {
                  const snap = initialSnapshot?.registrationOpenFrom ?? "";
                  if (snap && snap < nowLocal) return undefined;
                  return nowLocal;
                })()}
                className={fieldErrors.registrationOpenFrom ? "border-destructive focus-visible:ring-destructive" : undefined}
              />
              {fieldErrors.registrationOpenFrom && (
                <p className="text-xs text-destructive">{fieldErrors.registrationOpenFrom}</p>
              )}
            </div>
            <div className="p-3 rounded-lg bg-muted/50">
              <p className="text-sm text-muted-foreground">
                {formatDisplayDate(formValues.registrationOpenFrom)}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Registration Closes */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-500/10">
                <CalendarX className="h-5 w-5 text-red-500" />
              </div>
              <div>
                <CardTitle className="text-base">Registration Closes</CardTitle>
                <CardDescription>Last day to register</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="openUntil">Date/Time</Label>
              <Input
                id="openUntil"
                type="datetime-local"
                value={formValues.registrationOpenUntil}
                onChange={(e) => updateFormValue("registrationOpenUntil", e.target.value)}
                min={(() => {
                  const snap = initialSnapshot?.registrationOpenUntil ?? "";
                  if (snap && snap < nowLocal) return undefined;
                  if (formValues.registrationOpenFrom && formValues.registrationOpenFrom > nowLocal) {
                    return formValues.registrationOpenFrom;
                  }
                  return nowLocal;
                })()}
                className={fieldErrors.registrationOpenUntil ? "border-destructive focus-visible:ring-destructive" : undefined}
              />
              {fieldErrors.registrationOpenUntil && (
                <p className="text-xs text-destructive">{fieldErrors.registrationOpenUntil}</p>
              )}
            </div>
            <div className="p-3 rounded-lg bg-muted/50">
              <p className="text-sm text-muted-foreground">
                {formatDisplayDate(formValues.registrationOpenUntil)}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common deadline presets</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button
              variant="outline"
              onClick={() => {
                updateFormValue("registrationOpenFrom", nowLocalDateTimeValue());
                toast.success("Registration set to open now");
              }}
            >
              <PlayCircle className="h-4 w-4 mr-2" />
              Open Now
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                const d = new Date();
                d.setDate(d.getDate() + 7);
                updateFormValue("registrationOpenUntil", dateTimeLocalFromISO(d.toISOString()));
                toast.success("Registration set to close in 1 week");
              }}
            >
              <Clock className="h-4 w-4 mr-2" />
              Close in 1 Week
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                const d = new Date();
                d.setMonth(d.getMonth() + 1);
                updateFormValue("registrationOpenUntil", dateTimeLocalFromISO(d.toISOString()));
                toast.success("Registration set to close in 1 month");
              }}
            >
              <Calendar className="h-4 w-4 mr-2" />
              Close in 1 Month
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setFormValues({
                  registrationOpenFrom: "",
                  registrationOpenUntil: "",
                });
                setFieldErrors({});
                setHasChanges(hasFormChanges({ registrationOpenFrom: "", registrationOpenUntil: "" }, initialSnapshot));
                toast.success("All deadlines cleared");
              }}
            >
              <AlertCircle className="h-4 w-4 mr-2" />
              Clear All
            </Button>
          </div>
        </CardContent>
      </Card>

      <UnsavedChangesBar
        visible={hasChanges}
        saving={saving}
        onUndoAll={() => {
          if (!initialSnapshot) return;
          setFormValues(initialSnapshot);
          setFieldErrors({});
          setHasChanges(false);
        }}
        onSave={handleSave}
      />
    </div>
  );
}
