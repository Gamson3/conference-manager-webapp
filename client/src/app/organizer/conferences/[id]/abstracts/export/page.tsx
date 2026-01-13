"use client";

import { useState } from "react";
import { useParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import endpoints from "@/lib/api/endpoints";
import apiClient, { handleApiError } from "@/lib/api/client";

type StatusFilter = "all" | "draft" | "submitted" | "under_review" | "accepted" | "rejected" | "withdrawn";

export default function AbstractsExportPage() {
  const params = useParams();
  const conferenceId = Number(params?.id);

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);

  const buildUrl = (format: "csv" | "json") => {
    const qs = new URLSearchParams();
    qs.set("format", format);
    if (status !== "all") qs.set("status", status);
    if (search.trim()) qs.set("q", search.trim());
    return endpoints.SUBMISSIONS.EXPORT(conferenceId) + "?" + qs.toString();
  };

  const triggerDownload = async (format: "csv" | "json") => {
    if (!conferenceId || Number.isNaN(conferenceId)) return;
    setDownloading(true);
    setError(undefined);
    try {
      const url = buildUrl(format);
      const res = await apiClient.get(url, { responseType: "blob" });
      const blob = res.data as Blob;
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = format === "csv" ? `submissions-${conferenceId}.csv` : `submissions-${conferenceId}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(downloadUrl);
    } catch (e) {
      setError(handleApiError(e));
    } finally {
      setDownloading(false);
    }
  };

  if (!conferenceId || Number.isNaN(conferenceId)) {
    return <p className="text-sm text-red-500">Invalid conference id.</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Export Submissions</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Download abstracts for offline review or external analysis. Filters match the Abstracts Overview page.
        </p>
      </div>

      {error && (
        <div className="rounded border border-destructive/50 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="space-y-4 rounded-md border bg-background p-4">
        <h2 className="font-semibold mb-1">Filters</h2>
        <p className="text-xs text-muted-foreground mb-3">
          Narrow down which submissions to include in the export.
        </p>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <label className="block text-xs font-medium mb-1">Search</label>
            <Input
              placeholder="Search by title, abstract, or keyword..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="w-full sm:w-[200px]">
            <label className="block text-xs font-medium mb-1">Status</label>
            <Select value={status} onValueChange={(value: StatusFilter) => setStatus(value)}>
              <SelectTrigger>
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="submitted">Submitted</SelectItem>
                <SelectItem value="under_review">Under review</SelectItem>
                <SelectItem value="accepted">Accepted</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="withdrawn">Withdrawn</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="rounded-md border bg-background p-4 space-y-3">
        <h2 className="font-semibold mb-1">Export Format</h2>
        <p className="text-xs text-muted-foreground">
          Choose a format and we&apos;ll trigger a file download using the current filters.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" disabled={downloading} onClick={() => triggerDownload("csv")}>
            Download CSV
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={downloading}
            onClick={() => triggerDownload("json")}
          >
            Download JSON
          </Button>
        </div>
      </div>
    </div>
  );
}
