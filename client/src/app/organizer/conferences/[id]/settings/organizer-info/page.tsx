"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useParams } from "next/navigation";
import { getConferenceById, updateConference } from "@/features/conferences/api/conferencesApi";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import UnsavedChangesBar from "@/components/shared/UnsavedChangesBar";
import { toast } from "sonner";
import Image from "next/image";
import { organizerInfoSchema } from "@/lib/schemas";

export default function OrganizerInfoPage() {
  const params = useParams();
  const conferenceId = Number(params?.id);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const [values, setValues] = useState({
    organizerName: "",
    organizerEmail: "",
    organizerPhone: "",
    organizerWebsite: "",
    organizerLogoUrl: undefined as string | undefined,
  });

  const [initialSnapshot, setInitialSnapshot] = useState(values);

  useEffect(() => {
    if (!conferenceId) return;
    setLoading(true);

    getConferenceById(conferenceId)
      .then((data) => {
        const snapshot = {
          organizerName: data.organizerName || "",
          organizerEmail: data.organizerEmail || "",
          organizerPhone: data.organizerPhone || "",
          organizerWebsite: data.organizerWebsite || "",
          organizerLogoUrl: data.organizerLogoUrl || undefined,
        };
        setValues(snapshot);
        setInitialSnapshot(snapshot);
      })
      .catch((e: unknown) => {
        const message = e instanceof Error ? e.message : "Failed to load organizer info";
        setError(message);
      })
      .finally(() => setLoading(false));
  }, [conferenceId]);

  const handleChange = useCallback((field: string, value: string | undefined) => {
    setValues((prev) => ({ ...prev, [field]: value }));
  }, []);

  const onLogoChange = useCallback(
    (file?: File | null) => {
      if (!file) return handleChange("organizerLogoUrl", undefined);
      const reader = new FileReader();
      reader.onload = () => handleChange("organizerLogoUrl", reader.result as string);
      reader.readAsDataURL(file);
    },
    [handleChange]
  );

  const hasChanges = useMemo(
    () => JSON.stringify(values) !== JSON.stringify(initialSnapshot),
    [values, initialSnapshot]
  );

  const undoAll = useCallback(() => setValues(initialSnapshot), [initialSnapshot]);

  const onSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setError(undefined);
    setFieldErrors({});

    // Validate form
    const validation = organizerInfoSchema.safeParse(values);
    if (!validation.success) {
      const errors: Record<string, string> = {};
      validation.error.errors.forEach((err) => {
        if (err.path[0]) {
          errors[err.path[0] as string] = err.message;
        }
      });
      setFieldErrors(errors);
      setError("Please correct the highlighted fields");
      return;
    }

    setSaving(true);
    try {
      const updated = await updateConference(conferenceId, validation.data);
      toast.success("Organizer info updated");
      const newSnapshot = {
        organizerName: updated.organizerName || "",
        organizerEmail: updated.organizerEmail || "",
        organizerPhone: updated.organizerPhone || "",
        organizerWebsite: updated.organizerWebsite || "",
        organizerLogoUrl: updated.organizerLogoUrl || values.organizerLogoUrl,
      };
      setValues(newSnapshot);
      setInitialSnapshot(newSnapshot);
      setFieldErrors({});
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Failed to save";
      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  if (!conferenceId) return null;
  if (loading) return <p className="text-muted-foreground">Loading…</p>;

  return (
    <section className="space-y-10">
      {/* HEADER + LOGO PICKER */}
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Organizer Information</h1>
          <p className="text-muted-foreground">
            Public-facing organizer details displayed to attendees and participants.
          </p>
        </div>

        {/* LOGO PICKER TOP-RIGHT */}
        <div className="flex flex-col items-center">
          <div
            onClick={() => document.getElementById("org-logo-input")?.click()}
            className="w-32 h-32 rounded-xl bg-muted/30 hover:bg-muted/40 
                       transition flex items-center justify-center cursor-pointer"
          >
            {values.organizerLogoUrl ? (
              <Image
                src={values.organizerLogoUrl}
                alt="Organizer logo"
                width={128}
                height={128}
                unoptimized
                className="max-h-28 object-contain"
              />
            ) : (
              <p className="text-xs text-muted-foreground text-center px-2">
                Upload Logo
              </p>
            )}
          </div>
          <Input
            id="org-logo-input"
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => onLogoChange(e.target.files?.[0])}
          />
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <form onSubmit={onSubmit} className="space-y-12">
        {/* CONTACT DETAILS */}
        <div className="space-y-6">
          <h2 className="text-xl font-semibold">Contact Details</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex flex-col space-y-2">
              <Label>Organization Name</Label>
              <Input
                value={values.organizerName}
                onChange={(e) => handleChange("organizerName", e.target.value)}
                placeholder="e.g. Tech Conference Ltd"
                className={fieldErrors.organizerName ? "border-destructive" : ""}
              />
              {fieldErrors.organizerName && (
                <p className="text-xs text-destructive">{fieldErrors.organizerName}</p>
              )}
            </div>

            <div className="flex flex-col space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={values.organizerEmail}
                onChange={(e) => handleChange("organizerEmail", e.target.value)}
                placeholder="contact@example.com"
                className={fieldErrors.organizerEmail ? "border-destructive" : ""}
              />
              {fieldErrors.organizerEmail && (
                <p className="text-xs text-destructive">{fieldErrors.organizerEmail}</p>
              )}
            </div>

            <div className="flex flex-col space-y-2">
              <Label>Phone</Label>
              <Input
                type="tel"
                value={values.organizerPhone}
                onChange={(e) => handleChange("organizerPhone", e.target.value)}
                placeholder="+1 (555) 123-4567"
                className={fieldErrors.organizerPhone ? "border-destructive" : ""}
              />
              {fieldErrors.organizerPhone && (
                <p className="text-xs text-destructive">{fieldErrors.organizerPhone}</p>
              )}
            </div>

            <div className="flex flex-col space-y-2">
              <Label>Website</Label>
              <Input
                type="url"
                value={values.organizerWebsite}
                onChange={(e) => handleChange("organizerWebsite", e.target.value)}
                placeholder="https://example.com"
                className={fieldErrors.organizerWebsite ? "border-destructive" : ""}
              />
              {fieldErrors.organizerWebsite && (
                <p className="text-xs text-destructive">{fieldErrors.organizerWebsite}</p>
              )}
            </div>
          </div>
        </div>

        <Separator />

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
