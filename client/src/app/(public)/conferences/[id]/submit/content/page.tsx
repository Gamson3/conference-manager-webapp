"use client";

import React, { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useSubmission } from '@/contexts/SubmissionContext';
import { useAuth } from '@/features/auth/hooks/useAuth';
import apiClient from '@/lib/api/client';
import { parseSubmissionDraft } from '@/features/submissions/utils/parseSubmissionDraft';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { 
  AlertCircle, 
  ChevronLeft, 
  ChevronRight,
  FileText,
  Loader2,
  Plus,
  X,
  Upload,
  Save
} from 'lucide-react';
import { toast } from 'sonner';

interface AbstractSettings {
  id: number;
  abstractUploadMode?: 'TEXT' | 'FILE' | 'BOTH';
  bodyTextLabel?: string;
  bodyTextMinWords?: number;
  bodyTextMaxWords?: number;
  abstractMinLength?: number;
  abstractMaxLength?: number;
  minKeywords?: number;
  maxKeywords?: number;
  fileFieldLabel?: string;
  fileFieldRequired?: boolean;
  maxFileSizeMB?: number;
  allowedFileTypes?: string[];
  collectFullText?: boolean;
  fullTextTiming?: 'onSubmission' | 'afterAcceptance';
}

interface Conference {
  id: number;
  name: string;
}

export default function AbstractContentPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const { data, setAbstract, setKeywords, addKeyword, removeKeyword, setUploadedFile, setFullTextFile, loadDraft, setConferenceId } = useSubmission();
  
  const id = typeof params?.id === 'string' ? params.id : undefined;
  // Keep as string (slug or numeric ID) - backend resolver handles both
  const conferenceId = id;

  const [conference, setConference] = useState<Conference | null>(null);
  const [settings, setSettings] = useState<AbstractSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [keywordInput, setKeywordInput] = useState('');
  const [abstractError, setAbstractError] = useState<string | undefined>();
  const [keywordsError, setKeywordsError] = useState<string | undefined>();
  const [fileError, setFileError] = useState<string | undefined>();
  const [fullTextFileError, setFullTextFileError] = useState<string | undefined>();

  const draftIdParam = searchParams.get('draftId');

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push(`/conferences/${conferenceId}`);
    }
  }, [isAuthenticated, authLoading, conferenceId, router]);

  // Restore draft on reload if draftId is present
  useEffect(() => {
    if (!draftIdParam || !conferenceId || !isAuthenticated) return;
    if (data.draftId) return;

    const load = async (): Promise<void> => {
      try {
        const res = await apiClient.get(`/api/submissions/${draftIdParam}`);
        const parsed = parseSubmissionDraft(res.data as unknown);
        if (!parsed) {
          toast.error('Failed to load draft');
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
      } catch (err: unknown) {
        console.error('Failed to load draft:', err);
        toast.error('Failed to load draft');
      }
    };

    void load();
  }, [draftIdParam, conferenceId, isAuthenticated, data.draftId, loadDraft]);

  useEffect(() => {
    if (conferenceId && !data.conferenceId) {
      setConferenceId(conferenceId);
    }
  }, [conferenceId, data.conferenceId, setConferenceId]);

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

  // Clear any previously-entered keywords if keywords are disabled for this conference.
  useEffect(() => {
    const keywordsEnabled = (settings?.maxKeywords ?? 0) > 0;
    if (!settings) return;
    if (!keywordsEnabled && data.keywords.length > 0) {
      setKeywords([]);
      setKeywordsError(undefined);
      setKeywordInput('');
    }
  }, [settings, data.keywords.length, setKeywords]);

  const getWordCount = (text: string) => {
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
  };

  const saveDraft = async () => {
    if (!conferenceId || !data.draftId) return null;
    
    setSaving(true);
    try {
      const keywordsEnabled = (settings?.maxKeywords ?? 0) > 0;
      const payload: Record<string, unknown> = {
        title: data.title.trim() || 'Untitled',
        abstract: data.abstract.trim(),
        keywords: keywordsEnabled ? data.keywords : [],
        typeId: data.typeId,
        categoryId: data.categoryId,
      };

      if (data.authors.length > 0) {
        payload.authors = data.authors.map((author) => ({
          firstName: author.firstName.trim(),
          lastName: author.lastName.trim(),
          email: author.email.trim(),
          affiliation: author.affiliation.trim(),
          phone: author.phone.trim(),
          orcid: author.orcid.trim(),
          isPresentingAuthor: author.isPresentingAuthor,
        }));
        const firstAuthor = data.authors[0];
        payload.authorEmail = firstAuthor.email.trim();
        payload.authorAffiliation = firstAuthor.affiliation.trim();
        payload.authorPhone = firstAuthor.phone.trim();
        payload.authorOrcid = firstAuthor.orcid.trim();
      }

      const response = await apiClient.put(`/api/submissions/${data.draftId}`, payload);
      toast.success('Draft saved');
      return response.data;
    } catch (err: unknown) {
      console.error('Failed to save draft:', err);
      const apiErr = err as { response?: { data?: { message?: string } } };
      toast.error(apiErr.response?.data?.message || 'Failed to save draft');
      return null;
    } finally {
      setSaving(false);
    }
  };

  const handleAddKeyword = () => {
    const keywordsEnabled = (settings?.maxKeywords ?? 0) > 0;
    if (!keywordsEnabled) {
      toast.error('Keywords are disabled for this conference');
      return;
    }
    if (!keywordInput.trim()) return;
    if (data.keywords.includes(keywordInput.trim())) {
      toast.error('Keyword already added');
      return;
    }
    if (settings?.maxKeywords && data.keywords.length >= settings.maxKeywords) {
      toast.error(`Maximum ${settings.maxKeywords} keywords allowed`);
      return;
    }
    addKeyword(keywordInput);
    setKeywordInput('');
    setKeywordsError(undefined);
  };

  const validate = (): boolean => {
    let isValid = true;

    // Validate abstract/body text - ALWAYS required (text is canonical)
    const labelText = settings?.bodyTextLabel || 'Abstract';
    
    if (!data.abstract.trim()) {
      setAbstractError(`${labelText} is required`);
      isValid = false;
    } else {
      const wordCount = getWordCount(data.abstract);
      const minWords = settings?.bodyTextMinWords || settings?.abstractMinLength;
      const maxWords = settings?.bodyTextMaxWords || settings?.abstractMaxLength;
      
      if (minWords && wordCount < minWords) {
        setAbstractError(`${labelText} must be at least ${minWords} words (currently ${wordCount})`);
        isValid = false;
      } else if (maxWords && wordCount > maxWords) {
        setAbstractError(`${labelText} must not exceed ${maxWords} words (currently ${wordCount})`);
        isValid = false;
      } else {
        setAbstractError(undefined);
      }
    }

    // Validate keywords (only when enabled)
    const keywordsEnabled = (settings?.maxKeywords ?? 0) > 0;
    if (keywordsEnabled) {
      if ((settings?.minKeywords ?? 0) > 0 && data.keywords.length < (settings?.minKeywords ?? 0)) {
        setKeywordsError(`At least ${settings?.minKeywords} keyword(s) required`);
        isValid = false;
      } else if ((settings?.maxKeywords ?? 0) > 0 && data.keywords.length > (settings?.maxKeywords ?? 0)) {
        setKeywordsError(`Maximum ${settings?.maxKeywords} keywords allowed`);
        isValid = false;
      } else {
        setKeywordsError(undefined);
      }
    } else {
      setKeywordsError(undefined);
    }

    // Validate file upload (only when file upload is allowed + required)
    const allowFileUpload = settings?.abstractUploadMode === 'BOTH';
    if (allowFileUpload && settings?.fileFieldRequired && !data.uploadedFile) {
      setFileError('File upload is required');
      isValid = false;
    } else {
      setFileError(undefined);
    }

    return isValid;
  };

  const handleNext = async () => {
    if (validate()) {
      await saveDraft();
      // TODO: Check if questions step should be shown
      const draftQs = data.draftId ? `draftId=${data.draftId}` : '';
      const onBehalfQs = data.onBehalfOfUserId ? `onBehalfOf=${data.onBehalfOfUserId}` : '';
      const qs = [draftQs, onBehalfQs].filter(Boolean).join('&');
      router.push(`/conferences/${conferenceId}/submit/preview${qs ? `?${qs}` : ''}`);
    } else {
      toast.error('Please fix all errors before continuing');
    }
  };

  const handleSaveDraft = async () => {
    await saveDraft();
  };

  const handleBack = () => {
    const draftQs = data.draftId ? `draftId=${data.draftId}` : '';
    const onBehalfQs = data.onBehalfOfUserId ? `onBehalfOf=${data.onBehalfOfUserId}` : '';
    const qs = [draftQs, onBehalfQs].filter(Boolean).join('&');
    router.push(`/conferences/${conferenceId}/submit/essentials${qs ? `?${qs}` : ''}`);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const file = e.target.files[0];
      const maxSizeMB = settings?.maxFileSizeMB || 10;
      const maxSizeBytes = maxSizeMB * 1024 * 1024;
      
      if (file.size > maxSizeBytes) {
        setFileError(`File must be smaller than ${maxSizeMB} MB`);
        setUploadedFile(null);
        e.target.value = '';
        return;
      }
      
      setUploadedFile(file);
      setFileError(undefined);
    } else {
      setUploadedFile(null);
    }
  };

  const handleFullTextUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const file = e.target.files[0];
      const maxSizeMB = settings?.maxFileSizeMB || 10;
      const maxSizeBytes = maxSizeMB * 1024 * 1024;
      
      if (file.size > maxSizeBytes) {
        setFullTextFileError(`File must be smaller than ${maxSizeMB} MB`);
        setFullTextFile(null);
        e.target.value = '';
        return;
      }
      
      setFullTextFile(file);
      setFullTextFileError(undefined);
    } else {
      setFullTextFile(null);
    }
  };

  const abstractWordCount = getWordCount(data.abstract);
  const keywordsEnabled = typeof settings?.maxKeywords === 'number' && settings.maxKeywords > 0;
  const minKeywords = typeof settings?.minKeywords === 'number' ? settings.minKeywords : undefined;
  const maxKeywords = typeof settings?.maxKeywords === 'number' ? settings.maxKeywords : undefined;

  if (authLoading || loading) {
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
            <h2 className="text-lg font-semibold">Abstract Content</h2>
            <Badge variant="outline">{conference?.name}</Badge>
          </div>
          <Progress value={66} className="h-2" />
        </div>
      </div>

      <div className="app-container py-8">
        <Card className="mx-auto max-w-3xl">
          <CardHeader>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 rounded-lg bg-purple-50 dark:bg-purple-950">
                <FileText className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <CardTitle>Abstract Content</CardTitle>
                <CardDescription>
                  Provide abstract text, keywords, and files
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Abstract Text - always required */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="abstract" className="text-sm font-medium">
                  {settings?.bodyTextLabel || 'Abstract'}
                  <span className="text-red-500"> *</span>
                </Label>
                <span className="text-xs text-muted-foreground">
                  {abstractWordCount} word{abstractWordCount !== 1 ? 's' : ''}
                  {(settings?.bodyTextMinWords || settings?.abstractMinLength) && 
                   (settings?.bodyTextMaxWords || settings?.abstractMaxLength) && (
                    <span className="ml-1">
                      ({settings.bodyTextMinWords || settings.abstractMinLength} - {settings.bodyTextMaxWords || settings.abstractMaxLength} required)
                    </span>
                  )}
                </span>
              </div>
              <Textarea
                id="abstract"
                placeholder={`Enter your ${(settings?.bodyTextLabel || 'abstract').toLowerCase()}`}
                value={data.abstract}
                onChange={(e) => {
                  setAbstract(e.target.value);
                  setAbstractError(undefined);
                }}
                rows={12}
                className={abstractError ? 'border-destructive' : ''}
              />
              {abstractError && (
                <p className="text-xs text-destructive flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {abstractError}
                </p>
              )}
            </div>

            {/* File Upload Section - only when allowed by organizer (BOTH mode) */}
            {settings?.abstractUploadMode === 'BOTH' && (
              <>
                <Separator />
                <div className="space-y-2">
                  <Label htmlFor="abstractFile" className="text-sm font-medium">
                    {settings.fileFieldLabel || 'Upload Abstract File'}
                    {settings.fileFieldRequired && (
                      <span className="text-red-500"> *</span>
                    )}
                  </Label>
                  
                  <div className="border-2 border-dashed rounded-lg p-6 text-center hover:border-primary/50 transition-colors">
                    <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                    <Label htmlFor="abstractFile" className="cursor-pointer">
                      <span className="text-sm text-primary hover:underline">
                        Click to upload file
                      </span>
                      <span className="text-sm text-muted-foreground ml-1">
                        (Max. Size: {settings.maxFileSizeMB || 10} MB)
                      </span>
                    </Label>
                    <Input
                      id="abstractFile"
                      type="file"
                      accept={settings.allowedFileTypes && settings.allowedFileTypes.length > 0
                        ? settings.allowedFileTypes.join(',')
                        : '.pdf,.doc,.docx'}
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </div>

                  {data.uploadedFile && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      ✓ {data.uploadedFile.name} ({(data.uploadedFile.size / 1024).toFixed(1)} KB)
                    </p>
                  )}
                  
                  {fileError && (
                    <p className="text-xs text-destructive flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {fileError}
                    </p>
                  )}
                  
                  {settings.maxFileSizeMB && (
                    <p className="text-xs text-muted-foreground">
                      Max size: {settings.maxFileSizeMB} MB
                      {settings.allowedFileTypes && settings.allowedFileTypes.length > 0 && (
                        <span> • Allowed types: {settings.allowedFileTypes.join(', ')}</span>
                      )}
                    </p>
                  )}
                </div>
              </>
            )}

            <Separator />

            {/* Keywords (only when enabled by organizer settings) */}
            {keywordsEnabled && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="keyword-input" className="text-sm font-medium">
                    Keywords <span className="text-red-500">*</span>
                  </Label>
                  <div className="text-xs text-muted-foreground">
                    {typeof minKeywords === 'number' ? (
                      <>
                        {data.keywords.length} / {minKeywords} minimum
                        {data.keywords.length < minKeywords && (
                          <span className="text-destructive ml-1">
                            ({minKeywords - data.keywords.length} more needed)
                          </span>
                        )}
                      </>
                    ) : null}
                  </div>
                </div>

                <p className="text-xs text-muted-foreground">
                  {typeof minKeywords === 'number' && typeof maxKeywords === 'number'
                    ? `Required: ${minKeywords} - ${maxKeywords} keywords`
                    : null}
                </p>

                <div className="flex gap-2">
                  <Input
                    id="keyword-input"
                    placeholder="Enter a keyword"
                    value={keywordInput}
                    onChange={(e) => setKeywordInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddKeyword();
                      }
                    }}
                    className={keywordsError ? 'border-destructive' : ''}
                  />
                  <Button 
                    type="button" 
                    onClick={handleAddKeyword}
                    disabled={!keywordInput.trim()}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add
                  </Button>
                </div>

                {data.keywords.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {data.keywords.map((keyword) => (
                      <Badge key={keyword} variant="secondary" className="text-sm py-1 px-3">
                        {keyword}
                        <button
                          type="button"
                          onClick={() => removeKeyword(keyword)}
                          className="ml-2 hover:text-destructive"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}

                {keywordsError && (
                  <p className="text-xs text-destructive flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {keywordsError}
                  </p>
                )}
              </div>
            )}

            {/* Full Text Upload Section - Based on Organizer Configuration */}
            {settings?.collectFullText && (
              <>
                <Separator />
                <div className="space-y-3">
                  <Label htmlFor="fullTextFile" className="text-sm font-medium">
                    Upload Full Text
                    <Badge variant="outline" className="ml-2 text-xs">
                      {settings.fullTextTiming === 'onSubmission' ? 'Required Now' : 'Optional'}
                    </Badge>
                  </Label>
                  
                  <div className="border-2 border-dashed rounded-lg p-6 text-center hover:border-primary/50 transition-colors">
                    <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                    <Label htmlFor="fullTextFile" className="cursor-pointer">
                      <span className="text-sm text-primary hover:underline">
                        Click to upload full text file
                      </span>
                      <span className="text-sm text-muted-foreground ml-1">
                        (Max. Size: {settings.maxFileSizeMB || 10} MB)
                      </span>
                    </Label>
                    <Input
                      id="fullTextFile"
                      type="file"
                      accept={settings.allowedFileTypes && settings.allowedFileTypes.length > 0
                        ? settings.allowedFileTypes.join(',')
                        : '.pdf,.doc,.docx'}
                      onChange={handleFullTextUpload}
                      className="hidden"
                    />
                  </div>

                  {data.fullTextFile && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      ✓ {data.fullTextFile.name} ({(data.fullTextFile.size / 1024).toFixed(1)} KB)
                    </p>
                  )}
                  
                  {fullTextFileError && (
                    <p className="text-xs text-destructive flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {fullTextFileError}
                    </p>
                  )}
                  
                  {settings.fullTextTiming === 'afterAcceptance' && (
                    <p className="text-xs text-muted-foreground italic">
                      Note: Full text will be required after abstract acceptance
                    </p>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <div className="flex justify-between items-center mt-6">
          <Button variant="outline" onClick={handleBack}>
            <ChevronLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={handleSaveDraft}
              disabled={saving}
            >
              {saving ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving...</>
              ) : (
                <><Save className="h-4 w-4 mr-2" /> Save Draft</>
              )}
            </Button>
            <Button size="lg" onClick={handleNext} disabled={saving}>
              Next Step
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
