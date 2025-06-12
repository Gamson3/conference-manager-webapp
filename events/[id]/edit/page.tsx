'use client';

import { useRouter, useParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { updateEvent, deleteEvent } from '@/lib/actions/events';
import { createAuthenticatedApi } from '@/lib/utils';
import { ArrowLeft, Trash2, AlertTriangle, Calendar, MapPin, Clock, Info } from 'lucide-react';
import { motion } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';

export default function EditEventPage() {
  const router = useRouter();
  const { id } = useParams();
  const [event, setEvent] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    startDate: '',
    startTime: '',
    endDate: '',
    endTime: '',
    location: '',
    timezone: '(GMT+00:00) UTC'
  });

  useEffect(() => {
    if (!id) return;
    
    const fetchEvent = async () => {
      try {
        setIsLoading(true);
        const api = await createAuthenticatedApi();
        const response = await api.get(`/events/${id}`);
        
        const eventData = response.data;
        setEvent(eventData);
        
        // Format dates for form inputs
        const startDate = eventData.startDate ? new Date(eventData.startDate) : null;
        const endDate = eventData.endDate ? new Date(eventData.endDate) : null;
        
        setFormData({
          name: eventData.name || '',
          description: eventData.description || '',
          startDate: startDate ? startDate.toISOString().split('T')[0] : '',
          startTime: startDate ? startDate.toTimeString().slice(0, 5) : '09:00',
          endDate: endDate ? endDate.toISOString().split('T')[0] : '',
          endTime: endDate ? endDate.toTimeString().slice(0, 5) : '17:00',
          location: eventData.location || '',
          timezone: eventData.timezone || '(GMT+00:00) UTC',
        });
      } catch (error: any) {
        console.error("Error fetching event:", error);
        setError(error.response?.data?.message || "Failed to load event");
      } finally {
        setIsLoading(false);
      }
    };

    fetchEvent();
  }, [id]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsLoading(true);

      // Combine date and time into ISO strings
      const startDateTime = new Date(`${formData.startDate}T${formData.startTime}`);
      const endDateTime = new Date(`${formData.endDate}T${formData.endTime}`);

      // Validation
      if (endDateTime < startDateTime) {
        setError('End date and time must be after start date and time');
        setIsLoading(false);
        return;
      }

      const { startTime, endTime, ...eventDataWithoutTimes } = formData;
      const eventData = {
        ...eventDataWithoutTimes,
        startDate: startDateTime.toISOString(),
        endDate: endDateTime.toISOString(),
      };

      const response = await updateEvent(Number(id), eventData);
      if (response.success) {
        router.push(`/organizer/events/${id}`);
      } else {
        setError(response.error || "Failed to update event");
      }
    } catch (error: any) {
      console.error("Error updating event:", error);
      setError(error.message || "An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    router.push(`/organizer/events/${id}`);
  };
  
  const handleOpenDeleteDialog = () => {
    setShowDeleteDialog(true);
  };
  
  const handleCloseDeleteDialog = () => {
    setShowDeleteDialog(false);
  };
  
  const handleDeleteEvent = async () => {
    try {
      setIsDeleting(true);
      const response = await deleteEvent(Number(id));
      
      if (response.success) {
        router.push('/organizer/events');
      } else {
        setError(response.error || "Failed to delete event");
        setShowDeleteDialog(false);
      }
    } catch (error: any) {
      console.error("Error deleting event:", error);
      setError(error.message || "An unexpected error occurred");
      setShowDeleteDialog(false);
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto py-8 px-4">
        <div className="flex items-center gap-2 mb-8">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-4" />
          <Skeleton className="h-4 w-32" />
        </div>
        <Skeleton className="h-10 w-64 mb-6" />
        <div className="space-y-12">
          <Skeleton className="h-48 w-full rounded-lg" />
          <Skeleton className="h-64 w-full rounded-lg" />
          <Skeleton className="h-48 w-full rounded-lg" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <div className="bg-red-50 text-red-500 p-6 rounded-lg mb-4 max-w-md">
          <h2 className="text-xl font-bold mb-2">Error</h2>
          <p className="mb-4">{error}</p>
          <Button 
            onClick={() => router.push(`/organizer/events/${id}`)}
            className="bg-primary hover:bg-primary-600 text-white"
          >
            Back to Event
          </Button>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <div className="bg-amber-50 text-amber-700 p-6 rounded-lg mb-4 max-w-md">
          <h2 className="text-xl font-bold mb-2">Event Not Found</h2>
          <p className="mb-4">The event you're trying to edit could not be found.</p>
          <Button
            onClick={() => router.push("/organizer/events")}
            className="bg-primary hover:bg-primary-600 text-white"
          >
            Back to Events
          </Button>
        </div>
      </div>
    );
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
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            className="p-0 h-8 hover:bg-transparent hover:text-primary" 
            onClick={() => router.push(`/organizer/events/${id}`)}
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            <span className="text-sm font-medium">Back to Event</span>
          </Button>
        </div>
        
        <Button 
          variant="destructive" 
          onClick={handleOpenDeleteDialog}
          className="bg-red-700 hover:bg-red-600 text-white cursor-pointer"
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Delete Event
        </Button>
      </div>

      {error && (
        <div className="mb-6 text-red-600 border border-red-200 rounded-lg p-4 bg-red-50 shadow-sm">
          <h3 className="font-semibold mb-1">Error</h3>
          <p>{error}</p>
        </div>
      )}
      
      <h1 className="text-2xl font-bold mb-6">Edit Event</h1>

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
                  value={formData.startDate}
                  onChange={handleInputChange}
                  className="w-full p-3"
                  required
                />
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
                  value={formData.startTime}
                  onChange={handleInputChange}
                  className="w-full p-3"
                  required
                />
                <div className="flex items-center mt-1 text-xs text-gray-500">
                  <Clock className="h-3 w-3 mr-1" />
                  <span>Local time in {formData.timezone.split(') ')[1] || 'selected timezone'}</span>
                </div>
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
                  value={formData.endDate}
                  onChange={handleInputChange}
                  className="w-full p-3"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="endTime" className="block mb-2 font-medium flex items-center justify-between">
                  <span>End Time <span className="text-red-500">*</span></span>
                  <span className="text-xs text-gray-500">24-hour format</span>
                </Label>
                <Input 
                  id="endTime"
                  name="endTime"
                  type="time"
                  value={formData.endTime}
                  onChange={handleInputChange}
                  className="w-full p-3"
                  required
                />
                <div className="flex items-center mt-1 text-xs text-gray-500">
                  <Clock className="h-3 w-3 mr-1" />
                  <span>Local time in {formData.timezone.split(') ')[1] || 'selected timezone'}</span>
                </div>
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
              <span className="absolute left-3 top-3 text-gray-400">
                {/* <MapPin className="h-5 w-5" /> */}
              </span>
              <Input 
                name="location"
                value={formData.location}
                onChange={handleInputChange}
                placeholder="Search venue location"
                className="w-full pl-10 p-3"
                required
              />
            </div>
          </div>
          
          <div className="mt-4 flex items-start gap-2 text-xs text-gray-500">
            <Info className="h-4 w-4 flex-shrink-0 mt-0.5" />
            <p>
              Selecting a location helps attendees find your event. The map will be displayed on your 
              event page, and we'll use the coordinates for directions.
            </p>
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
          
          <Textarea 
            name="description"
            value={formData.description}
            onChange={handleInputChange}
            placeholder="Describe your event..."
            className="w-full p-3 min-h-[120px]"
            required
          />
        </motion.section>
        
        {/* Buttons */}
        <div className="flex justify-between items-center pt-4 mb-4">
          <Button 
            type="button"
            variant="outline" 
            onClick={handleCancel}
            disabled={isLoading}
            className="cursor-pointer"
          >
            Cancel
          </Button>
          
          <Button 
            type="submit"
            disabled={isLoading}
            className="text-white bg-primary-700 hover:bg-primary-700 shadow-gray-400 cursor-pointer"
          >
            {isLoading ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </form>
      
      {/* Delete Confirmation Dialog */}
      <Dialog 
        open={showDeleteDialog} 
        onOpenChange={setShowDeleteDialog}
      >
        <DialogContent className="sm:max-w-[425px] shadow-xl border border-gray-200 z-50 bg-white p-0 overflow-hidden">
          <div className="p-6">
            <DialogHeader className="pb-4">
              <DialogTitle className="flex items-center gap-2 text-red-600 text-xl">
                <AlertTriangle className="h-5 w-5" />
                Delete Event
              </DialogTitle>
              <DialogDescription className="text-gray-700 mt-2 text-base">
                Are you sure you want to delete <span className="font-bold">"{event.name}"</span>?
                This action cannot be undone and all associated data will be permanently removed.
              </DialogDescription>
            </DialogHeader>
            
            <div className="py-4 bg-gray-50 px-6 my-4 -mx-6 border-y border-gray-200">
              <p className="text-sm text-gray-500">
                This will remove all event information, sessions, registrations, and other associated data.
              </p>
            </div>
            
            <DialogFooter className="mt-6 flex justify-end gap-3">
              <Button 
                variant="outline" 
                onClick={handleCloseDeleteDialog}
                disabled={isDeleting}
                className="border-gray-300 cursor-pointer" 
              >
                Cancel
              </Button>
              <Button 
                variant="destructive"
                onClick={handleDeleteEvent}
                disabled={isDeleting}
                className="bg-red-700 hover:bg-red-600 text-white font-medium shadow-sm cursor-pointer"
              >
                {isDeleting ? 'Deleting...' : 'Yes, Delete Event'}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}