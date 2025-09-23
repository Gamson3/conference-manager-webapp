import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { CheckIcon, XIcon, RefreshCwIcon, Clock, AlertCircle } from "lucide-react";
import { Submission } from "@/types/submission";

interface SubmissionsDashboardProps {
  submissions: Submission[];
  onFilterByStatus: (status: string) => void;
}

export function SubmissionsDashboard({ submissions, onFilterByStatus }: SubmissionsDashboardProps) {
  const pending = submissions.filter(s => s.reviewStatus === "PENDING").length;
  const approved = submissions.filter(s => s.reviewStatus === "APPROVED").length;
  const rejected = submissions.filter(s => s.reviewStatus === "REJECTED").length;
  const revision = submissions.filter(s => s.reviewStatus === "REVISION_REQUESTED").length;
  const lateSubmissions = submissions.filter(s => s.isLateSubmission).length;

  const sortedSubmissions = [...submissions].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  const mostRecentSubmission = sortedSubmissions[0];

  return (
    <Card className="mb-6 bg-card shadow-sm">
      <CardContent className="p-4 sm:p-6">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <h2 className="text-base sm:text-lg font-semibold text-foreground">Submission Overview</h2>
            {mostRecentSubmission && (
              <span className="text-xs sm:text-sm text-muted-foreground">
                Last submission: {new Date(mostRecentSubmission.createdAt).toLocaleDateString()}
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
            {/* Pending */}
            <button
              onClick={() => onFilterByStatus("PENDING")}
              className="w-full flex flex-col items-center p-3 rounded-lg border border-blue-200 bg-blue-50 hover:bg-blue-100 transition-colors"
            >
              <Clock className="h-5 w-5 sm:h-6 sm:w-6 text-primary mt-0.5 mb-2 flex-shrink-0" />
              <span className="text-[11px] sm:text-xs font-medium text-foreground">Pending Review</span>
              <span className="text-xl sm:text-2xl font-bold text-foreground">{pending}</span>
            </button>

            {/* Approved */}
            <button
              onClick={() => onFilterByStatus("APPROVED")}
              className="w-full flex flex-col items-center p-3 rounded-lg border border-green-200 bg-green-50 hover:bg-green-100 transition-colors"
            >
              <CheckIcon className="h-5 w-5 sm:h-6 sm:w-6 text-accent mt-0.5 mb-2 flex-shrink-0" />
              <span className="text-[11px] sm:text-xs font-medium text-foreground">Approved</span>
              <span className="text-xl sm:text-2xl font-bold text-foreground">{approved}</span>
            </button>

            {/* Rejected */}
            <button
              onClick={() => onFilterByStatus("REJECTED")}
              className="w-full flex flex-col items-center p-3 rounded-lg border border-red-200 bg-red-50 hover:bg-red-100 transition-colors"
            >
              <XIcon className="h-5 w-5 sm:h-6 sm:w-6 text-destructive mt-0.5 mb-2 flex-shrink-0" />
              <span className="text-[11px] sm:text-xs font-medium text-foreground">Rejected</span>
              <span className="text-xl sm:text-2xl font-bold text-foreground">{rejected}</span>
            </button>

            {/* Needs Revision */}
            <button
              onClick={() => onFilterByStatus("REVISION_REQUESTED")}
              className="w-full flex flex-col items-center p-3 rounded-lg border border-amber-200 bg-amber-50 hover:bg-amber-100 transition-colors"
            >
              <RefreshCwIcon className="h-5 w-5 sm:h-6 sm:w-6 text-accent mt-0.5 mb-2 flex-shrink-0" />
              <span className="text-[11px] sm:text-xs font-medium text-foreground">Needs Revision</span>
              <span className="text-xl sm:text-2xl font-bold text-foreground">{revision}</span>
            </button>

            {/* Late Submissions */}
            <button
              onClick={() => onFilterByStatus("LATE")}
              className="w-full flex flex-col items-center p-3 rounded-lg border border-orange-200 bg-orange-50 hover:bg-orange-100 transition-colors"
            >
              <AlertCircle className="h-5 w-5 sm:h-6 sm:w-6 text-destructive mt-0.5 mb-2 flex-shrink-0" />
              <span className="text-[11px] sm:text-xs font-medium text-foreground">Late Submissions</span>
              <span className="text-xl sm:text-2xl font-bold text-foreground">{lateSubmissions}</span>
            </button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}