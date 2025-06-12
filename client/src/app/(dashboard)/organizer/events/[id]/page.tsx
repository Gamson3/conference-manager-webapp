"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Users,
  Settings,
  Edit,
  Trash2,
  Globe,
  Eye,
  EyeOff,
  FileText,
  Upload,
  Plus,
  Clock,
  CheckCircle,
  AlertCircle,
  BarChart3,
  Download,
  Mail,
  Share2,
} from "lucide-react";
import { toast } from "sonner";
import { createAuthenticatedApi } from "@/lib/utils";
import { format } from "date-fns";
import ConferencePublishDialog from "@/components/ConferencePublishDialog";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@radix-ui/react-dropdown-menu";

interface EventDetails {
  id: number;
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  location: string;
  status: string;
  capacity?: number;
  workflowStep?: number;
  workflowStatus?: string;
  submissionSettings?: any;
  categories?: any[];
  presentationTypes?: any[];
  sections?: any[]; // Add this line
  _count?: {
    attendances: number;
    sections: number;
    presentations: number;
  };
}

export default function EventDetailPage() {
  const router = useRouter();
  const params = useParams();
  const eventId = Number(params.id);

  const [event, setEvent] = useState<EventDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [showPublishDialog, setShowPublishDialog] = useState(false);
  const [submissions, setSubmissions] = useState([]);
  const [attendees, setAttendees] = useState([]);

  useEffect(() => {
    if (eventId) {
      fetchEventDetails();
    }
  }, [eventId]);

  const fetchEventDetails = async () => {
    try {
      setLoading(true);
      const api = await createAuthenticatedApi();

      // Fetch all the conference configuration data in parallel
      const [
        eventRes,
        submissionRes,
        categoriesRes,
        presentationTypesRes,
        sectionsRes, // Add this line
        submissionsRes,
        attendeesRes,
      ] = await Promise.all([
        api.get(`/events/${eventId}`),
        api
          .get(`/api/events/${eventId}/submission-settings`)
          .catch(() => ({ data: null })),
        api
          .get(`/api/events/${eventId}/categories`)
          .catch(() => ({ data: [] })),
        api
          .get(`/api/events/${eventId}/presentation-types`)
          .catch(() => ({ data: [] })),
        api.get(`/sections/conference/${eventId}`).catch(() => ({ data: [] })), // Add this line
        api.get(`/events/${eventId}/submissions`).catch(() => ({ data: [] })),
        api.get(`/events/${eventId}/attendees`).catch(() => ({ data: [] })),
      ]);

      console.log("Presentation Types:", presentationTypesRes.data);
      console.log("Event Data:", eventRes.data);
      console.log("Categories:", categoriesRes.data);
      console.log("Sections:", sectionsRes.data); // Add this line

      setEvent({
        ...eventRes.data,
        submissionSettings: submissionRes.data,
        categories: categoriesRes.data,
        presentationTypes: presentationTypesRes.data,
        sections: sectionsRes.data, // Add this line
      });
      setSubmissions(submissionsRes.data);
      setAttendees(attendeesRes.data);
    } catch (error: any) {
      console.error("Error fetching event details:", error);
      toast.error("Failed to load event details");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteEvent = async () => {
    // Enhanced confirmation dialog
    const confirmed = window.confirm(
      `Are you sure you want to delete "${event?.name}"?\n\n` +
        `This will permanently delete:\n` +
        `• ${event?.sections?.length || 0} sessions\n` +
        `• ${event?.categories?.length || 0} categories\n` +
        `• ${event?.presentationTypes?.length || 0} presentation types\n` +
        `• ${submissions.length} submissions\n` +
        `• ${attendees.length} attendee registrations\n\n` +
        `This action cannot be undone.`
    );

    if (!confirmed) return;

    try {
      setLoading(true);
      const api = await createAuthenticatedApi();

      await api.delete(`/events/${eventId}`);

      toast.success("Event deleted successfully");
      router.push("/organizer/events");
    } catch (error: any) {
      console.error("Error deleting event:", error);

      if (error.response?.status === 403) {
        toast.error("You do not have permission to delete this event");
      } else if (error.response?.status === 404) {
        toast.error("Event not found");
        router.push("/organizer/events");
      } else {
        toast.error(error.response?.data?.message || "Failed to delete event");
      }
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "published":
        return "bg-green-100 text-green-800 border-green-200";
      case "call_for_papers":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "draft":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "cancelled":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getWorkflowStepName = (step: number) => {
    switch (step) {
      case 1:
        return "Event Details";
      case 2:
        return "Sessions & Schedule";
      case 3:
        return "Categories & Types";
      case 4:
        return "Published";
      default:
        return "Unknown";
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="h-24 bg-gray-200 rounded"></div>
            <div className="h-24 bg-gray-200 rounded"></div>
            <div className="h-24 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="max-w-7xl mx-auto p-6 text-center">
        <h2 className="text-2xl font-bold text-red-600 mb-4">
          Event not found
        </h2>
        <Button onClick={() => router.push("/organizer/events")}>
          Back to Events
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center gap-2 mb-6">
        <Button
          variant="ghost"
          onClick={() => router.push("/organizer/events")}
          className="pl-0"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Events
        </Button>
      </div>

      {/* Event Header */}
      <div className="mb-8 p-6 bg-gradient-to-r from-primary-50 to-primary-100 rounded-lg">
        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold mb-3">{event.name}</h1>
              <Badge className={`px-3 py-1 ${getStatusColor(event.status)}`}>
                {event.status.replace("_", " ").toUpperCase()}
              </Badge>
            </div>
            <p className="text-gray-700 mb-4 mt-4">{event.description}</p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm mt-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary-600" />
                <span>
                  {format(new Date(event.startDate), "MMM d, yyyy")} -{" "}
                  {format(new Date(event.endDate), "MMM d, yyyy")}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary-600" />
                <span>{event.location}</span>
              </div>

              {/* Simplified Header Actions */}
              <div className="flex gap-4">
                <Button
                  variant="outline"
                  onClick={() => setShowPublishDialog(true)}
                >
                  {event.status === "published" ? (
                    <>
                      <EyeOff className="h-4 w-4 mr-2" />
                      Unpublish
                    </>
                  ) : (
                    <>
                      <Globe className="h-4 w-4 mr-2" />
                      Publish
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() =>
                    router.push(`/organizer/create-event?eventId=${eventId}`)
                  }
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Edit
                </Button>
                <Button
                  variant="outline"
                  onClick={handleDeleteEvent}
                  className="text-red-600"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Event
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Attendees</p>
                <p className="text-2xl font-bold">
                  {event._count?.attendances || 0}
                </p>
              </div>
              <Users className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Sessions</p>
                <p className="text-2xl font-bold">
                  {event.sections?.length || 0}
                </p>
              </div>
              <Clock className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Presentations</p>
                <p className="text-2xl font-bold">
                  {event._count?.presentations || 0}
                </p>
              </div>
              <FileText className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Submissions</p>
                <p className="text-2xl font-bold">{submissions.length}</p>
              </div>
              <Upload className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Action Buttons Section - Add this after Quick Stats */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Conference Management</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Schedule Builder */}
            <Button
              variant="outline"
              className="h-auto p-4 flex flex-col items-center gap-2 hover:bg-blue-50 border-blue-200"
              onClick={() =>
                router.push(`/organizer/events/${eventId}/schedule-builder`)
              }
            >
              <Calendar className="h-6 w-6 text-blue-600" />
              <div className="text-center">
                <div className="font-medium">Schedule Builder</div>
                <div className="text-xs text-gray-500">
                  Build conference schedule
                </div>
              </div>
            </Button>

            {/* Edit Event (Workflow) */}
            <Button
              variant="outline"
              className="h-auto p-4 flex flex-col items-center gap-2 hover:bg-purple-50 border-purple-200"
              onClick={() => {
                // Determine which step to redirect to based on workflow
                if (event.workflowStep === 1) {
                  router.push(`/organizer/create-event?eventId=${eventId}`);
                } else if (event.workflowStep === 2) {
                  router.push(
                    `/organizer/create-event/sessions?eventId=${eventId}`
                  );
                } else if (event.workflowStep === 3) {
                  router.push(
                    `/organizer/create-event/categories?eventId=${eventId}`
                  );
                } else if (event.workflowStep === 4) {
                  router.push(
                    `/organizer/create-event/publish?eventId=${eventId}`
                  );
                } else {
                  // Default to first step if no workflow step
                  router.push(`/organizer/create-event?eventId=${eventId}`);
                }
              }}
            >
              <Edit className="h-6 w-6 text-purple-600" />
              <div className="text-center">
                <div className="font-medium">Edit Event</div>
                <div className="text-xs text-gray-500">
                  Modify event details
                </div>
              </div>
            </Button>

            {/* Review Submissions */}
            <Button
              variant="outline"
              className={`h-auto p-4 flex flex-col items-center gap-2 hover:bg-orange-50 border-orange-200 ${
                submissions.length === 0 ? "opacity-50 cursor-not-allowed" : ""
              }`}
              onClick={() => {
                if (submissions.length > 0) {
                  router.push(`/organizer/events/${eventId}/submissions`);
                } else {
                  toast.info("No submissions to review yet");
                }
              }}
              disabled={submissions.length === 0}
            >
              <FileText className="h-6 w-6 text-orange-600" />
              <div className="text-center">
                <div className="font-medium">Review Submissions</div>
                <div className="text-xs text-gray-500">
                  {submissions.length} pending review
                </div>
              </div>
            </Button>

            {/* Manage Attendees */}
            <Button
              variant="outline"
              className="h-auto p-4 flex flex-col items-center gap-2 hover:bg-green-50 border-green-200"
              onClick={() =>
                router.push(`/organizer/events/${eventId}/attendees`)
              }
            >
              <Users className="h-6 w-6 text-green-600" />
              <div className="text-center">
                <div className="font-medium">Manage Attendees</div>
                <div className="text-xs text-gray-500">
                  {attendees.length} registered
                </div>
              </div>
            </Button>

            {/* Session Management */}
            <Button
              variant="outline"
              className="h-auto p-4 flex flex-col items-center gap-2 hover:bg-indigo-50 border-indigo-200"
              onClick={() =>
                router.push(`/organizer/events/${eventId}/sessions`)
              }
            >
              <Clock className="h-6 w-6 text-indigo-600" />
              <div className="text-center">
                <div className="font-medium">Manage Sessions</div>
                <div className="text-xs text-gray-500">
                  {event.sections?.length || 0} sessions
                </div>
              </div>
            </Button>

            {/* Event Analytics */}
            <Button
              variant="outline"
              className="h-auto p-4 flex flex-col items-center gap-2 hover:bg-teal-50 border-teal-200"
              onClick={() =>
                router.push(`/organizer/events/${eventId}/analytics`)
              }
            >
              <BarChart3 className="h-6 w-6 text-teal-600" />
              <div className="text-center">
                <div className="font-medium">Analytics</div>
                <div className="text-xs text-gray-500">View insights</div>
              </div>
            </Button>

            {/* Export Data */}
            <Button
              variant="outline"
              className="h-auto p-4 flex flex-col items-center gap-2 hover:bg-gray-50 border-gray-200"
              onClick={() => {
                // Add export functionality
                toast.info("Export functionality coming soon");
              }}
            >
              <Download className="h-6 w-6 text-gray-600" />
              <div className="text-center">
                <div className="font-medium">Export Data</div>
                <div className="text-xs text-gray-500">Download reports</div>
              </div>
            </Button>

            {/* Delete Event */}
            <Button
              variant="outline"
              className="h-auto p-4 flex flex-col items-center gap-2 hover:bg-red-50 border-red-200 text-red-600"
              onClick={handleDeleteEvent}
            >
              <Trash2 className="h-6 w-6 text-red-600" />
              <div className="text-center">
                <div className="font-medium">Delete Event</div>
                <div className="text-xs text-gray-500">Permanent deletion</div>
              </div>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Workflow Status */}
      {event.workflowStep && event.workflowStep < 4 && (
        <Alert className="mb-6 border-blue-200 bg-blue-50">
          <Clock className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-medium">Setup in progress:</span>
                <span className="ml-2">
                  Step {event.workflowStep}/4 -{" "}
                  {getWorkflowStepName(event.workflowStep!)}
                </span>
              </div>
              <Button
                size="sm"
                onClick={() => {
                  if (event.workflowStep === 1)
                    router.push(`/organizer/create-event?eventId=${eventId}`);
                  else if (event.workflowStep === 2)
                    router.push(
                      `/organizer/create-event/sessions?eventId=${eventId}`
                    );
                  else if (event.workflowStep === 3)
                    router.push(
                      `/organizer/create-event/categories?eventId=${eventId}`
                    );
                }}
              >
                Continue Setup
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Action Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        {/* Overview Tab */}
        <TabsContent value="overview" className="mt-6">
          {/* Configuration Details - NEW SECTION */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Conference Configuration Details</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="categories" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="categories">
                    Categories ({event.categories?.length || 0})
                  </TabsTrigger>
                  <TabsTrigger value="types">
                    Presentation Types ({event.presentationTypes?.length || 0})
                  </TabsTrigger>
                  <TabsTrigger value="sessions">
                    Sessions ({event.sections?.length || 0})
                  </TabsTrigger>
                  <TabsTrigger value="settings">
                    Submission Settings
                  </TabsTrigger>
                </TabsList>

                {/* Categories Tab */}
                <TabsContent value="categories" className="mt-4">
                  {event.categories && event.categories.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {event.categories.map((category: any) => (
                        <div
                          key={category.id}
                          className="flex items-center gap-3 p-3 border rounded-lg"
                        >
                          <div
                            className="w-4 h-4 rounded-full"
                            style={{
                              backgroundColor: category.color || "#6B7280",
                            }}
                          ></div>
                          <div className="flex-1">
                            <h4 className="font-medium">{category.name}</h4>
                            <p className="text-sm text-gray-600">
                              {category.description}
                            </p>
                            {category._count && (
                              <p className="text-xs text-gray-500 mt-1">
                                {category._count.presentations || 0}{" "}
                                presentations, {category._count.sections || 0}{" "}
                                sections
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <div className="w-12 h-12 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                        <Plus className="h-6 w-6 text-gray-400" />
                      </div>
                      <p className="text-gray-500 mb-2">
                        No categories configured yet
                      </p>
                      <Button
                        size="sm"
                        onClick={() =>
                          router.push(
                            `/organizer/create-event/categories?eventId=${eventId}`
                          )
                        }
                      >
                        Add Categories
                      </Button>
                    </div>
                  )}
                </TabsContent>

                {/* Presentation Types Tab */}
                <TabsContent value="types" className="mt-4">
                  {event.presentationTypes &&
                  event.presentationTypes.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {event.presentationTypes.map((type: any) => (
                        <div key={type.id} className="p-3 border rounded-lg">
                          <h4 className="font-medium">{type.name}</h4>
                          <p className="text-sm text-gray-600 mb-2">
                            {type.description}
                          </p>
                          <div className="text-xs text-gray-500 space-y-1">
                            <div>
                              Duration: {type.defaultDuration}min (
                              {type.minDuration}-{type.maxDuration}min)
                            </div>
                            {type.allowsQA && (
                              <div>Q&A: {type.qaDuration}min</div>
                            )}
                            {type._count && (
                              <div>
                                {type._count.presentations || 0} presentations
                                using this type
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <div className="w-12 h-12 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                        <FileText className="h-6 w-6 text-gray-400" />
                      </div>
                      <p className="text-gray-500 mb-2">
                        No presentation types configured yet
                      </p>
                      <Button
                        size="sm"
                        onClick={() =>
                          router.push(
                            `/organizer/create-event/categories?eventId=${eventId}`
                          )
                        }
                      >
                        Add Presentation Types
                      </Button>
                    </div>
                  )}
                </TabsContent>

                {/* Sessions Tab */}
                <TabsContent value="sessions" className="mt-4">
                  {event.sections && event.sections.length > 0 ? (
                    <div className="space-y-3">
                      {event.sections.map((section: any) => (
                        <div key={section.id} className="p-4 border rounded-lg">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <h4 className="font-medium">{section.name}</h4>
                              <p className="text-sm text-gray-600">
                                {section.description}
                              </p>
                            </div>
                            <Badge variant="outline" className="text-xs">
                              {section.type}
                            </Badge>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-4 gap-2 text-xs text-gray-500 mt-3">
                            {section.startTime && (
                              <div>
                                <Clock className="h-3 w-3 inline mr-1" />
                                {format(
                                  new Date(section.startTime),
                                  "MMM d, HH:mm"
                                )}
                              </div>
                            )}
                            {section.room && (
                              <div>
                                <MapPin className="h-3 w-3 inline mr-1" />
                                {section.room}
                              </div>
                            )}
                            {section.capacity && (
                              <div>
                                <Users className="h-3 w-3 inline mr-1" />
                                {section.capacity} capacity
                              </div>
                            )}
                            {section._count && (
                              <div>
                                <FileText className="h-3 w-3 inline mr-1" />
                                {section._count.presentations || 0}{" "}
                                presentations
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <div className="w-12 h-12 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                        <Clock className="h-6 w-6 text-gray-400" />
                      </div>
                      <p className="text-gray-500 mb-2">
                        No sessions created yet
                      </p>
                      <Button
                        size="sm"
                        onClick={() =>
                          router.push(
                            `/organizer/create-event/sessions?eventId=${eventId}`
                          )
                        }
                      >
                        Create Sessions
                      </Button>
                    </div>
                  )}
                </TabsContent>

                {/* Submission Settings Tab */}
                <TabsContent value="settings" className="mt-4">
                  {event.submissionSettings ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-3">
                        <div>
                          <label className="text-sm font-medium text-gray-700">
                            Submission Deadline
                          </label>
                          <p className="text-sm text-gray-600">
                            {format(
                              new Date(
                                event.submissionSettings.submissionDeadline
                              ),
                              "PPP"
                            )}
                          </p>
                        </div>

                        <div>
                          <label className="text-sm font-medium text-gray-700">
                            Abstract Requirements
                          </label>
                          <p className="text-sm text-gray-600">
                            {event.submissionSettings.requireAbstract
                              ? `Required (max ${event.submissionSettings.maxAbstractLength} chars)`
                              : "Not required"}
                          </p>
                        </div>

                        <div>
                          <label className="text-sm font-medium text-gray-700">
                            File Requirements
                          </label>
                          <p className="text-sm text-gray-600">
                            {event.submissionSettings.allowedFileTypes?.join(
                              ", "
                            ) || "Any"}
                            (max {event.submissionSettings.maxFileSize}MB)
                          </p>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div>
                          <label className="text-sm font-medium text-gray-700">
                            Review Process
                          </label>
                          <p className="text-sm text-gray-600 capitalize">
                            {event.submissionSettings.reviewProcess?.replace(
                              "_",
                              " "
                            ) || "Standard"}
                          </p>
                        </div>

                        <div>
                          <label className="text-sm font-medium text-gray-700">
                            Author Requirements
                          </label>
                          <ul className="text-sm text-gray-600">
                            {event.submissionSettings.requireAuthorBio && (
                              <li>• Bio required</li>
                            )}
                            {event.submissionSettings.requireAffiliation && (
                              <li>• Affiliation required</li>
                            )}
                            {event.submissionSettings.allowLateSubmissions && (
                              <li>• Late submissions allowed</li>
                            )}
                            {!event.submissionSettings.requireAuthorBio &&
                              !event.submissionSettings.requireAffiliation &&
                              !event.submissionSettings
                                .allowLateSubmissions && (
                                <li className="text-gray-400">
                                  • Standard requirements
                                </li>
                              )}
                          </ul>
                        </div>

                        {event.submissionSettings.submissionGuidelines && (
                          <div>
                            <label className="text-sm font-medium text-gray-700">
                              Guidelines
                            </label>
                            <p className="text-sm text-gray-600">
                              {event.submissionSettings.submissionGuidelines}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <div className="w-12 h-12 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                        <Settings className="h-6 w-6 text-gray-400" />
                      </div>
                      <p className="text-gray-500 mb-2">
                        No submission settings configured yet
                      </p>
                      <Button
                        size="sm"
                        onClick={() =>
                          router.push(
                            `/organizer/create-event/publish?eventId=${eventId}`
                          )
                        }
                      >
                        Configure Submissions
                      </Button>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </TabsContent>
        {/* Attendees Tab */}
        <TabsContent value="attendees" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Registered Attendees</CardTitle>
            </CardHeader>
            <CardContent>
              {attendees.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-semibold mb-2">
                    No attendees yet
                  </h3>
                  <p className="text-gray-600">
                    Once people register for your conference, they'll appear
                    here.
                  </p>
                </div>
              ) : (
                <p>You have {attendees.length} registered attendees.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Publish Dialog */}
      <ConferencePublishDialog
        open={showPublishDialog}
        onClose={() => setShowPublishDialog(false)}
        conferenceId={String(eventId)}
        currentStatus={event.status}
        onSuccess={() => {
          fetchEventDetails();
          setShowPublishDialog(false);
        }}
      />
    </div>
  );
}
