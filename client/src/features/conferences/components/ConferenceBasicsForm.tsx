"use client";

import React, { useMemo } from "react";
import { Input } from "@/components/ui/input";
import { DateInput } from "@/components/ui/date-input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const POPULAR_LOCATIONS = [
  "Accra, Ghana",
  "Lagos, Nigeria",
  "London, United Kingdom",
  "Berlin, Germany",
  "New York, USA",
  "Toronto, Canada",
  "Dubai, UAE",
  "Delhi, India",
];

function getTimeZones(): string[] {
  try {
    type IntlWithSupportedValuesOf = typeof Intl & {
      supportedValuesOf?: (key: "timeZone") => string[];
    };

    if (typeof Intl !== "undefined") {
      const supportedValuesOf = (Intl as IntlWithSupportedValuesOf).supportedValuesOf;
      if (typeof supportedValuesOf === "function") {
        return supportedValuesOf("timeZone");
      }
    }
  } catch {}
  return ["UTC", "Europe/London", "Europe/Berlin", "Africa/Accra", "America/New_York"];
}

function getTodayLocalISODate(): string {
  const now = new Date();
  const yyyy = String(now.getFullYear());
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export type ConferenceBasicsValues = {
  name?: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  timezone?: string;
  location?: string;
  venue?: string;
  websiteUrl?: string;
  capacity?: string;
  topics?: string;
  bannerImage?: string;
};

interface Props {
  mode: "create" | "edit";
  values: ConferenceBasicsValues;
  errors?: Partial<Record<keyof ConferenceBasicsValues, string>>;
  onChange: <K extends keyof ConferenceBasicsValues>(
    field: K,
    value: ConferenceBasicsValues[K]
  ) => void;
}

export default function ConferenceBasicsForm({
  mode,
  values,
  errors = {},
  onChange,
}: Props): React.JSX.Element {
  const timezones = useMemo(() => getTimeZones(), []);
  const showAdditional = mode === "edit";
  const today = useMemo(() => getTodayLocalISODate(), []);

  const startMin = mode === "create" ? today : undefined;
  const endMin = useMemo(() => {
    if (mode !== "create") return undefined;
    const start = values.startDate;
    if (start && start > today) return start;
    return today;
  }, [mode, today, values.startDate]);

  const derivedStartError = useMemo((): string | undefined => {
    if (mode !== "create") return undefined;
    const start = values.startDate;
    if (!start) return undefined;
    if (start < today) return "Start date can’t be in the past. Choose today or later.";
    return undefined;
  }, [mode, today, values.startDate]);

  const derivedEndError = useMemo((): string | undefined => {
    const start = values.startDate;
    const end = values.endDate;
    if (!end) return undefined;

    if (mode === "create" && end < today) {
      return "End date can’t be in the past. Choose today or later.";
    }

    if (start && end < start) {
      return "End date can’t be before the start date.";
    }

    return undefined;
  }, [mode, today, values.startDate, values.endDate]);

  const startErrorText = errors.startDate ?? derivedStartError;
  const endErrorText = errors.endDate ?? derivedEndError;

  return (
    <div className="space-y-8">
      {/* BASICS */}
      <Card className="border-muted/40">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">
            Basic information
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Give your conference a name and short description. You can refine details later.
          </p>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>
              Conference Title <span className="text-destructive">*</span>
            </Label>
            <Input
              value={values.name || ""}
              onChange={(e) => onChange("name", e.target.value)}
              placeholder="International AI Summit 2026"
              className={errors.name ? "border-destructive" : undefined}
            />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              rows={4}
              value={values.description || ""}
              onChange={(e) => onChange("description", e.target.value)}
              placeholder="Brief overview of your event..."
            />
          </div>
        </CardContent>
      </Card>

      {/* SCHEDULE */}
      <Card className="border-muted/40">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">
            Schedule
          </CardTitle>
        </CardHeader>

        <CardContent>
          <div className="grid gap-6 md:grid-cols-3">
            <div className="space-y-2">
              <Label>
                Start date <span className="text-destructive">*</span>
              </Label>
              <DateInput
                value={values.startDate || ""}
                onChange={(v) => onChange("startDate", v)}
                min={startMin}
                aria-invalid={!!startErrorText}
                className={startErrorText ? "border-destructive" : undefined}
              />
              {startErrorText && (
                <p className="text-xs text-destructive">{startErrorText}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>
                End date <span className="text-destructive">*</span>
              </Label>
              <DateInput
                value={values.endDate || ""}
                onChange={(v) => onChange("endDate", v)}
                min={endMin}
                aria-invalid={!!endErrorText}
                className={endErrorText ? "border-destructive" : undefined}
              />
              {endErrorText && (
                <p className="text-xs text-destructive">{endErrorText}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Time zone</Label>
              <select
                className="h-10 rounded-md border bg-background px-3 text-sm"
                value={values.timezone || "UTC"}
                onChange={(e) => onChange("timezone", e.target.value)}
              >
                {timezones.map((tz) => (
                  <option key={tz}>{tz}</option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* LOCATION */}
      <Card className="border-muted/40">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">
            Location
          </CardTitle>
        </CardHeader>

        <CardContent>
          <Input
            list="popular-locations"
            value={values.location || ""}
            onChange={(e) => onChange("location", e.target.value)}
            placeholder="City, Country"
          />

          <datalist id="popular-locations">
            {POPULAR_LOCATIONS.map((loc) => (
              <option key={loc} value={loc} />
            ))}
          </datalist>
        </CardContent>
      </Card>

      {/* EDIT MODE EXTRA FIELDS */}
      {showAdditional && (
        <Card className="border-muted/40">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">
              Additional details
            </CardTitle>
          </CardHeader>

          <CardContent className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Venue</Label>
              <Input
                value={values.venue || ""}
                onChange={(e) => onChange("venue", e.target.value)}
                placeholder="Convention center"
              />
            </div>

            <div className="space-y-2">
              <Label>Website</Label>
              <Input
                value={values.websiteUrl || ""}
                onChange={(e) => onChange("websiteUrl", e.target.value)}
                placeholder="https://..."
              />
            </div>

            <div className="space-y-2">
              <Label>Capacity</Label>
              <Input
                type="number"
                value={values.capacity || ""}
                onChange={(e) => onChange("capacity", e.target.value)}
                placeholder="Maximum attendees"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label>Topics (comma-separated)</Label>
              <Input
                value={values.topics || ""}
                onChange={(e) => onChange("topics", e.target.value)}
                placeholder="AI, Machine Learning, Data Science"
              />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
