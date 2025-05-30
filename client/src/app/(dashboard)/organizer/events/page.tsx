"use client";

import React, { useState, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useGetAuthUserQuery, useGetOrganizerEventsQuery } from "@/state/api";
import { deleteEvent } from '@/lib/actions/events';
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { 
  CalendarIcon, 
  MapPinIcon, 
  UsersIcon, 
  LayoutIcon, 
  PlusIcon,
  Loader2 
} from "lucide-react";

const ManageEventsPage = () => {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("upcoming");
  
  // Get the current organizer's info
  const { data: authUser, isLoading: userLoading } = useGetAuthUserQuery();
  
  // Fetch events for this organizer
  const {
    data: events,
    isLoading: eventsLoading,
  } = useGetOrganizerEventsQuery(
    { organizerId: authUser?.userInfo?.id },
    { skip: !authUser?.userInfo?.id }
  );

  // Function to determine event status
  const getEventStatus = (event: any) => {
    const now = new Date();
    const startDate = new Date(event.startDate);
    const endDate = new Date(event.endDate);
    
    if (endDate < now) return "past";
    if (startDate <= now && endDate >= now) return "active";
    return "upcoming";
  };

  // Categorize events by status
  const categorizedEvents = useMemo(() => {
    if (!events) return { upcoming: [], active: [], past: [] };
    
    return events.reduce((acc: any, event: any) => {
      const status = getEventStatus(event);
      if (!acc[status]) acc[status] = [];
      acc[status].push({...event, status});
      return acc;
    }, { upcoming: [], active: [], past: [] });
  }, [events]);

  const handleDelete = async (id: number) => {
    if (confirm("Are you sure you want to delete this event?")) {
      const response = await deleteEvent(id);
      if (response.success) {
        router.push('/organizer/events');
      } else {
        alert(response.error);
      }
    }
  };

  // Status Badge component
  const StatusBadge = ({ status }: { status: string }) => {
    let className = "text-xs font-medium px-2.5 py-0.5 rounded-full";
    
    switch (status) {
      case "active":
        className += " bg-green-100 text-green-800";
        break;
      case "upcoming":
        className += " bg-blue-100 text-blue-800";
        break;
      case "past":
        className += " bg-gray-100 text-gray-800";
        break;
    }
    
    return (
      <span className={className}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  // Enhanced loading state
  if (userLoading || eventsLoading) {
    return (
      <div className="flex justify-center items-center h-full py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary-700" />
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Header with Create Button - Always visible */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-primary-800">Your Conferences & Events</h1>
        <Link href="/organizer/create-event">
          <Button className="text-white bg-primary-700 hover:bg-primary-700 cursor-pointer">
            <PlusIcon className="h-4 w-4 mr-2" />
            Create New Event
          </Button>
        </Link>
      </div>

      {/* No events yet */}
      {(!events || events.length === 0) ? (
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <Image
            src="/noEventsYet.svg"
            alt="No Events Yet"
            width={400}
            height={220}
            priority
          />
          <h2 className="text-2xl md:text-3xl font-bold mb-2 text-center">
            Start A Great Event Today!
          </h2>
          <p className="mb-6 text-center max-w-xl">
            You are just one step away from your success story. Click the button below and start an excellent journey towards a great event planning and management experience.
          </p>
          <Link href="/organizer/create-event">
            <Button size="lg" className="border bg-primary-700 text-white hover:bg-primary-800 cursor-pointer">
              Create Your First Event
            </Button>
          </Link>
        </div>
      ) : (
        // Events exist - with tabs
        <Tabs defaultValue="upcoming" onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="upcoming">
              Upcoming ({categorizedEvents.upcoming.length})
            </TabsTrigger>
            <TabsTrigger value="active">
              Active ({categorizedEvents.active.length})
            </TabsTrigger>
            <TabsTrigger value="past">
              Past ({categorizedEvents.past.length})
            </TabsTrigger>
          </TabsList>
          
          {["upcoming", "active", "past"].map((tabValue) => (
            <TabsContent key={tabValue} value={tabValue} className="mt-0">
              {categorizedEvents[tabValue].length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-500 mb-4">No {tabValue} events found</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {categorizedEvents[tabValue].map((event: any) => (
                    <Link key={event.id} href={`/organizer/events/${event.id}`}>
                      <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer">
                        <CardHeader>
                          <div className="flex justify-between items-start">
                            <CardTitle className="line-clamp-2 font-bold text-lg">{event.name}</CardTitle>
                            <StatusBadge status={event.status} />
                          </div>
                        </CardHeader>
                        <CardContent>
                          <p className="text-gray-600 line-clamp-3 mb-4">{event.description}</p>
                          <div className="space-y-2">
                            <div className="flex items-center text-sm">
                              <CalendarIcon className="h-4 w-4 mr-2 text-gray-500" />
                              <span>
                                {format(new Date(event.startDate), "MMM d, yyyy")} - {format(new Date(event.endDate), "MMM d, yyyy")}
                              </span>
                            </div>
                            {event.location && (
                              <div className="flex items-center text-sm">
                                <MapPinIcon className="h-4 w-4 mr-2 text-gray-500" />
                                <span className="line-clamp-1">{event.location}</span>
                              </div>
                            )}
                          </div>
                        </CardContent>
                        <CardFooter className="border-t pt-4">
                          <div className="flex justify-between w-full text-sm">
                            <div className="flex items-center">
                              <UsersIcon className="h-4 w-4 mr-1 text-gray-500" />
                              <span>{event._count?.attendances || 0} attendees</span>
                            </div>
                            <div className="flex items-center">
                              <LayoutIcon className="h-4 w-4 mr-1 text-gray-500" />
                              <span>{event._count?.sections || 0} sessions</span>
                            </div>
                          </div>
                        </CardFooter>
                      </Card>
                    </Link>
                  ))}
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
      )}
    </div>
  );
};

export default ManageEventsPage;