"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { 
  Calendar, Clock, MapPin, Users, ChevronRight, Edit, ArrowLeft, Layers,
  TreePine, Info, UsersIcon, Globe, Eye, Settings, Plus  // ADD: Globe, Eye, Settings, Plus
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { createAuthenticatedApi } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";
import ConferenceTreeView from "@/components/ConferenceTreeView";
import ConferencePublishDialog from "@/components/ConferencePublishDialog"; // ADD: Import
import { toast } from "sonner"; // ADD: Import

export default function EventDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [event, setEvent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [showPublishDialog, setShowPublishDialog] = useState(false); // ADD: State for dialog

  useEffect(() => {
    if (!id) return;
    getEventDetails(); // CHANGE: Extract to named function for reuse
  }, [id]);

  // CHANGE: Extract function so it can be called after publish/unpublish
  const getEventDetails = async () => {
    try {
      setLoading(true);
      const api = await createAuthenticatedApi();
      
      // Fetch basic event data
      const eventResponse = await api.get(`/events/${id}`);
      
      // Fetch participants 
      const participantsResponse = await api.get(`/conferences/${id}/participants`);
      
      // ADDED: Fetch sessions (sections) for this conference
      const sessionsResponse = await api.get(`/sections/conference/${id}`);
      
      console.log("Event data:", eventResponse.data);
      console.log("Participants data:", participantsResponse.data);
      console.log("Sessions data:", sessionsResponse.data);
      
      setEvent({
        ...eventResponse.data,
        participants: participantsResponse.data,
        sessions: sessionsResponse.data || [] // Add sessions data
      });
    } catch (error) {
      console.error("Error fetching event:", error);
      toast.error("Failed to load event details");
      setEvent(null);
    } finally {
      setLoading(false);
    }
  };

  // ADD: Helper function for status colors
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published': 
        return 'bg-green-100 text-green-800 border-green-200';
      case 'draft': 
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'canceled': 
        return 'bg-red-100 text-red-800 border-red-200';
      case 'completed': 
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default: 
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // Keep your existing loading and error states...
  if (loading) {
    return (
      <div className="max-w-5xl mx-auto py-8 px-4 space-y-6">
        <Skeleton className="h-12 w-3/4" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
        <div className="flex gap-4">
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-24" />
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <div className="bg-red-50 text-red-500 p-4 rounded-lg mb-4">
          <h2 className="text-xl font-bold mb-2">Event Not Found</h2>
          <p className="text-sm opacity-80 mb-4">The event you're looking for could not be found or you don't have permission to view it.</p>
        </div>
        <Button onClick={() => router.push("/organizer/events")} variant="outline" className="group">
          <ArrowLeft className="mr-2 h-4 w-4 group-hover:translate-x-[-2px] transition-transform" />
          Back to Events
        </Button>
      </div>
    );
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'short',
      month: 'short', 
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  return (
    <div className="max-w-5xl mx-auto py-8 px-4">
      {/* Hero Section - UPDATED: Add publish button */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="mb-8"
      >
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-2 gap-3">
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              className="p-0 h-8 hover:bg-transparent hover:text-primary" 
              onClick={() => router.push("/organizer/events")}
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              <span className="text-sm font-medium">Events</span>
            </Button>
            <span className="text-gray-400">/</span>
            <span className="text-sm font-medium truncate max-w-[200px]">{event.name}</span>
          </div>
          
          {/* UPDATED: Show status with new colors and add publish button */}
          <div className="flex items-center gap-2">
            <Badge className={getStatusColor(event.status)}>
              {event.status?.charAt(0).toUpperCase() + event.status?.slice(1) || "Draft"}
            </Badge>
            
            {/* ADD: Publish/Unpublish button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowPublishDialog(true)}
              className="flex items-center gap-1.5"
            >
              {event.status === 'published' ? (
                <>
                  <Eye className="h-3.5 w-3.5" />
                  Unpublish
                </>
              ) : (
                <>
                  <Globe className="h-3.5 w-3.5" />
                  Publish
                </>
              )}
            </Button>
          </div>
        </div>
        
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
          {event.name}
        </h1>
        
        {/* Keep your existing event details bar */}
        <div className="flex flex-wrap gap-4 text-sm text-gray-600 mb-6">
          {event.startDate && (
            <div className="flex items-center gap-1.5">
              <Calendar className="h-4 w-4 text-primary-600" />
              <span>{formatDate(event.startDate)}</span>
            </div>
          )}
          {event.endDate && event.startDate !== event.endDate && (
            <div className="flex items-center gap-1.5">
              <Clock className="h-4 w-4 text-primary-600" />
              <span>Until {formatDate(event.endDate)}</span>
            </div>
          )}
          {event.location && (
            <div className="flex items-center gap-1.5">
              <MapPin className="h-4 w-4 text-primary-600" />
              <span>{event.location}</span>
            </div>
          )}
          {event.capacity && (
            <div className="flex items-center gap-1.5">
              <Users className="h-4 w-4 text-primary-600" />
              <span>Capacity: {event.capacity}</span>
            </div>
          )}
        </div>
      </motion.div>

      {/* Main Content - Keep your existing tabs structure */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-8">
          <TabsTrigger value="overview" className="flex items-center">
            <Info className="h-4 w-4 mr-2" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="tree" className="flex items-center">
            <TreePine className="h-4 w-4 mr-2" />
            Schedule Tree
          </TabsTrigger>
          <TabsTrigger value="people" className="flex items-center">
            <UsersIcon className="h-4 w-4 mr-2" />
            Organizers & Presenters
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab - ADD: Publishing status card to your existing content */}
        <TabsContent value="overview">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
            {/* Left Column (2/3 width) */}
            <div className="md:col-span-2 space-y-6">
              {/* About card */}
              <Card className="overflow-hidden border-none shadow-md">
                <CardHeader className="pb-4">
                  <CardTitle className="text-xl font-semibold">About this Event</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700 leading-relaxed whitespace-pre-line">
                    {event.description || "No description provided."}
                  </p>
                </CardContent>
              </Card>

              {/* Publishing Status Card */}
              <Card className="overflow-hidden border-none shadow-md">
                <CardHeader className="pb-4">
                  <CardTitle className="text-xl font-semibold flex items-center gap-2">
                    <Globe className="h-5 w-5" />
                    Publishing Status
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm font-medium">Current Status:</span>
                        <Badge className={getStatusColor(event.status)}>
                          {event.status?.charAt(0).toUpperCase() + event.status?.slice(1) || "Draft"}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600">
                        {event.status === 'published' 
                          ? "Your conference is live and visible to attendees."
                          : event.status === 'draft'
                            ? "Your conference is in draft mode. Publish it to make it visible to attendees."
                            : `Conference is ${event.status}.`
                        }
                      </p>
                    </div>
                    <Button
                      onClick={() => setShowPublishDialog(true)}
                      variant={event.status === 'published' ? "outline" : "default"}
                      className="ml-4"
                    >
                      {event.status === 'published' ? (
                        <>
                          <Eye className="h-4 w-4 mr-2" />
                          Unpublish
                        </>
                      ) : (
                        <>
                          <Globe className="h-4 w-4 mr-2" />
                          Publish
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* UPDATED: Sessions card to show actual sessions */}
              {event.sessions && event.sessions.length > 0 ? (
                <Card className="overflow-hidden border-none shadow-md">
                  <CardHeader className="pb-4 flex flex-row justify-between items-center">
                    <CardTitle className="text-xl font-semibold">
                      Sessions ({event.sessions.length})
                    </CardTitle>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => router.push(`/organizer/events/${event.id}/sessions`)}
                      className="text-primary hover:text-primary-700 hover:bg-primary-50"
                    >
                      Manage
                      <ChevronRight className="ml-1 h-4 w-4" />
                    </Button>
                  </CardHeader>
                  <CardContent className="pb-4">
                    <ul className="space-y-3">
                      {event.sessions.slice(0, 3).map((session: any) => (
                        <motion.li 
                          key={session.id} 
                          className="p-3 border border-gray-100 rounded-lg hover:border-gray-200 hover:bg-gray-50 transition-colors cursor-pointer"
                          whileHover={{ y: -2 }}
                          transition={{ type: "spring", stiffness: 300 }}
                          onClick={() => router.push(`/organizer/events/${event.id}/sessions/${session.id}`)}
                        >
                          <div className="font-medium">{session.name}</div>
                          <div className="text-sm text-gray-500 mt-1">
                            {session.type && <span className="capitalize">{session.type}</span>}
                            {session._count?.presentations > 0 && (
                              <span className="ml-2">• {session._count.presentations} presentations</span>
                            )}
                            {session.room && <span className="ml-2">• {session.room}</span>}
                          </div>
                          {session.startTime && (
                            <div className="text-xs text-gray-400 mt-1">
                              {new Date(session.startTime).toLocaleDateString()} at {new Date(session.startTime).toLocaleTimeString()}
                            </div>
                          )}
                        </motion.li>
                      ))}
                    </ul>
                    
                    {event.sessions.length > 3 && (
                      <Button
                        variant="link"
                        className="mt-2 p-0 h-auto text-primary"
                        onClick={() => router.push(`/organizer/events/${event.id}/sessions`)}
                      >
                        View all {event.sessions.length} sessions
                        <ChevronRight className="ml-1 h-4 w-4" />
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ) : (
                <Card className="overflow-hidden border-none shadow-md border-dashed border-2 bg-gray-50">
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <div className="rounded-full bg-primary-50 p-3 mb-4">
                      <Layers className="h-6 w-6 text-primary-700" />
                    </div>
                    <h3 className="font-semibold text-lg mb-2">No Sessions Yet</h3>
                    <p className="text-gray-500 text-center max-w-md mb-6">
                      Create sessions to organize your conference content and presentations.
                    </p>
                    <Button 
                      onClick={() => router.push(`/organizer/events/${event.id}/sessions`)}
                      className="bg-primary-700 text-white hover:bg-primary-800"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Create Your First Session
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Right Column - Keep existing but simplified */}
            <div className="space-y-6">
              {/* Event Details Card - simplified */}
              <Card className="overflow-hidden border-none shadow-md">
                <CardHeader className="pb-4">
                  <CardTitle className="text-xl font-semibold">Event Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {event.registrationDeadline && (
                    <div>
                      <div className="text-sm font-medium text-gray-500 mb-1">Registration Deadline</div>
                      <div>{new Date(event.registrationDeadline).toLocaleDateString()}</div>
                    </div>
                  )}
                  
                  {event.capacity && (
                    <div>
                      <div className="text-sm font-medium text-gray-500 mb-1">Capacity</div>
                      <div>{event.capacity} attendees</div>
                    </div>
                  )}
                  
                  {/* Action Buttons */}
                  <div className="pt-4 flex flex-col gap-4">
                    <Button 
                      onClick={() => router.push(`/organizer/events/${event.id}/edit`)}
                      className="w-full justify-start text-white bg-primary-700 hover:bg-primary-700 shadow-gray-400 cursor-pointer"
                    >
                      <Edit className="mr-2 h-4 w-4" />
                      Edit Event
                    </Button>
                    
                    <Button
                      variant="outline"
                      onClick={() => router.push(`/organizer/events/${event.id}/sessions`)}
                      className="w-full justify-start border-gray-200 hover:bg-gray-50 hover:text-primary shadow-gray-400 cursor-pointer"
                    >
                      <Layers className="mr-2 h-4 w-4" />
                      Manage Sessions
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* REMOVE: Speakers card for now since it's not in your current data structure */}
            </div>
          </div>
        </TabsContent>

        {/* UPDATED: Tree View Tab with status check */}
        <TabsContent value="tree">
          {event.status === 'published' ? (
            <ConferenceTreeView
              conferenceId={Number(id)}
              showSearch={true}
              expandedByDefault={false}
              onPresentationSelect={(presentation) => {
                router.push(`/organizer/events/${id}/sessions/${presentation.sectionId}/presentations/${presentation.id}`);
              }}
            />
          ) : (
            <div className="text-center py-12 bg-gray-50 rounded-lg">
              <TreePine className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-xl font-semibold mb-2">
                Conference Not Published
              </h3>
              <p className="text-gray-500 mb-6">
                Publish your conference to view the schedule tree.
              </p>
              <Button onClick={() => setShowPublishDialog(true)}>
                <Globe className="h-4 w-4 mr-2" />
                Publish Conference
              </Button>
            </div>
          )}
        </TabsContent>

        {/* Keep your existing People Tab */}
        <TabsContent value="people">
          <div className="space-y-8">
            {/* Keep all your existing People tab content... */}
            <div>
              <h2 className="text-2xl font-bold mb-4 flex items-center">
                <Edit className="h-6 w-6 mr-2" />
                Organizers ({event.participants?.filter((p: any) => p.role === 'organizer')?.length || 0})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {event.participants?.filter((p: any) => p.role === 'organizer')?.map((organizer: any) => (
                  <Card key={organizer.id}>
                    <CardContent className="p-6">
                      <h3 className="font-semibold text-lg mb-2">{organizer.name}</h3>
                      <p className="text-sm text-gray-600 mb-1">{organizer.email}</p>
                      {organizer.organization && (
                        <p className="text-sm text-gray-600 mb-2">{organizer.organization}</p>
                      )}
                      {organizer.bio && (
                        <p className="text-sm text-gray-600 line-clamp-3">{organizer.bio}</p>
                      )}
                    </CardContent>
                  </Card>
                )) || (
                  <div className="col-span-full text-center py-12 bg-gray-50 rounded-lg">
                    <Users className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                    <p className="text-gray-500">No organizers information available</p>
                  </div>
                )}
              </div>
            </div>

            {/* Presenters Section */}
            <div>
              <h2 className="text-2xl font-bold mb-4 flex items-center">
                <Users className="h-6 w-6 mr-2" />
                Presenters ({event.participants?.filter((p: any) => p.role === 'presenter')?.length || 0})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {event.participants?.filter((p: any) => p.role === 'presenter')?.map((presenter: any) => (
                  <Card key={presenter.id}>
                    <CardContent className="p-6">
                      <h3 className="font-semibold text-lg mb-2">{presenter.name}</h3>
                      <p className="text-sm text-gray-600 mb-1">{presenter.email}</p>
                      {presenter.affiliation && (
                        <p className="text-sm text-gray-600 mb-2">{presenter.affiliation}</p>
                      )}
                      {presenter.presentationCount && (
                        <Badge variant="outline" className="mt-2">
                          {presenter.presentationCount} presentations
                        </Badge>
                      )}
                    </CardContent>
                  </Card>
                )) || (
                  <div className="col-span-full text-center py-12 bg-gray-50 rounded-lg">
                    <Users className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                    <p className="text-gray-500">No presenters information available</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* ADD: Publish Dialog */}
      <ConferencePublishDialog
        open={showPublishDialog}
        onClose={() => setShowPublishDialog(false)}
        conferenceId={id as string}
        currentStatus={event.status || 'draft'}
        onSuccess={getEventDetails} // Refresh data after publish/unpublish
      />
    </div>
  );
}
