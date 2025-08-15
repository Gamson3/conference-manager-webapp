import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { CheckIcon, XIcon, RefreshCwIcon, Clock, AlertCircle } from "lucide-react";
import { Submission } from "@/types/submission";

interface SubmissionsDashboardProps {
  submissions: Submission[];
  onFilterByStatus: (status: string) => void;
}

export function SubmissionsDashboard({ submissions, onFilterByStatus }: SubmissionsDashboardProps) {
  // Calculate statistics
  const pending = submissions.filter(s => s.reviewStatus === "PENDING").length;
  const approved = submissions.filter(s => s.reviewStatus === "APPROVED").length;
  const rejected = submissions.filter(s => s.reviewStatus === "REJECTED").length;
  const revision = submissions.filter(s => s.reviewStatus === "REVISION_REQUESTED").length;
  const lateSubmissions = submissions.filter(s => s.isLateSubmission).length;
  
  // Sort submissions by creation date to find most recent
  const sortedSubmissions = [...submissions].sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  
  const mostRecentSubmission = sortedSubmissions[0];
  
  return (
    <Card className="mb-6 bg-white shadow-sm">
      <CardContent className="p-6">
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Submission Overview</h2>
            {mostRecentSubmission && (
              <span className="text-sm text-gray-500">
                Last submission: {new Date(mostRecentSubmission.createdAt).toLocaleDateString()}
              </span>
            )}
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <button 
              onClick={() => onFilterByStatus("PENDING")}
              className="flex flex-col items-center p-3 rounded-lg border border-blue-200 bg-blue-50 hover:bg-blue-100 transition-colors"
            >
              <Clock className="h-6 w-6 text-blue-600 mb-2" />
              <span className="text-xs text-blue-800 font-medium">Pending Review</span>
              <span className="text-2xl font-bold text-blue-700">{pending}</span>
            </button>
            
            <button 
              onClick={() => onFilterByStatus("APPROVED")}
              className="flex flex-col items-center p-3 rounded-lg border border-green-200 bg-green-50 hover:bg-green-100 transition-colors"
            >
              <CheckIcon className="h-6 w-6 text-green-600 mb-2" />
              <span className="text-xs text-green-800 font-medium">Approved</span>
              <span className="text-2xl font-bold text-green-700">{approved}</span>
            </button>
            
            <button 
              onClick={() => onFilterByStatus("REJECTED")}
              className="flex flex-col items-center p-3 rounded-lg border border-red-200 bg-red-50 hover:bg-red-100 transition-colors"
            >
              <XIcon className="h-6 w-6 text-red-600 mb-2" />
              <span className="text-xs text-red-800 font-medium">Rejected</span>
              <span className="text-2xl font-bold text-red-700">{rejected}</span>
            </button>
            
            <button 
              onClick={() => onFilterByStatus("REVISION_REQUESTED")}
              className="flex flex-col items-center p-3 rounded-lg border border-amber-200 bg-amber-50 hover:bg-amber-100 transition-colors"
            >
              <RefreshCwIcon className="h-6 w-6 text-amber-600 mb-2" />
              <span className="text-xs text-amber-800 font-medium">Needs Revision</span>
              <span className="text-2xl font-bold text-amber-700">{revision}</span>
            </button>
            
            <button 
              onClick={() => onFilterByStatus("LATE")}
              className="flex flex-col items-center p-3 rounded-lg border border-orange-200 bg-orange-50 hover:bg-orange-100 transition-colors"
            >
              <AlertCircle className="h-6 w-6 text-orange-600 mb-2" />
              <span className="text-xs text-orange-800 font-medium">Late Submissions</span>
              <span className="text-2xl font-bold text-orange-700">{lateSubmissions}</span>
            </button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}