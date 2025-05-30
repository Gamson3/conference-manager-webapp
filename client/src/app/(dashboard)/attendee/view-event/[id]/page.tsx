"use client";

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  CalendarIcon, 
  MapPinIcon, 
  UserIcon, 
  ClockIcon,
  ArrowLeftIcon,
  TicketIcon,
  MessageSquareIcon,
  BookOpenIcon,
  UsersIcon,
  ExternalLinkIcon,
  InfoIcon,
  Calendar,
} from 'lucide-react';
import { createAuthenticatedApi } from '@/lib/utils';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

interface Speaker {
  id: number;
  name: string;
  title: string;
  bio: string;
  profilePicture?: string;
}

interface Session {
  id: number;
  title: string;
  description: string;
  startTime: string;
  endTime: string;
  location: string;
  speakerId: number;
}

interface Material {
  id: number;
  title: string;
  type: string;
  url: string;
  uploadDate: string;
}

interface EventDetails {
  id: number;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  location: string;
  organizer: string;
  venue: {
    name: string;
    address: string;
    room?: string;
  };
  sessions: Session[];
  speakers: Speaker[];
  materials: Material[];
  registrationId: string;
  registrationDate: string;
}

export default function ViewEventDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = params?.id as string;
  
  const [event, setEvent] = useState<EventDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    const fetchEventDetails = async () => {
      try {
        setIsLoading(true);
        const api = await createAuthenticatedApi();
        const response = await api.get(`/attendee/events/${eventId}`);
        setEvent(response.data);
      } catch (error: any) {
        console.error('Error fetching event details:', error);
        setError(error.response?.data?.message || 'Failed to load event details');
        toast.error("Couldn't load event information");
      } finally {
        setIsLoading(false);
      }
    };

    if (eventId) {
      fetchEventDetails();
    }
  }, [eventId]);

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <Skeleton className="h-8 w-36 mb-8" />
        <Skeleton className="h-56 w-full rounded-lg mb-8" />
        
        <div className="mb-8">
          <Skeleton className="h-10 w-3/4 mb-4" />
          <div className="space-y-2 mb-4">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-5 w-56" />
          </div>
        </div>
        
        <Skeleton className="h-12 w-full mb-6" />
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2">
            <Skeleton className="h-64 w-full rounded-lg" />
          </div>
          <Skeleton className="h-64 w-full rounded-lg" />
        </div>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="max-w-7xl mx-auto p-6 flex flex-col items-center justify-center h-64">
        <h2 className="text-xl font-semibold text-red-600 mb-4">
          {error || "Event not found"}
        </h2>
        <Button onClick={() => router.push('/attendee/view-event')}>
          Back to My Events
        </Button>
      </div>
    );
  }

  const isEventActive = new Date() >= new Date(event.startDate) && new Date() <= new Date(event.endDate);
  const isEventPast = new Date() > new Date(event.endDate);

  // Extract date for better formatting
  const startDate = new Date(event.startDate);
  const endDate = new Date(event.endDate);
  const formattedDateRange = `${startDate.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric' 
  })} - ${endDate.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric', 
    year: 'numeric' 
  })}`;

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Back button */}
      <Button
        variant="ghost"
        className="mb-8 pl-0 flex items-center text-gray-600 hover:text-gray-900"
        onClick={() => router.push('/attendee/view-event')}
      >
        <ArrowLeftIcon className="h-4 w-4 mr-2" />
        Back to My Events
      </Button>

      {/* Event Banner */}
      <div className="mb-8 p-8 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-700 text-white shadow-lg">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="flex flex-col md:flex-row justify-between">
            <div className="mb-6 md:mb-0">
              <h1 className="text-3xl md:text-4xl font-bold mb-4">
                {event.title}
              </h1>
              
              <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-4">
                <div className="flex items-center px-3 py-1.5 bg-white/20 rounded-full">
                  <CalendarIcon className="h-4 w-4 mr-2" />
                  <span className="text-sm font-medium">{formattedDateRange}</span>
                </div>
                
                <div className="flex items-center px-3 py-1.5 bg-white/20 rounded-full">
                  <MapPinIcon className="h-4 w-4 mr-2" />
                  <span className="text-sm font-medium">{event.location}</span>
                </div>
              </div>
              
              <div className="flex items-center mt-2">
                <TicketIcon className="h-4 w-4 mr-2" />
                <span className="text-sm opacity-90">Registration ID: {event.registrationId}</span>
              </div>
            </div>
            
            <div className="flex flex-col gap-3">
              {isEventActive ? (
                <Button 
                  className="bg-white text-indigo-700 hover:bg-white/90"
                  onClick={() => router.push(`/attendee/join/${event.id}`)}
                >
                  Join Now
                </Button>
              ) : isEventPast ? (
                <Button 
                  variant="outline" 
                  className="bg-transparent border-white text-white hover:bg-white/20"
                  onClick={() => router.push(`/attendee/feedback/${event.id}`)}
                >
                  <MessageSquareIcon className="h-4 w-4 mr-2" />
                  Provide Feedback
                </Button>
              ) : (
                <Button 
                  variant="outline" 
                  className="bg-transparent border-white text-white hover:bg-white/20"
                  onClick={() => router.push(`/attendee/calendar/${event.id}`)}
                >
                  <CalendarIcon className="h-4 w-4 mr-2" />
                  Add to Calendar
                </Button>
              )}
            </div>
          </div>
        </motion.div>
      </div>

      {/* Status Badge */}
      <div className="flex justify-center mb-8">
        <Badge 
          className={`px-3 py-1 text-sm font-medium ${
            isEventActive 
              ? "bg-green-100 text-green-800 border-green-200" 
              : isEventPast 
                ? "bg-gray-100 text-gray-800 border-gray-200" 
                : "bg-blue-100 text-blue-800 border-blue-200"
          }`}
        >
          {isEventActive ? '🔴 Live Now' : isEventPast ? '✓ Event Completed' : '⏱ Upcoming Event'}
        </Badge>
      </div>

      {/* Tabs Navigation */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
      >
        <Tabs
          defaultValue={activeTab}
          onValueChange={setActiveTab}
          className="w-full mb-8"
        >
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview" className="flex items-center">
              <InfoIcon className="h-4 w-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="sessions" className="flex items-center">
              <ClockIcon className="h-4 w-4 mr-2" />
              Sessions
            </TabsTrigger>
            <TabsTrigger value="speakers" className="flex items-center">
              <UsersIcon className="h-4 w-4 mr-2" />
              Speakers
            </TabsTrigger>
            <TabsTrigger value="materials" className="flex items-center">
              <BookOpenIcon className="h-4 w-4 mr-2" />
              Materials
            </TabsTrigger>
          </TabsList>
        
          {/* Overview Tab */}
          <TabsContent value="overview">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="md:col-span-2">
                <Card className="shadow-md border-0">
                  <CardContent className="p-6">
                    <h3 className="text-xl font-semibold mb-4">
                      About This Event
                    </h3>
                    
                    <p className="text-gray-700 whitespace-pre-line mb-6">
                      {event.description}
                    </p>
                    
                    <div className="bg-gray-50 p-5 rounded-xl border border-gray-100">
                      <h4 className="text-lg font-semibold mb-2 flex items-center text-gray-800">
                        <MapPinIcon className="h-5 w-5 mr-2 text-indigo-600" />
                        Venue Information
                      </h4>
                      <p className="font-medium">{event.venue.name}</p>
                      <p className="text-gray-600">{event.venue.address}</p>
                      {event.venue.room && (
                        <p className="text-gray-600 mt-1">Room: {event.venue.room}</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
              
              <div>
                <Card className="mb-4 shadow-md border-0 overflow-hidden">
                  <CardHeader className="bg-gradient-to-r from-indigo-50 to-purple-50 pb-2">
                    <h3 className="text-xl font-semibold">
                      Event Details
                    </h3>
                  </CardHeader>
                  
                  <CardContent className="p-6">
                    <div className="space-y-4">
                      <div>
                        <p className="text-sm text-gray-500">Organizer</p>
                        <p className="font-medium">{event.organizer}</p>
                      </div>
                      
                      <div>
                        <p className="text-sm text-gray-500">Registration Date</p>
                        <p className="font-medium">
                          {new Date(event.registrationDate).toLocaleDateString()}
                        </p>
                      </div>
                      
                      <div>
                        <p className="text-sm text-gray-500">Total Sessions</p>
                        <p className="font-medium">{event.sessions.length}</p>
                      </div>
                      
                      <div>
                        <p className="text-sm text-gray-500">Available Materials</p>
                        <p className="font-medium">{event.materials.length}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="shadow-md border-0 overflow-hidden">
                  <CardHeader className="bg-gradient-to-r from-indigo-50 to-purple-50 pb-2">
                    <h3 className="text-xl font-semibold">
                      Quick Actions
                    </h3>
                  </CardHeader>
                  
                  <CardContent className="p-6">
                    <div className="flex flex-col gap-3">
                      <Button
                        variant="outline"
                        className="justify-start hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 transition-colors"
                        onClick={() => router.push(`/attendee/view-event/${event.id}/ticket`)}
                      >
                        <TicketIcon className="h-4 w-4 mr-2" />
                        View Ticket & QR Code
                      </Button>
                      
                      <Button
                        variant="outline"
                        className="justify-start hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 transition-colors"
                        onClick={() => router.push(`/attendee/calendar/${event.id}`)}
                      >
                        <CalendarIcon className="h-4 w-4 mr-2" />
                        Add to Calendar
                      </Button>
                      
                      <Button
                        variant="outline"
                        className="justify-start hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 transition-colors"
                        onClick={() => router.push(`/attendee/networking/${event.id}`)}
                      >
                        <UsersIcon className="h-4 w-4 mr-2" />
                        View Attendees
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>
          
          {/* Sessions Tab */}
          <TabsContent value="sessions">
            <Card className="shadow-md border-0">
              <CardContent className="p-6">
                <h3 className="text-xl font-semibold mb-6 flex items-center">
                  <ClockIcon className="h-5 w-5 mr-2 text-indigo-600" />
                  Event Sessions
                </h3>
                
                {event.sessions.length > 0 ? (
                  <div className="space-y-4">
                    {event.sessions.map((session, index) => (
                      <motion.div
                        key={session.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: index * 0.05 }}
                      >
                        <Card className="shadow-sm hover:shadow-md transition-shadow border border-gray-100">
                          <CardContent className="p-4">
                            <div className="flex flex-col md:flex-row justify-between">
                              <div className="mb-4 md:mb-0">
                                <h4 className="text-lg font-semibold mb-2">
                                  {session.title}
                                </h4>
                                
                                <p className="text-gray-600 mb-3">
                                  {session.description}
                                </p>
                                
                                <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                                  <div className="flex items-center">
                                    <ClockIcon className="h-4 w-4 mr-1 text-indigo-500" />
                                    {session.startTime} - {session.endTime}
                                  </div>
                                  
                                  <div className="flex items-center">
                                    <MapPinIcon className="h-4 w-4 mr-1 text-indigo-500" />
                                    {session.location}
                                  </div>
                                  
                                  {event.speakers && (
                                    <div className="flex items-center">
                                      <UserIcon className="h-4 w-4 mr-1 text-indigo-500" />
                                      {event.speakers.find(s => s.id === session.speakerId)?.name || 'Unknown Speaker'}
                                    </div>
                                  )}
                                </div>
                              </div>
                              
                              <div className="flex md:flex-col gap-2">
                                {isEventActive ? (
                                  <Button
                                    size="sm"
                                    className="bg-indigo-600 hover:bg-indigo-700"
                                    onClick={() => router.push(`/attendee/join/${event.id}/session/${session.id}`)}
                                  >
                                    Join Session
                                  </Button>
                                ) : isEventPast ? (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                                    onClick={() => router.push(`/attendee/feedback/${event.id}/session/${session.id}`)}
                                  >
                                    Rate Session
                                  </Button>
                                ) : (
                                  <Badge className="bg-blue-100 text-blue-800 border-blue-200">
                                    Upcoming
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 bg-gray-50 rounded-lg">
                    <ClockIcon className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                    <h4 className="text-xl font-semibold mb-2">
                      No sessions available
                    </h4>
                    <p className="text-gray-500">
                      Sessions for this event have not been scheduled yet.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Speakers Tab */}
          <TabsContent value="speakers">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {event.speakers && event.speakers.length > 0 ? (
                event.speakers.map((speaker, index) => (
                  <motion.div
                    key={speaker.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                  >
                    <Card className="h-full flex flex-col shadow-md border-0 overflow-hidden">
                      <div className="bg-gradient-to-r from-indigo-600 to-violet-600 h-12" />
                      <CardContent className="p-6 pt-0 -mt-6">
                        <div className="flex flex-col items-center mb-4">
                          <Avatar className="h-24 w-24 mb-4 border-4 border-white shadow-md ring-2 ring-indigo-100">
                            <AvatarImage
                              src={speaker.profilePicture || '/placeholder-avatar.png'}
                              alt={speaker.name}
                            />
                            <AvatarFallback className="bg-indigo-100 text-indigo-700">
                              {speaker.name.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          
                          <h4 className="text-lg font-semibold text-center">
                            {speaker.name}
                          </h4>
                          
                          <p className="text-gray-500 text-center">
                            {speaker.title}
                          </p>
                        </div>
                        
                        <Separator className="my-4" />
                        
                        <p className="text-gray-600">
                          {speaker.bio}
                        </p>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))
              ) : (
                <div className="col-span-full text-center py-12 bg-gray-50 rounded-lg">
                  <UsersIcon className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <h4 className="text-xl font-semibold mb-2">
                    No speakers information available
                  </h4>
                  <p className="text-gray-500">
                    Speaker information for this event has not been added yet.
                  </p>
                </div>
              )}
            </div>
          </TabsContent>
          
          {/* Materials Tab */}
          <TabsContent value="materials">
            <Card className="shadow-md border-0">
              <CardContent className="p-6">
                <h3 className="text-xl font-semibold mb-6 flex items-center">
                  <BookOpenIcon className="h-5 w-5 mr-2 text-indigo-600" />
                  Event Materials
                </h3>
                
                {event.materials && event.materials.length > 0 ? (
                  <div className="space-y-4">
                    {event.materials.map((material, index) => (
                      <motion.div
                        key={material.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: index * 0.05 }}
                      >
                        <Card className="shadow-sm hover:shadow-md transition-shadow border border-gray-100 bg-gray-50">
                          <CardContent className="p-4">
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
                              <div className="mb-3 sm:mb-0">
                                <p className="font-medium">
                                  {material.title}
                                </p>
                                <p className="text-gray-500 text-sm">
                                  {material.type} • Added on {new Date(material.uploadDate).toLocaleDateString()}
                                </p>
                              </div>
                              
                              <Button
                                variant="outline"
                                size="sm"
                                className="flex items-center border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                                onClick={() => window.open(material.url, '_blank')}
                              >
                                <ExternalLinkIcon className="h-4 w-4 mr-2" />
                                Download
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 bg-gray-50 rounded-lg">
                    <BookOpenIcon className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                    <h4 className="text-xl font-semibold mb-2">
                      No materials available
                    </h4>
                    <p className="text-gray-500">
                      No materials have been uploaded for this event yet.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </motion.div>
    </div>
  );
}