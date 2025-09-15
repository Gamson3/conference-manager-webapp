'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CalendarIcon, FileTextIcon, ClockIcon, AlertCircleIcon, CheckCircleIcon } from 'lucide-react';
import { ConferenceSubmissionInfo, ConferenceMember } from '@/types/submission';

interface ConferenceCallToActionProps {
  conferenceId: number;
  userId?: number;
}

export default function ConferenceCallToAction({ 
  conferenceId, 
  userId 
}: ConferenceCallToActionProps) {
  const [submissionInfo, setSubmissionInfo] = useState<ConferenceSubmissionInfo | null>(null);
  const [membership, setMembership] = useState<ConferenceMember | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    fetchSubmissionInfo();
    if (userId) {
      fetchMembership();
    }
  }, [conferenceId, userId]);

  const fetchSubmissionInfo = async () => {
    try {
      const response = await fetch(`/api/conferences/${conferenceId}/submission-info`);
      if (response.ok) {
        const data = await response.json();
        setSubmissionInfo(data);
      } else {
        setError('Failed to load submission information');
      }
    } catch (error) {
      console.error('Error fetching submission info:', error);
      setError('Failed to load submission information');
    } finally {
      setLoading(false);
    }
  };

  const fetchMembership = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/conferences/${conferenceId}/membership`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setMembership(data);
      }
    } catch (error) {
      console.error('Error fetching membership:', error);
    }
  };

  const handleSubmitProposal = () => {
    if (!userId) {
      router.push(`/signin?redirect=${encodeURIComponent(`/conferences/${conferenceId}`)}`);
      return;
    }
    router.push(`/presenter/conferences/${conferenceId}/submit`);
  };

  const handleViewSubmissions = () => {
    router.push(`/presenter/conferences/${conferenceId}/submissions`);
  };

  if (loading) {
    return (
      <Card className="mt-6">
        <CardContent className="p-6">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !submissionInfo) {
    return (
      <Alert className="mt-6">
        <AlertCircleIcon className="h-4 w-4" />
        <AlertDescription>{error || 'Submission information not available'}</AlertDescription>
      </Alert>
    );
  }

  const { submissionSettings, isSubmissionOpen, daysUntilDeadline } = submissionInfo;
  const deadline = new Date(submissionSettings.submissionDeadline);
  const isDeadlinePassed = new Date() > deadline;

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileTextIcon className="h-5 w-5" />
          Call for Papers
          {isSubmissionOpen && (
            <Badge variant="default" className="bg-green-600">Open</Badge>
          )}
          {isDeadlinePassed && (
            <Badge variant="secondary">Closed</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <CalendarIcon className="h-4 w-4" />
          <span>Submission Deadline: {deadline.toLocaleDateString()}</span>
          {isSubmissionOpen && daysUntilDeadline !== null && daysUntilDeadline > 0 && (
            <Badge variant="outline" className="flex items-center gap-1">
              <ClockIcon className="h-3 w-3" />
              {daysUntilDeadline} days left
            </Badge>
          )}
        </div>

        {submissionSettings.submissionGuidelines && (
          <div className="prose prose-sm max-w-none">
            <p className="text-muted-foreground">{submissionSettings.submissionGuidelines}</p>
          </div>
        )}

        {/* Requirements Summary */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <h4 className="font-medium mb-2">Requirements</h4>
            <ul className="space-y-1 text-muted-foreground">
              {submissionSettings.requireAbstract && (
                <li className="flex items-center gap-1">
                  <CheckCircleIcon className="h-3 w-3 text-green-600" />
                  Abstract (max {submissionSettings.maxAbstractLength} chars)
                </li>
              )}
              {submissionSettings.requireKeywords && (
                <li className="flex items-center gap-1">
                  <CheckCircleIcon className="h-3 w-3 text-green-600" />
                  Keywords (min {submissionSettings.minKeywords})
                </li>
              )}
              {submissionSettings.requirePresentationType && (
                <li className="flex items-center gap-1">
                  <CheckCircleIcon className="h-3 w-3 text-green-600" />
                  Presentation Type
                </li>
              )}
              {submissionSettings.requireAuthorBio && (
                <li className="flex items-center gap-1">
                  <CheckCircleIcon className="h-3 w-3 text-green-600" />
                  Author Biography
                </li>
              )}
            </ul>
          </div>
          <div>
            <h4 className="font-medium mb-2">File Upload</h4>
            <ul className="space-y-1 text-muted-foreground">
              <li>Types: {submissionSettings.allowedFileTypes.join(', ')}</li>
              <li>Max size: {submissionSettings.maxFileSize}MB</li>
            </ul>
          </div>
        </div>

        {/* User Status */}
        {membership && membership.isSpeaker && (
          <Alert>
            <CheckCircleIcon className="h-4 w-4" />
            <AlertDescription>
              You are registered as a speaker for this conference.
            </AlertDescription>
          </Alert>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2 pt-4">
          {isSubmissionOpen && (
            <Button onClick={handleSubmitProposal} size="lg">
              {membership?.isSpeaker ? 'Submit New Proposal' : 'Submit a Proposal'}
            </Button>
          )}
          {userId && membership?.isSpeaker && (
            <Button variant="outline" onClick={handleViewSubmissions}>
              View My Submissions
            </Button>
          )}
          {!userId && (
            <Button variant="outline" onClick={handleSubmitProposal}>
              Sign In to Submit
            </Button>
          )}
        </div>

        {isDeadlinePassed && (
          <Alert>
            <AlertCircleIcon className="h-4 w-4" />
            <AlertDescription>
              The submission deadline has passed. New submissions are no longer accepted.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}