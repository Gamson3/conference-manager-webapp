"use client";

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { createAuthenticatedApi } from "@/lib/utils";
import { toast } from "sonner";
import { 
  ArrowLeftIcon,
  InfoIcon,
  PlusIcon,
  TrashIcon,
  FileIcon,
  AlertCircleIcon,
  CheckCircleIcon,
  UserIcon,
  BuildingIcon,
  TagIcon,
  FileTextIcon,
  ClockIcon
} from "lucide-react";
import { motion } from "framer-motion";

interface ConferenceData {
  id: number;
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  location: string;
  submissionSettings: {
    submissionDeadline: string;
    allowLateSubmissions: boolean;
    requireAbstract: boolean;
    maxAbstractLength: number;
    requireFullPaper: boolean;
    allowedFileTypes: string[];
    maxFileSize: number;
    requireAuthorBio: boolean;
    requireAffiliation: boolean;
    maxCoAuthors: number;
    requirePresenterDesignation: boolean;
    requireKeywords: boolean;
    minKeywords: number;
    maxKeywords: number;
    requirePresentationType: boolean;
    allowDurationRequest: boolean;
    submissionGuidelines: string;
    authorGuidelines: string;
    presentationGuidelines: string;
    reviewCriteria: string;
  };
  categories: Array<{ id: number; name: string; description: string }>;
  presentationTypes: Array<{ id: number; name: string; description: string; duration: number }>;
}

interface Author {
  name: string;
  email: string;
  affiliation: string;
  bio: string;
  isPresenter: boolean;
}

interface SubmissionData {
  title: string;
  abstract: string;
  keywords: string[];
  categoryId: number | null;
  presentationTypeId: number | null;
  requestedDuration: number | null;
  authors: Author[];
  agreeToTerms: boolean;
}

export default function SubmissionForm() {
  const params = useParams();
  const router = useRouter();
  const conferenceId = params.conferenceId as string;

  const [conference, setConference] = useState<ConferenceData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentKeyword, setCurrentKeyword] = useState('');
  
  const [formData, setFormData] = useState<SubmissionData>({
    title: '',
    abstract: '',
    keywords: [],
    categoryId: null,
    presentationTypeId: null,
    requestedDuration: null,
    authors: [{
      name: '',
      email: '',
      affiliation: '',
      bio: '',
      isPresenter: true
    }],
    agreeToTerms: false
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchConferenceData();
  }, [conferenceId]);

  const fetchConferenceData = async () => {
    try {
      setIsLoading(true);
      const api = await createAuthenticatedApi();
      
      const [conferenceRes, categoriesRes, typesRes] = await Promise.all([
        api.get(`/conferences/${conferenceId}`),
        api.get(`/api/events/${conferenceId}/categories`),
        api.get(`/api/events/${conferenceId}/presentation-types`)
      ]);

      const conferenceData = {
        ...conferenceRes.data,
        categories: categoriesRes.data || [],
        presentationTypes: typesRes.data || []
      };

      setConference(conferenceData);

      // Auto-populate current user as first author
      const userResponse = await api.get('/auth/me');
      const user = userResponse.data;
      
      setFormData(prev => ({
        ...prev,
        authors: [{
          name: user.name || '',
          email: user.email || '',
          affiliation: user.organization || '',
          bio: user.bio || '',
          isPresenter: true
        }]
      }));

    } catch (error: any) {
      console.error('Error fetching conference data:', error);
      toast.error('Failed to load conference information');
    } finally {
      setIsLoading(false);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Basic validation
    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }

    // Abstract validation
    if (conference?.submissionSettings.requireAbstract) {
      if (!formData.abstract.trim()) {
        newErrors.abstract = 'Abstract is required';
      } else if (conference.submissionSettings.maxAbstractLength && 
                 formData.abstract.length > conference.submissionSettings.maxAbstractLength) {
        newErrors.abstract = `Abstract cannot exceed ${conference.submissionSettings.maxAbstractLength} characters`;
      }
    }

    // Keywords validation
    if (conference?.submissionSettings.requireKeywords) {
      if (formData.keywords.length < conference.submissionSettings.minKeywords) {
        newErrors.keywords = `At least ${conference.submissionSettings.minKeywords} keywords are required`;
      }
      if (formData.keywords.length > conference.submissionSettings.maxKeywords) {
        newErrors.keywords = `Maximum ${conference.submissionSettings.maxKeywords} keywords allowed`;
      }
    }

    // Category validation
    if (!formData.categoryId) {
      newErrors.categoryId = 'Please select a category';
    }

    // Presentation type validation
    if (conference?.submissionSettings.requirePresentationType && !formData.presentationTypeId) {
      newErrors.presentationTypeId = 'Please select a presentation type';
    }

    // Authors validation
    if (formData.authors.length === 0) {
      newErrors.authors = 'At least one author is required';
    } else {
      formData.authors.forEach((author, index) => {
        if (!author.name.trim()) {
          newErrors[`author_${index}_name`] = 'Author name is required';
        }
        if (!author.email.trim()) {
          newErrors[`author_${index}_email`] = 'Author email is required';
        }
        if (conference?.submissionSettings.requireAffiliation && !author.affiliation.trim()) {
          newErrors[`author_${index}_affiliation`] = 'Author affiliation is required';
        }
        if (conference?.submissionSettings.requireAuthorBio && !author.bio.trim()) {
          newErrors[`author_${index}_bio`] = 'Author bio is required';
        }
      });

      // Check presenter designation
      if (conference?.submissionSettings.requirePresenterDesignation) {
        const hasPresenter = formData.authors.some(author => author.isPresenter);
        if (!hasPresenter) {
          newErrors.presenter = 'At least one author must be designated as presenter';
        }
      }

      // Check max co-authors
      if (conference?.submissionSettings.maxCoAuthors && 
          formData.authors.length > conference.submissionSettings.maxCoAuthors) {
        newErrors.authors = `Maximum ${conference.submissionSettings.maxCoAuthors} authors allowed`;
      }
    }

    // Terms agreement
    if (!formData.agreeToTerms) {
      newErrors.agreeToTerms = 'You must agree to the terms and conditions';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error('Please fix the errors in the form');
      return;
    }

    try {
      setIsSubmitting(true);
      const api = await createAuthenticatedApi();
      
      const submissionData = {
        title: formData.title,
        abstract: formData.abstract,
        keywords: formData.keywords,
        categoryId: formData.categoryId,
        presentationTypeId: formData.presentationTypeId,
        requestedDuration: formData.requestedDuration,
        authors: formData.authors
      };

      const response = await api.post(`/api/conferences/${conferenceId}/submit`, submissionData);
      
      toast.success('🎉 Submission successful!');
      router.push(`/presenter/submissions/${response.data.presentation.id}`);
    } catch (error: any) {
      console.error('Error submitting:', error);
      toast.error(error.response?.data?.message || 'Failed to submit presentation');
    } finally {
      setIsSubmitting(false);
    }
  };

  const addKeyword = () => {
    if (currentKeyword.trim() && !formData.keywords.includes(currentKeyword.trim())) {
      setFormData(prev => ({
        ...prev,
        keywords: [...prev.keywords, currentKeyword.trim()]
      }));
      setCurrentKeyword('');
    }
  };

  const removeKeyword = (keyword: string) => {
    setFormData(prev => ({
      ...prev,
      keywords: prev.keywords.filter(k => k !== keyword)
    }));
  };

  const addAuthor = () => {
    setFormData(prev => ({
      ...prev,
      authors: [...prev.authors, {
        name: '',
        email: '',
        affiliation: '',
        bio: '',
        isPresenter: false
      }]
    }));
  };

  const removeAuthor = (index: number) => {
    if (formData.authors.length > 1) {
      setFormData(prev => ({
        ...prev,
        authors: prev.authors.filter((_, i) => i !== index)
      }));
    }
  };

  const updateAuthor = (index: number, field: keyof Author, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      authors: prev.authors.map((author, i) => 
        i === index ? { ...author, [field]: value } : author
      )
    }));
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto p-6 pb-20">
        <div className="animate-pulse space-y-6">
          <div className="h-16 bg-white/50 rounded-2xl"></div>
          <div className="h-96 bg-white/50 rounded-2xl"></div>
        </div>
      </div>
    );
  }

  if (!conference) {
    return (
      <div className="max-w-4xl mx-auto p-6 pb-20">
        <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
          <CardContent className="p-12 text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Conference Not Found</h2>
            <p className="text-gray-600 mb-6">The conference you're looking for doesn't exist or is not accepting submissions.</p>
            <Button onClick={() => router.push('/presenter/discover')}>
              <ArrowLeftIcon className="h-4 w-4 mr-2" />
              Back to Discover
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 pb-20">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="mb-8"
      >
        <Button
          variant="ghost"
          onClick={() => router.push('/presenter/discover')}
          className="mb-6 pl-0"
        >
          <ArrowLeftIcon className="h-4 w-4 mr-2" />
          Back to Discover
        </Button>

        <div className="bg-gradient-to-r from-violet-600 to-blue-600 rounded-2xl p-6 text-white mb-6">
          <h1 className="text-2xl font-bold mb-2">Submit to {conference.name}</h1>
          <p className="text-white/90 mb-4">{conference.description}</p>
          
          <div className="flex flex-wrap gap-4 text-sm">
            <div className="flex items-center gap-1">
              <CalendarIcon className="h-4 w-4" />
              <span>Conference: {new Date(conference.startDate).toLocaleDateString()}</span>
            </div>
            <div className="flex items-center gap-1">
              <ClockIcon className="h-4 w-4" />
              <span>Deadline: {new Date(conference.submissionSettings.submissionDeadline).toLocaleDateString()}</span>
            </div>
          </div>
        </div>

        {/* Guidelines */}
        {conference.submissionSettings.submissionGuidelines && (
          <Alert className="mb-6">
            <InfoIcon className="h-4 w-4" />
            <AlertDescription>
              <strong>Submission Guidelines:</strong> {conference.submissionSettings.submissionGuidelines}
            </AlertDescription>
          </Alert>
        )}
      </motion.div>

      {/* Form */}
      <motion.form
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.1 }}
        onSubmit={handleSubmit}
        className="space-y-8"
      >
        {/* Basic Information */}
        <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileTextIcon className="h-5 w-5 text-violet-600" />
              Presentation Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Title */}
            <div>
              <Label htmlFor="title">Presentation Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Enter your presentation title"
                className={errors.title ? "border-red-300" : ""}
              />
              {errors.title && <p className="text-red-600 text-sm mt-1">{errors.title}</p>}
            </div>

            {/* Abstract */}
            {conference.submissionSettings.requireAbstract && (
              <div>
                <Label htmlFor="abstract">
                  Abstract * 
                  {conference.submissionSettings.maxAbstractLength && (
                    <span className="text-gray-500 font-normal">
                      (max {conference.submissionSettings.maxAbstractLength} characters)
                    </span>
                  )}
                </Label>
                <Textarea
                  id="abstract"
                  value={formData.abstract}
                  onChange={(e) => setFormData(prev => ({ ...prev, abstract: e.target.value }))}
                  placeholder="Enter your presentation abstract"
                  rows={6}
                  className={errors.abstract ? "border-red-300" : ""}
                />
                <div className="flex justify-between text-sm text-gray-500 mt-1">
                  {errors.abstract && <span className="text-red-600">{errors.abstract}</span>}
                  <span className="ml-auto">
                    {formData.abstract.length}
                    {conference.submissionSettings.maxAbstractLength && 
                      `/${conference.submissionSettings.maxAbstractLength}`
                    } characters
                  </span>
                </div>
              </div>
            )}

            {/* Keywords */}
            {conference.submissionSettings.requireKeywords && (
              <div>
                <Label htmlFor="keywords">
                  Keywords * 
                  <span className="text-gray-500 font-normal">
                    ({conference.submissionSettings.minKeywords}-{conference.submissionSettings.maxKeywords} keywords)
                  </span>
                </Label>
                <div className="flex gap-2 mb-2">
                  <Input
                    value={currentKeyword}
                    onChange={(e) => setCurrentKeyword(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addKeyword())}
                    placeholder="Type a keyword and press Enter"
                    className="flex-1"
                  />
                  <Button type="button" onClick={addKeyword} size="sm">
                    <PlusIcon className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2 mb-2">
                  {formData.keywords.map((keyword, index) => (
                    <Badge key={index} variant="outline" className="flex items-center gap-1">
                      {keyword}
                      <button
                        type="button"
                        onClick={() => removeKeyword(keyword)}
                        className="ml-1 hover:text-red-600"
                      >
                        ×
                      </button>
                    </Badge>
                  ))}
                </div>
                {errors.keywords && <p className="text-red-600 text-sm">{errors.keywords}</p>}
              </div>
            )}

            {/* Category */}
            <div>
              <Label htmlFor="category">Category *</Label>
              <select
                id="category"
                value={formData.categoryId || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, categoryId: Number(e.target.value) || null }))}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:border-violet-300 ${
                  errors.categoryId ? "border-red-300" : "border-gray-200"
                }`}
              >
                <option value="">Select a category</option>
                {conference.categories.map(category => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
              {errors.categoryId && <p className="text-red-600 text-sm mt-1">{errors.categoryId}</p>}
            </div>

            {/* Presentation Type */}
            {conference.submissionSettings.requirePresentationType && (
              <div>
                <Label htmlFor="presentationType">Presentation Type *</Label>
                <select
                  id="presentationType"
                  value={formData.presentationTypeId || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, presentationTypeId: Number(e.target.value) || null }))}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:border-violet-300 ${
                    errors.presentationTypeId ? "border-red-300" : "border-gray-200"
                  }`}
                >
                  <option value="">Select a presentation type</option>
                  {conference.presentationTypes.map(type => (
                    <option key={type.id} value={type.id}>
                      {type.name} ({type.duration} minutes)
                    </option>
                  ))}
                </select>
                {errors.presentationTypeId && <p className="text-red-600 text-sm mt-1">{errors.presentationTypeId}</p>}
              </div>
            )}

            {/* Duration Request */}
            {conference.submissionSettings.allowDurationRequest && (
              <div>
                <Label htmlFor="duration">Requested Duration (minutes)</Label>
                <Input
                  id="duration"
                  type="number"
                  min="5"
                  max="180"
                  value={formData.requestedDuration || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, requestedDuration: Number(e.target.value) || null }))}
                  placeholder="e.g., 20"
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Authors */}
        <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <UserIcon className="h-5 w-5 text-violet-600" />
                Authors
              </CardTitle>
              {formData.authors.length < (conference.submissionSettings.maxCoAuthors || 10) && (
                <Button type="button" onClick={addAuthor} size="sm" variant="outline">
                  <PlusIcon className="h-4 w-4 mr-2" />
                  Add Author
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {conference.submissionSettings.authorGuidelines && (
              <Alert>
                <InfoIcon className="h-4 w-4" />
                <AlertDescription>{conference.submissionSettings.authorGuidelines}</AlertDescription>
              </Alert>
            )}

            {formData.authors.map((author, index) => (
              <div key={index} className="p-4 border rounded-lg space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Author {index + 1}</h4>
                  {formData.authors.length > 1 && (
                    <Button
                      type="button"
                      onClick={() => removeAuthor(index)}
                      size="sm"
                      variant="outline"
                      className="text-red-600 hover:text-red-700"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor={`author_${index}_name`}>Name *</Label>
                    <Input
                      id={`author_${index}_name`}
                      value={author.name}
                      onChange={(e) => updateAuthor(index, 'name', e.target.value)}
                      placeholder="Full name"
                      className={errors[`author_${index}_name`] ? "border-red-300" : ""}
                    />
                    {errors[`author_${index}_name`] && (
                      <p className="text-red-600 text-sm mt-1">{errors[`author_${index}_name`]}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor={`author_${index}_email`}>Email *</Label>
                    <Input
                      id={`author_${index}_email`}
                      type="email"
                      value={author.email}
                      onChange={(e) => updateAuthor(index, 'email', e.target.value)}
                      placeholder="email@example.com"
                      className={errors[`author_${index}_email`] ? "border-red-300" : ""}
                    />
                    {errors[`author_${index}_email`] && (
                      <p className="text-red-600 text-sm mt-1">{errors[`author_${index}_email`]}</p>
                    )}
                  </div>
                </div>

                {conference.submissionSettings.requireAffiliation && (
                  <div>
                    <Label htmlFor={`author_${index}_affiliation`}>Affiliation *</Label>
                    <Input
                      id={`author_${index}_affiliation`}
                      value={author.affiliation}
                      onChange={(e) => updateAuthor(index, 'affiliation', e.target.value)}
                      placeholder="University or Organization"
                      className={errors[`author_${index}_affiliation`] ? "border-red-300" : ""}
                    />
                    {errors[`author_${index}_affiliation`] && (
                      <p className="text-red-600 text-sm mt-1">{errors[`author_${index}_affiliation`]}</p>
                    )}
                  </div>
                )}

                {conference.submissionSettings.requireAuthorBio && (
                  <div>
                    <Label htmlFor={`author_${index}_bio`}>Bio *</Label>
                    <Textarea
                      id={`author_${index}_bio`}
                      value={author.bio}
                      onChange={(e) => updateAuthor(index, 'bio', e.target.value)}
                      placeholder="Brief professional bio"
                      rows={3}
                      className={errors[`author_${index}_bio`] ? "border-red-300" : ""}
                    />
                    {errors[`author_${index}_bio`] && (
                      <p className="text-red-600 text-sm mt-1">{errors[`author_${index}_bio`]}</p>
                    )}
                  </div>
                )}

                {conference.submissionSettings.requirePresenterDesignation && (
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id={`author_${index}_presenter`}
                      checked={author.isPresenter}
                      onCheckedChange={(checked) => updateAuthor(index, 'isPresenter', checked as boolean)}
                    />
                    <Label htmlFor={`author_${index}_presenter`}>
                      This author will present the work
                    </Label>
                  </div>
                )}
              </div>
            ))}

            {errors.authors && <p className="text-red-600 text-sm">{errors.authors}</p>}
            {errors.presenter && <p className="text-red-600 text-sm">{errors.presenter}</p>}
          </CardContent>
        </Card>

        {/* Terms and Submit */}
        <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <Checkbox
                  id="agreeToTerms"
                  checked={formData.agreeToTerms}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, agreeToTerms: checked as boolean }))}
                />
                <div>
                  <Label htmlFor="agreeToTerms" className="cursor-pointer">
                    I agree to the conference terms and conditions *
                  </Label>
                  <p className="text-sm text-gray-600 mt-1">
                    By submitting, you confirm that your work is original and you have the right to present it.
                  </p>
                </div>
              </div>
              {errors.agreeToTerms && <p className="text-red-600 text-sm">{errors.agreeToTerms}</p>}

              <div className="flex gap-4 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push('/presenter/discover')}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 bg-gradient-to-r from-violet-500 to-blue-500 hover:from-violet-600 hover:to-blue-600"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                      Submitting...
                    </>
                  ) : (
                    <>
                      <CheckCircleIcon className="h-4 w-4 mr-2" />
                      Submit Presentation
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.form>
    </div>
  );
}