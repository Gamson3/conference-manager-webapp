"use client";

import React, { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useSubmission } from '@/contexts/SubmissionContext';
import { useAuth } from '@/features/auth/hooks/useAuth';
import apiClient from '@/lib/api/client';
import API_ENDPOINTS from '@/lib/api/endpoints';
import { parseSubmissionDraft } from '@/features/submissions/utils/parseSubmissionDraft';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  AlertCircle, 
  ChevronLeft,
  Eye,
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';

type ApiErrorShape = { response?: { data?: { message?: unknown } } };

import type { SubmissionStatus } from '@/features/submissions/utils/parseSubmissionDraft';

const getApiErrorMessage = (error: unknown, fallback: string): string => {
  if (error instanceof Error) {
    const maybeAxios = error as unknown as ApiErrorShape;
    const message = maybeAxios.response?.data?.message;
    if (typeof message === 'string' && message.trim().length > 0) return message;
    if (error.message.trim().length > 0) return error.message;
  }
  return fallback;
};

interface Category {
  id: number;
  name: string;
}

interface PresentationType {
  id: number;
  name: string;
}

interface AbstractSettings {
  categories?: Category[];
  presentationTypes?: PresentationType[];
  minKeywords?: number;
  maxKeywords?: number;
}

interface Conference {
  id: number;
  name: string;
}

export default function PreviewPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const { data, loadDraft, resetSubmission } = useSubmission();
  
  const id = typeof params?.id === 'string' ? params.id : undefined;
  // Keep as string (slug or numeric ID) - backend resolver handles both
  const conferenceId = id;

  const [conference, setConference] = useState<Conference | null>(null);
  const [settings, setSettings] = useState<AbstractSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [draftLoading, setDraftLoading] = useState(false);
  const [draftStatus, setDraftStatus] = useState<SubmissionStatus | undefined>();
  const [draftRevisionFeedback, setDraftRevisionFeedback] = useState<string | null | undefined>();
  const keywordsEnabled = typeof settings?.maxKeywords === 'number' && settings.maxKeywords > 0;

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push(`/conferences/${conferenceId}`);
    }
  }, [isAuthenticated, authLoading, conferenceId, router]);

  // Support direct submit/resubmit from account pages via /submit/preview?draftId=123
  useEffect(() => {
    if (!isAuthenticated) return;
    const draftIdParam = searchParams.get('draftId');
    if (!draftIdParam) return;

    const draftId = Number(draftIdParam);
    if (!Number.isFinite(draftId)) {
      setError('Invalid draft id.');
      return;
    }

    if (data.draftId === draftId) return;

    const load = async (): Promise<void> => {
      setDraftLoading(true);
      setError(undefined);
      try {
        const res = await apiClient.get(`/api/submissions/${draftId}`);
        const parsed = parseSubmissionDraft(res.data as unknown);
        if (!parsed) {
          setError('Failed to load submission draft.');
          return;
        }

        loadDraft({
          id: parsed.id,
          conferenceId: parsed.conferenceId,
          title: parsed.title,
          abstract: parsed.abstract,
          keywords: parsed.keywords,
          categoryId: typeof parsed.categoryId === 'undefined' ? undefined : parsed.categoryId,
          typeId: typeof parsed.typeId === 'undefined' ? undefined : parsed.typeId,
          authors: parsed.authors,
        });

        setDraftStatus(parsed.status);
        setDraftRevisionFeedback(parsed.revisionFeedback);
      } catch (err: unknown) {
        const message = getApiErrorMessage(err, 'Failed to load submission draft.');
        setError(message);
        toast.error(message);
      } finally {
        setDraftLoading(false);
      }
    };

    void load();
  }, [isAuthenticated, searchParams, data.draftId, loadDraft]);

  useEffect(() => {
    if (!conferenceId || !isAuthenticated) return;

    const loadData = async () => {
      setLoading(true);
      try {
        const [confRes, settingsRes] = await Promise.all([
          apiClient.get(`/api/public/conferences/${conferenceId}`),
          apiClient.get(`/api/public/conferences/${conferenceId}/abstracts/settings`),
        ]);
        setConference(confRes.data);
        setSettings(settingsRes.data);
      } catch (err) {
        console.error('Failed to load data:', err);
        toast.error('Failed to load submission settings');
        router.push(`/conferences/${conferenceId}`);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [conferenceId, isAuthenticated, router]);

  const getWordCount = (text: string) => {
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(undefined);

    try {
      // Build submission payload
      const submissionPayload: Record<string, unknown> = {
        title: data.title.trim(),
        abstract: data.abstract.trim(),
        keywords: keywordsEnabled ? data.keywords : [],
      };

      if (data.typeId) submissionPayload.typeId = data.typeId;
      if (data.categoryId) submissionPayload.categoryId = data.categoryId;
      
      // Include onBehalfOfUserId for organizer assistance mode
      if (data.onBehalfOfUserId) {
        submissionPayload.onBehalfOfUserId = data.onBehalfOfUserId;
      }

      // Add authors array
      if (data.authors.length > 0) {
        submissionPayload.authors = data.authors.map(author => ({
          firstName: author.firstName.trim(),
          lastName: author.lastName.trim(),
          email: author.email.trim(),
          affiliation: author.affiliation.trim(),
          phone: author.phone.trim(),
          orcid: author.orcid.trim(),
          isPresentingAuthor: author.isPresentingAuthor,
        }));
        
        // For backwards compatibility, also send first author's info
        const firstAuthor = data.authors[0];
        if (firstAuthor) {
          submissionPayload.authorEmail = firstAuthor.email.trim();
          submissionPayload.authorAffiliation = firstAuthor.affiliation.trim();
          submissionPayload.authorPhone = firstAuthor.phone.trim();
          submissionPayload.authorOrcid = firstAuthor.orcid.trim();
        }
      }

      let submissionId: number;

      if (data.draftId) {
        // Update existing draft
        await apiClient.put(`/api/submissions/${data.draftId}`, submissionPayload);
        submissionId = data.draftId;
      } else {
        // Create new draft
        const draftRes = await apiClient.post(
          API_ENDPOINTS.SUBMISSIONS.CREATE(conferenceId!),
          submissionPayload
        );
        submissionId = draftRes.data.id;
      }

      // Upload files (if selected) before final submit so server-side validation passes.
      if (data.uploadedFile) {
        const formData = new FormData();
        formData.append('file', data.uploadedFile);
        await apiClient.post(`/api/submissions/${submissionId}/abstract-file`, formData);
      }
      if (data.fullTextFile) {
        const formData = new FormData();
        formData.append('file', data.fullTextFile);
        await apiClient.post(`/api/submissions/${submissionId}/full-text-file`, formData);
      }

      // Submit the draft
      await apiClient.post(
        API_ENDPOINTS.SUBMISSIONS.SUBMIT(submissionId)
      );

      toast.success('Submission successful!');
      resetSubmission();
      
      setTimeout(() => {
        router.push('/account/my-submissions');
      }, 2000);

    } catch (err: unknown) {
      console.error('Submission failed:', err);
      const message = getApiErrorMessage(err, 'Submission failed. Please try again.');
      setError(message);
      toast.error(message);
      setSubmitting(false);
    }
  };

  const handleBack = () => {
    const draftQs = data.draftId ? `draftId=${data.draftId}` : '';
    const onBehalfQs = data.onBehalfOfUserId ? `onBehalfOf=${data.onBehalfOfUserId}` : '';
    const qs = [draftQs, onBehalfQs].filter(Boolean).join('&');
    router.push(`/conferences/${conferenceId}/submit/content${qs ? `?${qs}` : ''}`);
  };

  if (authLoading || loading || draftLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-950 dark:to-gray-900">
      <div className="border-b bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="app-container py-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Review & Submit</h2>
            <Badge variant="outline">{conference?.name}</Badge>
          </div>
          <Progress value={100} className="h-2" />
        </div>
      </div>

      <div className="app-container py-8">
        <Card className="mx-auto max-w-3xl">
          <CardHeader>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950">
                <Eye className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <CardTitle>Review Your Submission</CardTitle>
                <CardDescription>
                  Please review all information before submitting
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {draftStatus === 'revision_requested' && draftRevisionFeedback && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Revision requested</AlertTitle>
                <AlertDescription>{draftRevisionFeedback}</AlertDescription>
              </Alert>
            )}
            <div>
              <h3 className="font-semibold text-sm text-muted-foreground mb-2">Title</h3>
              <p className="text-lg font-medium">{data.title}</p>
            </div>

            {/* Presentation Type */}
            {data.typeId && settings?.presentationTypes && (
              <>
                <Separator />
                <div>
                  <h3 className="font-semibold text-sm text-muted-foreground mb-2">Presentation Type</h3>
                  <p className="text-sm">
                    {settings.presentationTypes.find(t => t.id === data.typeId)?.name || 'Unknown'}
                  </p>
                </div>
              </>
            )}

            {/* Category */}
            {data.categoryId && settings?.categories && (
              <>
                <Separator />
                <div>
                  <h3 className="font-semibold text-sm text-muted-foreground mb-2">Category</h3>
                  <p className="text-sm">
                    {settings.categories.find(c => c.id === data.categoryId)?.name || 'Unknown'}
                  </p>
                </div>
              </>
            )}

            {/* Authors */}
            {data.authors.length > 0 && (
              <>
                <Separator />
                <div>
                  <h3 className="font-semibold text-sm text-muted-foreground mb-2">
                    Authors ({data.authors.length})
                  </h3>
                  <div className="space-y-3">
                    {data.authors.map((author) => (
                      <div key={author.id} className="p-3 bg-muted/50 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-medium">
                            {author.firstName} {author.lastName}
                          </span>
                          {author.isPresentingAuthor && (
                            <Badge variant="secondary" className="text-xs">
                              Presenting Author
                            </Badge>
                          )}
                        </div>
                        <div className="space-y-1 text-sm text-muted-foreground">
                          {author.email && <div>Email: {author.email}</div>}
                          {author.affiliation && <div>Affiliation: {author.affiliation}</div>}
                          {author.phone && <div>Phone: {author.phone}</div>}
                          {author.orcid && <div>ORCID: {author.orcid}</div>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Abstract */}
            {data.abstract && (
              <>
                <Separator />
                <div>
                  <h3 className="font-semibold text-sm text-muted-foreground mb-2">
                    Abstract ({getWordCount(data.abstract)} words)
                  </h3>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{data.abstract}</p>
                </div>
              </>
            )}

            {/* Keywords */}
            {keywordsEnabled && data.keywords.length > 0 && (
              <>
                <Separator />
                <div>
                  <h3 className="font-semibold text-sm text-muted-foreground mb-2">
                    Keywords ({data.keywords.length})
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {data.keywords.map((keyword) => (
                      <Badge key={keyword} variant="secondary">
                        {keyword}
                      </Badge>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Uploaded File */}
            {data.uploadedFile && (
              <>
                <Separator />
                <div>
                  <h3 className="font-semibold text-sm text-muted-foreground mb-2">Uploaded File</h3>
                  <div className="text-sm bg-muted p-3 rounded-md">
                    <p className="font-medium">Abstract File</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {data.uploadedFile.name} • {(data.uploadedFile.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                </div>
              </>
            )}

            {/* Full Text File */}
            {data.fullTextFile && (
              <>
                <Separator />
                <div>
                  <h3 className="font-semibold text-sm text-muted-foreground mb-2">Full Text File</h3>
                  <div className="text-sm bg-muted p-3 rounded-md">
                    <p className="font-medium">Full Text</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {data.fullTextFile.name} • {(data.fullTextFile.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {error && (
          <Card className="mt-6 border-destructive">
            <CardContent className="pt-6">
              <p className="text-sm text-destructive flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                {error}
              </p>
            </CardContent>
          </Card>
        )}

        <div className="flex justify-between items-center mt-6">
          <Button variant="outline" onClick={handleBack} disabled={submitting}>
            <ChevronLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <Button onClick={handleSubmit} disabled={submitting} size="lg">
            {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Submit Paper
          </Button>
        </div>
      </div>
    </div>
  );
}
