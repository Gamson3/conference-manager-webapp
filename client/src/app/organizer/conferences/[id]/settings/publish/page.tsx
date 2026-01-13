"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import {
  getConferenceById,
  updateConference,
  publishConference,
  unpublishConference,
  publishSchedule,
  unpublishSchedule,
} from "@/features/conferences/api/conferencesApi";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import type { Conference } from "@/types/conference";

export default function PublishPage() {
  const params = useParams();
  const conferenceId = Number(params?.id);

  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);
  const [conference, setConference] = useState<Conference | null>(null);

  const loadConference = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getConferenceById(conferenceId);
      setConference(data);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Failed to load conference";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [conferenceId]);

  useEffect(() => {
    if (!conferenceId) return;
    loadConference();
  }, [conferenceId, loadConference]);

  const handleTogglePublic = async (isPublic: boolean) => {
    setWorking(true);
    try {
      await updateConference(conferenceId, { isPublic });
      toast.success(isPublic ? "Conference is now public" : "Conference is now private");
      await loadConference();
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Failed to update";
      toast.error(message);
    } finally {
      setWorking(false);
    }
  };

  const handlePublishConference = async () => {
    setWorking(true);
    try {
      await publishConference(conferenceId);
      toast.success("Conference published");
      await loadConference();
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Failed to publish";
      toast.error(message);
    } finally {
      setWorking(false);
    }
  };

  const handleUnpublishConference = async () => {
    setWorking(true);
    try {
      await unpublishConference(conferenceId);
      toast.success("Conference unpublished");
      await loadConference();
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Failed to unpublish";
      toast.error(message);
    } finally {
      setWorking(false);
    }
  };

  const handlePublishSchedule = async () => {
    setWorking(true);
    try {
      await publishSchedule(conferenceId);
      toast.success("Schedule published");
      await loadConference();
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Failed to publish schedule";
      toast.error(message);
    } finally {
      setWorking(false);
    }
  };

  const handleUnpublishSchedule = async () => {
    setWorking(true);
    try {
      await unpublishSchedule(conferenceId);
      toast.success("Schedule unpublished");
      await loadConference();
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Failed to unpublish schedule";
      toast.error(message);
    } finally {
      setWorking(false);
    }
  };

  if (!conferenceId) return null;
  if (loading) return <p className="text-muted-foreground">Loading…</p>;
  if (!conference) return <p className="text-destructive">Conference not found</p>;

  const isPublished = conference.status === "published";
  const isSchedulePublished = !!conference.schedulePublishedAt;

  return (
    <section className="space-y-10">
      {/* HEADER */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Publish Conference</h1>
        <p className="text-muted-foreground">
          Control public visibility and schedule publishing for your conference.
        </p>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="space-y-8">
        {/* VISIBILITY TOGGLE */}
        <Card className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Label htmlFor="visibility" className="text-base font-semibold">
                  Public Visibility
                </Label>
                <Badge variant={conference.isPublic ? "default" : "secondary"}>
                  {conference.isPublic ? "Public" : "Private"}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {conference.isPublic
                  ? "Conference is visible to all users"
                  : "Conference is only visible to organizers"}
              </p>
            </div>
            <Switch
              id="visibility"
              checked={conference.isPublic}
              onCheckedChange={handleTogglePublic}
              disabled={working}
            />
          </div>
        </Card>

        <Separator />

        {/* CONFERENCE STATUS */}
        <Card className="p-6 space-y-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold">Conference Status</h2>
              <Badge variant={isPublished ? "default" : "outline"}>{conference.status}</Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {isPublished
                ? "Conference is live and accepting registrations (based on window settings)"
                : "Conference is in draft mode"}
            </p>
          </div>

          <div className="flex gap-3">
            {!isPublished ? (
              <Button onClick={handlePublishConference} disabled={working}>
                {working ? "Publishing…" : "Publish Conference"}
              </Button>
            ) : (
              <Button variant="outline" onClick={handleUnpublishConference} disabled={working}>
                {working ? "Unpublishing…" : "Unpublish Conference"}
              </Button>
            )}
          </div>

          {!isPublished && (
            <div className="rounded-lg bg-muted/50 p-4">
              <p className="text-sm">
                <strong>Note:</strong> Publishing will make the conference discoverable and allow users to view
                details. Registration and submission windows are controlled separately via deadlines.
              </p>
            </div>
          )}
        </Card>

        <Separator />

        {/* SCHEDULE PUBLISHING */}
        <Card className="p-6 space-y-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold">Schedule Publishing</h2>
              <Badge variant={isSchedulePublished ? "default" : "outline"}>
                {isSchedulePublished ? "Published" : "Draft"}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {isSchedulePublished
                ? `Schedule was published on ${new Date(conference.schedulePublishedAt!).toLocaleDateString()}`
                : "Schedule is in draft mode and only visible to organizers"}
            </p>
          </div>

          <div className="flex gap-3">
            {!isSchedulePublished ? (
              <Button onClick={handlePublishSchedule} disabled={working}>
                {working ? "Publishing…" : "Publish Schedule"}
              </Button>
            ) : (
              <Button variant="outline" onClick={handleUnpublishSchedule} disabled={working}>
                {working ? "Unpublishing…" : "Unpublish Schedule"}
              </Button>
            )}
          </div>

          {!isSchedulePublished && (
            <div className="rounded-lg bg-muted/50 p-4">
              <p className="text-sm">
                <strong>Tip:</strong> Publish the schedule when your program is finalized. Attendees will be able
                to view sessions, speakers, and build their personal schedule.
              </p>
            </div>
          )}
        </Card>

        {/* PUBLISHING CHECKLIST */}
        <Card className="p-6 space-y-4 bg-muted/30">
          <h3 className="font-semibold">Publishing Checklist</h3>
          <ul className="space-y-2 text-sm">
            <li className="flex items-start gap-2">
              <span className={conference.name ? "text-green-600" : "text-muted-foreground"}>
                {conference.name ? "✓" : "○"}
              </span>
              <span>Conference title and description</span>
            </li>
            <li className="flex items-start gap-2">
              <span className={conference.startDate && conference.endDate ? "text-green-600" : "text-muted-foreground"}>
                {conference.startDate && conference.endDate ? "✓" : "○"}
              </span>
              <span>Start and end dates</span>
            </li>
            <li className="flex items-start gap-2">
              <span className={conference.location ? "text-green-600" : "text-muted-foreground"}>
                {conference.location ? "✓" : "○"}
              </span>
              <span>Location details</span>
            </li>
            <li className="flex items-start gap-2">
              <span className={conference.bannerImageUrl ? "text-green-600" : "text-muted-foreground"}>
                {conference.bannerImageUrl ? "✓" : "○"}
              </span>
              <span>Conference banner/logo</span>
            </li>
          </ul>
        </Card>
      </div>
    </section>
  );
}

    