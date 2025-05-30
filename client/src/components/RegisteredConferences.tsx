"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { 
  CalendarIcon, 
  MapPinIcon, 
  UserIcon, 
  ExternalLinkIcon, 
  QrCodeIcon,
  AlertTriangleIcon
} from 'lucide-react';
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

interface Registration {
  id: number;
  registrationId: string;
  registrationDate: string;
  qrCode?: string;
  status: string;
  conference: Conference;
}

export default function RegisteredConferences() {
  const router = useRouter();
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState('upcoming');
  const [showQRCode, setShowQRCode] = useState<string | null>(null);
  const [cancelConfirm, setCancelConfirm] = useState<number | null>(null);
  const [isCanceling, setIsCanceling] = useState(false);

  useEffect(() => {
    const fetchRegistrations = async () => {
      try {
        setIsLoading(true);
        const api = await createAuthenticatedApi();
        const response = await api.get('/attendee/registered-conferences');
        setRegistrations(response.data);
      } catch (error: any) {
        console.error('Error fetching registered conferences:', error);
        setError(error.response?.data?.message || 'Failed to load your registrations');
        toast.error("Couldn't load your conference registrations");
      } finally {
        setIsLoading(false);
      }
    };

    fetchRegistrations();
  }, []);

  const handleCancelRegistration = async () => {
    if (!cancelConfirm) return;
    
    try {
      setIsCanceling(true);
      const api = await createAuthenticatedApi();
      await api.delete(`/attendee/cancel-registration/${cancelConfirm}`);
      
      // Update the UI
      setRegistrations(registrations.filter(reg => reg.id !== cancelConfirm));
      toast.success("Registration cancelled successfully");
      setCancelConfirm(null);
    } catch (error: any) {
      console.error('Error canceling registration:', error);
      toast.error(error.response?.data?.message || "Failed to cancel registration");
    } finally {
      setIsCanceling(false);
    }
  };

  if (isLoading) {
    return (
      <div>
        <div className="mb-6">
          <Skeleton className="h-10 w-64 mb-4" />
          <Skeleton className="h-10 w-full" />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-64 rounded-lg" />
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

  const today = new Date();
  
  const filteredRegistrations = registrations.filter(reg => {
    const endDate = new Date(reg.conference.endDate);
    if (filter === 'upcoming') {
      return endDate >= today;
    } else if (filter === 'past') {
      return endDate < today;
    }
    return true;
  });

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold mb-4">
          My Registered Conferences
        </h1>
        
        <Tabs 
          defaultValue={filter} 
          onValueChange={setFilter}
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="upcoming" className="relative">
              Upcoming
              {registrations.filter(reg => new Date(reg.conference.endDate) >= today).length > 0 && (
                <span className="absolute top-1 right-1">
                  <Badge variant="secondary" className="h-5 min-w-5 text-[10px] px-1">
                    {registrations.filter(reg => new Date(reg.conference.endDate) >= today).length}
                  </Badge>
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="past">
              Past
            </TabsTrigger>
            <TabsTrigger value="all">
              All
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value={filter}>
            {filteredRegistrations.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                {filteredRegistrations.map((registration, index) => {
                  const conference = registration.conference;
                  const isUpcoming = new Date(conference.endDate) >= today;
                  
                  return (
                    <motion.div
                      key={registration.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.1 }}
                    >
                      <Card>
                        <CardContent className="p-6">
                          <div className="flex justify-between items-start mb-3">
                            <h2 className="font-semibold text-lg line-clamp-1">
                              {conference.title}
                            </h2>
                            <Badge 
                              variant={isUpcoming ? "secondary" : "outline"} 
                              className={isUpcoming ? "bg-green-100 text-green-800 hover:bg-green-200" : ""}
                            >
                              {isUpcoming ? 'Upcoming' : 'Past'}
                            </Badge>
                          </div>
                          
                          <div className="space-y-2 mb-4">
                            <div className="flex items-center text-gray-500">
                              <CalendarIcon className="h-4 w-4 mr-2" />
                              <span className="text-sm">
                                {new Date(conference.startDate).toLocaleDateString()} - {new Date(conference.endDate).toLocaleDateString()}
                              </span>
                            </div>
                            
                            <div className="flex items-center text-gray-500">
                              <MapPinIcon className="h-4 w-4 mr-2" />
                              <span className="text-sm">
                                {conference.location}
                              </span>
                            </div>
                            
                            <div className="flex items-center text-gray-500">
                              <UserIcon className="h-4 w-4 mr-2" />
                              <span className="text-sm">
                                Organized by {conference.organizer}
                              </span>
                            </div>
                          </div>
                          
                          <Separator className="my-4" />
                          
                          <div className="flex justify-between items-center">
                            <div>
                              <p className="text-sm text-gray-500 mb-1">
                                Registration ID
                              </p>
                              <p className="font-medium">
                                {registration.registrationId}
                              </p>
                            </div>
                            
                            <Button 
                              variant="outline" 
                              size="icon"
                              onClick={() => setShowQRCode(registration.registrationId)}
                              aria-label="Show QR code"
                            >
                              <QrCodeIcon className="h-4 w-4" />
                            </Button>
                          </div>
                        </CardContent>
                        
                        <CardFooter className="px-6 py-4 bg-gray-50 flex flex-wrap gap-2">
                          <Button 
                            variant="outline"
                            onClick={() => router.push(`/attendee/conferences/${conference.id}`)}
                            className="flex items-center"
                          >
                            <ExternalLinkIcon className="h-4 w-4 mr-2" />
                            View Details
                          </Button>
                          
                          {isUpcoming ? (
                            <Button 
                              variant="outline"
                              onClick={() => setCancelConfirm(registration.id)}
                              className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            >
                              Cancel Registration
                            </Button>
                          ) : (
                            <Button 
                              variant="outline"
                              onClick={() => router.push(`/attendee/feedback/${conference.id}`)}
                            >
                              Provide Feedback
                            </Button>
                          )}
                        </CardFooter>
                      </Card>
                    </motion.div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12 px-6 bg-gray-50 rounded-lg mt-4">
                <UserIcon className="h-10 w-10 mx-auto text-gray-400 mb-4" />
                <h2 className="text-lg font-semibold mb-2">
                  No registered conferences
                </h2>
                <p className="text-gray-500 mb-6 max-w-md mx-auto">
                  {filter === 'upcoming' 
                    ? "You haven't registered for any upcoming conferences." 
                    : filter === 'past' 
                      ? "You don't have any past conference registrations." 
                      : "You haven't registered for any conferences yet."}
                </p>
                <Button 
                  onClick={() => router.push('/attendee/discover')}
                >
                  Discover Conferences
                </Button>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* QR Code Dialog */}
      <Dialog open={!!showQRCode} onOpenChange={() => setShowQRCode(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Your Registration QR Code</DialogTitle>
            <DialogDescription>
              Present this QR code at the event for check-in
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex flex-col items-center justify-center py-4">
            {/* This would be your actual QR code component */}
            <div className="bg-white p-4 border rounded-md">
              <img 
                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${showQRCode}`} 
                alt="Registration QR Code"
                className="w-48 h-48"
              />
            </div>
            
            <p className="text-center mt-4 text-sm text-gray-500">
              Registration ID: {showQRCode}
            </p>
          </div>
          
          <DialogFooter>
            <Button onClick={() => setShowQRCode(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Confirmation Dialog */}
      <Dialog open={!!cancelConfirm} onOpenChange={() => setCancelConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangleIcon className="h-5 w-5 text-destructive" />
              Cancel Registration
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel your registration? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          
          <DialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
            <Button 
              variant="outline" 
              onClick={() => setCancelConfirm(null)}
              disabled={isCanceling}
            >
              Keep Registration
            </Button>
            <Button 
              variant="destructive"
              onClick={handleCancelRegistration}
              disabled={isCanceling}
            >
              {isCanceling ? 'Cancelling...' : 'Yes, Cancel Registration'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}