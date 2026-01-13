"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import { isAxiosError } from "axios";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import endpoints from "@/lib/api/endpoints";
import apiClient, { handleApiError } from "@/lib/api/client";

interface Submission {
  id: number;
  title: string;
  status: string;
  createdAt?: string;
  submittedAt?: string | null;
}

type StatusFilter = "all" | "draft" | "submitted" | "under_review" | "accepted" | "rejected" | "withdrawn";

export default function AbstractsOverviewPage() {
  const params = useParams();
  const router = useRouter();
  const conferenceId = Number(params?.id);

  const [items, setItems] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");

  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [total, setTotal] = useState<number | undefined>(undefined);

  const totalPages = useMemo(() => {
    if (!total) return undefined;
    return Math.max(1, Math.ceil(total / pageSize));
  }, [total, pageSize]);

  useEffect(() => {
    if (!conferenceId) return;

    const qs = new URLSearchParams();
    qs.set("page", String(page));
    qs.set("pageSize", String(pageSize));
    if (status !== "all") qs.set("status", status);
    if (search.trim()) qs.set("q", search.trim());

    setLoading(true);
    setError(undefined);

    const url = endpoints.SUBMISSIONS.LIST(conferenceId) + "?" + qs.toString();

    apiClient.get<Submission[]>(url)
      .then((res) => {
        const totalHeader = res.headers["x-total-count"];
        setTotal(totalHeader ? Number(totalHeader) : undefined);
        setItems(res.data || []);
      })
      .catch((e) => {
        if (isAxiosError(e) && e.code === "ERR_CANCELED") return;
        setError(handleApiError(e));
      })
      .finally(() => setLoading(false));
  }, [conferenceId, page, pageSize, status, search]);

  const handleRowClick = (submissionId: number) => {
    if (!conferenceId) return;
    router.push(`/organizer/conferences/${conferenceId}/submissions/${submissionId}`);
  };

  if (!conferenceId || Number.isNaN(conferenceId)) {
    return <p className="text-sm text-red-500">Invalid conference id.</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Abstracts Overview</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Track drafts, submitted abstracts, reviews, and decisions for this conference.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push(`/organizer/conferences/${conferenceId}/abstracts/export`)}
          >
            Export
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 items-center mb-4">
        <div className="w-full sm:w-auto flex-1 sm:flex-none">
          <Input
            placeholder="Search by title, abstract, or keyword..."
            value={search}
            onChange={(e) => {
              setPage(1);
              setSearch(e.target.value);
            }}
          />
        </div>

        <Select
          value={status}
          onValueChange={(value: StatusFilter) => {
            setPage(1);
            setStatus(value);
          }}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
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

      {error && (
        <div className="mb-4 rounded border border-destructive/50 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="border rounded-md overflow-hidden bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[40%]">Title</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="hidden md:table-cell">Created</TableHead>
              <TableHead className="hidden md:table-cell">Submitted</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={4} className="py-6 text-center text-sm text-muted-foreground">
                  Loading submissions...
                </TableCell>
              </TableRow>
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="py-6 text-center text-sm text-muted-foreground">
                  No submissions found for the current filters.
                </TableCell>
              </TableRow>
            ) : (
              items.map((submission) => (
                <TableRow
                  key={submission.id}
                  className="cursor-pointer hover:bg-muted/60"
                  onClick={() => handleRowClick(submission.id)}
                >
                  <TableCell className="font-medium">
                    {submission.title}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="uppercase tracking-wide text-[11px]">
                      {submission.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-xs text-muted-foreground">
                    {submission.createdAt ? new Date(submission.createdAt).toLocaleString() : "—"}
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-xs text-muted-foreground">
                    {submission.submittedAt ? new Date(submission.submittedAt).toLocaleString() : "—"}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages && totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 text-xs text-muted-foreground">
          <div>
            Page {page} of {totalPages}
            {typeof total === "number" && ` • ${total} submissions`}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= (totalPages || 1)}
              onClick={() => setPage((p) => (totalPages ? Math.min(totalPages, p + 1) : p + 1))}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
