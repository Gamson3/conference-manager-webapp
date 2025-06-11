"use client";

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import {
  CalendarIcon, MapPinIcon, UsersIcon, InfoIcon, ClockIcon, CheckIcon,
  ArrowLeftIcon, Users, Mail, Building, Globe, TreePine, AlertTriangleIcon,
} from 'lucide-react';
import { createAuthenticatedApi } from '@/lib/utils';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import ConferenceTreeView from '@/components/ConferenceTreeView';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog, DialogContent,DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from "@/components/ui/dialog";

interface Conference {
  id: number;
  title: string;
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  location: string;
  topics?: string[];
  websiteUrl?: string;
  venue?: string;
  capacity?: number;
  status: string;
  organizers?: Organizer[];
  presenters?: Presenter[];
  isRegistered?: boolean;
}

interface Organizer {
  id: number;
  name: string;
  email: string;
  title?: string;
  organization?: string;
  profilePicture?: string;
  bio?: string;
}

interface Presenter {
  id: number;
  name: string;
  email: string;
  affiliation?: string;
  bio?: string;
  profilePicture?: string;
  organization?: string;
  presentations?: { id: number; title: string }[];
}

export default function ConferenceDetails() {
  const params = useParams();
  const router = useRouter();
  const conferenceId = Number(params.id);
  
  const [conference, setConference] = useState<Conference | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [registering, setRegistering] = useState(false);
  const [unregistering, setUnregistering] = useState(false);
  const [showUnregisterDialog, setShowUnregisterDialog] = useState(false);
  // ADD: Add userContext state
  const [userContext, setUserContext] = useState<any>(null);
  // ADD: More granular loading states
  const [loadingStates, setLoadingStates] = useState({
    conference: true,
    registration: false
  });

  useEffect(() => {
    fetchConferenceDetails();    
    // Cleanup function
    return () => {
      // Cancel any pending requests if using AbortController
      setLoading(false);
      setError(null);
    };
  }, [conferenceId]);

  // UPDATE: Better userContext handling
  const fetchConferenceDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      
      let response;
      let isAuthenticatedRequest = false;
      
      try {
        const api = await createAuthenticatedApi();
        response = await api.get(`/api/attendee/conferences/${conferenceId}/details`);
        isAuthenticatedRequest = true;
      } catch (authError: any) {
        // Fallback for guest users
        const publicResponse = await fetch(
          `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/attendee/conferences/${conferenceId}/details`
        );
        const data = await publicResponse.json();
        response = { data };
        isAuthenticatedRequest = false;
      }
      
      setConference(response.data);
      
      // Set userContext from backend response
      const userContextData = response.data?.userContext || {
        isAuthenticated: isAuthenticatedRequest,
        userRole: isAuthenticatedRequest ? 'attendee' : 'guest',
        userId: null
      };
      
      setUserContext(userContextData);
      
      console.log('[DEBUG] Conference details data:', {
        conferenceId: response.data.id,
        isRegistered: response.data.isRegistered,
        userContext: userContextData
      });
      
    } catch (error: any) {
      console.error('[ERROR] Failed to fetch conference details:', error);
      setError('Failed to load conference details');
      toast.error('Failed to load conference details');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    // Early return for unauthenticated users
    if (!userContext?.isAuthenticated) {
      toast.error("Please sign in to register for conferences");
      router.push('/signup');
      return;
    }

    // Prevent double registration
    if (conference?.isRegistered) {
      toast.info("You're already registered for this conference");
      return;
    }

    try {
      setRegistering(true);
      setLoadingStates(prev => ({ ...prev, registration: true }));
      
      const api = await createAuthenticatedApi();
      await api.post('/api/attendee/register-conference', { 
        conferenceId: conferenceId 
      });

      // Optimistic update
      setConference(prev => prev ? { 
        ...prev, 
        isRegistered: true 
      } : null);

      toast.success("Successfully registered for the conference!");
      setConference(prev => prev ? { ...prev, isRegistered: true } : null);

      // Optional: Trigger a refetch to ensure data consistency
      // fetchConferenceDetails();
    
    } catch (error: any) {
      console.error('Error registering for conference:', error);
      toast.error(error.response?.data?.message || "Registration failed. Please try again.");
      // Revert optimistic update on error
      setConference(prev => prev ? { 
        ...prev, 
        isRegistered: false 
      } : null);
    } finally {
      setRegistering(false);
      setLoadingStates(prev => ({ ...prev, registration: false }));
    }
  };


  const handleUnregister = async () => {
    try {
      setUnregistering(true);

      const api = await createAuthenticatedApi();
      await api.delete(`/api/attendee/unregister-conference/${conferenceId}`);

      // Update UI
      setConference(prev => prev ? { 
        ...prev, 
        isRegistered: false 
      } : null);

      toast.success("Successfully cancelled your registration");
      setShowUnregisterDialog(false);

    } catch (error: any) {
      console.error('Error unregistering:', error);
      toast.error(error.response?.data?.message || "Failed to cancel registration");
    } finally {
      setUnregistering(false);
    }
  };


  if (loading) {
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

  if (error || !conference) {
    return (
      <div className="max-w-7xl mx-auto p-6 flex flex-col items-center justify-center h-64">
        <h2 className="text-xl font-semibold text-red-600 mb-4">
          {error || "Conference not found"}
        </h2>
        <Button onClick={() => router.push("/attendee/discover")}>
          Discover Conferences
        </Button>
      </div>
    );
  }


  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Back button */}
      <Button
        variant="outline"
        className="mb-8 pl-0 flex items-center"
        onClick={() => router.back()}
      >
        <ArrowLeftIcon className="h-4 w-4 mr-2" />
        Back
      </Button>

      {/* Conference Banner */}
      <div className="mb-8 p-8 rounded-lg bg-gradient-to-r from-primary-600 to-primary-800 text-white">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="flex flex-col md:flex-row justify-between">
            <div className="mb-6 md:mb-0">
              <h1 className="text-3xl md:text-4xl font-bold mb-4">
                {conference.title || conference.name}
              </h1>

              <div className="flex flex-col sm:flex-row gap-4 mb-4">
                <div className="flex items-center">
                  <CalendarIcon className="h-5 w-5 mr-2" />
                  <p>
                    {new Date(conference.startDate).toLocaleDateString()} -{" "}
                    {new Date(conference.endDate).toLocaleDateString()}
                  </p>
                </div>

                <div className="flex items-center">
                  <MapPinIcon className="h-5 w-5 mr-2" />
                  <p>{conference.location}</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 mt-3">
                {conference.topics?.map((topic, index) => (
                  <Badge
                    key={index}
                    variant="outline"
                    className="bg-white/20 hover:bg-white/30 text-white border-white"
                  >
                    {topic}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-3">
              {conference.isRegistered ? (
                <>
                  <Button
                    onClick={handleRegister}
                    variant="outline"
                    className="bg-green-100 border-green-300 text-green-700 hover:bg-green-100 hover:text-green-700"
                  >
                    <CheckIcon className="h-4 w-4" />
                    Registered
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="bg-primary-100 text-red-600 hover:text-red-700 hover:bg-red-50"
                    onClick={() => setShowUnregisterDialog(true)}
                  >
                    Cancel Registration
                  </Button>
                </>
              ) : userContext?.isAuthenticated ? (
                <Button
                  onClick={handleRegister}
                  disabled={registering}
                  className="bg-white text-primary-700 hover:bg-white/90"
                >
                  {registering ? 'Registering...' : 'Register Now'}
                </Button>
              ) : (
                <Button
                  className="bg-white text-primary-700 hover:bg-white/90"
                  onClick={() => router.push('/signup')}
                >
                  Sign In to Register
                </Button>
              )}
            </div>
            
            {/* Confirmation Dialog (Required for any unregister action) */}
            <Dialog open={showUnregisterDialog} onOpenChange={setShowUnregisterDialog}>
              <DialogContent className="bg-white">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <AlertTriangleIcon className="h-5 w-5 text-amber-500" />
                    Cancel Registration?
                  </DialogTitle>
                  <div id="radix-«r4»">
                    Are you sure you want to cancel your registration for "{conference.name}"?

                    {/* Show consequences */}
                    <div className="mt-4 p-3 bg-amber-50 rounded-md">
                      <p className="font-medium text-amber-800">Please note:</p>
                      <ul className="mt-2 text-sm text-amber-700 space-y-1">
                        <li>• You'll lose access to all conference materials</li>
                        <li>• Your networking connections may be affected</li>
                        <li>• Re-registration may not be available if capacity is full</li>
                      </ul>
                    </div>
                  </div>
                </DialogHeader>

                <DialogFooter>
                  <Button 
                    variant="outline" 
                    onClick={() => setShowUnregisterDialog(false)}
                    disabled={unregistering}
                  >
                    close
                  </Button>
                  <Button 
                    variant="destructive"
                    onClick={handleUnregister}
                    disabled={unregistering}
                    className="bg-primary/50 text-red-600 hover:text-red-700 hover:bg-red-50 shadow"
                  >
                    {unregistering ? 'Cancelling...' : 'Yes, Cancel Registration'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </motion.div>
      </div>

      {/* Tabs Navigation */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
      >
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="w-full mb-8"
        >
          <TabsList>
            <TabsTrigger value="overview" className="flex items-center">
              <InfoIcon className="h-4 w-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="schedule" className="flex items-center">
              <TreePine className="h-4 w-4 mr-2" />
              Conference Schedule
            </TabsTrigger>
            <TabsTrigger value="organizers" className="flex items-center">
              <Users className="h-4 w-4 mr-2" />
              Organizers
            </TabsTrigger>
            <TabsTrigger value="presenters" className="flex items-center">
              <UsersIcon className="h-4 w-4 mr-2" />
              Presenters
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="md:col-span-2">
                <Card>
                  <CardContent className="p-6">
                    <h2 className="text-xl font-semibold mb-4">
                      About This Conference
                    </h2>
                    <p className="text-gray-700 whitespace-pre-line mb-6">
                      {conference.description}
                    </p>
                  </CardContent>
                </Card>
              </div>

              <div>
                <Card>
                  <CardHeader>
                    <h2 className="text-xl font-semibold">
                      Conference Details
                    </h2>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <p className="text-sm text-gray-500">Duration</p>
                      <p className="font-medium">
                        {Math.ceil(
                          (new Date(conference.endDate).getTime() -
                            new Date(conference.startDate).getTime()) /
                            (1000 * 60 * 60 * 24)
                        )}{" "}
                        days
                      </p>
                    </div>

                    {conference.venue && (
                      <div>
                        <p className="text-sm text-gray-500">Venue</p>
                        <p className="font-medium">{conference.venue}</p>
                      </div>
                    )}

                    {conference.capacity && (
                      <div>
                        <p className="text-sm text-gray-500">Capacity</p>
                        <p className="font-medium">{conference.capacity} attendees</p>
                      </div>
                    )}

                    {conference.websiteUrl && (
                      <div>
                        <p className="text-sm text-gray-500">Website</p>
                        <a
                          href={conference.websiteUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline flex items-center"
                        >
                          Visit Website
                          <Globe className="h-4 w-4 ml-1" />
                        </a>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* Schedule Tree Tab */}
          <TabsContent value="schedule">
            <ConferenceTreeView
              conferenceId={conference.id}
              showSearch={true}
              expandedByDefault={false}
              onPresentationSelect={(presentation) => {
                router.push(`/attendee/presentations/${presentation.id}`);
              }}
            />
          </TabsContent>

          {/* Organizers Tab */}
          <TabsContent value="organizers">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {conference.organizers && conference.organizers.length > 0 ? (
                conference.organizers.map((organizer, index) => (
                  <motion.div
                    key={organizer.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                  >
                    <Card className="h-full">
                      <CardContent className="p-6">
                        <div className="flex flex-col items-center mb-4">
                          <Avatar className="h-20 w-20 mb-4">
                            <AvatarImage
                              src={organizer.profilePicture || "/placeholder-avatar.png"}
                              alt={organizer.name}
                            />
                            <AvatarFallback>
                              {organizer.name.charAt(0)}
                            </AvatarFallback>
                          </Avatar>

                          <h3 className="text-lg font-semibold text-center">
                            {organizer.name}
                          </h3>

                          {organizer.title && (
                            <p className="text-gray-500 text-center">
                              {organizer.title}
                            </p>
                          )}

                          {organizer.organization && (
                            <div className="flex items-center mt-2">
                              <Building className="h-4 w-4 mr-1 text-gray-400" />
                              <span className="text-sm text-gray-600">
                                {organizer.organization}
                              </span>
                            </div>
                          )}

                          <div className="flex items-center mt-2">
                            <Mail className="h-4 w-4 mr-1 text-gray-400" />
                            <span className="text-sm text-gray-600">
                              {organizer.email}
                            </span>
                          </div>
                        </div>

                        {organizer.bio && (
                          <>
                            <Separator className="my-4" />
                            <p className="text-gray-600 text-sm">
                              {organizer.bio}
                            </p>
                          </>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                ))
              ) : (
                <div className="col-span-full text-center py-12 bg-gray-50 rounded-lg">
                  <Users className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-xl font-semibold mb-2">
                    No organizers information available
                  </h3>
                  <p className="text-gray-500">
                    Organizer information for this conference has not been added yet.
                  </p>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Presenters Tab */}
          <TabsContent value="presenters">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {conference.presenters && conference.presenters.length > 0 ? (
                conference.presenters.map((presenter, index) => (
                  <motion.div
                    key={presenter.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                  >
                    <Card className="h-full">
                      <CardContent className="p-6">
                        <div className="flex flex-col items-center mb-4">
                          <Avatar className="h-20 w-20 mb-4">
                            <AvatarImage
                              src={presenter.profilePicture || "/placeholder-avatar.png"}
                              alt={presenter.name}
                            />
                            <AvatarFallback>
                              {presenter.name.charAt(0)}
                            </AvatarFallback>
                          </Avatar>

                          <h3 className="text-lg font-semibold text-center">
                            {presenter.name}
                          </h3>

                          {presenter.affiliation && (
                            <div className="flex items-center mt-2">
                              <Building className="h-4 w-4 mr-1 text-gray-400" />
                              <span className="text-sm text-gray-600">
                                {presenter.affiliation}
                              </span>
                            </div>
                          )}

                          {presenter.email && (
                            <div className="flex items-center mt-2">
                              <Mail className="h-4 w-4 mr-1 text-gray-400" />
                              <span className="text-sm text-gray-600">
                                {presenter.email}
                              </span>
                            </div>
                          )}
                        </div>

                        {presenter.bio && (
                          <>
                            <Separator className="my-4" />
                            <p className="text-gray-600 text-sm mb-4">
                              {presenter.bio}
                            </p>
                          </>
                        )}

                        {presenter.presentations && presenter.presentations.length > 0 && (
                          <div className="mt-4">
                            <p className="text-sm text-gray-500 mb-2">
                              Presentations ({presenter.presentations.length}):
                            </p>
                            <div className="space-y-1">
                              {presenter.presentations.map((presentation) => (
                                <div
                                  key={presentation.id}
                                  className="text-sm text-blue-600 hover:text-blue-800 cursor-pointer"
                                  onClick={() => router.push(`/attendee/presentations/${presentation.id}`)}
                                >
                                  {presentation.title}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                ))
              ) : (
                <div className="col-span-full text-center py-12 bg-gray-50 rounded-lg">
                  <UsersIcon className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-xl font-semibold mb-2">
                    No presenters information available
                  </h3>
                  <p className="text-gray-500">
                    Presenter information for this conference has not been added yet.
                  </p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </motion.div>
    </div>
  );
}