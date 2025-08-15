"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createAuthenticatedApi } from "@/lib/utils";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeftIcon, CheckIcon, RefreshCwIcon, XIcon } from "lucide-react";
import { MaterialsSection } from "@/components/organizer/MaterialsSection";
import { NAVBAR_HEIGHT } from "@/lib/constants";

export default function OrganizerReviewPage() {
  const params = useParams();
  const router = useRouter();
  const conferenceId = params.id as string;
  const submissionId = params.submissionId as string;

  const [loading, setLoading] = useState(true);
  const [submission, setSubmission] = useState<any>(null);
  const [reviewComments, setReviewComments] = useState("");
  const [reviewScores, setReviewScores] = useState<Record<string, number>>({});
  const [statusHistory, setStatusHistory] = useState<
    { date: string; action: string }[]
  >([]);

  useEffect(() => {
    fetchSubmissionDetails();
  }, [submissionId]);

  const fetchSubmissionDetails = async () => {
    try {
      setLoading(true);
      const api = await createAuthenticatedApi();
      const response = await api.get(`/api/presentations/${submissionId}`);

      const submissionData = response.data;
      setSubmission(submissionData);
      setReviewComments(submissionData.reviewComments || "");

      // Create status history from review data
      if (submissionData.reviewedAt) {
        setStatusHistory([
          {
            date: new Date(submissionData.reviewedAt).toLocaleDateString(),
            action: `Status changed to ${submissionData.reviewStatus}`,
          },
        ]);
      } else {
        setStatusHistory([
          {
            date: new Date(submissionData.createdAt).toLocaleDateString(),
            action: "Submission received",
          },
        ]);
      }
    } catch (error) {
      console.error("Error fetching submission details:", error);
      toast.error("Failed to load submission details");
    } finally {
      setLoading(false);
    }
  };

  const handleReviewAction = async (status: string) => {
    try {
      const api = await createAuthenticatedApi();
      await api.post(`/api/presentations/${submissionId}/review`, {
        reviewStatus: status,
        reviewComments,
        reviewScores,
      });

      // Format the status for user-friendly display
      const formattedStatus = status
        .toLowerCase()
        .replace(/_/g, ' ') // Replace underscores with spaces
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');

      toast.success(`Submission ${formattedStatus}`);
    } catch (error) {
      console.error("Error updating submission status:", error);
      toast.error("Failed to update submission status");
    }
  };

  const updateReviewScore = (criterion: string, score: number) => {
    setReviewScores((prev) => ({
      ...prev,
      [criterion]: score,
    }));
  };

  if (loading) {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-8"></div>
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div className="lg:col-span-1 h-64 bg-gray-200 rounded"></div>
            <div className="lg:col-span-1 h-64 bg-gray-200 rounded"></div>
            <div className="lg:col-span-2 space-y-6">
              <div className="h-24 bg-gray-200 rounded"></div>
              <div className="h-64 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!submission) {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <Card className="p-6 text-center">
          <p className="mb-4">Submission not found</p>
          <Button
            onClick={() =>
              router.push(`/organizer/events/${conferenceId}/submissions`)
            }
            variant="outline"
          >
            <ArrowLeftIcon className="h-4 w-4 mr-2" />
            Back to Submissions
          </Button>
        </Card>
      </div>
    );
  }

  // Define review criteria
  const reviewCriteria = [
    {
      id: "relevance",
      label: "Relevance to Conference",
      score: reviewScores.relevance || 0,
    },
    {
      id: "quality",
      label: "Technical Quality",
      score: reviewScores.quality || 0,
    },
    {
      id: "originality",
      label: "Originality",
      score: reviewScores.originality || 0,
    },
    { id: "clarity", label: "Clarity", score: reviewScores.clarity || 0 },
  ];

  // Map submission data to expected format
  const title = submission.title;
  const abstract = submission.abstract;
  const keywords = submission.keywords || [];
  const track = submission.category?.name || "Uncategorized";
  const type = submission.presentationType?.name || "Standard";
  const duration = submission.duration || submission.requestedDuration || 0;

  // Map author data
  const authors = submission.authors || [];
  const author = authors.find((a: any) => a.isPresenter) || authors[0] || {};
  const coAuthors = authors.filter((a: any) => a.id !== author.id);

  // Map attachments
  const attachments = (submission.materials || []).map((m: any) => ({
    name: m.title || m.name,
    url: m.fileUrl,
    size: m.fileSize,
  }));

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Prominent Header with Title and Actions */}
      <div className="mb-6 bg-white border rounded-lg shadow-sm p-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
          <div className="flex flex-wrap gap-2 mt-2 items-center">
            <Badge
              className={
                submission.reviewStatus === "APPROVED"
                  ? "bg-green-100 text-green-800"
                  : submission.reviewStatus === "REJECTED"
                  ? "bg-red-100 text-red-800"
                  : submission.reviewStatus === "REVISION_REQUESTED"
                  ? "bg-amber-100 text-amber-800"
                  : "bg-blue-100 text-blue-800"
              }
            >
              {submission.reviewStatus === "PENDING"
                ? "Pending Review"
                : submission.reviewStatus === "APPROVED"
                ? "Approved"
                : submission.reviewStatus === "REJECTED"
                ? "Rejected"
                : "Revision Requested"}
            </Badge>
            <span className="text-sm text-gray-500">
              Submitted on{" "}
              {new Date(submission.createdAt).toLocaleDateString()}
            </span>
          </div>
        </div>
      </div>

      {/* Main Content - Two Panel Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Review Panel - 2/3 width */}
        <div className="lg:col-span-2 space-y-6">
          {/* Abstract - With Empty State */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center">
                <span className="mr-2">📄</span> Abstract
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {abstract ? (
                <p className="whitespace-pre-wrap text-gray-700">{abstract}</p>
              ) : (
                <p className="text-gray-500 italic">No abstract provided for this submission</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center">
                <span className="mr-2">📎</span> Supporting Materials{" "}
                {attachments.length > 0 && `(${attachments.length})`}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {attachments.length > 0 ? (
                <MaterialsSection attachments={attachments} />
              ) : (
                <div className="py-6 text-center">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-100 mb-3">
                    <span className="text-xl">📄</span>
                  </div>
                  <p className="text-gray-500">
                    No supporting materials were submitted with this presentation.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Improved Review Form */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center">
                <span className="mr-2">⭐</span> Review Assessment
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-6">
                {reviewCriteria.map((criteria) => (
                  <div key={criteria.id} className="space-y-2">
                    <label className="block font-medium">
                      {criteria.label}
                    </label>
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((score) => (
                        <button
                          key={score}
                          type="button"
                          onClick={() => updateReviewScore(criteria.id, score)}
                          className={`w-10 h-10 rounded-full flex items-center justify-center ${
                            reviewScores[criteria.id] === score
                              ? "bg-blue-100 border-2 border-blue-500 text-blue-700 font-bold"
                              : "bg-gray-50 border border-gray-200 hover:bg-gray-100"
                          }`}
                        >
                          {score}
                        </button>
                      ))}
                      <span className="ml-3 text-sm text-gray-500">
                        {!reviewScores[criteria.id]
                          ? "Not rated"
                          : reviewScores[criteria.id] <= 2
                          ? "Poor"
                          : reviewScores[criteria.id] === 3
                          ? "Average"
                          : reviewScores[criteria.id] === 4
                          ? "Good"
                          : "Excellent"}
                      </span>
                    </div>
                  </div>
                ))}

                <div className="mt-6">
                  <label className="block font-medium mb-2">
                    Comments to Author
                  </label>
                  <Textarea
                    className="min-h-[150px]"
                    value={reviewComments}
                    placeholder="Provide constructive feedback about the submission..."
                    onChange={(e) => setReviewComments(e.target.value)}
                  />
                </div>

                {/* <Button 
                variant="outline" 
                onClick={() => handleReviewAction("PENDING")}
                className="w-full mt-4"
                >
                  Reset to Pending Review
                </Button> */}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right: Information Sidebar */}
        <div className="space-y-6 pb-4">
          <Card className="border-2 border-gray-200">
            <CardContent className="p-4 space-y-4">
              {/* Top Row: Approve, Reject, Request Revision */}
              <div className="grid grid-cols-11 gap-1">
                <Button
                  className="col-span-3 bg-green-600 hover:bg-green-700 text-white"
                  onClick={() => handleReviewAction("APPROVED")}
                >
                  <CheckIcon className="h-3 w-3" /> 
                  Approve
                </Button>
                <Button
                  className="col-span-3 bg-red-600 hover:bg-red-700 text-white"
                  onClick={() => handleReviewAction("REJECTED")}
                >
                  <XIcon className="h-3 w-3" /> 
                  Reject
                </Button>
                <Button
                  className="col-span-5 bg-amber-600 hover:bg-amber-700 text-white"
                  onClick={() => handleReviewAction("REVISION_REQUESTED")}
                >
                  <RefreshCwIcon className="h-3 w-3" /> 
                  Request Revision
                </Button>
              </div>
              {/* Bottom Row: Reset to Pending (full width) */}
            <Button 
              variant="outline" 
              onClick={() => handleReviewAction("PENDING")}
              className="w-full"
            >
              Reset to Pending Review
            </Button>
            </CardContent>
          </Card>
          {/* Submission Details Card */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Submission Details</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <dl className="divide-y">
                <div className="py-2 flex justify-between">
                  <dt className="text-sm text-gray-500">Category</dt>
                  <dd className="text-sm font-medium">{track}</dd>
                </div>
                <div className="py-2 flex justify-between">
                  <dt className="text-sm text-gray-500">Presentation Type</dt>
                  <dd className="text-sm font-medium">{type}</dd>
                </div>
                <div className="py-2 flex justify-between">
                  <dt className="text-sm text-gray-500">Duration</dt>
                  <dd className="text-sm font-medium">{duration} mins</dd>
                </div>
                {/* <div className="py-2 flex justify-between">
                  <dt className="text-sm text-gray-500">Keywords</dt>
                  <dd className="text-sm font-medium">{keywords?.join(", ")}</dd>
                </div> */}
              </dl>
              <div className="mt-4 pt-2 border-t">
                <h3 className="font-medium text-sm mb-2">Keywords</h3>
                <div className="flex flex-wrap gap-1">
                  {keywords.length > 0 ? (
                    keywords.map((keyword: string, idx: number) => (
                      <Badge key={idx} variant="outline" className="bg-blue-50 text-xs">
                        {keyword}
                      </Badge>
                    ))
                  ) : (
                    <p className="text-sm text-gray-500">
                      No keywords specified
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
          {/* Author Info Card - With Empty State */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Author Information</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {author.authorName ? (
                <>
                  <div className="mb-4 pb-4 border-b">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium">{author.authorName}</p>
                        <p className="text-sm text-gray-600">
                          {author.authorEmail}
                        </p>
                        {author.affiliation && (
                          <p className="text-sm text-gray-600">
                            {author.affiliation}
                          </p>
                        )}
                      </div>
                      {author.isPresenter && (
                        <Badge className="bg-blue-100 text-blue-800">
                          Presenter
                        </Badge>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <div className="py-3 text-center">
                  <p className="text-gray-500">
                    No primary author information available
                  </p>
                </div>
              )}
              {/* Co-authors with empty state */}
              <div>
                <h3 className="font-medium text-sm mb-2">
                  Co-authors {coAuthors?.length > 0 && `(${coAuthors.length})`}
                </h3>
                {coAuthors?.length > 0 ? (
                  <ul className="space-y-2">
                    {coAuthors.map((co: any) => (
                      <li key={co.id} className="text-sm">
                        <div className="flex justify-between">
                          <span>{co.authorName}</span>
                          {co.isPresenter && (
                            <Badge className="bg-blue-100 text-blue-800 text-xs">
                              Presenter
                            </Badge>
                          )}
                        </div>
                        {co.affiliation && (
                          <span className="text-gray-500 text-xs block">
                            {co.affiliation}
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-gray-500">
                    No co-authors listed for this submission
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
          {/* Review History Card */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Review History</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-3">
                {statusHistory.map((status, i) => (
                  <div key={i} className="flex items-center gap-3 text-sm">
                    <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                    <div>
                      <p className="font-medium">{status.action.replace("_", " ")}</p>
                      <p className="text-gray-500 text-xs">{status.date}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          {/* Navigation Actions */}
          <Button
            variant="outline"
            className="w-full"
            onClick={() =>
              router.push(`/organizer/events/${conferenceId}/submissions`)
            }
          >
            <ArrowLeftIcon className="h-4 w-4 mr-2" />
            Back to All Submissions
          </Button>
        </div>
      
      </div>
    </div>
  );
}
