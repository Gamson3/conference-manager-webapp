'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowLeft, Edit, Download, Calendar, User, FileText } from 'lucide-react';
import { AbstractSubmission } from '@/types/submission';

interface SubmissionDetailsPageProps {
  params: {
    conferenceId: string;
    submissionId: string;
  };
}

export default function SubmissionDetailsPage({ params }: SubmissionDetailsPageProps) {
  const [submission, setSubmission] = useState<AbstractSubmission | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const conferenceId = parseInt(params.conferenceId);
  const submissionId = parseInt(params.submissionId);

  useEffect(() => {
    fetchSubmission();
  }, [submissionId]);

  const fetchSubmission = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/submissions/${submissionId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setSubmission(data);
      } else {
        setError('Submission not found');
      }
    } catch (error) {
      console.error('Error fetching submission:', error);
      setError('Failed to load submission');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/2"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (error || !submission) {
    return (
      <div className="container mx-auto p-6">
        <Alert variant="destructive">
          <AlertDescription>{error || 'Submission not found'}</AlertDescription>
        </Alert>
      </div>
    );
  }

  const canEdit = ['DRAFT', 'REVISION_REQUESTED'].includes(submission.status);

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <Button 
          variant="ghost" 
          onClick={() => router.push(`/presenter/conferences/${conferenceId}/submissions`)}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Submissions
        </Button>
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold mb-2">{submission.title}</h1>
            <div className="flex items-center gap-4 text-muted-foreground">
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                Submitted {new Date(submission.submissionDate).toLocaleDateString()}
              </div>
              <div className="flex items-center gap-1">
                <User className="h-4 w-4" />
                {submission.submitter.name}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge 
              variant={submission.status === 'ACCEPTED' ? 'default' : 'secondary'}
              className={submission.status === 'ACCEPTED' ? 'bg-green-100 text-green-800' : ''}
            >
              {submission.status.replace('_', ' ')}
            </Badge>
            {canEdit && (
              <Button 
                onClick={() => router.push(`/presenter/conferences/${conferenceId}/submit?edit=${submission.id}`)}
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-6">
        {/* Abstract */}
        <Card>
          <CardHeader>
            <CardTitle>Abstract</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose max-w-none">
              <p className="whitespace-pre-wrap">{submission.content}</p>
            </div>
          </CardContent>
        </Card>

        {/* Details */}
        <Card>
          <CardHeader>
            <CardTitle>Submission Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {submission.presentationType && (
              <div>
                <h4 className="font-medium">Presentation Type</h4>
                <p className="text-muted-foreground">{submission.presentationType.name}</p>
                {submission.presentationType.description && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {submission.presentationType.description}
                  </p>
                )}
              </div>
            )}

            {submission.requestedDuration && (
              <div>
                <h4 className="font-medium">Requested Duration</h4>
                <p className="text-muted-foreground">{submission.requestedDuration} minutes</p>
              </div>
            )}

            {submission.keywords.length > 0 && (
              <div>
                <h4 className="font-medium mb-2">Keywords</h4>
                <div className="flex flex-wrap gap-2">
                  {submission.keywords.map((keyword) => (
                    <Badge key={keyword} variant="secondary">
                      {keyword}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {submission.biography && (
              <div>
                <h4 className="font-medium">Speaker Biography</h4>
                <div className="prose prose-sm max-w-none mt-2">
                  <p className="whitespace-pre-wrap">{submission.biography}</p>
                </div>
              </div>
            )}

            {submission.fileUrl && (
              <div>
                <h4 className="font-medium mb-2">Supporting Document</h4>
                <Button variant="outline" asChild>
                  <a href={submission.fileUrl} target="_blank" rel="noopener noreferrer">
                    <FileText className="h-4 w-4 mr-2" />
                    Download Document
                  </a>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Reviews */}
        {submission.reviews.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Reviews</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {submission.reviews.map((review) => (
                  <div key={review.id} className="border-l-4 border-muted pl-4">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-medium">Review by {review.reviewer.name}</h4>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">Score: {review.score}/5</Badge>
                        <Badge 
                          variant={review.recommendation === 'accept' ? 'default' : 'secondary'}
                        >
                          {review.recommendation}
                        </Badge>
                      </div>
                    </div>
                    {review.comments && (
                      <p className="text-muted-foreground">{review.comments}</p>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}