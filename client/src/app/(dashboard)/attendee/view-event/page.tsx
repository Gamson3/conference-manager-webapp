"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import {
  CalendarIcon,
  MapPinIcon,
  UserIcon,
  ExternalLinkIcon,
  SearchIcon,
  TicketIcon,
  QrCodeIcon,
  HistoryIcon,
} from 'lucide-react';
import { createAuthenticatedApi } from '@/lib/utils';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { Separator } from '@/components/ui/separator';

interface Conference {
  id: number;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  location: string;
  organizer: string;
  registrationDate?: string;
  registrationId?: string;
  status: 'upcoming' | 'active' | 'past';
}

export default function ViewEventsPage() {
  const router = useRouter();
  const [events, setEvents] = useState<Conference[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState('upcoming');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        setIsLoading(true);
        const api = await createAuthenticatedApi();
        const response = await api.get('/api/attendee/registered-conferences');
        setEvents(response.data);
      } catch (error: any) {
        console.error('Error fetching events:', error);
        setError(error.response?.data?.message || 'Failed to load your events');
        toast.error("Couldn't load your registered events");
      } finally {
        setIsLoading(false);
      }
    };

    fetchEvents();
  }, []);

  const handleFilterChange = (newFilter: string) => {
    setFilter(newFilter);
  };

  const filteredEvents = events
    .filter(event => event.status === filter)
    .filter(event => 
      event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      event.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
      event.organizer.toLowerCase().includes(searchTerm.toLowerCase())
    );
  
  // const handleViewDetails = (event: Conference) (e: React.MouseEvent) => {
  //   e.stopPropagation(); // Prevent card click
  //   router.push(`/attendee/conferences/${event.id}`);
  // };


  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <h1 className="text-2xl font-bold mb-6">
          My Events
        </h1>
        
        <Skeleton className="h-12 w-full mb-6" />
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="border-none shadow-sm">
              <CardContent className="p-6">
                <Skeleton className="h-6 w-3/4 mb-2" />
                <Skeleton className="h-4 w-1/2 mb-4" />
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-full mb-2" />
              </CardContent>
              <CardFooter className="px-6 py-4 bg-gray-50 flex justify-between">
                <Skeleton className="h-9 w-24" />
                <Skeleton className="h-9 w-24" />
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // UPDATE: Better error handling
  if (error) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="text-center py-16 px-6 bg-red-50 rounded-lg">
          <h2 className="text-xl font-semibold text-red-600 mb-4">
            {error}
          </h2>
          <p className="text-red-500 mb-6">
            We couldn't load your registered events. Please try again.
          </p>
          <Button 
            onClick={() => window.location.reload()}
            variant="outline"
            className="mr-4"
          >
            Try Again
          </Button>
          <Button 
            onClick={() => router.push('/attendee/discover')}
            className="bg-primary-700 text-white hover:bg-primary-800"
          >
            Discover Conferences
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <h1 className="text-2xl font-bold flex items-center">
          <TicketIcon className="h-6 w-6 text-primary-600 mr-2" />
          My Events
        </h1>
        
        <div className="w-full md:w-auto">
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search events..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full md:w-64 pl-9"
            />
          </div>
        </div>
      </div>
      
      <Tabs
        defaultValue={filter}
        onValueChange={handleFilterChange}
        className="w-full mb-6"
      >
        <div className="border-b">
          <TabsList className="h-auto bg-transparent justify-start">
            <TabsTrigger 
              value="upcoming" 
              className="flex items-center gap-2 py-2 px-4 data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none"
            >
              <CalendarIcon className="h-4 w-4" />
              Upcoming
            </TabsTrigger>
            <TabsTrigger 
              value="active" 
              className="flex items-center gap-2 py-2 px-4 data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none"
            >
              <TicketIcon className="h-4 w-4" />
              Active
            </TabsTrigger>
            <TabsTrigger 
              value="past" 
              className="flex items-center gap-2 py-2 px-4 data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none"
            >
              <HistoryIcon className="h-4 w-4" />
              Past
            </TabsTrigger>
          </TabsList>
        </div>
      
        <TabsContent value="upcoming">
          {renderEventsList(filteredEvents)}
        </TabsContent>
        <TabsContent value="active">
          {renderEventsList(filteredEvents)}
        </TabsContent>
        <TabsContent value="past">
          {renderEventsList(filteredEvents)}
        </TabsContent>
      </Tabs>
    </div>
  );

  function renderEventsList(events: Conference[]) {
    return events.length > 0 ? (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {events.map((event, index) => (
          <motion.div
            key={event.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.05 }}
          >
            <Card className="border-none shadow-sm hover:shadow-md transition-shadow duration-200">
              <CardContent className="p-6">
                <h2 className="font-bold mb-2 text-xl">
                  {event.title}
                </h2>
                
                <div className="flex items-center text-gray-500 mb-2">
                  <CalendarIcon className="h-4 w-4 mr-2" />
                  <p className="text-sm">
                    {new Date(event.startDate).toLocaleDateString()} - {new Date(event.endDate).toLocaleDateString()}
                  </p>
                </div>
                
                <div className="flex items-center text-gray-500 mb-2">
                  <MapPinIcon className="h-4 w-4 mr-2" />
                  <p className="text-sm">
                    {event.location}
                  </p>
                </div>
                
                <div className="flex items-center text-gray-500 mb-4">
                  <UserIcon className="h-4 w-4 mr-2" />
                  <p className="text-sm">
                    Organized by {event.organizer}
                  </p>
                </div>
                
                {event.registrationId && (
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-md mb-2">
                    <p className="text-sm text-gray-600">
                      Registration ID: {event.registrationId}
                    </p>
                    <Button variant="ghost" size="sm" className="p-1 h-auto">
                      <QrCodeIcon className="h-4 w-4" />
                    </Button>
                  </div>
                )}
                
                {event.registrationDate && (
                  <p className="text-gray-500 text-sm">
                    Registered on {new Date(event.registrationDate).toLocaleDateString()}
                  </p>
                )}
              </CardContent>
              
              <CardFooter className="px-6 py-4 bg-gray-50 flex justify-between">
                <Button 
                  variant="outline"
                  onClick={() => router.push(`/attendee/conferences/${event.id}`)}
                  className="flex items-center"
                >
                  <ExternalLinkIcon className="h-4 w-4 mr-2" />
                  View Details
                </Button>
                
                {event.status === 'past' ? (
                  <Button 
                    variant="outline"
                    onClick={() => router.push(`/attendee/feedback/${event.id}`)}
                  >
                    Provide Feedback
                  </Button>
                ) : event.status === 'active' ? (
                  <Button 
                    onClick={() => router.push(`/attendee/join/${event.id}`)}
                  >
                    Join Now
                  </Button>
                ) : (
                  <Button 
                    variant="outline"
                    onClick={() => router.push(`/attendee/calendar/${event.id}`)}
                  >
                    Add to Calendar
                  </Button>
                )}
              </CardFooter>
            </Card>
          </motion.div>
        ))}
      </div>
    ) : (
      <div className="text-center py-16 px-6 bg-gray-50 rounded-lg">
        <TicketIcon className="h-12 w-12 mx-auto text-gray-400 mb-4" />
        <h2 className="text-xl font-semibold mb-2">
          No {filter} events found
        </h2>
        <p className="text-gray-500 mb-6 max-w-md mx-auto">
          {filter === 'upcoming' 
            ? "You don't have any upcoming events. Register for conferences to see them here."
            : filter === 'active'
              ? "You don't have any active events currently in progress."
              : "You don't have any past events. Once you attend conferences, they'll appear here."}
        </p>
        <Button 
          onClick={() => router.push('/attendee/discover')}
        >
          Discover Conferences
        </Button>
      </div>
    );
  }
}