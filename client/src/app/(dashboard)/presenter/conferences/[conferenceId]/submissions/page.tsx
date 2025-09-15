'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowLeft, Plus, Edit, Eye, Trash2, AlertCircle, FileText, Calendar } from 'lucide-react';
import { AbstractSubmission, ConferenceSubmissionInfo } from '@/types/submission';

interface SubmissionsPageProps {
  params: {
    conferenceId: string;
  };
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'SUBMITTED': return 'default';
    case 'UNDER_REVIEW': return 'secondary';
    case 'ACCEPTED': return 'default';
    case 'REJECTED': return 'destructive';
    case 'REVISION_REQUESTED': return 'outline';
    case 'WITHDRAWN': return 'secondary';
    default: return 'secondary';
  }
};

const getStatusVariant = (status: string) => {
  switch (status) {
    case 'ACCEPTED': return 'bg-green-100 text-green-800';
    case 'REJECTED': return 'bg-red-100 text-red-800';
    case 'UNDER_REVIEW': return 'bg-blue-100 text-blue-800';
    case 'REVISION_REQUESTED': return 'bg-yellow-100 text-yellow-800';
    default: return '';
  }
};

export default function SubmissionsPage({ params }: SubmissionsPageProps) {
  const [submissions, setSubmissions] = useState<AbstractSubmission[]>([]);
  const [submissionInfo, setSubmissionInfo] = useState<ConferenceSubmissionInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  
  const conferenceId = parseInt(params.conferenceId);

  useEffect(() => {
    fetchSubmissions();
    fetchSubmissionInfo();
  }, [conferenceId]);

  const fetchSubmissions = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/conferences/${conferenceId}/submissions`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setSubmissions(data);
      } else {
        setError('Failed to load submissions');
      }
    } catch (error) {
      console.error('Error fetching submissions:', error);
      setError('Failed to load submissions');
    }
  };

  const fetchSubmissionInfo = async () => {
    try {
      const response = await fetch(`/api/conferences/${conferenceId}/submission-info`);
      if (response.ok) {
        const data = await response.json();
        setSubmissionInfo(data);
      }
    } catch (error) {
      console.error('Error fetching submission info:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleWithdraw = async (submissionId: number) => {
    if (!confirm('Are you sure you want to withdraw this submission?')) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/submissions/${submissionId}/withdraw`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        fetchSubmissions(); // Refresh the list
      } else {
        setError('Failed to withdraw submission');
      }
    } catch (error) {
      console.error('Error withdrawing submission:', error);
      setError('Failed to withdraw submission');
    }
  };

  const canEdit = (submission: AbstractSubmission) => {
    return ['DRAFT', 'REVISION_REQUESTED'].includes(submission.status);
  };

  const canWithdraw = (submission: AbstractSubmission) => {
    return !['ACCEPTED', 'WITHDRAWN'].includes(submission.status);
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/2"></div>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <Button 
          variant="ghost" 
          onClick={() => router.push(`/conferences/${conferenceId}`)}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Conference
        </Button>
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold">My Submissions</h1>
            <p className="text-muted-foreground mt-2">
              {submissionInfo?.conference.name}
            </p>
          </div>
          {submissionInfo?.isSubmissionOpen && (
            <Button onClick={() => router.push(`/presenter/conferences/${conferenceId}/submit`)}>
              <Plus className="h-4 w-4 mr-2" />
              New Submission
            </Button>
          )}
        </div>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {submissions.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <FileText className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">No submissions yet</h3>
            <p className="text-muted-foreground mb-6">
              You haven't submitted any proposals for this conference.
            </p>
            {submissionInfo?.isSubmissionOpen && (
              <Button onClick={() => router.push(`/presenter/conferences/${conferenceId}/submit`)}>
                <Plus className="h-4 w-4 mr-2" />
                Submit Your First Proposal
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {submissions.map((submission) => (
            <Card key={submission.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="space-y-2">
                    <CardTitle className="text-xl">{submission.title}</CardTitle>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        Submitted {new Date(submission.submissionDate).toLocaleDateString()}
                      </div>
                      {submission.presentationType && (
                        <Badge variant="outline">
                          {submission.presentationType.name}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <Badge 
                    variant={getStatusColor(submission.status)}
                    className={getStatusVariant(submission.status)}
                  >
                    {submission.status.replace('_', ' ')}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <p className="text-muted-foreground line-clamp-2">
                    {submission.content}
                  </p>
                  
                  {submission.keywords.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {submission.keywords.slice(0, 5).map((keyword) => (
                        <Badge key={keyword} variant="secondary" className="text-xs">
                          {keyword}
                        </Badge>
                      ))}
                      {submission.keywords.length > 5 && (
                        <Badge variant="secondary" className="text-xs">
                          +{submission.keywords.length - 5} more
                        </Badge>
                      )}
                    </div>
                  )}

                  {submission.reviews.length > 0 && (
                    <div className="bg-muted p-3 rounded-lg">
                      <h4 className="font-medium mb-2">Reviews</h4>
                      {submission.reviews.map((review) => (
                        <div key={review.id} className="text-sm">
                          <p className="text-muted-foreground">
                            Score: {review.score}/5 - {review.recommendation}
                          </p>
                          {review.comments && (
                            <p className="mt-1">{review.comments}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push(`/presenter/conferences/${conferenceId}/submissions/${submission.id}`)}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      View Details
                    </Button>
                    
                    {canEdit(submission) && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => router.push(`/presenter/conferences/${conferenceId}/submit?edit=${submission.id}`)}
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </Button>
                    )}
                    
                    {canWithdraw(submission) && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleWithdraw(submission.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Withdraw
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}