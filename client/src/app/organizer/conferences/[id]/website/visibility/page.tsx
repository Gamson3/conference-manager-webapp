"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import apiClient, { handleApiError } from "@/lib/api/client";
import { API_ENDPOINTS } from "@/lib/api/endpoints";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { Globe, Calendar, FileText, Users, AlertTriangle, Lock, Eye, ChevronRight } from "lucide-react";

interface VisibilitySettings {
  conferenceId: number;
  isPublic: boolean;
  status: string;
  schedulePublished: boolean;
  schedulePublishedAt: string | null;
  abstractsVisibility: "public" | "private" | "invite_only";
  registrationOpen: boolean;
  registrationOpenFrom: string | null;
  registrationOpenUntil: string | null;
}

type VisibilityFormValues = Pick<VisibilitySettings, "isPublic" | "abstractsVisibility">;

export default function VisibilityPage() {
  const params = useParams();
  const conferenceId = Number(params?.id);

  const [settings, setSettings] = useState<VisibilitySettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [formValues, setFormValues] = useState<VisibilityFormValues>({
    isPublic: false,
    abstractsVisibility: "private",
  });

  const fetchSettings = useCallback(async () => {
    if (!conferenceId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get(API_ENDPOINTS.ORGANIZER.VISIBILITY(conferenceId));
      setSettings(res.data);
      setFormValues({
        isPublic: res.data.isPublic,
        abstractsVisibility: res.data.abstractsVisibility,
      });
    } catch (err) {
      setError(handleApiError(err));
    } finally {
      setLoading(false);
    }
  }, [conferenceId]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await apiClient.put(API_ENDPOINTS.ORGANIZER.VISIBILITY(conferenceId), formValues);
      setSettings(res.data);
      toast.success("Visibility settings updated");
    } catch (err) {
      toast.error(handleApiError(err));
    } finally {
      setSaving(false);
    }
  };

  const hasChanges = settings &&
    (formValues.isPublic !== settings.isPublic ||
     formValues.abstractsVisibility !== settings.abstractsVisibility);

  if (!conferenceId) return null;
  if (loading) return <p className="text-muted-foreground">Loading...</p>;
  if (error) return <p className="text-destructive">{error}</p>;
  if (!settings) return null;

  return (
    <div className="space-y-6">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
        <a href="../website" className="hover:text-foreground transition-colors">Website</a>
        <ChevronRight className="h-4 w-4" />
        <span className="text-foreground font-medium">Visibility</span>
      </div>

      <div>
        <h1 className="text-2xl font-semibold">Website Visibility</h1>
        <p className="text-muted-foreground mt-1">
          Control what is visible to the public and attendees.
        </p>
      </div>

      {/* Conference Visibility */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Conference Visibility
          </CardTitle>
          <CardDescription>
            Controls whether the conference appears in public listings.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-base">Public Conference</Label>
              <p className="text-sm text-muted-foreground">
                When enabled, the conference will be visible in search results and public listings.
              </p>
            </div>
            <Switch
              checked={formValues.isPublic}
              onCheckedChange={(checked) => setFormValues((v) => ({ ...v, isPublic: checked }))}
            />
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={formValues.isPublic ? "default" : "secondary"}>
              {formValues.isPublic ? (
                <><Eye className="h-3 w-3 mr-1" /> Visible</>
              ) : (
                <><Lock className="h-3 w-3 mr-1" /> Hidden</>
              )}
            </Badge>
            <span className="text-sm text-muted-foreground">
              Status: {settings.status}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Schedule Visibility */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Schedule Visibility
          </CardTitle>
          <CardDescription>
            Current schedule publication status (managed from the Program section).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <Badge variant={settings.schedulePublished ? "default" : "secondary"}>
              {settings.schedulePublished ? "Published" : "Unpublished"}
            </Badge>
            {settings.schedulePublishedAt && (
              <span className="text-sm text-muted-foreground">
                Since {new Date(settings.schedulePublishedAt).toLocaleDateString()}
              </span>
            )}
          </div>
          {!settings.schedulePublished && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                The schedule is not yet published. Go to <strong>Program → Scheduler</strong> to publish it.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Abstracts Visibility */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Abstracts Visibility
          </CardTitle>
          <CardDescription>
            Control who can view presentation abstracts and details.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <RadioGroup
            value={formValues.abstractsVisibility}
            onValueChange={(value: VisibilitySettings["abstractsVisibility"]) =>
              setFormValues((v) => ({ ...v, abstractsVisibility: value }))
            }
            className="space-y-3"
          >
            <div className="flex items-start space-x-3">
              <RadioGroupItem value="public" id="abstracts-public" className="mt-1" />
              <div>
                <Label htmlFor="abstracts-public" className="font-medium">Public</Label>
                <p className="text-sm text-muted-foreground">
                  Anyone can view abstracts and submission details.
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <RadioGroupItem value="invite_only" id="abstracts-invite" className="mt-1" />
              <div>
                <Label htmlFor="abstracts-invite" className="font-medium">Registered Attendees Only</Label>
                <p className="text-sm text-muted-foreground">
                  Only registered attendees can view abstracts.
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <RadioGroupItem value="private" id="abstracts-private" className="mt-1" />
              <div>
                <Label htmlFor="abstracts-private" className="font-medium">Private</Label>
                <p className="text-sm text-muted-foreground">
                  Abstracts are hidden from attendees (reviewers and organizers only).
                </p>
              </div>
            </div>
          </RadioGroup>
        </CardContent>
      </Card>

      {/* Registration Status (Read-only) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Registration Status
          </CardTitle>
          <CardDescription>
            Registration window status (managed from Settings → Deadlines).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <Badge variant={settings.registrationOpen ? "default" : "secondary"}>
              {settings.registrationOpen ? "Open" : "Closed"}
            </Badge>
          </div>
          {settings.registrationOpenFrom && settings.registrationOpenUntil && (
            <p className="text-sm text-muted-foreground">
              Registration window: {new Date(settings.registrationOpenFrom).toLocaleDateString()} – {new Date(settings.registrationOpenUntil).toLocaleDateString()}
            </p>
          )}
          {!settings.registrationOpen && !settings.registrationOpenFrom && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Registration dates not configured. Go to <strong>Settings → Deadlines</strong> to set them.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving || !hasChanges}>
          {saving ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </div>
  );
}
