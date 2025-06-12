'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useGetAuthUserQuery } from '@/state/api';
import { createEvent, saveEventDraft } from '@/lib/actions/events';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Plus, MapPin, Calendar, Clock, Loader2, Tag, ArrowRight, CheckCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { toast } from 'sonner';

// Modern timezone handling - using native Intl API
const getTimezones = () => {
  try {
    // Use the modern Intl API to get all supported timezones
    const timezones = Intl.supportedValuesOf('timeZone');
    
    // Group by region and format nicely
    const timezoneOptions = timezones
      .map(tz => {
        try {
          // Get timezone offset and name
          const now = new Date();
          const formatter = new Intl.DateTimeFormat('en', {
            timeZone: tz,
            timeZoneName: 'longOffset'
          });
          
          const parts = formatter.formatToParts(now);
          const offsetPart = parts.find(part => part.type === 'timeZoneName');
          const offset = offsetPart ? offsetPart.value : '';
          
          // Format: "America/New_York" -> "New York (GMT-5)"
          const cityName = tz.includes('/') 
            ? tz.split('/').pop()?.replace(/_/g, ' ') || tz
            : tz;
          
          return {
            value: tz,
            label: `${cityName} (${offset})`,
            region: tz.split('/')[0] || 'Other',
            offset: offset
          };
        } catch (e) {
          // Fallback for problematic timezones
          return {
            value: tz,
            label: tz.replace(/_/g, ' '),
            region: tz.split('/')[0] || 'Other',
            offset: ''
          };
        }
      })
      .sort((a, b) => a.label.localeCompare(b.label));

    return timezoneOptions;
  } catch (error) {
    // Fallback to common timezones if Intl API fails
    console.warn('Intl.supportedValuesOf not supported, using fallback timezones');
    return [
      { value: 'America/New_York', label: 'New York (GMT-5)', region: 'America', offset: 'GMT-5' },
      { value: 'America/Chicago', label: 'Chicago (GMT-6)', region: 'America', offset: 'GMT-6' },
      { value: 'America/Denver', label: 'Denver (GMT-7)', region: 'America', offset: 'GMT-7' },
      { value: 'America/Los_Angeles', label: 'Los Angeles (GMT-8)', region: 'America', offset: 'GMT-8' },
      { value: 'Europe/London', label: 'London (GMT+0)', region: 'Europe', offset: 'GMT+0' },
      { value: 'Europe/Paris', label: 'Paris (GMT+1)', region: 'Europe', offset: 'GMT+1' },
      { value: 'Europe/Berlin', label: 'Berlin (GMT+1)', region: 'Europe', offset: 'GMT+1' },
      { value: 'Asia/Tokyo', label: 'Tokyo (GMT+9)', region: 'Asia', offset: 'GMT+9' },
      { value: 'Asia/Shanghai', label: 'Shanghai (GMT+8)', region: 'Asia', offset: 'GMT+8' },
      { value: 'Australia/Sydney', label: 'Sydney (GMT+11)', region: 'Australia', offset: 'GMT+11' },
      { value: 'UTC', label: 'UTC (GMT+0)', region: 'UTC', offset: 'GMT+0' },
    ];
  }
};

// Get user's local timezone as default
const getUserTimezone = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch (error) {
    return 'UTC';
  }
};

// Define the form schema with zod for validation
const eventSchema = z.object({
  name: z.string().min(5, "Event name must be at least 5 characters"),
  description: z.string().min(20, "Description must be at least 20 characters"),
  startDate: z.string().nonempty("Start date is required"),
  startTime: z.string().nonempty("Start time is required"),
  endDate: z.string().nonempty("End date is required"),
  endTime: z.string().nonempty("End time is required"),
  location: z.string().min(3, "Location is required"),
  timezone: z.string(),
  topics: z.string().optional(),
});

export default function CreateEventPage() {
  const router = useRouter();
  const { data: authUser, isLoading: userLoading } = useGetAuthUserQuery();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [descriptionLength, setDescriptionLength] = useState(0);
  
  // Add new state for workflow draft tracking
const [workflowStep, setWorkflowStep] = useState(1);
const [isDraftSaving, setIsDraftSaving] = useState(false);
  
  // Get timezones with proper formatting
  const timezones = useMemo(() => getTimezones(), []);
  const userTimezone = useMemo(() => getUserTimezone(), []);
  
  // Use React Hook Form with zod validation
  const form = useForm<z.infer<typeof eventSchema>>({
    resolver: zodResolver(eventSchema),
    defaultValues: {
      name: '',
      description: '',
      startDate: '',
      startTime: '09:00',
      endDate: '',
      endTime: '17:00',
      location: '',
      timezone: userTimezone, // Use user's actual timezone
      topics: '',
    },
  });

  // For backward compatibility with existing code
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    startDate: '',
    startTime: '09:00',
    endDate: '',
    endTime: '17:00',
    location: '',
    timezone: userTimezone, // Use user's actual timezone
    topics: '',
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    if (name === 'description') {
      setDescriptionLength(value.length);
    }
    
    form.setValue(name as any, value);
  };

  // Calculate event duration for display
  const eventDuration = useMemo(() => {
    if (formData.startDate && formData.endDate && formData.startTime && formData.endTime) {
      const start = new Date(`${formData.startDate}T${formData.startTime}`);
      const end = new Date(`${formData.endDate}T${formData.endTime}`);
      
      if (end > start) {
        const diffMs = end.getTime() - start.getTime();
        const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
        const diffHours = Math.ceil(diffMs / (1000 * 60 * 60));
        
        if (diffDays > 1) {
          return `${diffDays} days`;
        } else {
          return `${diffHours} hours`;
        }
      }
    }
    return null;
  }, [formData.startDate, formData.endDate, formData.startTime, formData.endTime]);

  // Auto-sync dates and times
  useEffect(() => {
    if (formData.startDate && (!formData.endDate || formData.endDate < formData.startDate)) {
      setFormData(prev => ({ ...prev, endDate: formData.startDate }));
      form.setValue('endDate', formData.startDate);
    }
  }, [formData.startDate, formData.endDate, form]);

  // Update handleSubmit function to route to sessions management
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  
  const validationResult = await form.trigger();
  if (!validationResult) {
    return;
  }
  
  try {
    setIsLoading(true);
    setError(null);

    // Create proper timezone-aware dates
    const startDateTime = new Date(`${formData.startDate}T${formData.startTime}`);
    const endDateTime = new Date(`${formData.endDate}T${formData.endTime}`);

    if (endDateTime < startDateTime) {
      setError('End date and time must be after start date and time');
      setIsLoading(false);
      return;
    }

    const topics = formData.topics 
      ? formData.topics.split(',').map(topic => topic.trim()).filter(Boolean)
      : [];

    const { startTime, endTime, ...eventDataWithoutTimes } = formData;
    const eventData = {
      ...eventDataWithoutTimes,
      topics,
      startDate: startDateTime.toISOString(),
      endDate: endDateTime.toISOString(),
      createdById: authUser?.userInfo?.id,
      // Add workflow tracking
      workflowStep: 2, // Moving to step 2 (sessions)
      workflowStatus: 'in_progress'
    };

    const response = await createEvent(eventData);

    if (response.success) {
      toast.success("Event created successfully! Setting up sessions next...");
      
      // Route directly to sessions management (step 2)
      router.push(`/organizer/events/${response.data.id}/sessions?setup=true&step=2`);
    } else {
      setError(response.error || 'Failed to create event');
    }
  } catch (err) {
    setError('An unexpected error occurred');
    console.error('Create event error:', err);
  } finally {
    setIsLoading(false);
  }
};

// Enhanced draft saving with workflow step tracking
const handleSaveDraft = async () => {
  try {
    if (!formData.name.length) {
      setError('Event name is required even for drafts');
      return;
    }
    
    setIsDraftSaving(true);
    setError(null);

    let startDateTime = null;
    let endDateTime = null;
    
    try {
      if (formData.startDate && formData.startTime) {
        startDateTime = new Date(`${formData.startDate}T${formData.startTime}`);
      }
      if (formData.endDate && formData.endTime) {
        endDateTime = new Date(`${formData.endDate}T${formData.endTime}`);
      }
    } catch (err) {
      console.warn("Date parsing issue:", err);
    }

    const topics = formData.topics 
      ? formData.topics.split(',').map(topic => topic.trim()).filter(Boolean)
      : [];

    const { startTime, endTime, ...eventDataWithoutTimes } = formData;
    const draftData = {
      ...eventDataWithoutTimes,
      topics,
      status: 'draft',
      createdById: authUser?.userInfo?.id,
      startDate: startDateTime ? startDateTime.toISOString() : formData.startDate,
      endDate: endDateTime ? endDateTime.toISOString() : formData.endDate,
      // Add workflow tracking
      workflowStep: 1, // Still on step 1
      workflowStatus: 'draft'
    };

    const response = await saveEventDraft(draftData);

    if (response.success) {
      toast.success("Draft saved successfully!");
      router.push('/organizer/events');
    } else {
      setError(response.error || 'Failed to save draft');
    }
  } catch (err) {
    console.error('Save draft error:', err);
    setError('An unexpected error occurred while saving draft');
  } finally {
    setIsDraftSaving(false);
  }
};

  if (userLoading) {
    return <LoadingSkeleton />;
  }

  if (!authUser?.userInfo?.id) {
    router.push('/login');
    return null;
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 min-h-screen">
      {/* Header */}
      <div className="flex items-center gap-2 mb-8">
        <Button 
          variant="ghost" 
          className="p-0 h-8 hover:bg-transparent hover:text-primary" 
          onClick={() => router.push("/organizer/events")}
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          <span className="text-sm font-medium">Events</span>
        </Button>
        <span className="text-gray-400">/</span>
        <span className="text-sm font-medium">Create New Event</span>
      </div>

      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Create New Conference</h1>
        <p className="text-gray-600">
          Set up your conference details. After creation, you'll be guided through the complete setup process.
        </p>
      </div>

      {/* Workflow Preview */}
      <Card className="mb-8 border-blue-200 bg-blue-50">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg flex items-center">
            <ArrowRight className="h-5 w-5 mr-2 text-blue-600" />
            Setup Workflow Preview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <WorkflowStep
              number={1}
              title="Event Details"
              description="Basic conference information"
              status="current"
              icon={<Calendar className="h-4 w-4" />}
            />
            <WorkflowStep
              number={2}
              title="Sessions & Schedule"
              description="Create rooms, keynotes, breaks"
              status="upcoming"
              icon={<Clock className="h-4 w-4" />}
            />
            <WorkflowStep
              number={3}
              title="Categories & Types"
              description="Define presentation categories"
              status="upcoming"
              icon={<Tag className="h-4 w-4" />}
            />
            <WorkflowStep
              number={4}
              title="Publish for Submissions"
              description="Open for presenter applications"
              status="upcoming"
              icon={<ArrowRight className="h-4 w-4" />}
            />
            <WorkflowStep
              number={5}
              title="Schedule Builder"
              description="Organize approved presentations"
              status="upcoming"
              icon={<CheckCircle className="h-4 w-4" />}
            />
          </div>
        </CardContent>
      </Card>

      {error && (
        <div className="mb-6 text-red-600 border border-red-200 rounded-lg p-4 bg-red-50">
          <h3 className="font-semibold mb-1">Error</h3>
          <p>{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Event Name Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Calendar className="h-5 w-5 mr-2" />
              Basic Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <Label htmlFor="name">Conference Name *</Label>
              <Input 
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="e.g., International Architecture & Engineering Conference 2024"
                className="mt-1"
                required
              />
              {form.formState.errors.name && (
                <p className="text-red-500 text-sm mt-1">{form.formState.errors.name.message}</p>
              )}
            </div>
            
            <div>
              <Label htmlFor="description">Description *</Label>
              <Textarea 
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Describe your conference, its goals, and target audience..."
                className="mt-1 min-h-[100px]"
                required
              />
              <div className="flex justify-between items-center mt-1">
                {form.formState.errors.description && (
                  <p className="text-red-500 text-sm">{form.formState.errors.description.message}</p>
                )}
                <p className="text-xs text-gray-400 ml-auto">{descriptionLength} characters</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Dates & Times */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Clock className="h-5 w-5 mr-2" />
              Dates & Schedule
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <Label htmlFor="startDate">Start Date *</Label>
                <Input 
                  id="startDate"
                  name="startDate"
                  type="date"
                  value={formData.startDate}
                  onChange={handleInputChange}
                  className="mt-1"
                  required
                />
                {form.formState.errors.startDate && (
                  <p className="text-red-500 text-sm mt-1">{form.formState.errors.startDate.message}</p>
                )}
              </div>
              
              <div>
                <Label htmlFor="endDate">End Date *</Label>
                <Input 
                  id="endDate"
                  name="endDate"
                  type="date"
                  value={formData.endDate}
                  onChange={handleInputChange}
                  min={formData.startDate}
                  className="mt-1"
                  required
                />
                {form.formState.errors.endDate && (
                  <p className="text-red-500 text-sm mt-1">{form.formState.errors.endDate.message}</p>
                )}
              </div>
              
              <div>
                <Label htmlFor="timezone">Timezone</Label>
                <select
                  id="timezone"
                  name="timezone"
                  value={formData.timezone}
                  onChange={handleInputChange}
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  {timezones.map((tz) => (
                    <option key={tz.value} value={tz.value}>
                      {tz.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="startTime">Start Time *</Label>
                <Input 
                  id="startTime"
                  name="startTime"
                  type="time"
                  value={formData.startTime}
                  onChange={handleInputChange}
                  className="mt-1"
                  required
                />
                {form.formState.errors.startTime && (
                  <p className="text-red-500 text-sm mt-1">{form.formState.errors.startTime.message}</p>
                )}
              </div>
              
              <div>
                <Label htmlFor="endTime">End Time *</Label>
                <Input 
                  id="endTime"
                  name="endTime"
                  type="time"
                  value={formData.endTime}
                  onChange={handleInputChange}
                  className="mt-1"
                  required
                />
                {form.formState.errors.endTime && (
                  <p className="text-red-500 text-sm mt-1">{form.formState.errors.endTime.message}</p>
                )}
              </div>
            </div>
            
            {eventDuration && (
              <div className="p-3 bg-gray-50 rounded border">
                <p className="text-sm text-gray-600">
                  <strong>Duration:</strong> {eventDuration}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  You'll create detailed daily schedules in the next step.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Location */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <MapPin className="h-5 w-5 mr-2" />
              Location & Venue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div>
              <Label htmlFor="location">Event Location *</Label>
              <Input 
                id="location"
                name="location"
                value={formData.location}
                onChange={handleInputChange}
                placeholder="e.g., San Francisco Convention Center, CA"
                className="mt-1"
                required
              />
              {form.formState.errors.location && (
                <p className="text-red-500 text-sm mt-1">{form.formState.errors.location.message}</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Topics */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Tag className="h-5 w-5 mr-2" />
              Topics & Categories
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div>
              <Label htmlFor="topics">Event Topics (Optional)</Label>
              <Input 
                id="topics"
                name="topics"
                value={formData.topics}
                onChange={handleInputChange}
                placeholder="Architecture, Engineering, Urban Planning, Sustainability"
                className="mt-1"
              />
              <p className="text-xs text-gray-500 mt-1">
                Comma-separated topics to help with discoverability. You'll create detailed categories later.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex items-center justify-between pt-6">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push('/organizer/events')}
            disabled={isLoading || isSavingDraft}
          >
            Cancel
          </Button>
          
          <div className="flex gap-3">
            <Button 
              type="button"
              variant="outline"
              onClick={handleSaveDraft}
              disabled={isLoading || isSavingDraft}
            >
              {isSavingDraft ? (
                <div className="flex items-center">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </div>
              ) : (
                "Save Draft"
              )}
            </Button>
            
            <Button 
              type="submit"
              disabled={isLoading || isSavingDraft}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isLoading ? (
                <div className="flex items-center">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </div>
              ) : (
                <div className="flex items-center">
                  Create Event & Setup Sessions
                  <ArrowRight className="h-4 w-4 ml-2" />
                </div>
              )}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}

// Workflow step component
function WorkflowStep({
  number,
  title,
  description,
  status,
  icon
}: {
  number: number;
  title: string;
  description: string;
  status: 'current' | 'upcoming' | 'completed';
  icon: React.ReactNode;
}) {
  const getStepStyling = () => {
    switch (status) {
      case 'current':
        return 'border-blue-300 bg-blue-50';
      case 'completed':
        return 'border-green-300 bg-green-50';
      case 'upcoming':
        return 'border-gray-200 bg-gray-50';
    }
  };

  const getNumberStyling = () => {
    switch (status) {
      case 'current':
        return 'bg-blue-600 text-white';
      case 'completed':
        return 'bg-green-600 text-white';
      case 'upcoming':
        return 'bg-gray-300 text-gray-600';
    }
  };

  return (
    <div className={`relative p-4 rounded-lg border ${getStepStyling()}`}>
      <div className="flex items-start space-x-3">
        <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${getNumberStyling()}`}>
          {status === 'completed' ? <CheckCircle className="h-4 w-4" /> : number}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2">
            {icon}
            <h4 className="text-sm font-semibold text-gray-900">{title}</h4>
          </div>
          <p className="text-xs text-gray-600 mt-1">{description}</p>
        </div>
      </div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <Skeleton className="h-10 w-64 mb-6" />
      <Card className="p-8">
        <div className="space-y-8">
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-16 w-full" />
          <div className="grid grid-cols-2 gap-4">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
          <Skeleton className="h-12 w-full" />
        </div>
      </Card>
    </div>
  );
}