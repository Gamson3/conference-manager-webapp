"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import apiClient, { handleApiError } from "@/lib/api/client";
import { API_ENDPOINTS } from "@/lib/api/endpoints";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import UnsavedChangesBar from "@/components/shared/UnsavedChangesBar";
import SafeMarkdown from "@/components/shared/SafeMarkdown";
import { toast } from "sonner";
import { Plus, Trash2, ArrowUp, ArrowDown, FileText, Calendar, Info, Settings, ExternalLink, ChevronRight } from "lucide-react";
import { getConferenceById } from "@/features/conferences/api/conferencesApi";
import { listMilestones } from "@/features/conferences/api/conferenceSetupApi";

// Types
interface ContentBlock {
  id?: number;
  clientKey: string;
  title: string;
  markdown: string;
}

interface CFPPayload {
  conferenceId: number;
  submissionPortalUrl: string | null;
  blocks: Array<{ id: number; title: string | null; markdown: string; order: number }>;
}

interface FormValues {
  submissionPortalUrl: string;
  blocks: ContentBlock[];
}

function createClientKey(prefix = "tmp"): string {
  try {
    // modern browsers
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return `${prefix}-${crypto.randomUUID()}`;
    }
  } catch {
    // ignore
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

interface TimelineMilestone {
  id: number;
  name: string;
  description?: string | null;
  date: string;
}

interface TimelineEntry {
  key: string;
  label: string;
  start?: string;
  end?: string;
  note?: string;
}

function formatTimelineDateBadge(entry: TimelineEntry): string {
  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric", year: "numeric" };
  if (!entry.start && !entry.end) return "TBA";
  const start = entry.start ? new Date(entry.start) : undefined;
  const end = entry.end ? new Date(entry.end) : undefined;
  if (start && end) {
    const sameDay = start.toDateString() === end.toDateString();
    if (sameDay) return start.toLocaleDateString("en-US", opts);
    return `${start.toLocaleDateString("en-US", opts)} – ${end.toLocaleDateString("en-US", opts)}`;
  }
  const only = (start || end)!;
  return only.toLocaleDateString("en-US", opts);
}

function sortKeyForTimeline(entry: TimelineEntry): number {
  const dateStr = entry.start || entry.end;
  if (!dateStr) return Number.POSITIVE_INFINITY;
  return new Date(dateStr).getTime();
}

export default function CFPContentEditor() {
  const params = useParams();
  const conferenceId = Number(params?.id);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formValues, setFormValues] = useState<FormValues>({
    submissionPortalUrl: "",
    blocks: [],
  });

  const [initialSnapshot, setInitialSnapshot] = useState<FormValues>({
    submissionPortalUrl: "",
    blocks: [],
  });

  const [timeline, setTimeline] = useState<TimelineEntry[]>([]);

  const fetchAll = useCallback(async () => {
    if (!conferenceId) return;
    setLoading(true);
    setError(null);
    try {
      const [cfpRes, conf, ms] = await Promise.all([
        apiClient.get<CFPPayload>(API_ENDPOINTS.ORGANIZER.CFP(conferenceId)),
        getConferenceById(conferenceId),
        listMilestones(conferenceId),
      ]);

      const blocks: ContentBlock[] = (cfpRes.data.blocks || []).map((b) => ({
        id: b.id,
        clientKey: `id-${b.id}`,
        title: b.title || "",
        markdown: b.markdown || "",
      }));

      const snapshot: FormValues = {
        submissionPortalUrl: cfpRes.data.submissionPortalUrl || "",
        blocks,
      };

      setFormValues(snapshot);
      setInitialSnapshot(snapshot);

      const milestones: TimelineMilestone[] = (ms || []).map((m) => ({
        id: m.id,
        name: m.name,
        description: (m.description as string | null) || null,
        date: String(m.date),
      }));

      const entries: TimelineEntry[] = [
        {
          key: "cfp",
          label: "Call for Papers",
          start: conf.submissionsOpenFrom || undefined,
          end: conf.submissionsOpenUntil || undefined,
        },
        {
          key: "review",
          label: "Review Period",
          start: conf.reviewStartsAt || undefined,
          end: conf.reviewEndsAt || undefined,
        },
        {
          key: "registration",
          label: "Registration",
          start: conf.registrationOpenFrom || undefined,
          end: conf.registrationOpenUntil || undefined,
        },
        ...milestones.map((m) => ({
          key: `milestone-${m.id}`,
          label: m.name,
          start: m.date,
          end: m.date,
          note: m.description || undefined,
        })),
      ]
        .filter((e) => e.start || e.end)
        .sort((a, b) => sortKeyForTimeline(a) - sortKeyForTimeline(b));

      setTimeline(entries);
    } catch (err) {
      setError(handleApiError(err));
    } finally {
      setLoading(false);
    }
  }, [conferenceId]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const hasChanges = useMemo(
    () => JSON.stringify(formValues) !== JSON.stringify(initialSnapshot),
    [formValues, initialSnapshot]
  );

  const undoAll = useCallback(() => setFormValues(initialSnapshot), [initialSnapshot]);

  const updateField = useCallback((field: keyof FormValues, value: string) => {
    setFormValues((prev) => ({ ...prev, [field]: value }));
  }, []);

  const addBlock = useCallback(() => {
    setFormValues((prev) => ({
      ...prev,
      blocks: [...prev.blocks, { clientKey: createClientKey(), title: "", markdown: "" }],
    }));
  }, []);

  const updateBlock = useCallback((index: number, patch: Partial<ContentBlock>) => {
    setFormValues((prev) => {
      const next = [...prev.blocks];
      next[index] = { ...next[index], ...patch };
      return { ...prev, blocks: next };
    });
  }, []);

  const deleteBlock = useCallback((index: number) => {
    setFormValues((prev) => ({
      ...prev,
      blocks: prev.blocks.filter((_, i) => i !== index),
    }));
  }, []);

  const moveBlock = useCallback((from: number, to: number) => {
    setFormValues((prev) => {
      const next = [...prev.blocks];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return { ...prev, blocks: next };
    });
  }, []);

  const handleSave = useCallback(async () => {
    if (!conferenceId) return;
    setSaving(true);
    setError(null);
    try {
      const payload = {
        submissionPortalUrl: formValues.submissionPortalUrl?.trim() || null,
        blocks: formValues.blocks
          .filter((b) => b.markdown.trim())
          .map((b) => ({ title: b.title.trim() || undefined, markdown: b.markdown })),
      };

      const res = await apiClient.put<CFPPayload>(API_ENDPOINTS.ORGANIZER.CFP(conferenceId), payload);

      const nextSnapshot: FormValues = {
        submissionPortalUrl: res.data.submissionPortalUrl || "",
        blocks: (res.data.blocks || []).map((b) => ({
          id: b.id,
          clientKey: `id-${b.id}`,
          title: b.title || "",
          markdown: b.markdown || "",
        })),
      };
      setFormValues(nextSnapshot);
      setInitialSnapshot(nextSnapshot);
      toast.success("CFP content updated");
    } catch (err) {
      const msg = handleApiError(err);
      setError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }, [conferenceId, formValues]);

  if (!conferenceId) return null;
  if (loading) return <p className="text-muted-foreground">Loading...</p>;

  return (
    <div className="space-y-6">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
        <a href="../website" className="hover:text-foreground transition-colors">Website</a>
        <ChevronRight className="h-4 w-4" />
        <span className="text-foreground font-medium">Call for Papers</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Call for Papers</h1>
          <p className="text-muted-foreground mt-1">
            Configure author-facing content sections. Deadlines are managed in Settings → Deadlines.
          </p>
        </div>
        <div className="flex items-center justify-end">
          <Button variant="outline" size="sm" asChild>
            <a href={`/organizer/conferences/${conferenceId}/settings/deadlines`}>
              <Settings className="h-4 w-4 mr-2" />
              Manage Deadlines
            </a>
          </Button>
        </div>
      </div>

      {/* Info Alert */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription className="flex items-center justify-between">
          <span>
            Submission deadlines and registration dates are configured in <strong>Settings → Deadlines</strong> and will automatically appear in the CFP timeline.
          </span>
        </AlertDescription>
      </Alert>

      {error && <p className="text-destructive text-sm">{error}</p>}

      <Tabs defaultValue="content" className="space-y-4">
        <TabsList>
          <TabsTrigger value="content">Content Blocks</TabsTrigger>
          <TabsTrigger value="preview">Preview</TabsTrigger>
        </TabsList>

        {/* Content Blocks Tab */}
        <TabsContent value="content" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Submission Portal
              </CardTitle>
              <CardDescription>
                Optional link to external submission system (e.g., EasyChair).
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Label htmlFor="submissionPortalUrl">Submission Portal URL</Label>
              <Input
                id="submissionPortalUrl"
                value={formValues.submissionPortalUrl}
                onChange={(e) => updateField("submissionPortalUrl", e.target.value)}
                placeholder="https://easychair.org/conferences/?conf=yourconf"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                CFP Content Sections
              </CardTitle>
              <CardDescription>
                Add sections like &quot;Call for Papers&quot;, &quot;Submission Guidelines&quot;, &quot;Topics&quot;, &quot;Committees&quot;, etc.
                Use arrows to reorder. Supports markdown formatting.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {formValues.blocks.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No content blocks yet.</p>
                  <p className="text-sm mt-1">Click &quot;Add Content Block&quot; to get started.</p>
                </div>
              )}

              {formValues.blocks.map((block, index) => (
                <div key={block.clientKey} className="p-4 border rounded-sm space-y-3 bg-card">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="font-mono text-xs flex-shrink-0">
                      {index + 1}
                    </Badge>
                    <Input
                      placeholder="Section Title (e.g., 'Submission Guidelines')"
                      value={block.title}
                      onChange={(e) => updateBlock(index, { title: e.target.value })}
                      className="flex-1"
                    />
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        disabled={index === 0}
                        onClick={() => moveBlock(index, index - 1)}
                      >
                        <ArrowUp className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        disabled={index === formValues.blocks.length - 1}
                        onClick={() => moveBlock(index, index + 1)}
                      >
                        <ArrowDown className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="text-destructive"
                        onClick={() => deleteBlock(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <Textarea
                    placeholder="Content (supports markdown: **bold**, *italic*, lists, links)"
                    value={block.markdown}
                    onChange={(e) => updateBlock(index, { markdown: e.target.value })}
                    rows={10}
                    className="font-mono text-sm"
                  />
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{block.markdown.length} characters</span>
                    <span className="text-blue-600">
                      Tip: Use **bold**, *italic*, - lists, [links](url)
                    </span>
                  </div>
                </div>
              ))}

              <Button variant="outline" onClick={addBlock} className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Add Content Block
              </Button>
            </CardContent>
          </Card>

          {/* Example Blocks Helper */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Common CFP Sections</CardTitle>
              <CardDescription>Click to add a pre-filled template</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-2">
                {[
                  "Call for Papers",
                  "Submission Guidelines",
                  "Topics of Interest",
                  "Organizing Committee",
                  "Program Committee",
                  "Review Process",
                  "Publication",
                  "Contact Information",
                ].map((template) => (
                  <Button
                    key={template}
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setFormValues((prev) => ({
                        ...prev,
                        blocks: [
                          ...prev.blocks,
                          {
                            clientKey: createClientKey(),
                            title: template,
                            markdown: `Enter content for ${template}...`,
                          },
                        ],
                      }));
                    }}
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    {template}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Preview Tab */}
        <TabsContent value="preview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Public CFP Preview</CardTitle>
              <CardDescription>
                How the &quot;For Authors&quot; tab will appear on the public conference page.
                Deadlines shown below are pulled from your Settings.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="border rounded-sm p-8 bg-background space-y-8">
                {/* Timeline Preview (System-Generated) */}
                {timeline.length > 0 && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xl font-semibold">Important Dates</h3>
                      <Badge variant="secondary" className="text-xs">
                        <Calendar className="h-3 w-3 mr-1" />
                        Auto-generated
                      </Badge>
                    </div>
                    
                    <div className="space-y-3">
                      {timeline.map((entry) => (
                        <div key={entry.key} className="relative sm:pl-36">
                          {/* Date */}
                          <div 
                            className="
                              text-xs text-muted-foreground mb-1
                              sm:absolute sm:left-0 sm:top-1 sm:w-32 sm:text-sm sm:text-right sm:mb-0
                              "
                          >
                            {formatTimelineDateBadge(entry)}
                          </div>
                                              
                          {/* Label + Note */}
                          <div className="border-l pl-6 pb-6">
                            <div className="text-sm font-medium">
                              {entry.label}
                            </div>
                            {entry.note && (
                              <div className="text-xs text-muted-foreground mt-0.5">
                                {entry.note}
                              </div>
                            )}
                          </div>
                        </div>

                      ))}
                    </div>

                    {formValues.submissionPortalUrl.trim() && (
                      <Button className="mt-4" asChild>
                        <a href={formValues.submissionPortalUrl} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-4 w-4 mr-2" />
                          Submit via Portal
                        </a>
                      </Button>
                    )}
                  </div>
                )}

                {/* Content Blocks Preview (User-Generated) */}
                {formValues.blocks.length > 0 ? (
                  formValues.blocks
                    .filter((b) => b.markdown.trim())
                    .map((block) => (
                      <div key={block.clientKey} className="space-y-3 pt-8 border-t">
                        <h3 className="text-xl font-semibold">
                          {block.title || "Untitled Section"}
                        </h3>
                        <SafeMarkdown content={block.markdown} className="prose prose-sm max-w-none" />
                      </div>
                    ))
                ) : (
                  <div className="text-center py-12 text-muted-foreground border-t">
                    <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p>No content blocks added yet.</p>
                    <p className="text-sm mt-1">Switch to the &quot;Content Blocks&quot; tab to add sections.</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      

      <UnsavedChangesBar visible={hasChanges} saving={saving} onUndoAll={undoAll} onSave={handleSave} />
    </div>
  );
}