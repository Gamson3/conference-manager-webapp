'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  ArrowLeft,
  FileText,
  Download,
  Edit,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  User,
  Tag,
  Calendar,
} from 'lucide-react';
import apiClient from '@/lib/api/client';
import { API_ENDPOINTS } from '@/lib/api/endpoints';
import { openSubmissionFile } from '@/lib/api/fileAccess';
import { cn } from '@/lib/utils';

interface SubmissionAuthor {
  id: number;
  authorName: string;
  authorEmail?: string;
  affiliation?: string;
  isPresenter: boolean;
  order: number;
}

interface Submission {
  id: number;
  title: string;
  abstract: string;
  keywords: string[];
  status: string;
  revisionFeedback?: string | null;
  createdAt: string;
  submittedAt?: string | null;
  conferenceId: number;
  conferenceName?: string;
  presentationType?: { id: number; name: string } | null;
  category?: { id: number; name: string } | null;
  authors: SubmissionAuthor[];
  // File info
  abstractFileName?: string | null;
  abstractFileMimeType?: string | null;
  abstractFileSizeBytes?: number | null;
  fullTextFileName?: string | null;
  fullTextFileMimeType?: string | null;
  fullTextFileSizeBytes?: number | null;
}

const statusConfig: Record<string, { label: string; icon: React.ElementType; className: string }> = {
  draft: { label: 'Draft', icon: Edit, className: 'bg-gray-100 text-gray-700 border-gray-300' },
  submitted: { label: 'Submitted', icon: Clock, className: 'bg-blue-100 text-blue-700 border-blue-300' },
  under_review: { label: 'Under Review', icon: Clock, className: 'bg-yellow-100 text-yellow-700 border-yellow-300' },
  accepted: { label: 'Accepted', icon: CheckCircle2, className: 'bg-green-100 text-green-700 border-green-300' },
  rejected: { label: 'Rejected', icon: XCircle, className: 'bg-red-100 text-red-700 border-red-300' },
  revision_requested: { label: 'Revision Requested', icon: AlertCircle, className: 'bg-orange-100 text-orange-700 border-orange-300' },
  withdrawn: { label: 'Withdrawn', icon: XCircle, className: 'bg-gray-100 text-gray-500 border-gray-300' },
};

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function SubmissionDetailPage(): React.JSX.Element {
  const params = useParams();
  const id = params.id as string;
  
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloadingAbstract, setDownloadingAbstract] = useState(false);
  const [downloadingFullText, setDownloadingFullText] = useState(false);

  useEffect(() => {
    const fetchSubmission = async (): Promise<void> => {
      try {
        setLoading(true);
        const response = await apiClient.get<Submission>(
          API_ENDPOINTS.SUBMISSIONS.DETAIL(Number(id))
        );
        setSubmission(response.data);
      } catch (err) {
        console.error('Failed to fetch submission:', err);
        setError('Failed to load submission details');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      void fetchSubmission();
    }
  }, [id]);

  const handleDownloadAbstract = async (): Promise<void> => {
    if (!submission) return;
    setDownloadingAbstract(true);
    try {
      await openSubmissionFile(submission.id, 'abstract');
    } catch (err) {
      console.error('Failed to download abstract file:', err);
    } finally {
      setDownloadingAbstract(false);
    }
  };

  const handleDownloadFullText = async (): Promise<void> => {
    if (!submission) return;
    setDownloadingFullText(true);
    try {
      await openSubmissionFile(submission.id, 'fulltext');
    } catch (err) {
      console.error('Failed to download full text file:', err);
    } finally {
      setDownloadingFullText(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !submission) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" asChild>
          <Link href="/account/my-submissions">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to My Submissions
          </Link>
        </Button>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error || 'Submission not found'}</AlertDescription>
        </Alert>
      </div>
    );
  }

  const status = statusConfig[submission.status] || statusConfig.draft;
  const StatusIcon = status.icon;
  const canEdit = submission.status === 'draft' || submission.status === 'revision_requested';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" asChild>
          <Link href="/account/my-submissions">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to My Submissions
          </Link>
        </Button>
        {canEdit && (
          <Button asChild>
            <Link href={`/conferences/${submission.conferenceId}/submit/essentials?draft=${submission.id}`}>
              <Edit className="h-4 w-4 mr-2" />
              Edit Submission
            </Link>
          </Button>
        )}
      </div>

      {/* Status & Title Card */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2">
              <CardTitle className="text-2xl">{submission.title}</CardTitle>
              {submission.conferenceName && (
                <p className="text-muted-foreground">{submission.conferenceName}</p>
              )}
            </div>
            <Badge 
              variant="outline" 
              className={cn('flex items-center gap-1 px-3 py-1', status.className)}
            >
              <StatusIcon className="h-4 w-4" />
              {status.label}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Revision Feedback Alert */}
          {submission.status === 'revision_requested' && submission.revisionFeedback && (
            <Alert className="border-orange-200 bg-orange-50">
              <AlertCircle className="h-4 w-4 text-orange-600" />
              <AlertDescription className="text-orange-800">
                <strong>Revision Requested:</strong> {submission.revisionFeedback}
              </AlertDescription>
            </Alert>
          )}

          {/* Metadata */}
          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
            {submission.presentationType && (
              <span className="flex items-center gap-1">
                <Tag className="h-4 w-4" />
                {submission.presentationType.name}
              </span>
            )}
            {submission.category && (
              <span className="flex items-center gap-1">
                <FileText className="h-4 w-4" />
                {submission.category.name}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              Created: {formatDate(submission.createdAt)}
            </span>
            {submission.submittedAt && (
              <span className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                Submitted: {formatDate(submission.submittedAt)}
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Authors */}
      {submission.authors.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <User className="h-5 w-5" />
              Authors
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {submission.authors
                .sort((a, b) => a.order - b.order)
                .map((author) => (
                  <div key={author.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div>
                      <p className="font-medium">{author.authorName}</p>
                      {author.affiliation && (
                        <p className="text-sm text-muted-foreground">{author.affiliation}</p>
                      )}
                      {author.authorEmail && (
                        <p className="text-sm text-muted-foreground">{author.authorEmail}</p>
                      )}
                    </div>
                    {author.isPresenter && (
                      <Badge variant="secondary">Presenter</Badge>
                    )}
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Abstract */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Abstract
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="whitespace-pre-wrap text-gray-700 leading-relaxed">
            {submission.abstract}
          </p>
        </CardContent>
      </Card>

      {/* Keywords */}
      {submission.keywords.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Tag className="h-5 w-5" />
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

      {/* Files */}
      {(submission.abstractFileName || submission.fullTextFileName) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Download className="h-5 w-5" />
              Uploaded Files
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Abstract File */}
            {submission.abstractFileName && (
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="min-w-0">
                  <p className="font-medium truncate">{submission.abstractFileName}</p>
                  <p className="text-sm text-muted-foreground">
                    {submission.abstractFileMimeType || 'File'}
                    {submission.abstractFileSizeBytes 
                      ? ` • ${formatBytes(submission.abstractFileSizeBytes)}`
                      : ''}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownloadAbstract}
                  disabled={downloadingAbstract}
                >
                  {downloadingAbstract ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4 mr-2" />
                  )}
                  Open
                </Button>
              </div>
            )}

            {/* Full Text File */}
            {submission.fullTextFileName && (
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="min-w-0">
                  <p className="font-medium truncate">{submission.fullTextFileName}</p>
                  <p className="text-sm text-muted-foreground">
                    {submission.fullTextFileMimeType || 'File'}
                    {submission.fullTextFileSizeBytes 
                      ? ` • ${formatBytes(submission.fullTextFileSizeBytes)}`
                      : ''}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownloadFullText}
                  disabled={downloadingFullText}
                >
                  {downloadingFullText ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4 mr-2" />
                  )}
                  Open
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
