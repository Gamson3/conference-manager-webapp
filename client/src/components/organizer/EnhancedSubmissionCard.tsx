import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  CheckIcon, 
  XIcon, 
  RefreshCwIcon, 
  Clock, 
  Users, 
  Tag, 
  FileText, 
  Eye, 
  AlertCircle 
} from "lucide-react";
import { Author, Submission } from "@/types/submission";

interface EnhancedSubmissionCardProps {
  submission: Submission;
  onApprove: () => void;
  onReject: () => void;
  onRevisionRequest: () => void;
  onView: () => void;
  onStatusChange: (submission: Submission) => void;
  isSelected: boolean;
  onToggleSelect: () => void;
}

export function EnhancedSubmissionCard({ 
  submission, 
  onApprove, 
  onReject, 
  onRevisionRequest, 
  onView, 
  onStatusChange,
  isSelected,
  onToggleSelect
}: EnhancedSubmissionCardProps) {
  // Calculate days since submission
  const daysSinceSubmission = Math.floor(
    (new Date().getTime() - new Date(submission.createdAt).getTime()) / (1000 * 3600 * 24)
  );
  
  // Determine if this submission needs urgent attention
  const isUrgent = submission.reviewStatus === "PENDING" && daysSinceSubmission > 7;
  
  // Status badge helper
  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'PENDING':
        return <Badge variant="outline" className="bg-blue-50 text-blue-600 border-blue-200">Pending Review</Badge>;
      case 'APPROVED':
        return <Badge className="bg-green-100 text-green-800 border-green-200">Approved</Badge>;
      case 'REJECTED':
        return <Badge className="bg-red-100 text-red-800 border-red-200">Rejected</Badge>;
      case 'REVISION_REQUESTED':
        return <Badge className="bg-amber-100 text-amber-800 border-amber-200">Revision Requested</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };
  
  return (
    <Card className={`bg-gray-50 transition-all ${isUrgent ? 'border-orange-300 shadow-md' : ''} ${isSelected ? 'ring-2 ring-blue-500' : ''}`}>
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          {/* Selection checkbox */}
          <div className="pt-1">
            <Checkbox 
              checked={isSelected} 
              onCheckedChange={onToggleSelect} 
              className="h-5 w-5"
            />
          </div>
          
          <div className="flex flex-col md:flex-row justify-between gap-4 flex-1">
            <div className="flex-1">
              {/* Header with urgency indicator */}
              <div className="flex items-start gap-2">
                {isUrgent && (
                  <span className="inline-flex mt-1">
                    <AlertCircle className="h-5 w-5 text-orange-500" />
                  </span>
                )}
                <div>
                  <h3 className="font-semibold text-lg mb-1">{submission.title}</h3>
                  <div className="flex flex-wrap items-center gap-2 mb-3">
                    {getStatusBadge(submission.reviewStatus)}
                    <span className="text-sm text-gray-500">
                      Submitted {daysSinceSubmission === 0 ? 'today' : daysSinceSubmission === 1 ? 'yesterday' : `${daysSinceSubmission} days ago`}
                    </span>
                    {submission.isLateSubmission === true && (
                      <Badge variant="outline" className="bg-orange-50 text-orange-600 border-orange-200">Late</Badge>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Abstract with better display */}
              <p className="text-sm text-gray-700 mb-4 line-clamp-2">
                {submission.abstract || "No abstract provided"}
              </p>
              
              {/* Key information with icons */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-2 mb-3">
                <div className="flex items-center text-sm text-gray-600">
                  <Users className="h-4 w-4 mr-1 flex-shrink-0" />
                  <span className="truncate">
                    {submission.authors.length} author(s)
                    {submission.authors.some(a => a.isPresenter) ? 
                      <span className="ml-1 text-green-600">(Presenter ✓)</span> : 
                      <span className="ml-1 text-red-600">(No presenter)</span>
                    }
                  </span>
                </div>
                
                <div className="flex items-center text-sm text-gray-600">
                  <Clock className="h-4 w-4 mr-1 flex-shrink-0" />
                  <span className="truncate">
                    {submission.duration || submission.requestedDuration || "?"} minutes
                  </span>
                </div>
                
                {submission.category && (
                  <div className="flex items-center text-sm text-gray-600">
                    <Tag className="h-4 w-4 mr-1 flex-shrink-0" />
                    <span className="truncate">{submission.category.name}</span>
                  </div>
                )}
                
                {submission.presentationType && (
                  <div className="flex items-center text-sm text-gray-600">
                    <FileText className="h-4 w-4 mr-1 flex-shrink-0" />
                    <span className="truncate">{submission.presentationType.name}</span>
                  </div>
                )}
              </div>
              
              {/* Preview primary author - with link to view all */}
              <div className="mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs uppercase text-gray-500 font-medium">Primary Author:</span>
                  {submission.authors[0] ? (
                    <Badge variant="outline" className="bg-gray-50">
                      {submission.authors[0].authorName}
                      {submission.authors[0].isPresenter && <span className="ml-1 text-blue-600">✓</span>}
                    </Badge>
                  ) : (
                    <span className="text-sm text-gray-400 italic">No authors specified</span>
                  )}
                  {submission.authors.length > 1 && (
                    <span className="text-xs text-gray-500">+{submission.authors.length - 1} more</span>
                  )}
                </div>
              </div>
            </div>
            
            {/* Action buttons - compacted for better use of space */}
            <div className="flex md:flex-col gap-2 min-w-[130px]">
              <Button 
                onClick={onView} 
                variant="outline" 
                className="w-full justify-center md:justify-start gap-1"
                size="sm"
              >
                <Eye className="h-4 w-4" />
                <span className="hidden md:inline">View Details</span>
              </Button>
              
              {submission.reviewStatus === 'PENDING' ? (
                <div className="grid grid-cols-3 md:grid-cols-1 gap-1">
                  <Button 
                    onClick={onApprove} 
                    className="bg-green-600 hover:bg-green-700 text-white justify-center md:justify-start"
                    size="sm"
                  >
                    <CheckIcon className="h-4 w-4 md:mr-2" />
                    <span className="hidden md:inline">Approve</span>
                  </Button>
                  <Button 
                    onClick={onReject} 
                    className="bg-red-600 hover:bg-red-700 text-white justify-center md:justify-start"
                    size="sm"
                  >
                    <XIcon className="h-4 w-4 md:mr-2" />
                    <span className="hidden md:inline">Reject</span>
                  </Button>
                  <Button 
                    onClick={onRevisionRequest} 
                    className="bg-amber-600 hover:bg-amber-700 text-white justify-center md:justify-start"
                    size="sm"
                  >
                    <RefreshCwIcon className="h-4 w-4 md:mr-2" />
                    <span className="hidden md:inline">Revision</span>
                  </Button>
                </div>
              ) : (
                <Button 
                  onClick={() => onStatusChange(submission)} 
                  variant="outline" 
                  className="w-full justify-center md:justify-start gap-1"
                  size="sm"
                >
                  <RefreshCwIcon className="h-4 w-4" />
                  <span className="hidden md:inline">Change Status</span>
                </Button>
              )}
            </div>
          </div>
        </div>
        
        {/* Review Comments - Collapsible */}
        {submission.reviewComments && (
          <div className="mt-4 ml-9 border-t pt-4">
            <details className="text-sm">
              <summary className="text-xs uppercase text-gray-500 font-medium cursor-pointer hover:text-gray-700">
                Review Feedback
              </summary>
              <p className="mt-2 text-sm text-gray-700 whitespace-pre-line">{submission.reviewComments}</p>
            </details>
          </div>
        )}
      </CardContent>
    </Card>
  );
}