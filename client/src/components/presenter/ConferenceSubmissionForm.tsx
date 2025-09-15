'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Save, Send, AlertCircle, Info } from 'lucide-react';
import KeywordsInput from '@/components/keywords-input';
import FileUpload from '@/components/file-upload';
import { submissionFormSchema, SubmissionFormData } from '@/lib/schemas/submissionSchema';
import { ConferenceSubmissionInfo, AbstractSubmission } from '@/types/submission';

interface ConferenceSubmissionFormProps {
  conferenceId: string;
  submissionSettings?: any;
  categories?: any[];
  presentationTypes?: any[];
}

export default function ConferenceSubmissionForm({ 
  conferenceId, 
  submissionSettings,
  categories,
  presentationTypes 
}: ConferenceSubmissionFormProps) {
  const [submissionInfo, setSubmissionInfo] = useState<ConferenceSubmissionInfo | null>(null);
  const [existingSubmission, setExistingSubmission] = useState<AbstractSubmission | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const form = useForm<SubmissionFormData>({
    resolver: zodResolver(submissionFormSchema),
    defaultValues: {
      title: '',
      content: '',
      keywords: [],
      presentationTypeId: 0,
      requestedDuration: undefined,
      biography: '',
      fileUrl: '',
      consentToTerms: false
    }
  });

  useEffect(() => {
    fetchSubmissionInfo();
    if (submissionId) {
      fetchExistingSubmission();
    }
  }, [conferenceId, submissionId]);

  const fetchSubmissionInfo = async () => {
    try {
      const response = await fetch(`/api/conferences/${conferenceId}/submission-info`);
      if (response.ok) {
        const data = await response.json();
        setSubmissionInfo(data);
      } else {
        setError('Failed to load submission requirements');
      }
    } catch (error) {
      console.error('Error fetching submission info:', error);
      setError('Failed to load submission requirements');
    } finally {
      setLoading(false);
    }
  };

  const fetchExistingSubmission = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/submissions/${submissionId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const submission = await response.json();
        setExistingSubmission(submission);
        
        // Populate form with existing data
        form.reset({
          title: submission.title,
          content: submission.content,
          keywords: submission.keywords || [],
          presentationTypeId: submission.presentationTypeId || 0,
          requestedDuration: submission.requestedDuration,
          biography: submission.biography || '',
          fileUrl: submission.fileUrl || '',
          consentToTerms: true
        });
      }
    } catch (error) {
      console.error('Error fetching existing submission:', error);
    }
  };

  const onSubmit = async (data: SubmissionFormData) => {
    if (!submissionInfo) return;

    setSubmitting(true);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      const url = submissionId 
        ? `/api/submissions/${submissionId}`
        : `/api/conferences/${conferenceId}/submissions`;
      
      const method = submissionId ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title: data.title,
          content: data.content,
          keywords: data.keywords,
          presentationTypeId: data.presentationTypeId,
          requestedDuration: data.requestedDuration,
          biography: data.biography,
          fileUrl: data.fileUrl
        })
      });

      if (response.ok) {
        router.push(`/presenter/conferences/${conferenceId}/submissions`);
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to save submission');
      }
    } catch (error) {
      console.error('Error saving submission:', error);
      setError('Failed to save submission. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/2"></div>
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!submissionInfo || error) {
    return (
      <div className="container mx-auto p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {error || 'Failed to load submission requirements'}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const { conference, submissionSettings, presentationTypes } = submissionInfo;

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <Button 
          variant="ghost" 
          onClick={() => router.back()}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <h1 className="text-3xl font-bold">
          {submissionId ? 'Edit Submission' : 'Submit Proposal'}
        </h1>
        <p className="text-muted-foreground mt-2">
          {conference.name}
        </p>
      </div>

      {/* Submission Guidelines */}
      {submissionSettings.submissionGuidelines && (
        <Alert className="mb-6">
          <Info className="h-4 w-4" />
          <AlertDescription>
            {submissionSettings.submissionGuidelines}
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Submission Details</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Title */}
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Presentation Title *</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Enter your presentation title"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Abstract */}
              <FormField
                control={form.control}
                name="content"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Abstract *</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Enter your abstract..."
                        className="min-h-[150px]"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      {field.value.length}/{submissionSettings.maxAbstractLength} characters
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Keywords */}
              <FormField
                control={form.control}
                name="keywords"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Keywords *</FormLabel>
                    <FormControl>
                      <KeywordsInput
                        keywords={field.value}
                        onChange={field.onChange}
                        minKeywords={submissionSettings.minKeywords}
                        maxKeywords={submissionSettings.maxKeywords}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Presentation Type */}
              <FormField
                control={form.control}
                name="presentationTypeId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Presentation Type *</FormLabel>
                    <Select 
                      onValueChange={(value) => field.onChange(parseInt(value))}
                      value={field.value?.toString()}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select presentation type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {presentationTypes.map((type) => (
                          <SelectItem key={type.id} value={type.id.toString()}>
                            <div>
                              <div className="font-medium">{type.name}</div>
                              {type.description && (
                                <div className="text-sm text-muted-foreground">
                                  {type.description}
                                </div>
                              )}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Requested Duration (if allowed) */}
              {submissionSettings.allowDurationRequest && (
                <FormField
                  control={form.control}
                  name="requestedDuration"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Requested Duration (minutes)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number"
                          placeholder="Enter duration in minutes"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || undefined)}
                        />
                      </FormControl>
                      <FormDescription>
                        Leave blank to use the default duration for your presentation type
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {/* Biography */}
              {submissionSettings.requireAuthorBio && (
                <FormField
                  control={form.control}
                  name="biography"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Speaker Biography *</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Tell us about yourself and your qualifications..."
                          className="min-h-[100px]"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Include your professional background, expertise, and any relevant credentials
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {/* File Upload */}
              {submissionSettings.requireFullPaper && (
                <FormField
                  control={form.control}
                  name="fileUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Supporting Document</FormLabel>
                      <FormControl>
                        <FileUpload
                          onFileUpload={field.onChange}
                          onFileRemove={() => field.onChange('')}
                          allowedTypes={submissionSettings.allowedFileTypes}
                          maxSizeMB={submissionSettings.maxFileSize}
                          currentFileUrl={field.value}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {/* Terms and Conditions */}
              {submissionSettings.requireConsentToTerms && (
                <FormField
                  control={form.control}
                  name="consentToTerms"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>
                          I agree to the terms and conditions *
                        </FormLabel>
                        <FormDescription>
                          By submitting, you agree to the conference submission guidelines and review process.
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />
              )}

              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {/* Action Buttons */}
              <div className="flex justify-end gap-2 pt-6">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => router.back()}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={submitting}
                  className="min-w-[120px]"
                >
                  {submitting ? (
                    <div className="flex items-center gap-2">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent" />
                      Saving...
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Send className="h-4 w-4" />
                      {submissionId ? 'Update Submission' : 'Submit Proposal'}
                    </div>
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}