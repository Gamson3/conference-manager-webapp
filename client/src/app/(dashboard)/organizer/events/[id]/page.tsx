"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, MapPin, Users, ChevronRight, Edit, ArrowLeft, Layers } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { createAuthenticatedApi } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { motion } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";

export default function EventDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [event, setEvent] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    setLoading(true);

    const getEventDetails = async () => {
      try {
        const api = await createAuthenticatedApi();
        const response = await api.get(`/events/${id}`);
        console.log("Event data:", response.data);
        setEvent(response.data);
      } catch (error) {
        console.error("Error fetching event:", error);
        setEvent(null);
      } finally {
        setLoading(false);
      }
    };

    getEventDetails();
  }, [id]);

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
      {/* Hero Section */}
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
          <Badge
            variant={event.isPublished ? "default" : "secondary"}
            className={`${
              event.isPublished 
                ? "bg-green-400 text-green-800 hover:bg-green-300" 
                : "bg-gray-400 text-gray-800 hover:bg-gray-400"
            } px-3 py-1 rounded-full font-medium text-xs`}
          >
            {event.isPublished ? "Published" : "Draft"}
          </Badge>
        </div>
        
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
          {event.name}
        </h1>
        
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

      {/* Main Content */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
        {/* Left Column (2/3 width) */}
        <div className="md:col-span-2 space-y-6">
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

          {event.sessions && event.sessions.length > 0 && (
            <Card className="overflow-hidden border-none shadow-md">
              <CardHeader className="pb-4 flex flex-row justify-between items-center">
                <CardTitle className="text-xl font-semibold">Sessions</CardTitle>
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
                      <div className="font-medium">{session.title}</div>
                      {session.speaker && (
                        <div className="text-sm text-gray-500 mt-1">
                          Speaker: {session.speaker.name}
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
          )}
        </div>

        {/* Right Column (1/3 width) */}
        <div className="space-y-6">
          {/* Event Details Card */}
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
              
              {event.registeredAttendees !== undefined && (
                <div>
                  <div className="text-sm font-medium text-gray-500 mb-1">Registered Attendees</div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{event.registeredAttendees}</span>
                    {event.capacity && (
                      <span className="text-gray-500 text-sm">of {event.capacity}</span>
                    )}
                  </div>
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

          {/* Speakers Card */}
          {event.speakers && event.speakers.length > 0 && (
            <Card className="overflow-hidden border-none shadow-md">
              <CardHeader className="pb-4">
                <CardTitle className="text-xl font-semibold">Speakers</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {event.speakers.slice(0, 3).map((speaker: any) => (
                    <li key={speaker.id} className="flex items-center gap-3 p-3 border border-gray-100 rounded-lg hover:border-gray-200 hover:bg-gray-50 transition-colors">
                      <div className="h-8 w-8 bg-primary-100 text-primary rounded-full flex items-center justify-center">
                        {speaker.name.charAt(0)}
                      </div>
                      <div>
                        <div className="font-medium">{speaker.name}</div>
                        {speaker.role && (
                          <div className="text-xs text-gray-500">{speaker.role}</div>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
                
                {event.speakers.length > 3 && (
                  <Button
                    variant="link"
                    className="mt-3 p-0 h-auto text-primary"
                    onClick={() => router.push(`/organizer/events/${event.id}/speakers`)}
                  >
                    View all {event.speakers.length} speakers
                    <ChevronRight className="ml-1 h-4 w-4" />
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
