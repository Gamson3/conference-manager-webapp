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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  AlertCircle, 
  ChevronLeft, 
  ChevronRight,
  FileText,
  Loader2,
  Plus,
  MoreVertical,
  Trash2,
  Save,
  UserCog
} from 'lucide-react';
import { toast } from 'sonner';

interface Category {
  id: number;
  name: string;
  description?: string;
}

interface PresentationType {
  id: number;
  name: string;
  description?: string;
  defaultDuration?: number;
}

interface AbstractSettings {
  id: number;
  isSubmissionOpen: boolean;
  categories?: Category[];
  presentationTypes?: PresentationType[];
  authorsEnabled?: boolean;
  collectAuthorEmail?: boolean;
  collectAuthorAffiliation?: boolean;
  collectAuthorPhone?: boolean;
  collectAuthorOrcid?: boolean;
  titleMaxWords?: number;
  requiresOrcid?: boolean;
}

interface Conference {
  id: number;
  name: string;
}

export default function AbstractEssentialsPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const { data, setTitle, setCategoryId, setTypeId, addAuthor, removeAuthor, updateAuthor, loadDraft, setConferenceId, setOnBehalfOfUserId } = useSubmission();
  
  const id = typeof params?.id === 'string' ? params.id : undefined;
  // Keep as string (slug or numeric ID) - backend resolver handles both
  const conferenceId = id;
  
  // Check for onBehalfOf query param (organizer assistance mode)
  const onBehalfOfParam = searchParams.get('onBehalfOf');
  const onBehalfOfUserId = onBehalfOfParam ? parseInt(onBehalfOfParam, 10) : null;

  const [conference, setConference] = useState<Conference | null>(null);
  const [settings, setSettings] = useState<AbstractSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [assistedAuthorName, setAssistedAuthorName] = useState<string | null>(null);

  const [titleError, setTitleError] = useState<string | undefined>();
  const [typeError, setTypeError] = useState<string | undefined>();
  const [categoryError, setCategoryError] = useState<string | undefined>();
  const [authorsError, setAuthorsError] = useState<string | undefined>();
  const [authorErrors, setAuthorErrors] = useState<Record<string, Record<string, string>>>({});

  const draftIdParam = searchParams.get('draftId');

  // Sync onBehalfOfUserId to context and fetch author name
  useEffect(() => {
    if (onBehalfOfUserId && Number.isFinite(onBehalfOfUserId)) {
      setOnBehalfOfUserId(onBehalfOfUserId);
      // Fetch author name for display
      apiClient.get(`/api/admin/users/${onBehalfOfUserId}`).then(res => {
        setAssistedAuthorName(res.data?.name || 'Author');
      }).catch(() => {
        setAssistedAuthorName('Author');
      });
    }
  }, [onBehalfOfUserId, setOnBehalfOfUserId]);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push(`/conferences/${conferenceId}`);
    }
  }, [isAuthenticated, authLoading, conferenceId, router]);

  // Load draft if draftId is provided
  useEffect(() => {
    const draftId = draftIdParam;
    if (draftId && conferenceId && isAuthenticated && !data.draftId) {
      const loadExistingDraft = async () => {
        try {
          const draftRes = await apiClient.get(`/api/submissions/${draftId}`);
          const parsed = parseSubmissionDraft(draftRes.data as unknown);
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
          toast.success('Draft loaded successfully');
        } catch (err) {
          console.error('Failed to load draft:', err);
          toast.error('Failed to load draft');
        }
      };
      loadExistingDraft();
    } else if (conferenceId && !data.conferenceId) {
      setConferenceId(conferenceId);
    }
  }, [draftIdParam, conferenceId, isAuthenticated, data.draftId, data.conferenceId, loadDraft, setConferenceId]);

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

  // Auto-add initial author form when authors are enabled and none exist
  useEffect(() => {
    if (settings?.authorsEnabled && data.authors.length === 0 && !loading) {
      addAuthor();
    }
  }, [settings?.authorsEnabled, data.authors.length, loading, addAuthor]);

  const getWordCount = (text: string) => {
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
  };

  const shouldCollectOrcid = Boolean(settings?.collectAuthorOrcid) || Boolean(settings?.requiresOrcid);

  const saveDraft = async () => {
    if (!conferenceId) return null;
    
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        title: data.title.trim() || 'Untitled',
        abstract: data.abstract.trim() || '',
        keywords: data.keywords,
        typeId: data.typeId,
        categoryId: data.categoryId,
      };

      // Include onBehalfOfUserId for organizer assistance mode
      if (data.onBehalfOfUserId) {
        payload.onBehalfOfUserId = data.onBehalfOfUserId;
      }

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

      let response;
      if (data.draftId) {
        // Update existing draft
        response = await apiClient.put(`/api/submissions/${data.draftId}`, payload);
        toast.success('Draft saved');
      } else {
        // Create new draft
        response = await apiClient.post(`/api/conferences/${conferenceId}/submissions`, payload);
        loadDraft(response.data);
        toast.success('Draft created');
      }

      const savedId: number | null =
        typeof response.data?.id === 'number' && Number.isFinite(response.data.id)
          ? response.data.id
          : data.draftId;

      if (savedId && draftIdParam !== String(savedId)) {
        router.replace(`/conferences/${conferenceId}/submit/essentials?draftId=${savedId}`);
      }
      
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
  const validate = (): boolean => {
    let isValid = true;

    // Validate title
    if (!data.title.trim()) {
      setTitleError('Title is required');
      isValid = false;
    } else if (settings?.titleMaxWords) {
      const wordCount = getWordCount(data.title);
      if (wordCount > settings.titleMaxWords) {
        setTitleError(`Title must not exceed ${settings.titleMaxWords} words (currently ${wordCount})`);
        isValid = false;
      } else {
        setTitleError(undefined);
      }
    } else {
      setTitleError(undefined);
    }

    // Validate presentation type
    if (settings?.presentationTypes && settings.presentationTypes.length > 0 && !data.typeId) {
      setTypeError('Please select a presentation type');
      isValid = false;
    } else {
      setTypeError(undefined);
    }

    // Validate category
    if (settings?.categories && settings.categories.length > 0 && !data.categoryId) {
      setCategoryError('Please select a category');
      isValid = false;
    } else {
      setCategoryError(undefined);
    }

    // Validate authors
    if (settings?.authorsEnabled) {
      if (data.authors.length === 0) {
        setAuthorsError('At least one author is required');
        isValid = false;
      } else {
        setAuthorsError(undefined);
        
        const hasPresentingAuthor = data.authors.some(a => a.isPresentingAuthor);
        if (!hasPresentingAuthor) {
          setAuthorsError('Please designate one author as the presenting author');
          isValid = false;
        }

        const newAuthorErrors: Record<string, Record<string, string>> = {};
        data.authors.forEach(author => {
          const errors: Record<string, string> = {};

          if (!author.firstName.trim()) {
            errors.firstName = 'First name is required';
            isValid = false;
          }
          if (!author.lastName.trim()) {
            errors.lastName = 'Last name is required';
            isValid = false;
          }

          if (settings.collectAuthorEmail) {
            if (!author.email.trim()) {
              errors.email = 'Email is required';
              isValid = false;
            } else if (!author.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
              errors.email = 'Invalid email address';
              isValid = false;
            }
          }

          if (settings.collectAuthorAffiliation && !author.affiliation.trim()) {
            errors.affiliation = 'Affiliation is required';
            isValid = false;
          }

          if (settings.collectAuthorPhone) {
            if (!author.phone.trim()) {
              errors.phone = 'Phone is required';
              isValid = false;
            }
          }

          if (shouldCollectOrcid) {
            if (settings.requiresOrcid && !author.orcid.trim()) {
              errors.orcid = 'ORCID iD is required';
              isValid = false;
            } else if (author.orcid && !author.orcid.match(/^\d{4}-\d{4}-\d{4}-\d{3}[0-9X]$/)) {
              errors.orcid = 'Invalid ORCID format (0000-0000-0000-0000)';
              isValid = false;
            }
          }

          if (Object.keys(errors).length > 0) {
            newAuthorErrors[author.id] = errors;
          }
        });
        setAuthorErrors(newAuthorErrors);
      }
    }

    return isValid;
  };

  const handleNext = async () => {
    if (validate()) {
      const saved = await saveDraft();
      const savedId: number | null =
        saved && typeof (saved as { id?: unknown }).id === 'number' && Number.isFinite((saved as { id?: number }).id)
          ? (saved as { id: number }).id
          : data.draftId;
      const draftQs = savedId ? `draftId=${savedId}` : '';
      const onBehalfQs = data.onBehalfOfUserId ? `onBehalfOf=${data.onBehalfOfUserId}` : '';
      const qs = [draftQs, onBehalfQs].filter(Boolean).join('&');
      router.push(`/conferences/${conferenceId}/submit/content${qs ? `?${qs}` : ''}`);
    } else {
      toast.error('Please fix all errors before continuing');
    }
  };

  const handleSaveDraft = async () => {
    await saveDraft();
  };

  const handleBack = () => {
    const onBehalfQs = data.onBehalfOfUserId ? `?onBehalfOf=${data.onBehalfOfUserId}` : '';
    router.push(`/conferences/${conferenceId}/submit${onBehalfQs}`);
  };

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
            <h2 className="text-lg font-semibold">Abstract Essentials</h2>
            <Badge variant="outline">{conference?.name}</Badge>
          </div>
          <Progress value={33} className="h-2" />
        </div>
      </div>

      <div className="app-container py-8">
        {/* Assistance Mode Banner */}
        {data.onBehalfOfUserId && (
          <Alert className="mb-6 max-w-3xl mx-auto border-amber-500/50 bg-amber-50 dark:bg-amber-950/20">
            <UserCog className="h-4 w-4 text-amber-600" />
            <AlertTitle className="text-amber-800 dark:text-amber-200">
              Organizer Assistance Mode
            </AlertTitle>
            <AlertDescription className="text-amber-700 dark:text-amber-300">
              You are creating this submission on behalf of <strong>{assistedAuthorName || 'the author'}</strong>.
            </AlertDescription>
          </Alert>
        )}
        <Card className="mx-auto max-w-3xl">
          <CardHeader>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 rounded-lg bg-purple-50 dark:bg-purple-950">
                <FileText className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <CardTitle>Abstract Essentials</CardTitle>
                <CardDescription>
                  Provide title, presentation type, category, and author details
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title" className="text-sm font-medium">
                Abstract Title <span className="text-red-500">*</span>
              </Label>
              <Input
                id="title"
                placeholder="Enter your abstract title"
                value={data.title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  setTitleError(undefined);
                }}
                className={titleError ? 'border-destructive' : ''}
              />
              {titleError && (
                <p className="text-xs text-destructive flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {titleError}
                </p>
              )}
            </div>

            {/* Presentation Type and Category side by side */}
            {((settings?.presentationTypes && settings.presentationTypes.length > 0) || 
              (settings?.categories && settings.categories.length > 0)) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Presentation Type */}
                {settings?.presentationTypes && settings.presentationTypes.length > 0 && (
                <div className="space-y-2">
                  <Label htmlFor="type" className="text-sm font-medium">
                    Presentation Type <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={data.typeId?.toString() || ''}
                    onValueChange={(value) => {
                      setTypeId(Number(value));
                      setTypeError(undefined);
                    }}
                  >
                    <SelectTrigger className={typeError ? 'border-destructive' : ''}>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {settings.presentationTypes.map((type) => (
                        <SelectItem key={type.id} value={type.id.toString()}>
                          {type.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {typeError && (
                    <p className="text-xs text-destructive flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {typeError}
                    </p>
                  )}
                </div>
              )}

              {/* Category */}
              {settings?.categories && settings.categories.length > 0 && (
                <div className="space-y-2">
                  <Label htmlFor="category" className="text-sm font-medium">
                    Submission Topic/Category <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={data.categoryId?.toString() || ''}
                    onValueChange={(value) => {
                      setCategoryId(Number(value));
                      setCategoryError(undefined);
                    }}
                  >
                    <SelectTrigger className={categoryError ? 'border-destructive' : ''}>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {settings.categories.map((category) => (
                        <SelectItem key={category.id} value={category.id.toString()}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {categoryError && (
                    <p className="text-xs text-destructive flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {categoryError}
                    </p>
                  )}
                </div>
              )}
              </div>
            )}

            {((settings?.presentationTypes && settings.presentationTypes.length > 0) || 
              (settings?.categories && settings.categories.length > 0)) && <Separator />}

            {/* Authors Section */}
            {settings?.authorsEnabled && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-semibold">Authors</Label>
                  <Button type="button" size="sm" onClick={addAuthor} variant="outline">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Author
                  </Button>
                </div>

                {authorsError && (
                  <p className="text-xs text-destructive flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {authorsError}
                  </p>
                )}

                {data.authors.map((author, index) => (
                  <Card key={author.id} className="relative">
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-muted-foreground">
                            Author {index + 1}
                          </span>
                          {author.isPresentingAuthor && (
                            <Badge variant="secondary" className="text-xs">
                              Presenting Author
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-2">
                            <Label htmlFor={`presenting-${author.id}`} className="text-xs cursor-pointer">
                              Presenting
                            </Label>
                            <Switch
                              id={`presenting-${author.id}`}
                              checked={author.isPresentingAuthor}
                              onCheckedChange={(checked) =>
                                updateAuthor(author.id, 'isPresentingAuthor', checked)
                              }
                            />
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                className={data.authors.length === 1 ? 'text-muted-foreground cursor-not-allowed' : 'text-destructive'}
                                onClick={() => {
                                  if (data.authors.length === 1) {
                                    toast.error('At least one author is required');
                                    return;
                                  }
                                  removeAuthor(author.id);
                                }}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete Author
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>

                      <div className="space-y-4">
                        {/* First Name and Last Name */}
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor={`firstName-${author.id}`} className="text-sm">
                              First Name <span className="text-red-500">*</span>
                            </Label>
                            <Input
                              id={`firstName-${author.id}`}
                              value={author.firstName}
                              onChange={(e) => updateAuthor(author.id, 'firstName', e.target.value)}
                              className={authorErrors[author.id]?.firstName ? 'border-destructive' : ''}
                            />
                            {authorErrors[author.id]?.firstName && (
                              <p className="text-xs text-destructive">
                                {authorErrors[author.id].firstName}
                              </p>
                            )}
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor={`lastName-${author.id}`} className="text-sm">
                              Last Name <span className="text-red-500">*</span>
                            </Label>
                            <Input
                              id={`lastName-${author.id}`}
                              value={author.lastName}
                              onChange={(e) => updateAuthor(author.id, 'lastName', e.target.value)}
                              className={authorErrors[author.id]?.lastName ? 'border-destructive' : ''}
                            />
                            {authorErrors[author.id]?.lastName && (
                              <p className="text-xs text-destructive">
                                {authorErrors[author.id].lastName}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Affiliation */}
                        {settings.collectAuthorAffiliation && (
                          <div className="space-y-2">
                            <Label htmlFor={`affiliation-${author.id}`} className="text-sm">
                              Affiliation <span className="text-red-500">*</span>
                            </Label>
                            <Input
                              id={`affiliation-${author.id}`}
                              value={author.affiliation}
                              onChange={(e) => updateAuthor(author.id, 'affiliation', e.target.value)}
                              className={authorErrors[author.id]?.affiliation ? 'border-destructive' : ''}
                            />
                            {authorErrors[author.id]?.affiliation && (
                              <p className="text-xs text-destructive">
                                {authorErrors[author.id].affiliation}
                              </p>
                            )}
                          </div>
                        )}

                        {/* Email and Phone */}
                        <div className="grid grid-cols-2 gap-4">
                          {settings.collectAuthorEmail && (
                            <div className="space-y-2">
                              <Label htmlFor={`email-${author.id}`} className="text-sm">
                                Email <span className="text-red-500">*</span>
                              </Label>
                              <Input
                                id={`email-${author.id}`}
                                type="email"
                                value={author.email}
                                onChange={(e) => updateAuthor(author.id, 'email', e.target.value)}
                                className={authorErrors[author.id]?.email ? 'border-destructive' : ''}
                              />
                              {authorErrors[author.id]?.email && (
                                <p className="text-xs text-destructive">
                                  {authorErrors[author.id].email}
                                </p>
                              )}
                            </div>
                          )}
                          {settings.collectAuthorPhone && (
                            <div className="space-y-2">
                              <Label htmlFor={`phone-${author.id}`} className="text-sm">
                                Phone <span className="text-red-500">*</span>
                              </Label>
                              <Input
                                id={`phone-${author.id}`}
                                type="tel"
                                value={author.phone}
                                onChange={(e) => updateAuthor(author.id, 'phone', e.target.value)}
                                className={authorErrors[author.id]?.phone ? 'border-destructive' : ''}
                              />
                              {authorErrors[author.id]?.phone && (
                                <p className="text-xs text-destructive">
                                  {authorErrors[author.id].phone}
                                </p>
                              )}
                            </div>
                          )}
                        </div>

                        {/* ORCID */}
                        {shouldCollectOrcid && (
                          <div className="space-y-2">
                            <Label htmlFor={`orcid-${author.id}`} className="text-sm">
                              ORCID iD {settings.requiresOrcid && <span className="text-red-500">*</span>}
                            </Label>
                            <Input
                              id={`orcid-${author.id}`}
                              placeholder="0000-0000-0000-0000"
                              value={author.orcid}
                              onChange={(e) => updateAuthor(author.id, 'orcid', e.target.value)}
                              className={authorErrors[author.id]?.orcid ? 'border-destructive' : ''}
                            />
                            {authorErrors[author.id]?.orcid && (
                              <p className="text-xs text-destructive">
                                {authorErrors[author.id].orcid}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
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
