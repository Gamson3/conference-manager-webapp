"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import apiClient, { handleApiError } from "@/lib/api/client";
import { API_ENDPOINTS } from "@/lib/api/endpoints";
import { openSubmissionFile, submissionHasFile } from "@/lib/api/fileAccess";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Eye,
  ArrowLeft,
  User,
  Mail,
  Calendar,
  Tag,
  Star,
  Send,
  Download,
  Loader2,
  RotateCcw,
} from "lucide-react";
import { toast } from "sonner";

interface AuthorEntry {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  affiliations?: string[];
  phone?: string;
  orcid?: string;
  isPresenter: boolean;
  order: number;
}

interface SubmissionDetail {
  id: number;
  title: string;
  abstract?: string;
  keywords?: string[];
  abstractFileUrl?: string | null;
  abstractFileKey?: string | null;
  abstractFileName?: string | null;
  abstractFileMimeType?: string | null;
  abstractFileSizeBytes?: number | null;
  fullTextFileUrl?: string | null;
  fullTextFileKey?: string | null;
  fullTextFileName?: string | null;
  fullTextFileMimeType?: string | null;
  fullTextFileSizeBytes?: number | null;
  status: string;
  createdAt: string;
  submittedAt: string | null;
  revisionFeedback?: string | null;
  revisionRequestedAt?: string | null;
  resubmittedAt?: string | null;
  author: {
    id: number;
    name: string;
    email: string;
    organization?: string;
  };
  authors?: AuthorEntry[];
  coAuthors?: Array<{
    name: string;
    email?: string;
    organization?: string;
  }>;
  category?: {
    id: number;
    name: string;
  };
  presentationType?: {
    id: number;
    name: string;
  };
  reviews?: Array<{
    id: number;
    score: number;
    comments?: string;
    reviewer?: {
      name: string;
    };
    createdAt: string;
  }>;
  customResponses?: Record<string, unknown>;
}

const statusConfig: Record<string, { color: string; bgColor: string; borderColor: string; icon: typeof Clock; label: string }> = {
  draft: { color: "text-gray-500", bgColor: "bg-gray-500/10", borderColor: "border-gray-500/30", icon: FileText, label: "Draft" },
  submitted: { color: "text-blue-500", bgColor: "bg-blue-500/10", borderColor: "border-blue-500/30", icon: Clock, label: "Submitted" },
  under_review: { color: "text-amber-500", bgColor: "bg-amber-500/10", borderColor: "border-amber-500/30", icon: Eye, label: "Under Review" },
  accepted: { color: "text-green-500", bgColor: "bg-green-500/10", borderColor: "border-green-500/30", icon: CheckCircle2, label: "Accepted" },
  rejected: { color: "text-red-500", bgColor: "bg-red-500/10", borderColor: "border-red-500/30", icon: XCircle, label: "Rejected" },
  revision_requested: { color: "text-orange-500", bgColor: "bg-orange-500/10", borderColor: "border-orange-500/30", icon: AlertCircle, label: "Revision Requested" },
  withdrawn: { color: "text-gray-400", bgColor: "bg-gray-400/10", borderColor: "border-gray-400/30", icon: XCircle, label: "Withdrawn" },
};

export default function SubmissionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const conferenceId = Number(params?.id);
  const submissionId = Number(params?.submissionId);

  const [submission, setSubmission] = useState<SubmissionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Review form
  const [reviewScore, setReviewScore] = useState("");
  const [reviewComments, setReviewComments] = useState("");
  const [savingReview, setSavingReview] = useState(false);

  // Decision state
  const [savingDecision, setSavingDecision] = useState(false);

  // Revision request state
  const [revisionFeedback, setRevisionFeedback] = useState("");

  const fetchSubmission = useCallback(async () => {
    if (!conferenceId || !submissionId) return;
    setLoading(true);
    setError(null);

    try {
      // Get from list (no single submission endpoint)
      const res = await apiClient.get(API_ENDPOINTS.ORGANIZER.SUBMISSIONS(conferenceId));
      const list = res.data.submissions || res.data || [];
      const found = list.find((s: SubmissionDetail) => s.id === submissionId);
      if (!found) throw new Error("Submission not found");
      setSubmission(found);
    } catch (err) {
      setError(handleApiError(err));
    } finally {
      setLoading(false);
    }
  }, [conferenceId, submissionId]);

  useEffect(() => {
    fetchSubmission();
  }, [fetchSubmission]);

  const handleSaveReview = async () => {
    const score = Number(reviewScore);
    if (isNaN(score) || score < 0 || score > 100) {
      toast.error("Score must be a number between 0 and 100");
      return;
    }

    setSavingReview(true);
    try {
      await apiClient.post(API_ENDPOINTS.ORGANIZER.SUBMISSION_REVIEW(submissionId), {
        score,
        comments: reviewComments || undefined,
      });
      toast.success("Review saved successfully");
      fetchSubmission();
      setReviewScore("");
      setReviewComments("");
    } catch (err) {
      toast.error(handleApiError(err));
    } finally {
      setSavingReview(false);
    }
  };

  const handleDecision = async (decision: "accepted" | "rejected") => {
    setSavingDecision(true);
    try {
      await apiClient.post(API_ENDPOINTS.ORGANIZER.SUBMISSION_DECISION(submissionId), { decision });
      toast.success(`Submission marked as ${decision.replace(/_/g, " ")}`);
      fetchSubmission();
    } catch (err) {
      toast.error(handleApiError(err));
    } finally {
      setSavingDecision(false);
    }
  };

  const handleRequestRevision = async (): Promise<void> => {
    const feedback = revisionFeedback.trim();
    if (feedback.length === 0) {
      toast.error("Feedback is required");
      return;
    }

    setSavingDecision(true);
    try {
      await apiClient.post(API_ENDPOINTS.ORGANIZER.SUBMISSION_REQUEST_REVISION(submissionId), {
        feedback,
      });
      toast.success("Revision requested");
      setRevisionFeedback("");
      fetchSubmission();
    } catch (err) {
      toast.error(handleApiError(err));
    } finally {
      setSavingDecision(false);
    }
  };

  const handleStartReview = async (): Promise<void> => {
    setSavingDecision(true);
    try {
      await apiClient.post(API_ENDPOINTS.ORGANIZER.SUBMISSION_START_REVIEW(submissionId));
      toast.success("Submission moved to under review");
      fetchSubmission();
    } catch (err) {
      toast.error(handleApiError(err));
    } finally {
      setSavingDecision(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "—";
    return new Date(dateString).toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (!conferenceId || !submissionId) {
    return <p className="text-destructive">Invalid conference or submission ID</p>;
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <Skeleton className="h-48" />
            <Skeleton className="h-32" />
          </div>
          <div className="space-y-6">
            <Skeleton className="h-40" />
            <Skeleton className="h-64" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !submission) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 text-destructive">
              <AlertCircle className="h-5 w-5" />
              <p>{error || "Submission not found"}</p>
            </div>
            <Button variant="outline" className="mt-4" onClick={fetchSubmission}>
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const config = statusConfig[submission.status] || statusConfig.submitted;
  const StatusIcon = config.icon;
  const canReview = ["submitted", "under_review"].includes(submission.status);
  const canDecide = ["submitted", "under_review"].includes(submission.status);
  const canRequestRevision = submission.status === "under_review";
  const canStartReview = submission.status === "submitted";
  const averageScore = submission.reviews?.length
    ? Math.round(submission.reviews.reduce((sum, r) => sum + r.score, 0) / submission.reviews.length)
    : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <Button
          variant="ghost"
          className="w-fit"
          onClick={() => router.push(`/organizer/conferences/${conferenceId}/home/submissions`)}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Submissions
        </Button>

        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold">{submission.title}</h1>
            <div className="flex flex-wrap items-center gap-3">
              <Badge className={`${config.bgColor} ${config.color} ${config.borderColor} border`}>
                <StatusIcon className="h-3 w-3 mr-1" />
                {config.label}
              </Badge>
              {submission.presentationType && (
                <Badge variant="outline">{submission.presentationType.name}</Badge>
              )}
              {submission.category && (
                <Badge variant="secondary">{submission.category.name}</Badge>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          {canDecide && (
            <div className="flex gap-2">
              {canStartReview && (
                <Button variant="outline" onClick={handleStartReview} disabled={savingDecision}>
                  <Eye className="h-4 w-4 mr-2" />
                  Start Review
                </Button>
              )}

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="default" className="bg-green-600 hover:bg-green-700" disabled={savingDecision}>
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Accept
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Accept Submission</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to accept this submission? The author will be notified.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => handleDecision("accepted")}>
                      Accept
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" className="text-red-600 border-red-200 hover:bg-red-50" disabled={savingDecision}>
                    <XCircle className="h-4 w-4 mr-2" />
                    Reject
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Reject Submission</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to reject this submission? The author will be notified.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => handleDecision("rejected")} className="bg-red-600 hover:bg-red-700">
                      Reject
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              {canRequestRevision && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" disabled={savingDecision}>
                      <RotateCcw className="h-4 w-4 mr-2" />
                      Request Revision
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Request Revision</AlertDialogTitle>
                      <AlertDialogDescription>
                        Provide feedback for the author. This will unlock the submission for edits.
                      </AlertDialogDescription>
                    </AlertDialogHeader>

                    <div className="space-y-2">
                      <Label htmlFor="revisionFeedback">Feedback</Label>
                      <Textarea
                        id="revisionFeedback"
                        value={revisionFeedback}
                        onChange={(e) => setRevisionFeedback(e.target.value)}
                        placeholder="Describe what needs to change before resubmission..."
                        rows={6}
                      />
                    </div>

                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleRequestRevision}
                        disabled={savingDecision || revisionFeedback.trim().length === 0}
                      >
                        Request Revision
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Abstract */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                Abstract
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-sm leading-relaxed">
                {submission.abstract || "No abstract provided."}
              </p>
            </CardContent>
          </Card>

          {/* Abstract File */}
          {submissionHasFile(submission, 'abstract') && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Download className="h-5 w-5 text-primary" />
                  Abstract File
                </CardTitle>
              </CardHeader>
              <CardContent className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">
                    {submission.abstractFileName || "abstract"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {submission.abstractFileMimeType || ""}
                    {submission.abstractFileSizeBytes != null ? ` • ${Math.round(submission.abstractFileSizeBytes / 1024)} KB` : ""}
                  </p>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => openSubmissionFile(submission.id, 'abstract')}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Open
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Full Text */}
          {submissionHasFile(submission, 'fulltext') && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Download className="h-5 w-5 text-primary" />
                  Full Text
                </CardTitle>
              </CardHeader>
              <CardContent className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">
                    {submission.fullTextFileName || "full text"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {submission.fullTextFileMimeType || ""}
                    {submission.fullTextFileSizeBytes != null ? ` • ${Math.round(submission.fullTextFileSizeBytes / 1024)} KB` : ""}
                  </p>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => openSubmissionFile(submission.id, 'fulltext')}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Open
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Keywords */}
          {submission.keywords && submission.keywords.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Tag className="h-5 w-5 text-primary" />
                  Keywords
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {submission.keywords.map((keyword, idx) => (
                    <Badge key={idx} variant="secondary">
                      {keyword}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Reviews */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Star className="h-5 w-5 text-primary" />
                  Reviews
                  {submission.reviews?.length ? (
                    <Badge variant="outline">{submission.reviews.length}</Badge>
                  ) : null}
                </div>
                {averageScore !== null && (
                  <div className="text-sm text-muted-foreground">
                    Avg: <span className="font-semibold text-foreground">{averageScore}/100</span>
                  </div>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {submission.reviews && submission.reviews.length > 0 ? (
                <div className="space-y-4">
                  {submission.reviews.map((review, idx) => (
                    <div key={review.id || idx} className="p-4 rounded-lg bg-muted/50 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Star className="h-4 w-4 text-amber-500" />
                          <span className="font-semibold">{review.score}/100</span>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {review.reviewer?.name || "Reviewer"} • {formatDate(review.createdAt)}
                        </span>
                      </div>
                      {review.comments && (
                        <p className="text-sm text-muted-foreground">{review.comments}</p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-4">No reviews yet</p>
              )}

              {/* Add Review Form */}
              {canReview && (
                <>
                  <Separator className="my-6" />
                  <div className="space-y-4">
                    <h4 className="text-sm font-medium">Add Review</h4>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="score">Score (0-100)</Label>
                        <Input
                          id="score"
                          type="number"
                          min={0}
                          max={100}
                          value={reviewScore}
                          onChange={(e) => setReviewScore(e.target.value)}
                          placeholder="Enter score"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="comments">Comments (optional)</Label>
                      <Textarea
                        id="comments"
                        value={reviewComments}
                        onChange={(e) => setReviewComments(e.target.value)}
                        placeholder="Add comments for the review committee..."
                        rows={3}
                      />
                    </div>
                    <Button onClick={handleSaveReview} disabled={savingReview || !reviewScore}>
                      {savingReview ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Send className="h-4 w-4 mr-2" />
                          Submit Review
                        </>
                      )}
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Author Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5 text-primary" />
                Authors
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {submission.authors && submission.authors.length > 0 ? (
                <>
                  {submission.authors.map((author, idx) => {
                    const displayName = `${author.firstName} ${author.lastName}`.trim() || author.email;
                    const affiliation = author.affiliations?.join(", ");
                    return (
                      <div key={author.id || idx} className="space-y-2">
                        {idx > 0 && <Separator />}
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <User className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">
                              {displayName}
                              {author.isPresenter && (
                                <Badge variant="secondary" className="ml-2 text-xs">Presenter</Badge>
                              )}
                            </p>
                            {affiliation && (
                              <p className="text-sm text-muted-foreground">
                                {affiliation}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="space-y-1 ml-13">
                          <a
                            href={`mailto:${author.email}`}
                            className="flex items-center gap-2 text-sm text-primary hover:underline"
                          >
                            <Mail className="h-4 w-4" />
                            {author.email}
                          </a>
                        </div>
                      </div>
                    );
                  })}
                </>
              ) : (
                /* Fallback to legacy author field */
                <>
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{submission.author.name}</p>
                      {submission.author.organization && (
                        <p className="text-sm text-muted-foreground">
                          {submission.author.organization}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <a
                      href={`mailto:${submission.author.email}`}
                      className="flex items-center gap-2 text-sm text-primary hover:underline"
                    >
                      <Mail className="h-4 w-4" />
                      {submission.author.email}
                    </a>
                  </div>

                  {submission.coAuthors && submission.coAuthors.length > 0 && (
                    <>
                      <Separator />
                      <div>
                        <p className="text-sm font-medium mb-2">Co-Authors</p>
                        <div className="space-y-2">
                          {submission.coAuthors.map((coAuthor, idx) => (
                            <div key={idx} className="text-sm">
                              <p>{coAuthor.name}</p>
                              {coAuthor.organization && (
                                <p className="text-xs text-muted-foreground">{coAuthor.organization}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                Timeline
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="mt-1 h-2 w-2 rounded-full bg-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Created</p>
                  <p className="text-xs text-muted-foreground">{formatDate(submission.createdAt)}</p>
                </div>
              </div>
              {submission.submittedAt && (
                <div className="flex items-start gap-3">
                  <div className="mt-1 h-2 w-2 rounded-full bg-blue-500" />
                  <div>
                    <p className="text-sm font-medium">Submitted</p>
                    <p className="text-xs text-muted-foreground">{formatDate(submission.submittedAt)}</p>
                  </div>
                </div>
              )}
              {(submission.status === "accepted" || submission.status === "rejected") && (
                <div className="flex items-start gap-3">
                  <div className={`mt-1 h-2 w-2 rounded-full ${submission.status === "accepted" ? "bg-green-500" : "bg-red-500"}`} />
                  <div>
                    <p className="text-sm font-medium capitalize">{submission.status}</p>
                    <p className="text-xs text-muted-foreground">Decision made</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
