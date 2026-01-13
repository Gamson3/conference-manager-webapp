"use client";

import React, { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useSubmission } from '@/contexts/SubmissionContext';
import apiClient from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  AlertCircle, 
  CheckCircle2,
  UserCog, 
  ChevronLeft, 
  ChevronRight,
  Loader2, 
  FileText,
  Calendar,
  Clock,
  Edit
} from 'lucide-react';

interface Draft {
  id: number;
  title?: string;
  updatedAt: string;
  conference: { 
    id: number;
    slug?: string;
  };
}

interface AbstractSettings {
  id: number;
  isSubmissionOpen: boolean;
  submissionsOpenFrom?: string;
  submissionsOpenUntil?: string;
  abstractMinLength?: number;
  abstractMaxLength?: number;
  minKeywords?: number;
  maxKeywords?: number;
}

interface Conference {
  id: number;
  name: string;
  description?: string;
  startDate: string;
  endDate: string;
  bannerImageUrl?: string;
}

export default function ConferenceSubmitWelcomePage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const { setOnBehalfOfUserId } = useSubmission();
  const id = typeof params?.id === 'string' ? params.id : undefined;
  // Keep as string (slug or numeric ID) - backend resolver handles both
  const conferenceId = id;
  
  // Check for onBehalfOf query param (organizer assistance mode)
  const onBehalfOfParam = searchParams.get('onBehalfOf');
  const onBehalfOfUserId = onBehalfOfParam ? parseInt(onBehalfOfParam, 10) : null;

  const [conference, setConference] = useState<Conference | null>(null);
  const [settings, setSettings] = useState<AbstractSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | undefined>();
  const [existingDraft, setExistingDraft] = useState<Draft | null>(null);
  const [checkingDraft, setCheckingDraft] = useState(false);
  const [assistedAuthorName, setAssistedAuthorName] = useState<string | null>(null);

  // Set onBehalfOfUserId in context when entering assistance mode
  useEffect(() => {
    if (onBehalfOfUserId && Number.isFinite(onBehalfOfUserId)) {
      setOnBehalfOfUserId(onBehalfOfUserId);
      // Fetch author name for display
      apiClient.get(`/api/admin/users/${onBehalfOfUserId}`).then(res => {
        setAssistedAuthorName(res.data?.name || 'Author');
      }).catch(() => {
        setAssistedAuthorName('Author');
      });
    } else {
      setOnBehalfOfUserId(null);
    }
  }, [onBehalfOfUserId, setOnBehalfOfUserId]);

  // Handle edit query parameter - auto-redirect to essentials
  useEffect(() => {
    const editId = searchParams.get('edit');
    if (editId && conferenceId && isAuthenticated) {
      router.push(`/conferences/${conferenceId}/submit/essentials?draftId=${editId}`);
    }
  }, [searchParams, conferenceId, isAuthenticated, router]);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push(`/conferences/${conferenceId}`);
    }
  }, [isAuthenticated, authLoading, conferenceId, router]);

  useEffect(() => {
    if (!conferenceId || !isAuthenticated) return;

    const loadData = async () => {
      setLoading(true);
      setError(undefined);

      try {
        const [confRes, settingsRes] = await Promise.all([
          apiClient.get(`/api/public/conferences/${conferenceId}`),
          apiClient.get(`/api/public/conferences/${conferenceId}/abstracts/settings`),
        ]);
        
        setConference(confRes.data);
        setSettings(settingsRes.data);

        if (!settingsRes.data.isSubmissionOpen) {
          setError('Submissions are not currently open for this conference.');
          return;
        }

        const now = new Date();
        const openFrom = settingsRes.data.submissionsOpenFrom ? new Date(settingsRes.data.submissionsOpenFrom) : null;
        const openUntil = settingsRes.data.submissionsOpenUntil ? new Date(settingsRes.data.submissionsOpenUntil) : null;

        if (openFrom && now < openFrom) {
          setError(`Submissions open on ${openFrom.toLocaleDateString()}.`);
          return;
        }

        if (openUntil && now > openUntil) {
          setError('Submission deadline has passed.');
          return;
        }

        // Check for existing draft
        try {
          const draftsRes = await apiClient.get('/api/account/my-submissions', {
            params: { status: 'draft' }
          });
          const drafts = draftsRes.data || [];
          // Compare as strings to support both slug and numeric ID
          const conferenceDraft = drafts.find((d: Draft) => 
            String(d.conference.id) === String(conferenceId) || 
            d.conference.slug === conferenceId
          );
          if (conferenceDraft) {
            setExistingDraft(conferenceDraft);
          }
        } catch {
          console.log('No existing drafts found');
        }

      } catch (err: unknown) {
        console.error('Failed to load submission data:', err);
        const apiErr = err as { response?: { data?: { message?: string } } };
        setError(apiErr.response?.data?.message || 'Failed to load submission form.');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [conferenceId, isAuthenticated]);

  const handleStart = () => {
    const qs = onBehalfOfUserId ? `?onBehalfOf=${onBehalfOfUserId}` : '';
    router.push(`/conferences/${conferenceId}/submit/essentials${qs}`);
  };

  const handleContinueDraft = async () => {
    setCheckingDraft(true);
    try {
      // Load full draft details in the essentials page
      const onBehalfQs = onBehalfOfUserId ? `&onBehalfOf=${onBehalfOfUserId}` : '';
      router.push(`/conferences/${conferenceId}/submit/essentials?draftId=${existingDraft!.id}${onBehalfQs}`);
    } catch (err) {
      console.error('Failed to load draft:', err);
      const qs = onBehalfOfUserId ? `?onBehalfOf=${onBehalfOfUserId}` : '';
      router.push(`/conferences/${conferenceId}/submit/essentials${qs}`);
    }
  };

  const handleStartNew = () => {
    setExistingDraft(null);
    const qs = onBehalfOfUserId ? `?onBehalfOf=${onBehalfOfUserId}` : '';
    router.push(`/conferences/${conferenceId}/submit/essentials${qs}`);
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading submission form...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="app-container py-12">
        <Card className="border-destructive mx-auto max-w-2xl">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="inline-flex p-4 rounded-full bg-destructive/10 mb-4">
                <AlertCircle className="h-12 w-12 text-destructive" />
              </div>
              <h2 className="text-2xl font-bold mb-2">Unable to Submit</h2>
              <p className="text-muted-foreground mb-6">{error}</p>
              <Button onClick={() => router.push(`/conferences/${conferenceId}`)}>
                <ChevronLeft className="h-4 w-4 mr-2" />
                Back to Conference
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-950 dark:to-gray-900 py-12">
      <div className="app-container">
        <div className="mx-auto w-full max-w-4xl">
        {/* Assistance Mode Banner */}
        {onBehalfOfUserId && (
          <Alert className="mb-6 border-amber-500/50 bg-amber-50 dark:bg-amber-950/20">
            <UserCog className="h-4 w-4 text-amber-600" />
            <AlertTitle className="text-amber-800 dark:text-amber-200">
              Organizer Assistance Mode
            </AlertTitle>
            <AlertDescription className="text-amber-700 dark:text-amber-300">
              You are creating this submission on behalf of <strong>{assistedAuthorName || 'the author'}</strong>. 
              The submission will be attributed to their account.
            </AlertDescription>
          </Alert>
        )}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-600 via-pink-600 to-orange-600 text-white mb-8">
          {conference?.bannerImageUrl && (
            <div className="absolute inset-0 opacity-20">
              <Image
                src={conference.bannerImageUrl}
                alt=""
                fill
                sizes="100vw"
                className="object-cover"
              />
            </div>
          )}
          <div className="relative p-8 md:p-12">
            <Badge className="mb-4 bg-white/20 text-white border-white/30">
              Submissions Open
            </Badge>
            <h1 className="text-3xl md:text-4xl font-bold mb-4">
              Submit Your Paper
            </h1>
            <p className="text-lg text-white/90 max-w-2xl mb-6">
              {conference?.description || `Submit your abstract to ${conference?.name}`}
            </p>
            {conference && (
              <div className="flex flex-wrap gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  <span>
                    {new Date(conference.startDate).toLocaleDateString()} - {new Date(conference.endDate).toLocaleDateString()}
                  </span>
                </div>
                {settings?.submissionsOpenUntil && (
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    <span>
                      Deadline: {new Date(settings.submissionsOpenUntil).toLocaleDateString()}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {existingDraft && (
          <Alert className="mb-8 border-blue-200 bg-blue-50 dark:bg-blue-950">
            <Edit className="h-4 w-4 text-blue-600" />
            <AlertTitle className="text-blue-900 dark:text-blue-100">
              You have an unfinished submission
            </AlertTitle>
            <AlertDescription className="text-blue-800 dark:text-blue-200 mt-2">
              <p className="mb-3">
                <strong>{existingDraft.title || 'Untitled Draft'}</strong>
              </p>
              <p className="text-sm mb-4">
                Last updated: {new Date(existingDraft.updatedAt).toLocaleString()}
              </p>
              <div className="flex gap-3">
                <Button
                  onClick={handleContinueDraft}
                  disabled={checkingDraft}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {checkingDraft ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Loading...</>
                  ) : (
                    <><Edit className="h-4 w-4 mr-2" /> Continue Editing</>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={handleStartNew}
                  disabled={checkingDraft}
                >
                  Start New Submission
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {(settings?.abstractMinLength || settings?.abstractMaxLength) && (
          <Card className="mb-8">
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-lg bg-purple-50 dark:bg-purple-950">
                  <FileText className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Abstract Requirements</h3>
                  <p className="text-sm text-muted-foreground">
                    {settings.abstractMinLength && settings.abstractMaxLength
                      ? `${settings.abstractMinLength} - ${settings.abstractMaxLength} words`
                      : settings.abstractMinLength
                      ? `Minimum ${settings.abstractMinLength} words`
                      : `Maximum ${settings.abstractMaxLength} words`}
                  </p>
                  {(settings.minKeywords || settings.maxKeywords) && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Keywords: {settings.minKeywords && settings.maxKeywords
                        ? `${settings.minKeywords}-${settings.maxKeywords}`
                        : settings.minKeywords
                        ? `Min ${settings.minKeywords}`
                        : `Max ${settings.maxKeywords}`}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5" />
              What to Expect
            </CardTitle>
            <CardDescription>The submission process is straightforward</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-full bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-400">
                  <CheckCircle2 className="h-4 w-4" />
                </div>
                <div>
                  <p className="font-medium">Step 1: Abstract Essentials</p>
                  <p className="text-sm text-muted-foreground">
                    Provide title, presentation type, category, and author information
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-full bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-400">
                  <CheckCircle2 className="h-4 w-4" />
                </div>
                <div>
                  <p className="font-medium">Step 2: Abstract Content</p>
                  <p className="text-sm text-muted-foreground">
                    Add your abstract text/file, keywords, and full text (if required)
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-full bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-400">
                  <CheckCircle2 className="h-4 w-4" />
                </div>
                <div>
                  <p className="font-medium">Step 3: Review & Submit</p>
                  <p className="text-sm text-muted-foreground">
                    Review all details and submit your paper
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-between items-center">
          <Button
            variant="ghost"
            onClick={() => router.push(`/conferences/${conferenceId}`)}
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Back to Conference
          </Button>
          <Button 
            size="lg"
            onClick={handleStart}
            className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
          >
            Start Submission
            <ChevronRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
        </div>
      </div>
    </div>
  );
}
