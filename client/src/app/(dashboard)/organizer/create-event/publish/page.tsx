"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  CheckCircle,
  AlertCircle,
  Calendar,
  Upload,
  Users,
  Clock,
  Settings,
  FolderIcon,
  PresentationIcon,
  ArrowLeft,
  Globe,
  FileText,
  Mail,
  Eye,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { createAuthenticatedApi } from "@/lib/utils";
import CreateEventWorkflow from "@/components/workflow/CreateEventWorkflow";
import { motion } from "framer-motion";

interface Event {
  id: number;
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  location: string;
  status: string;
  capacity?: number;
}

interface SubmissionSettings {
  // Deadline Settings
  submissionDeadline: string;
  allowLateSubmissions: boolean;

  // Abstract Requirements
  requireAbstract: boolean;
  maxAbstractLength: number;

  // File Requirements
  requireFullPaper: boolean;
  allowedFileTypes: string[];
  maxFileSize: number; // in MB

  // Author Requirements
  requireAuthorBio: boolean;
  requireAffiliation: boolean;
  maxCoAuthors: number;
  requirePresenterDesignation: boolean;

  // Presentation Requirements
  requireKeywords: boolean;
  minKeywords: number;
  maxKeywords: number;
  requirePresentationType: boolean;
  allowDurationRequest: boolean;

  // Submission Process
  reviewProcess: "automatic" | "manual" | "peer_review";
  enableSubmissions: boolean;
  allowMultipleSubmissions: boolean;
  requireConsentToTerms: boolean;

  // Guidelines
  submissionGuidelines: string;
  authorGuidelines: string;
  presentationGuidelines: string;
  reviewCriteria: string;

  // Notification Settings
  notificationEmails: string[];
  sendConfirmationEmail: boolean;
  sendStatusUpdates: boolean;
}

export default function PublishEventPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const eventId = searchParams?.get("eventId");

  const [event, setEvent] = useState<Event | null>(null);
  const [categories, setCategories] = useState([]);
  const [presentationTypes, setPresentationTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const [submissionSettings, setSubmissionSettings] =
    useState<SubmissionSettings>({
      // Deadline Settings
      submissionDeadline: "",
      allowLateSubmissions: false,

      // Abstract Requirements
      requireAbstract: true,
      maxAbstractLength: 500,

      // File Requirements
      requireFullPaper: true,
      allowedFileTypes: ["pdf", "doc", "docx"],
      maxFileSize: 50, // Updated to 50MB for documents

      // Author Requirements
      requireAuthorBio: true,
      requireAffiliation: true,
      maxCoAuthors: 5,
      requirePresenterDesignation: true,

      // Presentation Requirements
      requireKeywords: true,
      minKeywords: 5,
      maxKeywords: 15,
      requirePresentationType: true,
      allowDurationRequest: false,

      // Submission Process
      reviewProcess: "manual",
      enableSubmissions: true,
      allowMultipleSubmissions: false,
      requireConsentToTerms: true,

      // Guidelines
      submissionGuidelines: "",
      authorGuidelines: "",
      presentationGuidelines: "",
      reviewCriteria: "",

      // Notification Settings
      notificationEmails: [],
      sendConfirmationEmail: true,
      sendStatusUpdates: true,
    });

  useEffect(() => {
    if (!eventId) {
      toast.error("No event ID found");
      router.push("/organizer/create-event");
      return;
    }
    fetchEventData();
  }, [eventId]);

  // Update fetchEventData to load submission settings
  const fetchEventData = async () => {
    if (!eventId) return;

    try {
      setLoading(true);
      const api = await createAuthenticatedApi();

      const [eventRes, categoriesRes, typesRes, submissionRes] =
        await Promise.all([
          api.get(`/events/${eventId}`),
          api
            .get(`/api/events/${eventId}/categories`)
            .catch(() => ({ data: [] })),
          api
            .get(`/api/events/${eventId}/presentation-types`)
            .catch(() => ({ data: [] })),
          api
            .get(`/api/events/${eventId}/submission-settings`)
            .catch(() => ({ data: null })),
        ]);

      const eventData = eventRes.data;
      const categoriesData = categoriesRes.data || [];
      const typesData = typesRes.data || [];
      const submissionData = submissionRes.data;

      setEvent(eventData);
      setCategories(categoriesData);
      setPresentationTypes(typesData);

      // Load existing submission settings or use defaults
      // Alternative cleaner approach
      if (submissionData) {
        setSubmissionSettings((prev) => ({
          ...prev, // Start with defaults
          ...submissionData, // Override with loaded data
          // Handle special cases
          submissionDeadline:
            submissionData.submissionDeadline?.split("T")[0] || "",
          maxCoAuthors: submissionData.maxCoAuthors || 5,
          requirePresenterDesignation:
            submissionData.requirePresenterDesignation || false,
          requireKeywords: submissionData.requireKeywords ?? true,
          minKeywords: submissionData.minKeywords || 5,
          maxKeywords: submissionData.maxKeywords || 15,
          requirePresentationType:
            submissionData.requirePresentationType ?? true,
          allowDurationRequest: submissionData.allowDurationRequest || false,
          allowMultipleSubmissions:
            submissionData.allowMultipleSubmissions || false,
          requireConsentToTerms: submissionData.requireConsentToTerms || false,
          authorGuidelines: submissionData.authorGuidelines || "",
          presentationGuidelines: submissionData.presentationGuidelines || "",
          reviewCriteria: submissionData.reviewCriteria || "",
          sendConfirmationEmail: submissionData.sendConfirmationEmail ?? true,
          sendStatusUpdates: submissionData.sendStatusUpdates ?? true,
        }));
      } else if (eventData?.startDate) {
        // Set default deadline if no settings exist
        const eventDate = new Date(eventData.startDate);
        const defaultDeadline = new Date(eventDate);
        defaultDeadline.setMonth(defaultDeadline.getMonth() - 1);
        setSubmissionSettings((prev) => ({
          ...prev,
          submissionDeadline: defaultDeadline.toISOString().split("T")[0],
        }));
      }

      validateConfiguration(eventData, categoriesData, typesData);
    } catch (error) {
      console.error("Error fetching event data:", error);
      toast.error("Failed to load event data");
    } finally {
      setLoading(false);
    }
  };

  // ✅ FIXED: Update function to accept parameters with fallbacks
  const validateConfiguration = (
    eventData: Event | null = event,
    categoriesData: any[] = categories,
    typesData: any[] = presentationTypes
  ) => {
    const errors: string[] = [];

    // Basic event validation (required for call for papers)
    if (!eventData?.name) errors.push("Event name is required");
    if (!eventData?.description) errors.push("Event description is required");
    if (!eventData?.startDate) errors.push("Event start date is required");
    if (!eventData?.location) errors.push("Event location is required");

    // Structure validation (required for submissions)
    if (categoriesData.length === 0)
      errors.push("At least one category is required");
    if (typesData.length === 0)
      errors.push("At least one presentation type is required");

    setValidationErrors(errors);
  };

  // Update publish function to use proper endpoints
  const handlePublishWithSubmissions = async () => {
    if (validationErrors.length > 0) {
      toast.error("Please fix all validation errors before publishing");
      return;
    }

    try {
      setPublishing(true);
      const api = await createAuthenticatedApi();

      // 1. Save submission settings to dedicated table
      await api.put(
        `/api/events/${eventId}/submission-settings`,
        submissionSettings
      );

      // 2. Update event status to call_for_papers
      await api.put(`/events/${eventId}`, {
        status: "call_for_papers",
      });

      toast.success("🎉 Conference published! Now accepting submissions.");
      router.push(`/organizer/events/${eventId}`);
    } catch (error: any) {
      console.error("Error publishing event:", error);
      toast.error(
        error.response?.data?.message || "Failed to publish conference"
      );
    } finally {
      setPublishing(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto py-8 px-4">
        <div className="animate-pulse space-y-6">
          <div className="h-32 bg-gray-500 rounded"></div>
          <div className="space-y-4">
            <div className="h-24 bg-gray-500 rounded"></div>
            <div className="h-24 bg-gray-500 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  const isValid = validationErrors.length === 0;

  return (
    <div className="max-w-6xl mx-auto py-8 px-4">
      <CreateEventWorkflow
        currentStep={4}
        eventId={eventId || undefined}
        showCancelButton={true}
      />

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <Button
            variant="ghost"
            onClick={() =>
              router.push(
                `/organizer/create-event/categories?eventId=${eventId}`
              )
            }
            className="p-0 h-8 hover:bg-transparent"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Categories
          </Button>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">
              Publish Conference & Configure Submissions
            </h1>
            <p className="text-gray-600 mt-2">
              Set up submission guidelines and publish your conference to start
              accepting papers.
            </p>
          </div>
          <Badge variant="outline" className="text-sm">
            Step 4 of 4
          </Badge>
        </div>
      </div>

      {/* Validation Status */}
      {validationErrors.length > 0 && (
        <Alert className="mb-6 border-red-200 bg-red-50">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            <div className="font-medium mb-2">
              Please fix the following issues:
            </div>
            <ul className="list-disc list-inside space-y-1">
              {validationErrors.map((error, index) => (
                <li key={index} className="text-sm">
                  {error}
                </li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column - Conference Summary */}
        <div className="space-y-6">
          {/* Event Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                Conference Overview
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold text-lg">{event?.name}</h3>
                <p className="text-gray-600 text-sm mt-1">
                  {event?.description}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Date:</span>
                  <br />
                  <span>
                    {event?.startDate
                      ? new Date(event.startDate).toLocaleDateString()
                      : "Not set"}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">Location:</span>
                  <br />
                  <span>{event?.location || "Not set"}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Conference Structure */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5 text-primary" />
                Conference Structure
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <FolderIcon className="h-8 w-8 mx-auto text-blue-600 mb-2" />
                  <div className="text-2xl font-bold text-blue-600">
                    {categories.length}
                  </div>
                  <div className="text-sm text-blue-700">Categories</div>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <PresentationIcon className="h-8 w-8 mx-auto text-purple-600 mb-2" />
                  <div className="text-2xl font-bold text-purple-600">
                    {presentationTypes.length}
                  </div>
                  <div className="text-sm text-purple-700">
                    Presentation Types
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Submission Configuration */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5 text-primary" />
                Submission Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Submission Deadline */}
              <div>
                <Label htmlFor="submission-deadline">
                  Submission Deadline *
                </Label>
                <Input
                  id="submission-deadline"
                  type="date"
                  value={submissionSettings.submissionDeadline}
                  onChange={(e) =>
                    setSubmissionSettings((prev) => ({
                      ...prev,
                      submissionDeadline: e.target.value,
                    }))
                  }
                  className="mt-1"
                />
              </div>

              {/* Requirements */}
              <div className="space-y-4">
                <h4 className="font-medium">Submission Requirements</h4>

                <div className="flex items-center space-x-3">
                  <Checkbox
                    id="require-abstract"
                    checked={submissionSettings.requireAbstract}
                    onCheckedChange={(checked) =>
                      setSubmissionSettings((prev) => ({
                        ...prev,
                        requireAbstract: checked as boolean,
                      }))
                    }
                  />
                  <Label htmlFor="require-abstract" className="cursor-pointer">
                    Require Abstract
                  </Label>
                </div>

                {submissionSettings.requireAbstract && (
                  <div className="ml-6">
                    <Label htmlFor="max-abstract">
                      Max Abstract Length (words)
                    </Label>
                    <Input
                      id="max-abstract"
                      type="number"
                      value={submissionSettings.maxAbstractLength}
                      onChange={(e) =>
                        setSubmissionSettings((prev) => ({
                          ...prev,
                          maxAbstractLength: Number(e.target.value),
                        }))
                      }
                      className="mt-1"
                    />
                  </div>
                )}

                <div className="flex items-center space-x-3">
                  <Checkbox
                    id="require-paper"
                    checked={submissionSettings.requireFullPaper}
                    onCheckedChange={(checked) =>
                      setSubmissionSettings((prev) => ({
                        ...prev,
                        requireFullPaper: checked as boolean,
                      }))
                    }
                  />
                  <Label htmlFor="require-paper" className="cursor-pointer">
                    Require Full Paper
                  </Label>
                </div>
              </div>

              {/* Author Requirements Section */}
              <Card>
                <CardHeader>
                  <CardTitle>Author Requirements</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <Checkbox
                      id="require-bio"
                      checked={submissionSettings.requireAuthorBio}
                      onCheckedChange={(checked) =>
                        setSubmissionSettings((prev) => ({
                          ...prev,
                          requireAuthorBio: checked as boolean,
                        }))
                      }
                    />
                    <Label htmlFor="require-bio">Require Author Bio</Label>
                  </div>

                  <div className="flex items-center space-x-3">
                    <Checkbox
                      id="require-affiliation"
                      checked={submissionSettings.requireAffiliation}
                      onCheckedChange={(checked) =>
                        setSubmissionSettings((prev) => ({
                          ...prev,
                          requireAffiliation: checked as boolean,
                        }))
                      }
                    />
                    <Label htmlFor="require-affiliation">
                      Require Affiliation
                    </Label>
                  </div>

                  <div className="flex items-center space-x-3">
                    <Checkbox
                      id="require-presenter"
                      checked={submissionSettings.requirePresenterDesignation}
                      onCheckedChange={(checked) =>
                        setSubmissionSettings((prev) => ({
                          ...prev,
                          requirePresenterDesignation: checked as boolean,
                        }))
                      }
                    />
                    <Label htmlFor="require-presenter">
                      Require Presenter Designation
                    </Label>
                  </div>

                  <div>
                    <Label htmlFor="max-coauthors">Maximum Co-authors</Label>
                    <Input
                      id="max-coauthors"
                      type="number"
                      min="1"
                      max="20"
                      value={submissionSettings.maxCoAuthors}
                      onChange={(e) =>
                        setSubmissionSettings((prev) => ({
                          ...prev,
                          maxCoAuthors: Number(e.target.value),
                        }))
                      }
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Presentation Requirements Section */}
              <Card>
                <CardHeader>
                  <CardTitle>Presentation Requirements</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <Checkbox
                      id="require-keywords"
                      checked={submissionSettings.requireKeywords}
                      onCheckedChange={(checked) =>
                        setSubmissionSettings((prev) => ({
                          ...prev,
                          requireKeywords: checked as boolean,
                        }))
                      }
                    />
                    <Label htmlFor="require-keywords">Require Keywords</Label>
                  </div>

                  {submissionSettings.requireKeywords && (
                    <div className="ml-6 grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="min-keywords">Minimum Keywords</Label>
                        <Input
                          id="min-keywords"
                          type="number"
                          min="1"
                          max="10"
                          value={submissionSettings.minKeywords}
                          onChange={(e) =>
                            setSubmissionSettings((prev) => ({
                              ...prev,
                              minKeywords: Number(e.target.value),
                            }))
                          }
                        />
                      </div>
                      <div>
                        <Label htmlFor="max-keywords">Maximum Keywords</Label>
                        <Input
                          id="max-keywords"
                          type="number"
                          min="5"
                          max="20"
                          value={submissionSettings.maxKeywords}
                          onChange={(e) =>
                            setSubmissionSettings((prev) => ({
                              ...prev,
                              maxKeywords: Number(e.target.value),
                            }))
                          }
                        />
                      </div>
                    </div>
                  )}

                  <div className="flex items-center space-x-3">
                    <Checkbox
                      id="require-type"
                      checked={submissionSettings.requirePresentationType}
                      onCheckedChange={(checked) =>
                        setSubmissionSettings((prev) => ({
                          ...prev,
                          requirePresentationType: checked as boolean,
                        }))
                      }
                    />
                    <Label htmlFor="require-type">
                      Require Presentation Type Selection
                    </Label>
                  </div>

                  <div className="flex items-center space-x-3">
                    <Checkbox
                      id="allow-duration"
                      checked={submissionSettings.allowDurationRequest}
                      onCheckedChange={(checked) =>
                        setSubmissionSettings((prev) => ({
                          ...prev,
                          allowDurationRequest: checked as boolean,
                        }))
                      }
                    />
                    <Label htmlFor="allow-duration">
                      Allow Duration Requests
                    </Label>
                  </div>
                </CardContent>
              </Card>

              {/* File Settings */}
              <div>
                <Label htmlFor="max-file-size">Max File Size (MB)</Label>
                <Input
                  id="max-file-size"
                  type="number"
                  value={submissionSettings.maxFileSize}
                  onChange={(e) =>
                    setSubmissionSettings((prev) => ({
                      ...prev,
                      maxFileSize: Number(e.target.value),
                    }))
                  }
                  className="mt-1"
                />
              </div>

              {/* Submission Guidelines */}
              <div>
                <Label htmlFor="guidelines">Submission Guidelines</Label>
                <Textarea
                  id="guidelines"
                  value={submissionSettings.submissionGuidelines}
                  onChange={(e) =>
                    setSubmissionSettings((prev) => ({
                      ...prev,
                      submissionGuidelines: e.target.value,
                    }))
                  }
                  placeholder="Provide detailed instructions for authors submitting to your conference..."
                  rows={4}
                  className="mt-1"
                />
              </div>

              {/* Author Guidelines - NEW SECTION */}
              <div>
                <Label htmlFor="author-guidelines">Author Guidelines</Label>
                <Textarea
                  id="author-guidelines"
                  value={submissionSettings.authorGuidelines}
                  onChange={(e) =>
                    setSubmissionSettings((prev) => ({
                      ...prev,
                      authorGuidelines: e.target.value,
                    }))
                  }
                  placeholder="Provide guidelines specifically for authors..."
                  rows={4}
                  className="mt-1"
                />
              </div>

              {/* Presentation Guidelines - NEW SECTION */}
              <div>
                <Label htmlFor="presentation-guidelines">
                  Presentation Guidelines
                </Label>
                <Textarea
                  id="presentation-guidelines"
                  value={submissionSettings.presentationGuidelines}
                  onChange={(e) =>
                    setSubmissionSettings((prev) => ({
                      ...prev,
                      presentationGuidelines: e.target.value,
                    }))
                  }
                  placeholder="Provide guidelines for the presentation format, length, etc..."
                  rows={4}
                  className="mt-1"
                />
              </div>

              {/* Review Criteria - NEW SECTION */}
              <div>
                <Label htmlFor="review-criteria">Review Criteria</Label>
                <Textarea
                  id="review-criteria"
                  value={submissionSettings.reviewCriteria}
                  onChange={(e) =>
                    setSubmissionSettings((prev) => ({
                      ...prev,
                      reviewCriteria: e.target.value,
                    }))
                  }
                  placeholder="Specify the criteria on which submissions will be reviewed..."
                  rows={4}
                  className="mt-1"
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Ready to Publish Banner */}
      {isValid && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-8 p-6 bg-gradient-to-r from-green-50 to-blue-50 border border-green-500 rounded-lg"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-full">
              <Sparkles className="h-5 w-5 text-green-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-green-800">
                Ready to Accept Submissions!
              </h3>
              <p className="text-sm text-green-700 mt-1">
                Your conference will be published with a "Call for Papers"
                status. Authors can start submitting their presentations
                immediately.
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Action Buttons */}
      <div className="flex justify-between items-center mt-8">
        <Button
          variant="outline"
          onClick={() =>
            router.push(`/organizer/create-event/categories?eventId=${eventId}`)
          }
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Categories
        </Button>

        <Button
          onClick={handlePublishWithSubmissions}
          disabled={publishing || !isValid}
          className={`${
            !isValid
              ? "opacity-50 cursor-not-allowed"
              : "bg-green-600 hover:bg-green-700 text-white"
          }`}
        >
          {publishing ? (
            <>
              <Eye className="h-4 w-4 mr-2 animate-spin" />
              Publishing...
            </>
          ) : (
            <>
              <Globe className="h-4 w-4 mr-2" />
              Publish Conference & Open Submissions
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
