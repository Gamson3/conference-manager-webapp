"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardFooter } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { 
  CalendarIcon, 
  BellIcon, 
  UserIcon, 
  BookOpenIcon,
  MessageSquareIcon,
  ClipboardCheckIcon,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { createAuthenticatedApi } from '@/lib/utils';
import { toast } from 'sonner';

// Import attendee components
import UpcomingConferences from '@/components/UpcomingConferences';
import RegisteredConferences from '@/components/RegisteredConferences';
import FeedbackForm from '@/components/FeedbackForm';
import ConferenceMaterials from '@/components/ConferenceMaterials';
import NetworkingSection from '@/components/NetworkingSection';

export default function AttendeeDashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('upcoming');
  const [user, setUser] = useState<any>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setIsLoading(true);
        const api = await createAuthenticatedApi();
        
        // Fetch user profile
        const userResponse = await api.get('/attendee/profile');
        setUser(userResponse.data);
        
        // Fetch notifications
        const notificationsResponse = await api.get('/attendee/notifications');
        setNotifications(notificationsResponse.data);
        
      } catch (error: any) {
        console.error('Error fetching attendee data:', error);
        setError(error.response?.data?.message || 'Failed to load your profile');
        toast.error("Couldn't load your profile information");
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserData();
  }, []);

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        {/* Loading skeleton for dashboard */}
        <div className="flex items-center justify-between mb-8 bg-gray-100 p-6 rounded-lg">
          <div className="flex items-center">
            <Skeleton className="h-16 w-16 rounded-full" />
            <div className="ml-4">
              <Skeleton className="h-7 w-40 mb-2" />
              <Skeleton className="h-5 w-24" />
            </div>
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-10 w-36" />
            <Skeleton className="h-10 w-10 rounded-full" />
          </div>
        </div>
        
        <Skeleton className="h-12 w-3/4 mb-8" />
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-60 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto p-6 flex flex-col items-center justify-center h-64">
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
    <div className="max-w-7xl mx-auto p-6">
      {/* Dashboard Header */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="bg-gradient-to-r from-primary-50 to-primary-100 rounded-lg p-6 mb-8 shadow-sm">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
            <div className="flex items-center mb-4 md:mb-0">
              <Avatar className="h-16 w-16 mr-4">
                <AvatarImage 
                  src={user?.avatarUrl || '/placeholder-avatar.png'} 
                  alt={user?.name}
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/placeholder-avatar.png';
                  }}
                />
                <AvatarFallback>{user?.name?.charAt(0) || 'A'}</AvatarFallback>
              </Avatar>
              <div>
                <h2 className="text-2xl font-bold tracking-tight">
                  Welcome, {user?.name || 'Attendee'}
                </h2>
                <p className="text-gray-600">
                  {user?.registeredConferences?.length || 0} Registered {user?.registeredConferences?.length === 1 ? 'Conference' : 'Conferences'}
                </p>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                onClick={() => router.push('/attendee/discover')}
                className="flex items-center gap-2"
              >
                <CalendarIcon className="h-4 w-4" />
                Find Conferences
              </Button>
              
              <Button
                variant="outline"
                onClick={() => router.push('/attendee/notifications')}
                className="relative"
              >
                <BellIcon className="h-4 w-4" />
                {notifications.length > 0 && (
                  <Badge className="absolute -top-2 -right-2 flex items-center justify-center h-5 w-5">
                    {notifications.length}
                  </Badge>
                )}
              </Button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Dashboard Stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="mb-8"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-white border-none shadow-sm">
            <CardContent className="p-4">
              <div className="flex justify-between items-center">
                <h3 className="text-base font-medium">
                  Upcoming Events
                </h3>
                <div className="p-2 bg-blue-50 text-blue-500 rounded-full">
                  <CalendarIcon className="h-5 w-5" />
                </div>
              </div>
              <p className="text-3xl font-bold mt-2">
                {user?.upcomingConferences || 0}
              </p>
            </CardContent>
          </Card>
          
          <Card className="bg-white border-none shadow-sm">
            <CardContent className="p-4">
              <div className="flex justify-between items-center">
                <h3 className="text-base font-medium">
                  Materials
                </h3>
                <div className="p-2 bg-emerald-50 text-emerald-500 rounded-full">
                  <BookOpenIcon className="h-5 w-5" />
                </div>
              </div>
              <p className="text-3xl font-bold mt-2">
                {user?.unreadMaterials || 0}
              </p>
            </CardContent>
          </Card>
          
          <Card className="bg-white border-none shadow-sm">
            <CardContent className="p-4">
              <div className="flex justify-between items-center">
                <h3 className="text-base font-medium">
                  Connections
                </h3>
                <div className="p-2 bg-violet-50 text-violet-500 rounded-full">
                  <UserIcon className="h-5 w-5" />
                </div>
              </div>
              <p className="text-3xl font-bold mt-2">
                {user?.connections || 0}
              </p>
            </CardContent>
          </Card>
          
          <Card className="bg-white border-none shadow-sm">
            <CardContent className="p-4">
              <div className="flex justify-between items-center">
                <h3 className="text-base font-medium">
                  Pending Feedback
                </h3>
                <div className="p-2 bg-amber-50 text-amber-500 rounded-full">
                  <MessageSquareIcon className="h-5 w-5" />
                </div>
              </div>
              <p className="text-3xl font-bold mt-2">
                {user?.pendingFeedback || 0}
              </p>
            </CardContent>
          </Card>
        </div>
      </motion.div>

      {/* Tab Navigation */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
      >
        <div className="mb-2">
          <Tabs
            defaultValue={activeTab}
            onValueChange={setActiveTab}
            className="w-full"
          >
            <div className="border-b">
              <TabsList className="w-full h-auto bg-transparent justify-start">
                <TabsTrigger value="upcoming" className="flex items-center gap-2 py-2 px-4 data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none">
                  <CalendarIcon className="h-4 w-4" />
                  Upcoming Conferences
                </TabsTrigger>
                <TabsTrigger value="registered" className="flex items-center gap-2 py-2 px-4 data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none">
                  <ClipboardCheckIcon className="h-4 w-4" />
                  My Conferences
                </TabsTrigger>
                <TabsTrigger value="feedback" className="flex items-center gap-2 py-2 px-4 data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none">
                  <MessageSquareIcon className="h-4 w-4" />
                  Provide Feedback
                </TabsTrigger>
                <TabsTrigger value="materials" className="flex items-center gap-2 py-2 px-4 data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none">
                  <BookOpenIcon className="h-4 w-4" />
                  Materials
                </TabsTrigger>
                <TabsTrigger value="networking" className="flex items-center gap-2 py-2 px-4 data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none">
                  <UserIcon className="h-4 w-4" />
                  Networking
                </TabsTrigger>
              </TabsList>
            </div>

            {/* Tab Content */}
            <div className="py-4">
              <TabsContent value="upcoming">
                <UpcomingConferences />
              </TabsContent>
              <TabsContent value="registered">
                <RegisteredConferences />
              </TabsContent>
              <TabsContent value="feedback">
                <FeedbackForm />
              </TabsContent>
              <TabsContent value="materials">
                <ConferenceMaterials />
              </TabsContent>
              <TabsContent value="networking">
                <NetworkingSection />
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </motion.div>
    </div>
  );
}