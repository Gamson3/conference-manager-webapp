"use client";

import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import apiClient from "@/lib/api/client";
import { API_ENDPOINTS } from "@/lib/api/endpoints";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  FileText, 
  Search, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  Send,
  FileEdit,
  ExternalLink,
  Calendar,
  Lock
} from "lucide-react";
import Link from "next/link";
import { format, formatDistanceToNow, isPast } from "date-fns";

interface Submission {
  id: number;
  title: string;
  abstract: string;
  keywords: string[];
  status: 'draft' | 'submitted' | 'under_review' | 'accepted' | 'rejected' | 'revision_requested' | 'withdrawn';
  submittedAt: string;
  updatedAt: string;
  revisionFeedback?: string | null;
  revisionRequestedAt?: string | null;
  resubmittedAt?: string | null;
  isLocked: boolean;
  lockedAt: string | null;
  lockedReason: string | null;
  conference: {
    id: number;
    name: string;
    slug: string;
    startDate: string;
    endDate: string;
    submissionsOpenUntil: string | null;
  };
}

const statusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  draft: { 
    label: 'Draft', 
    color: 'bg-gray-100 text-gray-800', 
    icon: <FileEdit className="h-3.5 w-3.5" /> 
  },
  submitted: { 
    label: 'Submitted', 
    color: 'bg-blue-100 text-blue-800', 
    icon: <Send className="h-3.5 w-3.5" /> 
  },
  under_review: { 
    label: 'Under Review', 
    color: 'bg-yellow-100 text-yellow-800', 
    icon: <Clock className="h-3.5 w-3.5" /> 
  },
  accepted: { 
    label: 'Accepted', 
    color: 'bg-green-100 text-green-800', 
    icon: <CheckCircle2 className="h-3.5 w-3.5" /> 
  },
  rejected: { 
    label: 'Rejected', 
    color: 'bg-red-100 text-red-800', 
    icon: <XCircle className="h-3.5 w-3.5" /> 
  },
  revision_requested: { 
    label: 'Revision Requested', 
    color: 'bg-orange-100 text-orange-800', 
    icon: <AlertCircle className="h-3.5 w-3.5" /> 
  },
  withdrawn: { 
    label: 'Withdrawn', 
    color: 'bg-gray-100 text-gray-500', 
    icon: <XCircle className="h-3.5 w-3.5" /> 
  },
};

type StatusTab = 'all' | 'draft' | 'submitted' | 'under_review' | 'accepted' | 'rejected';

export default function MySubmissionsPage() {
  const [activeTab, setActiveTab] = useState<StatusTab>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const { data: submissions, isLoading, error } = useQuery<Submission[]>({
    queryKey: ['user-submissions'],
    queryFn: async () => {
      const response = await apiClient.get(API_ENDPOINTS.ACCOUNT.MY_SUBMISSIONS);
      return response.data;
    }
  });

  const filteredSubmissions = useMemo(() => {
    if (!submissions) return [];
    
    let filtered = submissions;

    // Filter by tab/status
    if (activeTab !== 'all') {
      filtered = filtered.filter(s => s.status === activeTab);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(s => 
        s.title.toLowerCase().includes(query) ||
        s.abstract.toLowerCase().includes(query) ||
        s.keywords.some(k => k.toLowerCase().includes(query)) ||
        s.conference.name.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [submissions, activeTab, searchQuery]);

  const statusCounts = useMemo(() => {
    if (!submissions) return { all: 0, draft: 0, submitted: 0, under_review: 0, accepted: 0, rejected: 0 };
    return {
      all: submissions.length,
      draft: submissions.filter(s => s.status === 'draft').length,
      submitted: submissions.filter(s => s.status === 'submitted').length,
      under_review: submissions.filter(s => s.status === 'under_review').length,
      accepted: submissions.filter(s => s.status === 'accepted').length,
      rejected: submissions.filter(s => s.status === 'rejected' || s.status === 'withdrawn').length,
    };
  }, [submissions]);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Failed to load submissions</h2>
        <p className="text-gray-500">{error.message}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Submissions</h1>
        <p className="mt-1 text-gray-500">
          Track and manage your abstract submissions across all conferences.
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as StatusTab)}>
          <TabsList className="grid grid-cols-3 sm:grid-cols-6 gap-1">
            <TabsTrigger value="all" className="text-xs sm:text-sm">
              All ({statusCounts.all})
            </TabsTrigger>
            <TabsTrigger value="draft" className="text-xs sm:text-sm">
              Drafts ({statusCounts.draft})
            </TabsTrigger>
            <TabsTrigger value="submitted" className="text-xs sm:text-sm">
              Submitted ({statusCounts.submitted})
            </TabsTrigger>
            <TabsTrigger value="under_review" className="text-xs sm:text-sm">
              In Review ({statusCounts.under_review})
            </TabsTrigger>
            <TabsTrigger value="accepted" className="text-xs sm:text-sm">
              Accepted ({statusCounts.accepted})
            </TabsTrigger>
            <TabsTrigger value="rejected" className="text-xs sm:text-sm">
              Rejected ({statusCounts.rejected})
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input 
            placeholder="Search submissions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-5 w-3/4 mb-2" />
                <Skeleton className="h-4 w-1/2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-20 w-full" />
              </CardContent>
              <CardFooter>
                <Skeleton className="h-9 w-24" />
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && filteredSubmissions.length === 0 && (
        <Card className="py-12">
          <div className="flex flex-col items-center text-center">
            <FileText className="h-12 w-12 text-gray-300 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {searchQuery || activeTab !== 'all' 
                ? 'No matching submissions'
                : 'No submissions yet'
              }
            </h3>
            <p className="text-gray-500 mb-6 max-w-sm">
              {searchQuery || activeTab !== 'all' 
                ? 'Try adjusting your filters or search query.'
                : 'Submit your first abstract to a conference to see it here.'
              }
            </p>
            <Button asChild>
              <Link href="/conferences">
                <ExternalLink className="mr-2 h-4 w-4" />
                Browse Conferences
              </Link>
            </Button>
          </div>
        </Card>
      )}

      {/* Submissions Grid */}
      {!isLoading && filteredSubmissions.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2">
          {filteredSubmissions.map((submission) => {
            const config = statusConfig[submission.status] || statusConfig.draft;
            const deadlinePassed = submission.conference.submissionsOpenUntil 
              ? isPast(new Date(submission.conference.submissionsOpenUntil))
              : false;

            return (
              <Card key={submission.id} className="flex flex-col">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1 flex-1 min-w-0">
                      <CardTitle className="text-base line-clamp-2">{submission.title}</CardTitle>
                      <CardDescription className="flex items-center gap-2">
                        <Link 
                          href={`/conferences/${submission.conference.slug || submission.conference.id}`}
                          className="hover:text-primary transition-colors line-clamp-1"
                        >
                          {submission.conference.name}
                        </Link>
                      </CardDescription>
                    </div>
                    <Badge className={`${config.color} shrink-0 flex items-center gap-1`}>
                      {config.icon}
                      {config.label}
                    </Badge>
                  </div>
                </CardHeader>
                
                <CardContent className="pb-3 flex-1">
                  <p className="text-sm text-gray-600 line-clamp-3 mb-3">
                    {submission.abstract}
                  </p>

                  {submission.status === "revision_requested" && submission.revisionFeedback && (
                    <div className="mb-3 p-2 bg-orange-50 border border-orange-200 rounded-md">
                      <p className="text-xs font-medium text-orange-900 mb-1">Revision feedback</p>
                      <p className="text-xs text-orange-800 line-clamp-3">{submission.revisionFeedback}</p>
                    </div>
                  )}
                  
                  {/* Lock Status */}
                  {submission.isLocked && (
                    <div className="flex items-center gap-2 mb-3 p-2 bg-yellow-50 border border-yellow-200 rounded-md">
                      <Lock className="h-4 w-4 text-yellow-700" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-yellow-900">Locked</p>
                        <p className="text-xs text-yellow-700">
                          {submission.lockedReason || 'This submission cannot be edited'}
                        </p>
                      </div>
                    </div>
                  )}
                  
                  {/* Keywords */}
                  {submission.keywords.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {submission.keywords.slice(0, 3).map((keyword, i) => (
                        <Badge key={i} variant="outline" className="text-xs">
                          {keyword}
                        </Badge>
                      ))}
                      {submission.keywords.length > 3 && (
                        <Badge variant="outline" className="text-xs text-muted-foreground">
                          +{submission.keywords.length - 3} more
                        </Badge>
                      )}
                    </div>
                  )}
                  
                  {/* Metadata */}
                  <div className="text-xs text-gray-500 space-y-1">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5" />
                      <span>
                        Added {formatDistanceToNow(new Date(submission.submittedAt), { addSuffix: true })}
                      </span>
                    </div>
                    {submission.status !== 'draft' && (
                      <div className="flex items-center gap-1.5">
                        <Send className="h-3.5 w-3.5" />
                        <span>
                          Submitted {format(new Date(submission.submittedAt), 'MMM d, yyyy')}
                        </span>
                      </div>
                    )}
                    {submission.conference.submissionsOpenUntil && (
                      <div className={`flex items-center gap-1.5 ${deadlinePassed ? 'text-red-500' : ''}`}>
                        <Clock className="h-3.5 w-3.5" />
                        <span>
                          {deadlinePassed 
                            ? 'Deadline passed'
                            : `Deadline: ${format(new Date(submission.conference.submissionsOpenUntil), 'MMM d, yyyy')}`
                          }
                        </span>
                      </div>
                    )}
                  </div>
                </CardContent>
                
                <CardFooter className="pt-3 border-t gap-2">
                  {submission.status === 'draft' && !deadlinePassed && !submission.isLocked && (
                    <>
                      <Button size="sm" variant="outline" asChild>
                        <Link href={`/conferences/${submission.conference.slug || submission.conference.id}/submit?edit=${submission.id}`}>
                          <FileEdit className="mr-1.5 h-3.5 w-3.5" />
                          Edit
                        </Link>
                      </Button>
                      <Button size="sm" asChild>
                        <Link href={`/conferences/${submission.conference.slug || submission.conference.id}/submit/preview?draftId=${submission.id}`}>
                          <Send className="mr-1.5 h-3.5 w-3.5" />
                          Submit
                        </Link>
                      </Button>
                    </>
                  )}
                  {submission.status === 'revision_requested' && !submission.isLocked && (
                    <>
                      <Button size="sm" variant="outline" asChild>
                        <Link href={`/conferences/${submission.conference.slug || submission.conference.id}/submit?edit=${submission.id}`}>
                          <FileEdit className="mr-1.5 h-3.5 w-3.5" />
                          Edit
                        </Link>
                      </Button>
                      <Button size="sm" asChild>
                        <Link href={`/conferences/${submission.conference.slug || submission.conference.id}/submit/preview?draftId=${submission.id}`}>
                          <Send className="mr-1.5 h-3.5 w-3.5" />
                          Resubmit
                        </Link>
                      </Button>
                    </>
                  )}
                  {submission.status === 'draft' && submission.isLocked && (
                    <p className="text-sm text-yellow-600 flex items-center gap-1.5">
                      <Lock className="h-3.5 w-3.5" />
                      This submission is locked
                    </p>
                  )}
                  {submission.status === 'revision_requested' && submission.isLocked && (
                    <p className="text-sm text-yellow-600 flex items-center gap-1.5">
                      <Lock className="h-3.5 w-3.5" />
                      This submission is locked
                    </p>
                  )}
                  {submission.status === 'draft' && deadlinePassed && !submission.isLocked && (
                    <p className="text-sm text-red-500">Submission deadline has passed</p>
                  )}
                  {submission.status !== 'draft' && (
                    <Button size="sm" variant="outline" asChild>
                      <Link href={`/account/my-submissions/${submission.id}`}>
                        <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                        View Details
                      </Link>
                    </Button>
                  )}
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
