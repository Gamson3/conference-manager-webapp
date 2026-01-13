"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import apiClient, { handleApiError } from "@/lib/api/client";
import { API_ENDPOINTS } from "@/lib/api/endpoints";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import UnsavedChangesBar from "@/components/shared/UnsavedChangesBar";
import {
  Settings,
  Calendar,
  Users,
  Shield,
  Mail,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";

type RegistrationFormValues = {
  registrationEnabled: boolean;
  registrationOpenFrom: string; // YYYY-MM-DDTHH:mm
  registrationOpenUntil: string; // YYYY-MM-DDTHH:mm
  maxAttendees: string;
  waitlistEnabled: boolean;
  requireApproval: boolean;
  confirmationEmailBody: string;
};

type RegistrationDateFieldKey = "registrationOpenFrom" | "registrationOpenUntil";

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

function hasFormChanges(next: RegistrationFormValues, baseline: RegistrationFormValues | null): boolean {
  if (!baseline) return true;
  const keys = Object.keys(next) as Array<keyof RegistrationFormValues>;
  return keys.some((k) => next[k] !== baseline[k]);
}

export default function RegistrationSettingsPage() {
  const params = useParams();
  const conferenceId = Number(params?.id);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<RegistrationDateFieldKey, string>>>({});
  const [hasChanges, setHasChanges] = useState(false);
  const [initialSnapshot, setInitialSnapshot] = useState<RegistrationFormValues | null>(null);

  const nowLocal = nowLocalDateTimeValue();

  // Form state
  const [formValues, setFormValues] = useState<RegistrationFormValues>({
    registrationEnabled: true,
    registrationOpenFrom: "",
    registrationOpenUntil: "",
    maxAttendees: "",
    waitlistEnabled: false,
    requireApproval: false,
    confirmationEmailBody: "",
  });

  const fetchSettings = useCallback(async () => {
    if (!conferenceId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get(API_ENDPOINTS.ORGANIZER.REGISTRATION_SETTINGS(conferenceId));
      // Populate form
      const nextValues: RegistrationFormValues = {
        registrationEnabled: res.data.registrationEnabled ?? true,
        registrationOpenFrom: res.data.registrationOpenFrom
          ? dateTimeLocalFromISO(String(res.data.registrationOpenFrom))
          : "",
        registrationOpenUntil: res.data.registrationOpenUntil
          ? dateTimeLocalFromISO(String(res.data.registrationOpenUntil))
          : "",
        maxAttendees: res.data.maxAttendees?.toString() || "",
        waitlistEnabled: res.data.waitlistEnabled ?? false,
        requireApproval: res.data.requireApproval ?? false,
        confirmationEmailBody: res.data.confirmationEmailBody || "",
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

  const updateFormValue = <K extends keyof RegistrationFormValues>(
    key: K,
    value: RegistrationFormValues[K]
  ) => {
    setFormValues((prev) => {
      const next = { ...prev, [key]: value };
      setHasChanges(hasFormChanges(next, initialSnapshot));
      return next;
    });
    if (key === "registrationOpenFrom" || key === "registrationOpenUntil") {
      const dateKey: RegistrationDateFieldKey = key;
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[dateKey];
        return next;
      });
    }
  };

  const handleSave = async () => {
    const fe: Partial<Record<RegistrationDateFieldKey, string>> = {};

    const now = new Date();

    const regOpenFromDate = formValues.registrationOpenFrom ? new Date(formValues.registrationOpenFrom) : null;
    const regOpenUntilDate = formValues.registrationOpenUntil ? new Date(formValues.registrationOpenUntil) : null;

    if (regOpenFromDate && Number.isNaN(regOpenFromDate.getTime())) {
      fe.registrationOpenFrom = "Registration open date/time must be valid.";
    }
    if (regOpenUntilDate && Number.isNaN(regOpenUntilDate.getTime())) {
      fe.registrationOpenUntil = "Registration close date/time must be valid.";
    }

    if (
      formValues.registrationOpenFrom &&
      regOpenFromDate !== null &&
      !Number.isNaN(regOpenFromDate.getTime()) &&
      regOpenFromDate.getTime() < now.getTime() &&
      formValues.registrationOpenFrom !== (initialSnapshot?.registrationOpenFrom ?? "")
    ) {
      fe.registrationOpenFrom = "Registration open date/time can’t be in the past.";
    }

    if (
      formValues.registrationOpenUntil &&
      regOpenUntilDate !== null &&
      !Number.isNaN(regOpenUntilDate.getTime()) &&
      regOpenUntilDate.getTime() < now.getTime() &&
      formValues.registrationOpenUntil !== (initialSnapshot?.registrationOpenUntil ?? "")
    ) {
      fe.registrationOpenUntil = "Registration close date/time can’t be in the past.";
    }

    if (formValues.registrationOpenFrom && formValues.registrationOpenUntil) {
      if (
        regOpenFromDate &&
        regOpenUntilDate &&
        !Number.isNaN(regOpenFromDate.getTime()) &&
        !Number.isNaN(regOpenUntilDate.getTime()) &&
        regOpenUntilDate.getTime() < regOpenFromDate.getTime()
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
      const payload = {
        registrationEnabled: formValues.registrationEnabled,
        registrationOpenFrom: formValues.registrationOpenFrom
          ? isoFromDateTimeLocal(formValues.registrationOpenFrom)
          : null,
        registrationOpenUntil: formValues.registrationOpenUntil
          ? isoFromDateTimeLocal(formValues.registrationOpenUntil)
          : null,
        maxAttendees: formValues.maxAttendees ? parseInt(formValues.maxAttendees) : null,
        waitlistEnabled: formValues.waitlistEnabled,
        requireApproval: formValues.requireApproval,
        confirmationEmailBody: formValues.confirmationEmailBody || null,
      };

      await apiClient.put(API_ENDPOINTS.ORGANIZER.REGISTRATION_SETTINGS(conferenceId), payload);
      toast.success("Settings saved successfully");
      setHasChanges(false);
      setFieldErrors({});
      fetchSettings();
    } catch (err) {
      toast.error(handleApiError(err));
    } finally {
      setSaving(false);
    }
  };

  const handleUndoAll = useCallback((): void => {
    if (!initialSnapshot) return;
    setFormValues(initialSnapshot);
    setFieldErrors({});
    setHasChanges(false);
  }, [initialSnapshot]);

  if (!conferenceId) return null;

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96 mt-2" />
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-64" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive">
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-5 w-5" />
            <p>{error}</p>
          </div>
          <Button variant="outline" className="mt-4" onClick={fetchSettings}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold">Registration Settings</h1>
            {formValues.registrationEnabled ? (
              <Badge className="bg-green-500/10 text-green-500">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Enabled
              </Badge>
            ) : (
              <Badge variant="secondary">
                <AlertCircle className="h-3 w-3 mr-1" />
                Disabled
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground mt-1">
            Configure registration window, capacity, and approval settings
          </p>
        </div>
      </div>

      {/* Main Toggle */}
      <Card className={!formValues.registrationEnabled ? "opacity-90" : ""}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Settings className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle>Enable Registration</CardTitle>
                <CardDescription>Allow participants to register for this conference</CardDescription>
              </div>
            </div>
            <Switch
              checked={formValues.registrationEnabled}
              onCheckedChange={(checked) => updateFormValue("registrationEnabled", checked)}
            />
          </div>
        </CardHeader>
      </Card>

      <div className={`grid gap-6 lg:grid-cols-2 ${!formValues.registrationEnabled ? "opacity-50 pointer-events-none" : ""}`}>
        {/* Registration Window */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Calendar className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <CardTitle>Registration Window</CardTitle>
                <CardDescription>Set when registration opens and closes</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="openFrom">Opens At</Label>
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
            <div className="space-y-2">
              <Label htmlFor="openUntil">Closes At</Label>
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
          </CardContent>
        </Card>

        {/* Capacity */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/10">
                <Users className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <CardTitle>Capacity</CardTitle>
                <CardDescription>Limit the number of attendees</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="maxAttendees">Maximum Attendees</Label>
              <Input
                id="maxAttendees"
                type="number"
                min="0"
                placeholder="Unlimited"
                value={formValues.maxAttendees}
                onChange={(e) => updateFormValue("maxAttendees", e.target.value)}
              />
              <p className="text-xs text-muted-foreground">Leave empty for unlimited capacity</p>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <Label>Enable Waitlist</Label>
                <p className="text-xs text-muted-foreground">
                  Allow registrations after capacity is reached
                </p>
              </div>
              <Switch
                checked={formValues.waitlistEnabled}
                onCheckedChange={(checked) => updateFormValue("waitlistEnabled", checked)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Approval */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10">
                <Shield className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <CardTitle>Approval Settings</CardTitle>
                <CardDescription>Control registration approval workflow</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <Label>Require Approval</Label>
                <p className="text-sm text-muted-foreground mt-1">
                  When enabled, registrations will be placed on a waitlist until you approve them
                </p>
              </div>
              <Switch
                checked={formValues.requireApproval}
                onCheckedChange={(checked) => updateFormValue("requireApproval", checked)}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Confirmation Email */}
      <Card className={!formValues.registrationEnabled ? "opacity-50 pointer-events-none" : ""}>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-pink-500/10">
              <Mail className="h-5 w-5 text-pink-500" />
            </div>
            <div>
              <CardTitle>Confirmation Email</CardTitle>
              <CardDescription>Custom message to include in registration confirmation emails</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="Thank you for registering for our conference! We look forward to seeing you..."
            value={formValues.confirmationEmailBody}
            onChange={(e) => updateFormValue("confirmationEmailBody", e.target.value)}
            rows={5}
            className="resize-none"
          />
          <p className="text-xs text-muted-foreground mt-2">
            This message will be appended to the standard confirmation email sent to registrants.
          </p>
        </CardContent>
      </Card>

      <UnsavedChangesBar
        visible={hasChanges}
        saving={saving}
        onUndoAll={handleUndoAll}
        onSave={handleSave}
      />
    </div>
  );
}
