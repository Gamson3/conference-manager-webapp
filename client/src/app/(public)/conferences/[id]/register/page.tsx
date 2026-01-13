"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { useAuth } from '@/features/auth/hooks/useAuth';
import apiClient from '@/lib/api/client';
import API_ENDPOINTS from '@/lib/api/endpoints';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { DateInput } from '@/components/ui/date-input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { 
  AlertCircle, 
  CheckCircle2, 
  ChevronLeft, 
  ChevronRight,
  Loader2, 
  UserCheck, 
  FileText,
  Calendar,
  MapPin,
  Users
} from 'lucide-react';
import { toast } from 'sonner';

function normalizeOptions(raw: unknown): string[] | undefined {
  if (raw === null || raw === undefined) return undefined;
  if (Array.isArray(raw)) {
    const clean = raw
      .filter((x): x is string => typeof x === "string")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    return clean.length > 0 ? clean : undefined;
  }
  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (trimmed.length === 0) return undefined;

    // JSON-encoded arrays are common.
    if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
      try {
        const parsed: unknown = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          const clean = parsed
            .filter((x): x is string => typeof x === "string")
            .map((s) => s.trim())
            .filter((s) => s.length > 0);
          return clean.length > 0 ? clean : undefined;
        }
      } catch {
        // fall through
      }
    }

    const parts = trimmed
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    return parts.length > 0 ? parts : undefined;
  }
  return undefined;
}

interface RegistrationSettings {
  id: number;
  registrationEnabled: boolean;
  registrationOpenFrom?: string;
  registrationOpenUntil?: string;
  maxAttendees?: number;
  waitlistEnabled?: boolean;
  requireApproval?: boolean;
}

interface RegistrationQuestion {
  id: number;
  label: string;
  description?: string;
  type: 'text' | 'textarea' | 'select' | 'multiselect' | 'checkbox' | 'email' | 'phone' | 'date';
  required: boolean;
  options?: string[];
  placeholder?: string;
  category?: string;
}

interface Conference {
  id: number;
  name: string;
  description?: string;
  startDate: string;
  endDate: string;
  location?: string;
  venue?: string;
  bannerImageUrl?: string;
}

type Step = 'welcome' | 'information' | 'success';

export default function ConferenceRegisterPage() {
  const params = useParams<{ id?: string }>();
  const router = useRouter();
  const { isAuthenticated, loading: authLoading, user } = useAuth();
  const conferenceId = params?.id ? Number(params.id) : undefined;

  const [conference, setConference] = useState<Conference | null>(null);
  const [settings, setSettings] = useState<RegistrationSettings | null>(null);
  const [questions, setQuestions] = useState<RegistrationQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [currentStep, setCurrentStep] = useState<Step>('welcome');
  const [responses, setResponses] = useState<Record<number, string | boolean | string[]>>({});
  const [errors, setErrors] = useState<Record<number, string>>({});

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push(`/conferences/${conferenceId}`);
    }
  }, [isAuthenticated, authLoading, conferenceId, router]);

  // Load data
  useEffect(() => {
    if (!conferenceId || !isAuthenticated) return;

    const loadData = async () => {
      setLoading(true);
      setError(undefined);

      try {
        // Fetch conference basic details
        const confRes = await apiClient.get(API_ENDPOINTS.CONFERENCES.BY_ID(conferenceId));
        setConference(confRes.data);

        // Fetch ACTUAL registration settings configured by organizer
        const settingsRes = await apiClient.get(
          `/api/public/conferences/${conferenceId}/registration/settings`
        );
        setSettings(settingsRes.data);

        // Validate registration window
        if (!settingsRes.data.registrationEnabled) {
          setError('Registration is not enabled for this conference.');
          return;
        }

        const now = new Date();
        const openFrom = settingsRes.data.registrationOpenFrom ? new Date(settingsRes.data.registrationOpenFrom) : null;
        const openUntil = settingsRes.data.registrationOpenUntil ? new Date(settingsRes.data.registrationOpenUntil) : null;

        if (openFrom && now < openFrom) {
          setError(`Registration opens on ${openFrom.toLocaleDateString()}.`);
          return;
        }

        if (openUntil && now > openUntil) {
          setError('Registration has closed.');
          return;
        }

        // Fetch active registration questions
        const questionsRes = await apiClient.get(
          `/api/conferences/${conferenceId}/registration/questions/active`
        );
        const rawQuestions: unknown = questionsRes.data;
        const normalized = Array.isArray(rawQuestions)
          ? rawQuestions
              .filter((q): q is Record<string, unknown> => typeof q === "object" && q !== null)
              .map((q): RegistrationQuestion | null => {
                const id = q.id;
                const label = q.label;
                const type = q.type;
                const required = q.required;
                if (typeof id !== "number" || typeof label !== "string") return null;
                if (typeof type !== "string") return null;
                if (typeof required !== "boolean") return null;

                const description = typeof q.description === "string" ? q.description : undefined;
                const placeholder = typeof q.placeholder === "string" ? q.placeholder : undefined;
                const category = typeof q.category === "string" ? q.category : undefined;
                const options = normalizeOptions(q.options);

                return {
                  id,
                  label,
                  type: type as RegistrationQuestion["type"],
                  required,
                  description,
                  placeholder,
                  category,
                  options,
                };
              })
              .filter((q): q is RegistrationQuestion => q !== null)
          : [];
        setQuestions(normalized);

      } catch (err: unknown) {
        console.error('Failed to load registration data:', err);
        const apiErr = err as { response?: { data?: { message?: string } } };
        setError(apiErr.response?.data?.message || 'Failed to load registration form.');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [conferenceId, isAuthenticated]);

  const handleResponseChange = useCallback((questionId: number, value: string | boolean | string[]) => {
    setResponses((prev) => ({ ...prev, [questionId]: value }));
    setErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors[questionId];
      return newErrors;
    });
  }, []);

  const validateForm = (): boolean => {
    const newErrors: Record<number, string> = {};
    let isValid = true;

    questions.forEach((question) => {
      if (question.required) {
        const value = responses[question.id];
        if (value === undefined || value === null || value === '' || 
            (Array.isArray(value) && value.length === 0)) {
          newErrors[question.id] = `${question.label} is required`;
          isValid = false;
        }
      }
    });

    setErrors(newErrors);
    return isValid;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      toast.error('Please fill in all required fields');
      return;
    }

    setSubmitting(true);
    setError(undefined);

    try {
      await apiClient.post(
        `/api/conferences/${conferenceId}/register/enhanced`,
        { customResponses: responses }
      );

      toast.success('Registration successful!');
      setCurrentStep('success');
      
      setTimeout(() => {
        router.push(`/conferences/${conferenceId}`);
      }, 3000);

    } catch (err: unknown) {
      console.error('Registration failed:', err);
      const apiErr = err as { response?: { data?: { message?: string } } };
      const message = apiErr.response?.data?.message || 'Registration failed. Please try again.';
      setError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const getStepProgress = () => {
    const steps = ['welcome', 'information', 'success'];
    const currentIndex = steps.indexOf(currentStep);
    return ((currentIndex + 1) / steps.length) * 100;
  };

  const renderQuestion = (question: RegistrationQuestion) => {
    const value = responses[question.id];
    const error = errors[question.id];
    const stringValue = (typeof value === 'string' ? value : '') as string;
    const boolValue = (typeof value === 'boolean' ? value : false) as boolean;

    const inputClasses = error 
      ? 'border-destructive focus-visible:ring-destructive' 
      : 'border-gray-200 focus-visible:ring-primary';

    switch (question.type) {
      case 'text':
      case 'email':
      case 'phone':
        return (
          <div key={question.id} className="space-y-2">
            <Label htmlFor={`q-${question.id}`} className="text-sm font-medium">
              {question.label}
              {question.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            {question.description && (
              <p className="text-xs text-muted-foreground">{question.description}</p>
            )}
            <Input
              id={`q-${question.id}`}
              type={question.type}
              placeholder={question.placeholder}
              value={stringValue}
              onChange={(e) => handleResponseChange(question.id, e.target.value)}
              className={inputClasses}
            />
            {error && (
              <p className="text-xs text-destructive flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {error}
              </p>
            )}
          </div>
        );

      case 'textarea':
        return (
          <div key={question.id} className="space-y-2">
            <Label htmlFor={`q-${question.id}`} className="text-sm font-medium">
              {question.label}
              {question.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            {question.description && (
              <p className="text-xs text-muted-foreground">{question.description}</p>
            )}
            <Textarea
              id={`q-${question.id}`}
              placeholder={question.placeholder}
              value={stringValue}
              onChange={(e) => handleResponseChange(question.id, e.target.value)}
              rows={4}
              className={inputClasses}
            />
            {error && (
              <p className="text-xs text-destructive flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {error}
              </p>
            )}
          </div>
        );

      case 'select':
        return (
          <div key={question.id} className="space-y-2">
            <Label htmlFor={`q-${question.id}`} className="text-sm font-medium">
              {question.label}
              {question.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            {question.description && (
              <p className="text-xs text-muted-foreground">{question.description}</p>
            )}
            <Select
              value={stringValue}
              onValueChange={(val) => handleResponseChange(question.id, val)}
            >
              <SelectTrigger className={inputClasses}>
                <SelectValue placeholder={question.placeholder || 'Select an option'} />
              </SelectTrigger>
              <SelectContent>
                {question.options?.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {error && (
              <p className="text-xs text-destructive flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {error}
              </p>
            )}
          </div>
        );

      case 'checkbox':
        return (
          <div key={question.id} className="space-y-2">
            <div className="flex items-start gap-3 p-4 rounded-lg border bg-gray-50/50 dark:bg-gray-900/20">
              <Checkbox
                id={`q-${question.id}`}
                checked={boolValue}
                onCheckedChange={(checked) => handleResponseChange(question.id, !!checked)}
                className="mt-1"
              />
              <div className="space-y-1 flex-1">
                <Label htmlFor={`q-${question.id}`} className="cursor-pointer text-sm font-medium">
                  {question.label}
                  {question.required && <span className="text-red-500 ml-1">*</span>}
                </Label>
                {question.description && (
                  <p className="text-xs text-muted-foreground">{question.description}</p>
                )}
              </div>
            </div>
            {error && (
              <p className="text-xs text-destructive flex items-center gap-1 ml-7">
                <AlertCircle className="h-3 w-3" />
                {error}
              </p>
            )}
          </div>
        );

      case 'date':
        return (
          <div key={question.id} className="space-y-2">
            <Label htmlFor={`q-${question.id}`} className="text-sm font-medium">
              {question.label}
              {question.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            {question.description && (
              <p className="text-xs text-muted-foreground">{question.description}</p>
            )}
            <DateInput
              id={`q-${question.id}`}
              value={stringValue}
              onChange={(v) => handleResponseChange(question.id, v)}
              className={inputClasses}
            />
            {error && (
              <p className="text-xs text-destructive flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {error}
              </p>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  // Welcome Step
  const renderWelcomeStep = () => (
    <div className="max-w-4xl mx-auto">
      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 text-white mb-8">
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
            Registration Open
          </Badge>
          <h1 className="text-3xl md:text-4xl font-bold mb-4">
            {conference?.name}
          </h1>
          <p className="text-lg text-white/90 max-w-2xl">
            {conference?.description || 'Join us for an incredible conference experience'}
          </p>
        </div>
      </div>

      {/* Conference Details Grid */}
      <div className="grid md:grid-cols-2 gap-6 mb-8">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950">
                <Calendar className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">Conference Dates</h3>
                <p className="text-sm text-muted-foreground">
                  {conference?.startDate && new Date(conference.startDate).toLocaleDateString('en-US', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric'
                  })}
                  {' - '}
                  {conference?.endDate && new Date(conference.endDate).toLocaleDateString('en-US', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric'
                  })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {conference?.location && (
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950">
                  <MapPin className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Location</h3>
                  <p className="text-sm text-muted-foreground">
                    {conference.venue && <span className="block">{conference.venue}</span>}
                    {conference.location}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {settings?.maxAttendees && (
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-lg bg-purple-50 dark:bg-purple-950">
                  <Users className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Capacity</h3>
                  <p className="text-sm text-muted-foreground">
                    Limited to {settings.maxAttendees} attendees
                    {settings.waitlistEnabled && (
                      <span className="block text-xs mt-1">Waitlist available if full</span>
                    )}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

      </div>

      {/* What to Expect */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            What to Expect
          </CardTitle>
          <CardDescription>
            The registration process is quick and easy
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400">
                <CheckCircle2 className="h-4 w-4" />
              </div>
              <div>
                <p className="font-medium">Step 1: Your Information</p>
                <p className="text-sm text-muted-foreground">
                  {questions.length > 0 
                    ? `We'll ask you ${questions.length} question${questions.length > 1 ? 's' : ''} to complete your registration`
                    : 'Confirm your account details'}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400">
                <CheckCircle2 className="h-4 w-4" />
              </div>
              <div>
                <p className="font-medium">Step 2: Review & Submit</p>
                <p className="text-sm text-muted-foreground">
                  Review your information and complete your registration
                </p>
              </div>
            </div>
            {settings?.requireApproval && (
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-full bg-amber-100 dark:bg-amber-900 text-amber-600 dark:text-amber-400">
                  <AlertCircle className="h-4 w-4" />
                </div>
                <div>
                  <p className="font-medium">Approval Required</p>
                  <p className="text-sm text-muted-foreground">
                    Your registration will be reviewed by the organizers
                  </p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* CTA */}
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
          onClick={() => setCurrentStep('information')}
          className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
        >
          Start Registration
          <ChevronRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  );

  // Information Step
  const renderInformationStep = () => (
    <div className="max-w-3xl mx-auto">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950">
              <UserCheck className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <CardTitle>Registration Information</CardTitle>
              <CardDescription>
                Please provide the following information to complete your registration
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* User Info */}
          <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-900/20 border">
            <h3 className="font-medium mb-2 flex items-center gap-2">
              <UserCheck className="h-4 w-4" />
              Your Account
            </h3>
            <p className="text-sm text-muted-foreground mb-3">
              Registering as: <span className="font-medium text-foreground">{user?.email}</span>
            </p>
          </div>

          {questions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle2 className="h-12 w-12 mx-auto mb-3 text-green-500" />
              <p>No additional information required.</p>
              <p className="text-sm">Click continue to complete your registration.</p>
            </div>
          ) : (
            <>
              <Separator />
              <div className="space-y-6">
                {questions.map(renderQuestion)}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-between items-center mt-6">
        <Button
          variant="outline"
          onClick={() => setCurrentStep('welcome')}
          disabled={submitting}
        >
          <ChevronLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <Button 
          onClick={handleSubmit}
          disabled={submitting}
          size="lg"
        >
          {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Complete Registration
          <ChevronRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  );

  // Success Step
  const renderSuccessStep = () => (
    <div className="max-w-2xl mx-auto text-center">
      <div className="mb-8">
        <div className="inline-flex p-4 rounded-full bg-green-100 dark:bg-green-900/20 mb-4">
          <CheckCircle2 className="h-16 w-16 text-green-600 dark:text-green-400" />
        </div>
        <h1 className="text-3xl font-bold mb-4">Registration Successful!</h1>
        <p className="text-lg text-muted-foreground mb-6">
          You have successfully registered for {conference?.name}
        </p>
        
        {settings?.requireApproval && (
          <Card className="mb-6 border-amber-200 bg-amber-50 dark:bg-amber-950/20">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5" />
                <div className="text-left">
                  <h3 className="font-semibold mb-1">Approval Required</h3>
                  <p className="text-sm text-muted-foreground">
                    Your registration is pending approval from the conference organizers. 
                    You will receive an email notification once your registration is approved.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button 
            variant="outline"
            onClick={() => router.push(`/conferences/${conferenceId}`)}
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Back to Conference
          </Button>
          <Button onClick={() => router.push('/account/my-conferences')}>
            View My Conferences
          </Button>
        </div>

        <p className="text-xs text-muted-foreground mt-6">
          Redirecting you to the conference page in a moment...
        </p>
      </div>
    </div>
  );

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading registration...</p>
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
              <h2 className="text-2xl font-bold mb-2">Unable to Register</h2>
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
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-950 dark:to-gray-900">
      {/* Header */}
      <div className="border-b bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="app-container py-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Conference Registration</h2>
            <Badge variant="outline">{conference?.name}</Badge>
          </div>
          <Progress value={getStepProgress()} className="h-2" />
        </div>
      </div>

      {/* Content */}
      <div className="app-container py-8">
        {currentStep === 'welcome' && renderWelcomeStep()}
        {currentStep === 'information' && renderInformationStep()}
        {currentStep === 'success' && renderSuccessStep()}
      </div>
    </div>
  );
}
