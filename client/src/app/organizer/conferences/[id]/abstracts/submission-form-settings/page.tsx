"use client";
import { useParams } from "next/navigation";
import { useState, useEffect, useCallback, useMemo } from "react";
import type { ReactElement } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import UnsavedChangesBar from "@/components/shared/UnsavedChangesBar";
import {
  getRequirements,
  upsertRequirements,
  SubmissionRequirement,
} from "@/features/conferences/api/conferenceSetupApi";

interface GeneralFormValues {
  abstractMinLength: string;
  abstractMaxLength: string;
  requiresOrcid: boolean;
  maxFileSizeMB: string;
  allowedFileTypes: string; // comma-separated
}

// Local-only UI state for future backend expansion.
// Future: extend backend model to persist these.
interface LocalUiSettings {
  abstractTitle: {
    maxWords: string;
  };
  bodyText: {
    label: string;
    minWords: string;
    maxWords: string;
  };
  authors: {
    enabled: boolean;
    askEmail: boolean;
    askAffiliation: boolean;
    askPhone: boolean;
    askOrcid: boolean;
  };
  /** Whether to allow abstract file upload in addition to abstract text */
  allowFileUpload: boolean;
  fileField: {
    label: string;
    maxSizeMB: string;
    allowedTypes: string;
    required: boolean;
  };
  fullText: {
    enabled: boolean;
    timing: "onSubmission" | "afterAcceptance";
  };
  keywords: {
    enabled: boolean;
    minimum: string;
    limit: string;
    required: boolean;
  };
}

export default function SubmissionFormGeneralPage(): ReactElement {
  const params = useParams();
  const conferenceId = Number(params?.id);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);
  const [_fieldErrors, _setFieldErrors] = useState<Record<string, string>>({});

  const [isAuthorSettingsOpen, setIsAuthorSettingsOpen] = useState(false);
  const [isBodyTextSettingsOpen, setIsBodyTextSettingsOpen] = useState(false);
  const [isFileFieldSettingsOpen, setIsFileFieldSettingsOpen] = useState(false);

  const [values, setValues] = useState<GeneralFormValues>({
    abstractMinLength: "50",
    abstractMaxLength: "3000",
    requiresOrcid: false,
    maxFileSizeMB: "10",
    allowedFileTypes: "",
  });

  const [initialSnapshot, setInitialSnapshot] = useState<GeneralFormValues>(values);

  const initialUiSettingsDefault: LocalUiSettings = {
    abstractTitle: { maxWords: "100" },
    bodyText: {
      label: "Abstract text",
      minWords: "100",
      maxWords: "3000",
    },
    authors: {
      enabled: true,
      askEmail: true,
      askAffiliation: true,
      askPhone: true,
      askOrcid: false,
    },
    allowFileUpload: false,
    fileField: {
      label: "Add Abstract File",
      maxSizeMB: "5",
      allowedTypes: "PDF, DOCX",
      required: false,
    },
    fullText: {
      enabled: false,
      timing: "onSubmission",
    },
    keywords: {
      enabled: true,
      minimum: "5",
      limit: "8",
      required: true,
    },
  };

  const [uiSettings, setUiSettings] = useState<LocalUiSettings>(initialUiSettingsDefault);
  const [initialUiSettingsSnapshot, setInitialUiSettingsSnapshot] = useState<LocalUiSettings>(initialUiSettingsDefault);

  useEffect(() => {
    if (!conferenceId) return;
    setLoading(true);

    getRequirements(conferenceId)
      .then((data) => {
        if (data) {
          const formValues: GeneralFormValues = {
            abstractMinLength: data.abstractMinLength != null ? String(data.abstractMinLength) : "50",
            abstractMaxLength: data.abstractMaxLength != null ? String(data.abstractMaxLength) : "3000",
            requiresOrcid: data.requiresOrcid ?? false,
            maxFileSizeMB: data.maxFileSizeMB != null ? String(data.maxFileSizeMB) : "10",
            allowedFileTypes: data.allowedFileTypes?.join(", ") || "",
          };
          setValues(formValues);
          setInitialSnapshot(formValues);

          // Abstract file is allowed when mode is BOTH (FILE mode is deprecated, treat as BOTH)
          const allowFileUpload =
            data.abstractUploadMode === "BOTH" ||
            data.abstractUploadMode === "FILE";

          const newUiSettings: LocalUiSettings = {
            abstractTitle: {
              maxWords:
                data.titleMaxWords != null
                  ? String(data.titleMaxWords)
                  : "100",
            },
            bodyText: {
              label: data.bodyTextLabel ?? "Abstract text",
              minWords:
                data.bodyTextMinWords != null
                  ? String(data.bodyTextMinWords)
                  : "100",
              maxWords:
                data.bodyTextMaxWords != null
                  ? String(data.bodyTextMaxWords)
                  : "3000",
            },
            authors: {
              enabled: data.authorsEnabled ?? true,
              askEmail: data.collectAuthorEmail ?? true,
              askAffiliation: data.collectAuthorAffiliation ?? true,
              askPhone: data.collectAuthorPhone ?? true,
              askOrcid: data.collectAuthorOrcid ?? false,
            },
            allowFileUpload,
            fileField: {
              label: data.fileFieldLabel ?? "Add Abstract File",
              maxSizeMB: formValues.maxFileSizeMB || "5",
              allowedTypes:
                data.allowedFileTypes && data.allowedFileTypes.length > 0
                  ? data.allowedFileTypes.join(", ")
                  : "PDF, DOCX",
              required: data.fileFieldRequired ?? false,
            },
            fullText: {
              enabled: data.collectFullText ?? false,
              timing: data.fullTextTiming ?? "onSubmission",
            },
            keywords: {
              enabled: data.maxKeywords != null ? data.maxKeywords > 0 : true,
              minimum:
                data.maxKeywords != null && data.maxKeywords <= 0
                  ? "0"
                  : String(Math.max(5, data.minKeywords ?? 5)),
              limit:
                data.maxKeywords != null && data.maxKeywords <= 0
                  ? "0"
                  : String(Math.max(5, data.maxKeywords ?? 8)),
              required: true,
            },
          };

          setUiSettings(newUiSettings);
          setInitialUiSettingsSnapshot(newUiSettings);
        }
      })
      .catch((e: unknown) => {
        const message = e instanceof Error ? e.message : "Failed to load submission settings";
        setError(message);
      })
      .finally(() => setLoading(false));
  }, [conferenceId]);

  const _handleChange = useCallback((field: string, value: string | boolean) => {
    setValues((prev) => ({ ...prev, [field]: value }));
  }, []);

  const hasChanges = useMemo(
    () =>
      JSON.stringify(values) !== JSON.stringify(initialSnapshot) ||
      JSON.stringify(uiSettings) !== JSON.stringify(initialUiSettingsSnapshot),
    [values, initialSnapshot, uiSettings, initialUiSettingsSnapshot]
  );

  const undoAll = useCallback(() => {
    setValues(initialSnapshot);
    setUiSettings(initialUiSettingsSnapshot);
  }, [initialSnapshot, initialUiSettingsSnapshot]);

  const onSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setError(undefined);
    _setFieldErrors({});

    // Validation
    const fe: Record<string, string> = {};
    const minLen = Number(values.abstractMinLength);
    const maxLen = Number(values.abstractMaxLength);
    const maxSize = Number(values.maxFileSizeMB);

    if (isNaN(minLen) || minLen < 0) fe.abstractMinLength = "Must be a valid number >= 0";
    if (isNaN(maxLen) || maxLen < 0) fe.abstractMaxLength = "Must be a valid number >= 0";
    if (minLen > maxLen) fe.abstractMaxLength = "Max length must be >= min length";

    if (isNaN(maxSize) || maxSize < 0) fe.maxFileSizeMB = "Must be a valid number >= 0";

    if (Object.keys(fe).length) {
      _setFieldErrors(fe);
      return;
    }

    setSaving(true);
    try {
      const fileTypes = values.allowedFileTypes
        .split(",")
        .map((t) => t.trim())
        .filter((t) => t.length > 0);

      // Map UI to backend: text is always required; file is optional supplement
      const abstractUploadMode = uiSettings.allowFileUpload ? "BOTH" : "TEXT";
      const fileFieldRequired = uiSettings.allowFileUpload && uiSettings.fileField.required;

      const keywordsMaxRaw = uiSettings.keywords.enabled ? Number(uiSettings.keywords.limit) : 0;
      const keywordsMinRaw = uiSettings.keywords.enabled ? Number(uiSettings.keywords.minimum) : 0;
      const keywordsMax = uiSettings.keywords.enabled
        ? Math.max(5, isNaN(keywordsMaxRaw) ? 8 : Math.floor(keywordsMaxRaw))
        : 0;
      const keywordsMin = uiSettings.keywords.enabled
        ? Math.min(keywordsMax, Math.max(5, isNaN(keywordsMinRaw) ? 5 : Math.floor(keywordsMinRaw)))
        : 0;

      const payload: Partial<SubmissionRequirement> = {
        minKeywords: keywordsMin,
        maxKeywords: keywordsMax,
        abstractMinLength: minLen,
        abstractMaxLength: maxLen,
        requiresOrcid: values.requiresOrcid,
        maxFileSizeMB: maxSize,
        allowedFileTypes: fileTypes,
        titleMaxWords:
          uiSettings.abstractTitle.maxWords.trim().length > 0
            ? Number(uiSettings.abstractTitle.maxWords)
            : undefined,
        bodyTextLabel: uiSettings.bodyText.label.trim() || undefined,
        bodyTextMinWords:
          uiSettings.bodyText.minWords.trim().length > 0
            ? Number(uiSettings.bodyText.minWords)
            : undefined,
        bodyTextMaxWords:
          uiSettings.bodyText.maxWords.trim().length > 0
            ? Number(uiSettings.bodyText.maxWords)
            : undefined,
        authorsEnabled: uiSettings.authors.enabled,
        collectAuthorEmail: uiSettings.authors.askEmail,
        collectAuthorAffiliation: uiSettings.authors.askAffiliation,
        collectAuthorPhone: uiSettings.authors.askPhone,
        collectAuthorOrcid: uiSettings.authors.askOrcid,
        abstractUploadMode,
        fileFieldRequired,
        fileFieldLabel: uiSettings.fileField.label.trim() || undefined,
        // Full Text settings
        collectFullText: uiSettings.fullText.enabled,
        fullTextTiming: uiSettings.fullText.timing,
      };

      await upsertRequirements(conferenceId, payload);
      toast.success("Submission settings saved");

      // Update snapshots
      setInitialSnapshot(values);
      setInitialUiSettingsSnapshot(uiSettings);
      _setFieldErrors({});
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Failed to save submission settings";
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
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Submission Form: General Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Configure how authors enter core information like title, authors, abstract text, and full text.
        </p>
      </div>

      {error && <p className="text-destructive text-sm">{error}</p>}

      <form onSubmit={onSubmit} className="space-y-6">
        {/* Abstract title */}
        <div className="rounded-xl border bg-card shadow-sm">
          <div className="p-6 space-y-4">
            <div className="space-y-1">
              <h2 className="text-base font-semibold">Abstract title</h2>
              <p className="text-sm text-muted-foreground">
                The abstract title is a required field and must be filled out during the submission process.
              </p>
            </div>

            <div className="mt-2 grid gap-4 md:grid-cols-[220px_minmax(0,1fr)_120px] items-end">
              <div className="space-y-2">
                <Label htmlFor="titleMaxWords">Max word limit</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="titleMaxWords"
                    type="number"
                    value={uiSettings.abstractTitle.maxWords}
                    onChange={(e) =>
                      setUiSettings((prev) => ({
                        ...prev,
                        abstractTitle: { maxWords: e.target.value },
                      }))
                    }
                    className="w-24"
                  />
                  <span className="text-sm text-muted-foreground">words</span>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">Abstract title</Label>
                <Input disabled placeholder="Type the abstract title" />
              </div>
              <div className="flex justify-end text-xs text-muted-foreground">Preview only</div>
            </div>
          </div>
        </div>

        {/* Authors */}
        <div className="rounded-xl border bg-card shadow-sm">
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-1">
                <h2 className="text-base font-semibold">Authors</h2>
                <p className="text-sm text-muted-foreground">
                  Define which information will be collected from authors.
                </p>
              </div>
              <Switch
                checked={uiSettings.authors.enabled}
                onCheckedChange={(checked) => {
                  setUiSettings((prev) => ({
                    ...prev,
                    authors: checked
                      ? { ...prev.authors, enabled: true }
                      : {
                          enabled: false,
                          askEmail: false,
                          askAffiliation: false,
                          askPhone: false,
                          askOrcid: false,
                        },
                  }));
                  if (!checked) {
                    setValues((prev) => ({ ...prev, requiresOrcid: false }));
                  }
                }}
              />
            </div>

            <div className="rounded-lg bg-muted/40 p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setIsAuthorSettingsOpen(true)}
                >
                  Settings
                </Button>
                <span className="text-xs text-muted-foreground">All preview only</span>
              </div>
              {uiSettings.authors.enabled ? (
                <div className="grid gap-3 md:grid-cols-2">
                  <Input disabled placeholder="First name" />
                  <Input disabled placeholder="Last name" />
                  {uiSettings.authors.askEmail && (
                    <Input disabled placeholder="Email" />
                  )}
                  {uiSettings.authors.askAffiliation && (
                    <Input disabled placeholder="Affiliation" />
                  )}
                  {uiSettings.authors.askPhone && (
                    <Input disabled placeholder="Phone" />
                  )}
                  {uiSettings.authors.askOrcid && (
                    <Input disabled placeholder="ORCID iD" />
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Authors field disabled – no author details will be requested during submission.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Abstract content */}
        <div className="rounded-xl border bg-card shadow-sm">
          <div className="p-6 space-y-4">
            <div className="space-y-1">
              <h2 className="text-base font-semibold">Abstract content</h2>
              <p className="text-sm text-muted-foreground">
                Abstract text is always required. Optionally allow file uploads as supplementary material.
              </p>
            </div>

            {/* Body text section - always shown */}
            <div className="rounded-lg bg-muted/40 p-4">
              <div className="mb-2 flex items-center justify-between gap-3">
                <div className="text-sm font-medium">
                  {uiSettings.bodyText.label}
                  <span className="ml-1 text-red-500">*</span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {uiSettings.bodyText.minWords || "0"}
                  {" "}–{" "}
                  {uiSettings.bodyText.maxWords || "∞"} words
                </span>
              </div>
              <div className="h-40 rounded-md border bg-background" />
              <div className="mt-3 flex items-center justify-between">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setIsBodyTextSettingsOpen(true)}
                >
                  Body Text Settings
                </Button>
              </div>
            </div>

            {/* Allow abstract file upload toggle */}
            <div className="flex items-center justify-between rounded-lg bg-muted/40 p-3">
              <div>
                <p className="text-sm font-medium">Allow abstract file upload</p>
                <p className="text-xs text-muted-foreground">
                  Let authors upload a supplementary file (PDF, DOCX) with their abstract text.
                </p>
              </div>
              <Switch
                checked={uiSettings.allowFileUpload}
                onCheckedChange={(checked) =>
                  setUiSettings((prev) => ({
                    ...prev,
                    allowFileUpload: checked,
                    fileField: {
                      ...prev.fileField,
                        // Default to required when enabling file upload
                        required: checked ? true : false,
                    },
                  }))
                }
              />
            </div>

            {/* File field section - only when file upload is allowed */}
            {uiSettings.allowFileUpload && (
              <div className="rounded-lg bg-muted/40 p-4 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="text-sm font-medium">{uiSettings.fileField.label}</div>
                    <div className="inline-flex items-center rounded-full border bg-background p-[2px] text-[10px]">
                      <button
                        type="button"
                        aria-pressed={uiSettings.fileField.required}
                        onClick={() =>
                          setUiSettings((prev) => ({
                            ...prev,
                            fileField: { ...prev.fileField, required: true },
                          }))
                        }
                        className={
                          "inline-flex h-5 items-center gap-1 rounded-full px-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background " +
                          (uiSettings.fileField.required
                            ? "bg-primary text-primary-foreground"
                            : "text-muted-foreground hover:text-foreground")
                        }
                      >
                        <span aria-hidden="true" className="text-[9px] leading-none">✓</span>
                        <span>Required</span>
                      </button>
                      <button
                        type="button"
                        aria-pressed={!uiSettings.fileField.required}
                        onClick={() =>
                          setUiSettings((prev) => ({
                            ...prev,
                            fileField: { ...prev.fileField, required: false },
                          }))
                        }
                        className={
                          "inline-flex h-5 items-center gap-1 rounded-full px-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background " +
                          (!uiSettings.fileField.required
                            ? "bg-muted text-foreground"
                            : "text-muted-foreground hover:text-foreground")
                        }
                      >
                        <span aria-hidden="true" className="text-[9px] leading-none">✕</span>
                        <span>Optional</span>
                      </button>
                    </div>
                  </div>
                </div>
                <div className="rounded-md border border-dashed bg-background p-4 text-sm text-muted-foreground">
                  <div>{uiSettings.fileField.label}</div>
                  <div>Max. {uiSettings.fileField.maxSizeMB || values.maxFileSizeMB || "10"} MB</div>
                  {uiSettings.fileField.allowedTypes
                    ? ` Allowed types: ${uiSettings.fileField.allowedTypes}`
                    : ""}
                </div>
                <div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setIsFileFieldSettingsOpen(true)}
                  >
                    Edit File Settings
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Full text */}
        <div className="rounded-xl border bg-card shadow-sm">
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-base font-semibold">Full text</h2>
              <Switch
                checked={uiSettings.fullText.enabled}
                onCheckedChange={(checked) =>
                  setUiSettings((prev) => ({
                    ...prev,
                    fullText: { ...prev.fullText, enabled: checked },
                  }))
                }
              />
            </div>

            {uiSettings.fullText.enabled && (
              <div className="mt-3 space-y-3 rounded-lg bg-muted/40 p-4">
                <div className="rounded-md border border-dashed bg-background p-4 text-sm text-muted-foreground">
                  Upload Full Text File — Max. {values.maxFileSizeMB || "10"} MB (preview only)
                </div>
                <RadioGroup
                  value={uiSettings.fullText.timing}
                  onValueChange={(val: "onSubmission" | "afterAcceptance") =>
                    setUiSettings((prev) => ({
                      ...prev,
                      fullText: { ...prev.fullText, timing: val },
                    }))
                  }
                >
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="onSubmission" id="ft-submission" />
                    <Label htmlFor="ft-submission" className="text-sm">
                      Collect during the abstract submission
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="afterAcceptance" id="ft-acceptance" />
                    <Label htmlFor="ft-acceptance" className="text-sm">
                      Collect after the acceptance
                    </Label>
                  </div>
                </RadioGroup>
              </div>
            )}
          </div>
        </div>

        {/* Keywords */}
        <div className="rounded-xl border bg-card shadow-sm">
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-1">
                <h2 className="text-base font-semibold">Keywords</h2>
                <p className="text-sm text-muted-foreground">
                  Allow authors to add keywords.
                </p>
              </div>
              <Switch
                checked={uiSettings.keywords.enabled}
                onCheckedChange={(checked) =>
                  setUiSettings((prev) => ({
                    ...prev,
                    keywords: checked
                      ? { ...prev.keywords, enabled: true, required: true, minimum: "5", limit: "8" }
                      : { ...prev.keywords, enabled: false, required: true, minimum: "0", limit: "0" },
                  }))
                }
              />
            </div>

            {uiSettings.keywords.enabled && (
              <div className="mt-3 space-y-4 rounded-lg bg-muted/40 p-4">
                <div className="grid gap-4 md:grid-cols-2">
                  {/* Minimum Keywords */}
                  <div className="space-y-2">
                    <Label htmlFor="keywordMinimum" className="text-sm font-medium">
                      Minimum
                    </Label>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => {
                          const current = Number(uiSettings.keywords.minimum);
                          if (current > 5) {
                            setUiSettings((prev) => ({
                              ...prev,
                              keywords: { ...prev.keywords, minimum: String(current - 1) },
                            }));
                          }
                        }}
                        disabled={Number(uiSettings.keywords.minimum) <= 5}
                      >
                        -
                      </Button>
                      <Input
                        id="keywordMinimum"
                        type="number"
                          min={5}
                        value={uiSettings.keywords.minimum}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                            const clampedMin = Math.max(5, isNaN(val) ? 5 : Math.floor(val));
                            const max = Number(uiSettings.keywords.limit);
                            const safeMax = Math.max(5, isNaN(max) ? 8 : Math.floor(max));
                            if (clampedMin <= safeMax) {
                              setUiSettings((prev) => ({
                                ...prev,
                                keywords: { ...prev.keywords, minimum: String(clampedMin), limit: String(safeMax) },
                              }));
                            }
                        }}
                        className="w-20 text-center"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => {
                          const current = Number(uiSettings.keywords.minimum);
                          const max = Number(uiSettings.keywords.limit);
                          const safeMax = Math.max(5, isNaN(max) ? 8 : Math.floor(max));
                          if (current < safeMax) {
                            setUiSettings((prev) => ({
                              ...prev,
                              keywords: { ...prev.keywords, minimum: String(current + 1) },
                            }));
                          }
                        }}
                        disabled={Number(uiSettings.keywords.minimum) >= Number(uiSettings.keywords.limit)}
                      >
                        +
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Cannot be less than 5
                    </p>
                  </div>

                  {/* Maximum Keywords */}
                  <div className="space-y-2">
                    <Label htmlFor="keywordLimit" className="text-sm font-medium">
                      Maximum
                    </Label>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => {
                          const current = Number(uiSettings.keywords.limit);
                          const min = Number(uiSettings.keywords.minimum);
                          if (current > min) {
                            setUiSettings((prev) => ({
                              ...prev,
                              keywords: { ...prev.keywords, limit: String(current - 1) },
                            }));
                          }
                        }}
                        disabled={Number(uiSettings.keywords.limit) <= Number(uiSettings.keywords.minimum)}
                      >
                        -
                      </Button>
                      <Input
                        id="keywordLimit"
                        type="number"
                        min={Number(uiSettings.keywords.minimum)}
                        value={uiSettings.keywords.limit}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          const min = Number(uiSettings.keywords.minimum);
                          const clamped = Math.max(min, isNaN(val) ? 8 : Math.floor(val));
                          setUiSettings((prev) => ({
                            ...prev,
                            keywords: { ...prev.keywords, limit: String(clamped) },
                          }));
                        }}
                        className="w-20 text-center"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => {
                          const current = Number(uiSettings.keywords.limit);
                          setUiSettings((prev) => ({
                            ...prev,
                            keywords: { ...prev.keywords, limit: String(current + 1) },
                          }));
                        }}
                      >
                        +
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Must be ≥ minimum
                    </p>
                  </div>
                </div>

                <p className="text-xs text-muted-foreground">
                  Authors must provide {uiSettings.keywords.minimum}-{uiSettings.keywords.limit} keywords.
                </p>
              </div>
            )}
          </div>
        </div>
      </form>
      {/* Authors settings dialog */}
      <Dialog open={isAuthorSettingsOpen} onOpenChange={setIsAuthorSettingsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Author Settings</DialogTitle>
            <DialogDescription>
              Choose which information you want to collect from authors. These
              settings affect the submission form and backend validation.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium">Ask for author email</p>
              </div>
              <Switch
                checked={uiSettings.authors.askEmail}
                onCheckedChange={(checked) =>
                  setUiSettings((prev) => ({
                    ...prev,
                    authors: { ...prev.authors, askEmail: checked },
                  }))
                }
              />
            </div>
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium">Ask for author affiliation</p>
              </div>
              <Switch
                checked={uiSettings.authors.askAffiliation}
                onCheckedChange={(checked) =>
                  setUiSettings((prev) => ({
                    ...prev,
                    authors: { ...prev.authors, askAffiliation: checked },
                  }))
                }
              />
            </div>
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium">Ask for author phone number</p>
              </div>
              <Switch
                checked={uiSettings.authors.askPhone}
                onCheckedChange={(checked) =>
                  setUiSettings((prev) => ({
                    ...prev,
                    authors: { ...prev.authors, askPhone: checked },
                  }))
                }
              />
            </div>
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium">Ask for author ORCID ID</p>
              </div>
              <Switch
                checked={uiSettings.authors.askOrcid}
                onCheckedChange={(checked) =>
                  setUiSettings((prev) => ({
                    ...prev,
                    authors: { ...prev.authors, askOrcid: checked },
                  }))
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" onClick={() => setIsAuthorSettingsOpen(false)}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Body text settings dialog */}
      <Dialog open={isBodyTextSettingsOpen} onOpenChange={setIsBodyTextSettingsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Body Text Settings</DialogTitle>
            <DialogDescription>
              Configure how the abstract body text field behaves. These
              settings drive both the submission form and backend validation.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="bodyTextLabel">Field label</Label>
              <Input
                id="bodyTextLabel"
                value={uiSettings.bodyText.label}
                onChange={(e) =>
                  setUiSettings((prev) => ({
                    ...prev,
                    bodyText: { ...prev.bodyText, label: e.target.value },
                  }))
                }
              />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="bodyTextMinWords">Minimum words</Label>
                <Input
                  id="bodyTextMinWords"
                  type="number"
                  min={0}
                  value={uiSettings.bodyText.minWords}
                  onChange={(e) =>
                    setUiSettings((prev) => ({
                      ...prev,
                      bodyText: { ...prev.bodyText, minWords: e.target.value },
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bodyTextMaxWords">Maximum words</Label>
                <Input
                  id="bodyTextMaxWords"
                  type="number"
                  min={0}
                  value={uiSettings.bodyText.maxWords}
                  onChange={(e) =>
                    setUiSettings((prev) => ({
                      ...prev,
                      bodyText: { ...prev.bodyText, maxWords: e.target.value },
                    }))
                  }
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              These limits will later be enforced during submission; for now
              they only control what you see in this preview.
            </p>
          </div>
          <DialogFooter>
            <Button type="button" onClick={() => setIsBodyTextSettingsOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* File upload field settings dialog */}
      <Dialog open={isFileFieldSettingsOpen} onOpenChange={setIsFileFieldSettingsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>File Upload Settings</DialogTitle>
            <DialogDescription>
              Configure the label and maximum file size for the abstract file
              field. These settings are currently preview-only.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fileFieldLabel">Field label</Label>
              <Input
                id="fileFieldLabel"
                value={uiSettings.fileField.label}
                onChange={(e) =>
                  setUiSettings((prev) => ({
                    ...prev,
                    fileField: { ...prev.fileField, label: e.target.value },
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fileFieldMaxSize">Max file size (MB)</Label>
              <Input
                id="fileFieldMaxSize"
                type="number"
                min={0}
                value={uiSettings.fileField.maxSizeMB}
                onChange={(e) =>
                  setUiSettings((prev) => ({
                    ...prev,
                    fileField: { ...prev.fileField, maxSizeMB: e.target.value },
                  }))
                }
                className="w-32"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fileFieldTypes">Allowed file types</Label>
              <Input
                id="fileFieldTypes"
                placeholder="e.g. PDF, DOCX"
                value={uiSettings.fileField.allowedTypes}
                onChange={(e) =>
                  setUiSettings((prev) => ({
                    ...prev,
                    fileField: { ...prev.fileField, allowedTypes: e.target.value },
                  }))
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" onClick={() => setIsFileFieldSettingsOpen(false)}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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

