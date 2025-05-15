"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useGetAuthUserQuery, useGetOrganizerEventsQuery } from "@/state/api";
import { deleteEvent } from '@/lib/actions/events';
import { useRouter } from "next/navigation";

const ManageEventsPage = () => {
  const router = useRouter();
  // Get the current organizer's info
  const { data: authUser, isLoading: userLoading } = useGetAuthUserQuery();
  // Fetch events for this organizer (assumes you have this endpoint)
  const {
    data: events,
    isLoading: eventsLoading,
  } = useGetOrganizerEventsQuery(
    { organizerId: authUser?.userInfo?.id },
    { skip: !authUser?.userInfo?.id }
  );

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

  if (userLoading || eventsLoading) {
    return (
      <div className="flex justify-center items-center h-full">
        <span>Loading...</span>
      </div>
    );
  }

  // No events yet
  if (!events || events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh]">
        <Image
          src="/noEventsYet.svg" // Place your screenshot in public/images as noEventsYet.png
          alt="No Events Yet"
          width={400}
          height={220}
          className="mb-8 w-full h-full object-cover z-10"
          priority
        />
        <h2 className="text-2xl md:text-3xl font-bold mb-2 text-center">
          Start A Great Event Today !
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
    );
  }

  // Events exist
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">Your Conferences & Events</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {events.map((event: any) => (
          <Link key={event.id} href={`/organizer/events/${event.id}`}>
            <Card className="hover:shadow-lg transition">
              <CardHeader>
                <CardTitle className="font-bold text-lg">{event.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="mb-2 text-sm text-gray-600">
                  {/* {event.startDate ? new Date(event.startDate).toLocaleString() : "No date"} */}
                  {event.startDate ? new Date(event.startDate).toLocaleString() : "No date"}
                  {event.endDate ? ` - ${new Date(event.endDate).toLocaleString()}` : ""}
                </p>
                <p className="mb-2">{event.description?.slice(0, 80)}...</p>
                <Button 
                 variant="outline" size="sm" 
                 className="hover:bg-primary-700 hover:text-white cursor-pointer"
                >
                  View Details
                </Button>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default ManageEventsPage;