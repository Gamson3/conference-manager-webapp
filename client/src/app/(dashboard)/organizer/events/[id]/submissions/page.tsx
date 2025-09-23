"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { createAuthenticatedApi } from "@/lib/utils";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertCircle,
  ArrowLeftIcon,
  CheckIcon,
  FileText,
  HelpCircle,
  RefreshCw,
  RefreshCwIcon,
  XIcon,
} from "lucide-react";
import { Submission } from "@/types/submission";
import { SubmissionsDashboard } from "@/components/organizer/SubmissionsDashboard";
import { SubmissionsFilter } from "@/components/organizer/SubmissionsFilter";
import { EnhancedSubmissionCard } from "@/components/organizer/EnhancedSubmissionCard";
import { BatchActionsBar } from "@/components/organizer/BatchActionsBar";
import { SubmissionHelpTipsDialog } from "@/components/organizer/SubmissionHelpTipsDialog";

interface Conference {
  id: number;
  name: string;
  description?: string;
  startDate: string;
  endDate: string;
}

export default function SubmissionReviewPage() {
  const params = useParams();
  const router = useRouter();
  const conferenceId = params.id as string;

  // State
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [conference, setConference] = useState<Conference | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<string>("PENDING");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [sortBy, setSortBy] = useState<string>("newest");
  const [selectedSubmission, setSelectedSubmission] =
    useState<Submission | null>(null);
  const [reviewDialog, setReviewDialog] = useState<boolean>(false);
  const [reviewComments, setReviewComments] = useState<string>("");
  const [reviewAction, setReviewAction] = useState<string>("");
  const [isChangingStatus, setIsChangingStatus] = useState<boolean>(false);
  const [selectedSubmissions, setSelectedSubmissions] = useState<number[]>([]);
  const [batchProcessing, setBatchProcessing] = useState<boolean>(false);
  const [helpTipsVisible, setHelpTipsVisible] = useState<boolean>(false);
  const [showHelpAnimation, setShowHelpAnimation] = useState<boolean>(true);

  const openStatusChangeDialog = (submission: Submission) => {
    setSelectedSubmission(submission);
    setIsChangingStatus(true);
    setReviewComments("");
    setReviewAction("");
    setReviewDialog(true);
  };

  const fetchSubmissions = async () => {
    try {
      setLoading(true);
      const api = await createAuthenticatedApi();
      const conferenceRes = await api.get(
        `/api/conferences/management/${conferenceId}`
      );
      setConference(conferenceRes.data);
      const submissionsRes = await api.get(
        `/api/conferences/${conferenceId}/submissions`
      );
      setSubmissions(submissionsRes.data);
    } catch (error) {
      console.error("Error fetching submissions:", error);
      toast.error("Failed to load submissions");
    } finally {
      setLoading(false);
    }
  };

  const processedSubmissions = React.useMemo(() => {
    let result = [...submissions];
    if (activeTab !== "ALL") {
      result = result.filter((s) => s.reviewStatus === activeTab);
    }
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (s) =>
          s.title.toLowerCase().includes(term) ||
          s.abstract?.toLowerCase().includes(term) ||
          s.authors.some((a) => a.authorName.toLowerCase().includes(term))
      );
    }
    switch (sortBy) {
      case "newest":
        result.sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        break;
      case "oldest":
        result.sort(
          (a, b) =>
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
        break;
      case "title_asc":
        result.sort((a, b) => a.title.localeCompare(b.title));
        break;
      case "title_desc":
        result.sort((a, b) => b.title.localeCompare(a.title));
        break;
    }
    return result;
  }, [submissions, activeTab, searchTerm, sortBy]);

  const handleSubmitReview = async () => {
    if (!selectedSubmission || !reviewAction) return;
    try {
      const api = await createAuthenticatedApi();
      await api.post(`/api/presentations/${selectedSubmission.id}/review`, {
        reviewStatus: reviewAction,
        reviewComments: reviewComments,
      });
      toast.success(
        reviewAction === "APPROVED"
          ? "Submission approved successfully"
          : reviewAction === "REJECTED"
          ? "Submission rejected successfully"
          : reviewAction === "REVISION_REQUESTED"
          ? "Revision requested successfully"
          : "Submission status updated successfully"
      );
      setReviewDialog(false);
      setSelectedSubmission(null);
      setReviewComments("");
      setReviewAction("");
      setIsChangingStatus(false);
      fetchSubmissions();
    } catch (error) {
      console.error("Error submitting review:", error);
      toast.error("Failed to update submission status");
    }
  };

  const openReviewDialog = (submission: Submission, action: string) => {
    setSelectedSubmission(submission);
    setReviewAction(action);
    setReviewComments("");
    setIsChangingStatus(false);
    setReviewDialog(true);
  };

  const handleBatchAction = async (action: string) => {
    if (selectedSubmissions.length === 0) return;
    setBatchProcessing(true);
    const api = await createAuthenticatedApi();
    let successCount = 0;
    let errorCount = 0;
    for (const submissionId of selectedSubmissions) {
      try {
        await api.post(`/api/presentations/${submissionId}/review`, {
          reviewStatus: action,
          reviewComments: `Batch ${action.toLowerCase()} on ${new Date().toLocaleDateString()}`,
        });
        successCount++;
      } catch (error) {
        console.error(`Error processing submission ${submissionId}:`, error);
        errorCount++;
      }
    }
    if (successCount > 0)
      toast.success(`Successfully processed ${successCount} submissions`);
    if (errorCount > 0)
      toast.error(`Failed to process ${errorCount} submissions`);
    setSelectedSubmissions([]);
    setBatchProcessing(false);
    fetchSubmissions();
  };

  const toggleSubmissionSelection = (submissionId: number) => {
    setSelectedSubmissions((prev) =>
      prev.includes(submissionId)
        ? prev.filter((id) => id !== submissionId)
        : [...prev, submissionId]
    );
  };

  const clearFilters = () => {
    setActiveTab("ALL");
    setSearchTerm("");
    setSortBy("newest");
  };

  useEffect(() => {
    fetchSubmissions();
  }, [conferenceId]);

  useEffect(() => {
    const timer = setTimeout(() => setShowHelpAnimation(false), 10000);
    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return (
      <div className="p-6 max-w-[1440px] mx-auto w-full animate-pulse space-y-6">
        <div className="h-8 bg-muted rounded w-1/3 mb-8"></div>
        <div className="h-40 bg-muted rounded mb-8"></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 bg-muted rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full px-4 sm:px-6 lg:px-12 py-6 max-w-[1440px] mx-auto min-h-screen space-y-8 overflow-x-hidden pb-24">
      {/* Back button */}
      <div className="flex items-center gap-2 mb-2">
        <Button variant="ghost" onClick={() => router.back()} className="pl-0">
          <ArrowLeftIcon className="h-4 w-4 mr-2" />
          Back
        </Button>
      </div>

      {/* Header section */}
      <div className="mb-8 p-6 bg-gradient-to-r from-primary-50 to-primary-100 rounded-lg">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-0">
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              Manage Submissions
            </h1>
            <h2 className="text-lg font-medium text-foreground">
              {conference?.name}
            </h2>
            <p className="mt-1 text-muted-foreground">
              Review and manage presentation submissions for this conference.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => setHelpTipsVisible(!helpTipsVisible)}
              variant="ghost"
              size="icon"
              className={`text-muted-foreground relative ${
                showHelpAnimation ? "help-button-glow" : ""
              }`}
            >
              <HelpCircle className="h-4 w-4" />
              {showHelpAnimation && (
                <span className="absolute inset-0 rounded-full animate-ping-slow bg-blue-500/20"></span>
              )}
            </Button>
            <Button onClick={fetchSubmissions} variant="outline" size="icon">
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button
              onClick={() =>
                router.push(`/organizer/events/${conferenceId}/schedule-builder`)
              }
              variant="outline"
            >
              Go to Schedule Builder
            </Button>
          </div>
        </div>
      </div>

      {/* Help tips */}
      <SubmissionHelpTipsDialog
        open={helpTipsVisible}
        onOpenChange={setHelpTipsVisible}
      />

      {/* Dashboard overview */}
      <SubmissionsDashboard
        submissions={submissions}
        onFilterByStatus={setActiveTab}
      />

      {/* Filters and search */}
      <SubmissionsFilter
        activeTab={activeTab}
        searchTerm={searchTerm}
        sortBy={sortBy}
        setActiveTab={setActiveTab}
        setSearchTerm={setSearchTerm}
        setSortBy={setSortBy}
        clearFilters={clearFilters}
      />

      {/* Submissions List */}
      <div className="space-y-4">
        {processedSubmissions.length === 0 ? (
          <div className="text-center py-12 bg-card rounded-lg border border-border">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No submissions found</p>
            {(activeTab !== "ALL" || searchTerm) && (
              <Button variant="link" onClick={clearFilters} className="mt-2">
                Clear filters
              </Button>
            )}
          </div>
        ) : (
          processedSubmissions.map((submission: Submission) => (
            <EnhancedSubmissionCard
              key={submission.id}
              submission={submission}
              onApprove={() => openReviewDialog(submission, "APPROVED")}
              onReject={() => openReviewDialog(submission, "REJECTED")}
              onRevisionRequest={() =>
                openReviewDialog(submission, "REVISION_REQUESTED")
              }
              onView={() =>
                router.push(
                  `/organizer/events/${conferenceId}/submissions/${submission.id}`
                )
              }
              onStatusChange={openStatusChangeDialog}
              isSelected={selectedSubmissions.includes(submission.id)}
              onToggleSelect={() => toggleSubmissionSelection(submission.id)}
            />
          ))
        )}
      </div>

      {/* Review Dialog */}
      <Dialog open={reviewDialog} onOpenChange={setReviewDialog}>
        <DialogContent className="max-w-md bg-card border border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground">
              {isChangingStatus
                ? "Change Submission Status"
                : reviewAction === "APPROVED"
                ? "Approve Submission"
                : reviewAction === "REJECTED"
                ? "Reject Submission"
                : "Request Revision"}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              {selectedSubmission?.title}
            </DialogDescription>
          </DialogHeader>

          {isChangingStatus && (
            <div className="py-4 flex flex-col gap-2">
              <Button
                variant={reviewAction === "APPROVED" ? "default" : "outline"}
                className={
                  reviewAction === "APPROVED"
                    ? "bg-green-600 hover:bg-green-700"
                    : ""
                }
                onClick={() => setReviewAction("APPROVED")}
              >
                <CheckIcon className="h-4 w-4 mr-2" /> Approve Submission
              </Button>
              <Button
                variant={reviewAction === "REJECTED" ? "default" : "outline"}
                className={
                  reviewAction === "REJECTED"
                    ? "bg-red-600 hover:bg-red-700"
                    : ""
                }
                onClick={() => setReviewAction("REJECTED")}
              >
                <XIcon className="h-4 w-4 mr-2" /> Reject Submission
              </Button>
              <Button
                variant={
                  reviewAction === "REVISION_REQUESTED" ? "default" : "outline"
                }
                className={
                  reviewAction === "REVISION_REQUESTED"
                    ? "bg-amber-600 hover:bg-amber-700"
                    : ""
                }
                onClick={() => setReviewAction("REVISION_REQUESTED")}
              >
                <RefreshCwIcon className="h-4 w-4 mr-2" /> Request Revision
              </Button>
              <Button
                variant={reviewAction === "PENDING" ? "default" : "outline"}
                className={
                  reviewAction === "PENDING"
                    ? "bg-blue-600 hover:bg-blue-700"
                    : ""
                }
                onClick={() => setReviewAction("PENDING")}
              >
                Reset to Pending
              </Button>
            </div>
          )}

          <div className="py-4">
            <label className="block text-sm font-medium mb-1 text-foreground">
              Feedback for the author (optional)
            </label>
            <Textarea
              value={reviewComments}
              onChange={(e) => setReviewComments(e.target.value)}
              placeholder="Enter any feedback or comments for the author..."
              rows={4}
            />
          </div>

          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setReviewDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmitReview}
              disabled={isChangingStatus && !reviewAction}
              className={
                reviewAction === "APPROVED"
                  ? "bg-green-600 hover:bg-green-700"
                  : reviewAction === "REJECTED"
                  ? "bg-red-600 hover:bg-red-700"
                  : reviewAction === "REVISION_REQUESTED"
                  ? "bg-amber-600 hover:bg-amber-700"
                  : reviewAction === "PENDING"
                  ? "bg-blue-600 hover:bg-blue-700"
                  : ""
              }
            >
              {isChangingStatus
                ? reviewAction
                  ? `Confirm ${reviewAction.replace("_", " ").toLowerCase()}`
                  : "Select a status"
                : "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Batch actions bar */}
      <BatchActionsBar
        selectedCount={selectedSubmissions.length}
        onBatchApprove={() => handleBatchAction("APPROVED")}
        onBatchReject={() => handleBatchAction("REJECTED")}
        onBatchRevisionRequest={() => handleBatchAction("REVISION_REQUESTED")}
        onClearSelection={() => setSelectedSubmissions([])}
      />
    </div>
  );
}