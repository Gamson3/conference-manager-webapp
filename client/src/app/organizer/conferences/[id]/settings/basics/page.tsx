"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useParams } from "next/navigation";
import { getConferenceById, updateConference } from "@/features/conferences/api/conferencesApi";
import ConferenceBasicsForm, {
  type ConferenceBasicsValues,
} from "@/features/conferences/components/ConferenceBasicsForm";
import Image from "next/image";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import UnsavedChangesBar from "@/components/shared/UnsavedChangesBar";
import { toast } from "sonner";
import { conferenceBasicsSchema } from "@/lib/schemas";

export default function ConferenceSettingsBasicsPage() {
  const params = useParams();
  const conferenceId = Number(params?.id);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const [values, setValues] = useState<ConferenceBasicsValues>({
    name: "",
    description: "",
    startDate: "",
    endDate: "",
    timezone: "UTC",
    location: "",
    venue: "",
    websiteUrl: "",
    capacity: "",
    topics: "",
    bannerImage: undefined,
  });

  const [initialSnapshot, setInitialSnapshot] = useState<ConferenceBasicsValues>({
    name: "",
    description: "",
    startDate: "",
    endDate: "",
    timezone: "UTC",
    location: "",
    venue: "",
    websiteUrl: "",
    capacity: "",
    topics: "",
    bannerImage: undefined,
  });

  useEffect(() => {
    if (!conferenceId) return;
    setLoading(true);

    getConferenceById(conferenceId)
      .then((data) => {
        const snapshot = {
          name: data.name || "",
          description: data.description || "",
          startDate: data.startDate?.substring(0, 10) || "",
          endDate: data.endDate?.substring(0, 10) || "",
          timezone: data.timezone || "UTC",
          location: data.location || "",
          venue: data.venue || "",
          websiteUrl: data.websiteUrl || "",
          capacity: data.capacity?.toString() || "",
          topics: (data.topics || []).join(", "),
          bannerImage: data.bannerImageUrl || undefined,
        };
        setValues(snapshot);
        setInitialSnapshot(snapshot);
      })
      .catch((e: Error) => setError(e.message || "Failed to load conference"))
      .finally(() => setLoading(false));
  }, [conferenceId]);

  const handleChange = useCallback(
    <K extends keyof ConferenceBasicsValues>(field: K, value: ConferenceBasicsValues[K]) => {
      setValues((prev) => ({ ...prev, [field]: value } as ConferenceBasicsValues));
    },
    []
  );

  const onLogoChange = useCallback(
    (file?: File | null) => {
      if (!file) return handleChange("bannerImage", undefined);
      const reader = new FileReader();
      reader.onload = () => handleChange("bannerImage", reader.result as string);
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

    // Prepare data for validation
    const validationData = {
      ...values,
      capacity: values.capacity ? Number(values.capacity) : undefined,
    };

    // Validate form
    const validation = conferenceBasicsSchema.safeParse(validationData);
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
      const payload = {
        ...values,
        capacity: values.capacity ? Number(values.capacity) : undefined,
        topics: (values.topics ?? "")
          .split(",")
          .map((t: string) => t.trim())
          .filter(Boolean),
      };

      const updated = await updateConference(conferenceId, payload);
      toast.success("Conference updated");
      const newSnapshot = { ...values, bannerImage: updated.bannerImageUrl || values.bannerImage };
      setValues(newSnapshot);
      setInitialSnapshot(newSnapshot);
      setFieldErrors({});
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : "Failed to save";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  if (!conferenceId) return null;
  if (loading) return <p className="text-muted-foreground">Loading…</p>;

  return (
    <section className="space-y-10">
      {/* HEADER + LOGO PICKER TOP-RIGHT */}
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Edit Conference</h1>
          <p className="text-muted-foreground">
            Update your conference details. Changes are not saved until you click Save.
          </p>
        </div>

        {/* LOGO PICKER TOP-RIGHT */}
        <div className="flex flex-col items-center">
          <div
            onClick={() => document.getElementById("logo-input-edit")?.click()}
            className="w-32 h-32 rounded-xl bg-muted/30 hover:bg-muted/40 
                       transition flex items-center justify-center cursor-pointer"
          >
            {values.bannerImage ? (
              <Image
                src={values.bannerImage}
                alt="Conference logo"
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
            id="logo-input-edit"
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => onLogoChange(e.target.files?.[0])}
          />
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <form onSubmit={onSubmit} className="space-y-12">
        {/* USE SHARED FORM COMPONENT (edit mode = all fields) */}
        <ConferenceBasicsForm mode="edit" values={values} errors={fieldErrors} onChange={handleChange} />

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
