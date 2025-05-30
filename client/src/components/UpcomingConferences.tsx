"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { SearchIcon, MapPinIcon, CalendarIcon, ClockIcon } from 'lucide-react';
import { toast } from 'sonner';
import { createAuthenticatedApi } from '@/lib/utils';
import { motion } from 'framer-motion';

interface Conference {
  id: number;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  location: string;
  topics?: string[];
  organizer: string;
}

export default function UpcomingConferences() {
  const router = useRouter();
  const [conferences, setConferences] = useState<Conference[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [registering, setRegistering] = useState<number | null>(null);

  useEffect(() => {
    const fetchConferences = async () => {
      try {
        setIsLoading(true);
        const api = await createAuthenticatedApi();
        const response = await api.get('/conferences/upcoming');
        setConferences(response.data);
      } catch (error: any) {
        console.error('Error fetching upcoming conferences:', error);
        setError(error.response?.data?.message || 'Failed to load conferences');
        toast.error("Couldn't load upcoming conferences");
      } finally {
        setIsLoading(false);
      }
    };

    fetchConferences();
  }, []);

  const handleRegister = async (conferenceId: number) => {
    try {
      setRegistering(conferenceId);
      const api = await createAuthenticatedApi();
      
      await api.post('/attendee/register-conference', { conferenceId });
      
      toast.success("Successfully registered for the conference!");
      
      // Update UI or navigate
      router.push('/attendee/conferences/registered');
    } catch (error: any) {
      console.error('Error registering for conference:', error);
      toast.error(error.response?.data?.message || "Registration failed. Please try again.");
    } finally {
      setRegistering(null);
    }
  };

  const filteredConferences = conferences.filter((conference) => 
    conference.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    conference.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
    conference.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) {
    return (
      <div>
        <div className="flex justify-between mb-6">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-10 w-64" />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-72 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-10">
        <h2 className="text-xl font-semibold text-red-600 mb-4">
          {error}
        </h2>
        <Button onClick={() => router.refresh()}>
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <h1 className="text-2xl font-semibold">
          Discover Conferences
        </h1>
        
        <div className="relative w-full sm:w-auto max-w-sm">
          <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            type="text"
            placeholder="Search conferences..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {filteredConferences.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredConferences.map((conference, index) => (
            <motion.div
              key={conference.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
            >
              <Card className="h-full flex flex-col hover:shadow-md transition-shadow">
                <CardContent className="flex-grow p-6">
                  <h2 className="font-semibold text-xl mb-2 line-clamp-2">
                    {conference.title}
                  </h2>
                  
                  <div className="flex items-center text-gray-500 mb-1">
                    <CalendarIcon className="h-4 w-4 mr-2" />
                    <p className="text-sm">
                      {new Date(conference.startDate).toLocaleDateString()} - {new Date(conference.endDate).toLocaleDateString()}
                    </p>
                  </div>
                  
                  <div className="flex items-center text-gray-500 mb-3">
                    <MapPinIcon className="h-4 w-4 mr-2" />
                    <p className="text-sm">
                      {conference.location}
                    </p>
                  </div>
                  
                  <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                    {conference.description}
                  </p>
                  
                  <div className="flex flex-wrap gap-1 mt-auto">
                    {conference.topics?.slice(0, 3).map((topic, i) => (
                      <Badge key={i} variant="outline" className="text-xs">
                        {topic}
                      </Badge>
                    ))}
                    {conference.topics && conference.topics.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{conference.topics.length - 3} more
                      </Badge>
                    )}
                  </div>
                </CardContent>
                
                <CardFooter className="px-6 py-4 bg-gray-50 flex justify-between">
                  <Button 
                    variant="outline"
                    onClick={() => router.push(`/attendee/conferences/${conference.id}`)}
                  >
                    View Details
                  </Button>
                  
                  <Button
                    onClick={() => handleRegister(conference.id)}
                    disabled={registering === conference.id}
                  >
                    {registering === conference.id ? 'Registering...' : 'Register'}
                  </Button>
                </CardFooter>
              </Card>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="text-center py-10 bg-gray-50 rounded-lg">
          <h2 className="text-xl font-semibold mb-2">
            No conferences match your search
          </h2>
          <p className="text-gray-500 mb-4">
            Try adjusting your search terms or check back later
          </p>
          {searchTerm && (
            <Button variant="outline" onClick={() => setSearchTerm('')}>
              Clear Search
            </Button>
          )}
        </div>
      )}
    </div>
  );
}