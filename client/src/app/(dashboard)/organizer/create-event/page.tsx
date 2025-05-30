'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useGetAuthUserQuery } from '@/state/api';
import { createEvent, saveEventDraft } from '@/lib/actions/events';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Plus, MapPin, Calendar, Clock, Loader2, Tag } from 'lucide-react';
import { motion } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { toast } from 'sonner';

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
  
  // Use React Hook Form with zod validation
  const form = useForm<z.infer<typeof eventSchema>>({
    resolver: zodResolver(eventSchema),
    defaultValues: {
      name: '',
      description: '',
      startDate: '',
      startTime: '09:00', // Default to 9 AM
      endDate: '',
      endTime: '17:00', // Default to 5 PM
      location: '',
      timezone: '(GMT+00:00) UTC',
      topics: '',
    },
  });

  // For backward compatibility with existing code
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    startDate: '',
    startTime: '09:00', // Default to 9 AM
    endDate: '',
    endTime: '17:00', // Default to 5 PM
    location: '',
    timezone: '(GMT+00:00) UTC',
    topics: '',
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    // Update form data state
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // For description, update character count
    if (name === 'description') {
      setDescriptionLength(value.length);
    }
    
    // Also update the react-hook-form state
    form.setValue(name as any, value);
  };

  // Add this to handle date synchronization
  useEffect(() => {
    // If start date changes and end date is empty or before start date, update end date
    if (formData.startDate && (!formData.endDate || formData.endDate < formData.startDate)) {
      setFormData(prev => ({
        ...prev,
        endDate: formData.startDate
      }));
      form.setValue('endDate', formData.startDate);
    }
    
    // If start time changes, set end time to 2 hours later by default
    if (formData.startTime && !formData.endTime) {
      const [hours, minutes] = formData.startTime.split(':').map(Number);
      let endHours = hours + 2;
      if (endHours > 23) endHours = 23;
      
      const endTime = `${String(endHours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
      
      setFormData(prev => ({
        ...prev,
        endTime
      }));
      form.setValue('endTime', endTime);
    }
  }, [formData.startDate, formData.startTime, form]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate using react-hook-form
    const validationResult = await form.trigger();
    if (!validationResult) {
      return; // Form has validation errors
    }
    
    try {
      setIsLoading(true);
      setError(null);

      // Combine date and time into ISO strings
      const startDateTime = new Date(`${formData.startDate}T${formData.startTime}`);
      const endDateTime = new Date(`${formData.endDate}T${formData.endTime}`);

      // Validation
      if (endDateTime < startDateTime) {
        setError('End date and time must be after start date and time');
        setIsLoading(false);
        return;
      }

      // Process topics into an array
      const topics = formData.topics 
        ? formData.topics.split(',').map(topic => topic.trim()).filter(Boolean)
        : [];

      const { startTime, endTime, ...eventDataWithoutTimes } = formData;
      const eventData = {
        ...eventDataWithoutTimes,
        topics, // Add the processed topics array
        startDate: startDateTime.toISOString(),
        endDate: endDateTime.toISOString(),
        createdById: authUser?.userInfo?.id,
      };

      const response = await createEvent(eventData);

      if (response.success) {
        toast.success("Event created successfully!");
        router.push(`/organizer/events/${response.data.id}`);
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

  const handleSaveDraft = async () => {
    try {
      // Validate the form first - but with less strict rules for drafts
      // You could skip full validation for drafts if desired
      const nameIsValid = formData.name.length > 0;
      if (!nameIsValid) {
        setError('Event name is required even for drafts');
        return;
      }
      
      setIsSavingDraft(true);
      setError(null);

      // Combine date and time into ISO strings (if present)
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
        console.warn("Date parsing issue, sending as is:", err);
      }

      // Process topics into an array
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
      };

      // For debugging - log what we're sending
      console.log("Saving draft with data:", draftData);

      const response = await saveEventDraft(draftData);

      if (response.success) {
        toast.success("Draft saved successfully!");
        router.push('/organizer/events');
      } else {
        setError(response.error || 'Failed to save draft');
      }
    } catch (err) {
      console.error('Save draft error details:', err);
      setError('An unexpected error occurred while saving draft');
    } finally {
      setIsSavingDraft(false);
    }
  };

  const handleCancel = () => {
    router.push('/organizer/events');
  };

  if (userLoading) {
    return (
      <div className="max-w-3xl mx-auto py-8 px-4">
        <Skeleton className="h-10 w-64 mb-6" />
        <Card className="p-8">
          <div className="space-y-8">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-8 w-3/4" />
            <div className="grid grid-cols-2 gap-4">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-12 w-full" />
          </div>
        </Card>
      </div>
    );
  }

  if (!authUser?.userInfo?.id) {
    router.push('/login');
    return null;
  }

  const timezones = [
    '(GMT-12:00) International Date Line West',
    '(GMT-11:00) Midway Island, Samoa',
    '(GMT-10:00) Hawaii',
    '(GMT-09:00) Alaska',
    '(GMT-08:00) Pacific Time (US & Canada)',
    '(GMT-07:00) Mountain Time (US & Canada)',
    '(GMT-06:00) Central Time (US & Canada)',
    '(GMT-05:00) Eastern Time (US & Canada)',
    '(GMT-04:00) Atlantic Time (Canada)',
    '(GMT-03:00) Brasilia, Buenos Aires',
    '(GMT-02:00) Mid-Atlantic',
    '(GMT-01:00) Azores, Cape Verde Islands',
    '(GMT+00:00) UTC',
    '(GMT+01:00) Budapest, Paris, Madrid',
    '(GMT+02:00) Athens, Istanbul, Cairo',
    '(GMT+03:00) Moscow, Baghdad',
    '(GMT+04:00) Dubai, Baku',
    '(GMT+05:00) Karachi, Tashkent',
    '(GMT+05:30) Mumbai, Kolkata',
    '(GMT+06:00) Dhaka, Almaty',
    '(GMT+07:00) Bangkok, Jakarta',
    '(GMT+08:00) Beijing, Singapore',
    '(GMT+09:00) Tokyo, Seoul',
    '(GMT+10:00) Sydney, Melbourne',
    '(GMT+11:00) Solomon Islands',
    '(GMT+12:00) Auckland, Fiji',
  ];

  return (
    <div className="max-w-3xl mx-auto py-8 px-4 min-h-screen">
      {/* Breadcrumb navigation */}
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

      {error && (
        <div className="mb-6 text-red-600 border border-red-200 rounded-lg p-4 bg-red-50 shadow-sm">
          <h3 className="font-semibold mb-1">Error</h3>
          <p>{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-12">
        {/* Event Name Section */}
        <motion.section 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="bg-white rounded-lg p-6 shadow-sm"
        >
          <h2 className="text-xl font-bold mb-3">What will your event's name be?</h2>
          <p className="text-gray-500 text-sm mb-4">
            Write your event name here. Remember, an SEO-friendly event name boosts discoverability.
          </p>
          <Input 
            name="name"
            value={formData.name}
            onChange={handleInputChange}
            placeholder="Your event name"
            className="w-full p-3 text-base"
            required
          />
          {form.formState.errors.name && (
            <p className="text-red-500 text-sm mt-1">{form.formState.errors.name.message}</p>
          )}
        </motion.section>
        
        {/* Event Date Section */}
        <motion.section 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="bg-white rounded-lg p-6 shadow-sm"
        >
          <h2 className="text-xl font-bold mb-3">When will the event start and end?</h2>
          <p className="text-gray-500 text-sm mb-4">
            Choose the start and end dates and times of your event.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <Label htmlFor="startDate" className="block mb-2 font-medium">
                  Start Date <span className="text-red-500">*</span>
                </Label>
                <Input 
                  id="startDate"
                  name="startDate"
                  type="date"
                  value={formData.startDate ? formData.startDate.split('T')[0] : ''}
                  onChange={handleInputChange}
                  className="w-full p-3"
                  required
                />
                {form.formState.errors.startDate && (
                  <p className="text-red-500 text-sm mt-1">{form.formState.errors.startDate.message}</p>
                )}
              </div>
              
              <div>
                <Label htmlFor="startTime" className="block mb-2 font-medium flex items-center justify-between">
                  <span>Start Time <span className="text-red-500">*</span></span>
                  <span className="text-xs text-gray-500">24-hour format</span>
                </Label>
                <Input 
                  id="startTime"
                  name="startTime"
                  type="time"
                  value={formData.startTime || ''}
                  onChange={handleInputChange}
                  className="w-full p-3"
                  required
                />
                <div className="flex items-center mt-1 text-xs text-gray-500">
                  <Clock className="h-3 w-3 mr-1" />
                  <span>Local time in {formData.timezone.split(') ')[1] || 'selected timezone'}</span>
                </div>
                {form.formState.errors.startTime && (
                  <p className="text-red-500 text-sm mt-1">{form.formState.errors.startTime.message}</p>
                )}
              </div>
            </div>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="endDate" className="block mb-2 font-medium">
                  End Date <span className="text-red-500">*</span>
                </Label>
                <Input 
                  id="endDate"
                  name="endDate"
                  type="date"
                  value={formData.endDate ? formData.endDate.split('T')[0] : ''}
                  onChange={handleInputChange}
                  className="w-full p-3"
                  required
                />
                {form.formState.errors.endDate && (
                  <p className="text-red-500 text-sm mt-1">{form.formState.errors.endDate.message}</p>
                )}
              </div>
              
              <div>
                <Label htmlFor="endTime" className="block mb-2 font-medium">
                  End Time <span className="text-red-500">*</span>
                </Label>
                <Input 
                  id="endTime"
                  name="endTime"
                  type="time"
                  value={formData.endTime || ''}
                  onChange={handleInputChange}
                  className="w-full p-3"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">Local time in your selected timezone</p>
                {form.formState.errors.endTime && (
                  <p className="text-red-500 text-sm mt-1">{form.formState.errors.endTime.message}</p>
                )}
              </div>
            </div>
          </div>
          
          <div className="mt-4">
            <Label htmlFor="timezone" className="block mb-2 font-medium">
              Time Zone
            </Label>
            <select
              id="timezone"
              name="timezone"
              value={formData.timezone}
              onChange={handleInputChange}
              className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              {timezones.map(timezone => (
                <option key={timezone} value={timezone}>
                  {timezone}
                </option>
              ))}
            </select>
          </div>
        </motion.section>
        
        {/* Event Location Section */}
        <motion.section 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
          className="bg-white rounded-lg p-6 shadow-sm"
        >
          <h2 className="text-xl font-bold mb-3">Where will your event take place?</h2>
          <p className="text-gray-500 text-sm mb-4">
            Write your event's location. You can change later on.
          </p>
          
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center gap-2 text-gray-600 mb-4">
              <MapPin className="h-5 w-5" />
              <span className="font-medium">Find Event location with Google Maps</span>
            </div>
            
            <div className="relative">
              <Input 
                name="location"
                value={formData.location}
                onChange={handleInputChange}
                placeholder="Search venue location"
                className="w-full pl-10 p-3"
                required
              />
              {form.formState.errors.location && (
                <p className="text-red-500 text-sm mt-1">{form.formState.errors.location.message}</p>
              )}
            </div>
          </div>
        </motion.section>
        
        {/* Description Section */}
        <motion.section 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.3 }}
          className="bg-white rounded-lg p-6 shadow-sm"
        >
          <h2 className="text-xl font-bold mb-3">Describe your event</h2>
          <p className="text-gray-500 text-sm mb-4">
            Provide details about what attendees can expect.
          </p>
          
          <div className="relative">
            <Textarea 
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              placeholder="Describe your event..."
              className="w-full p-3 min-h-[120px]"
              required
            />
            <div className="absolute bottom-2 right-2 text-xs text-gray-400">
              {descriptionLength} characters
            </div>
            {form.formState.errors.description && (
              <p className="text-red-500 text-sm mt-1">{form.formState.errors.description.message}</p>
            )}
          </div>
        </motion.section>
        
        {/* Topics Section - New */}
        <motion.section 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.4 }}
          className="bg-white rounded-lg p-6 shadow-sm"
        >
          <h2 className="text-xl font-bold mb-3">Event Topics</h2>
          <p className="text-gray-500 text-sm mb-4">
            Add topics to help attendees find your event (comma-separated).
          </p>
          
          <div className="flex items-center gap-2 text-gray-600 mb-4">
            <Tag className="h-5 w-5" />
            <span className="font-medium">Add relevant topics to improve discoverability</span>
          </div>
          
          <Input 
            name="topics"
            value={formData.topics}
            onChange={handleInputChange}
            placeholder="AI, Machine Learning, Web Development"
            className="w-full p-3"
          />
          <p className="text-xs text-gray-500 mt-2">
            Example: Technology, Business, Healthcare, Education
          </p>
        </motion.section>
        
        {/* Buttons */}
        <div className="flex justify-between items-center pt-4 mb-4">
          <Button 
            type="button"
            variant="outline" 
            onClick={handleCancel}
            disabled={isLoading || isSavingDraft}
            className="border cursor-pointer min-w-[120px]"
          >
            Cancel
          </Button>
          
          <div className="flex space-x-4">
            <Button 
              type="button"
              variant="outline"
              onClick={handleSaveDraft}
              disabled={isLoading || isSavingDraft}
              className="border cursor-pointer min-w-[120px]"
            >
              {isSavingDraft ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Draft"
              )}
            </Button>
            
            <Button 
              type="submit"
              disabled={isLoading || isSavingDraft}
              className="border bg-primary-700 text-white hover:bg-primary-700 cursor-pointer min-w-[120px]"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Event"
              )}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}