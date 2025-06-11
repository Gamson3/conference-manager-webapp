import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import {
  UserIcon,
  SearchIcon,
  CheckIcon,
  PlusIcon,
  MessageCircleIcon,
  UserPlusIcon,
  UsersIcon,
  BriefcaseIcon,
  MapPinIcon,
  TagIcon,
} from 'lucide-react';
import { createAuthenticatedApi } from '@/lib/utils';
import { toast } from 'sonner';

interface Attendee {
  id: number;
  name: string;
  title: string;
  organization: string;
  bio: string;
  location: string;
  avatarUrl: string;
  interests: string[];
  isConnected: boolean;
  isPending: boolean;
  conferenceIds: number[];
}

interface Conference {
  id: number;
  name: string;
}

const NetworkingSection = () => {
  const router = useRouter();
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [filteredAttendees, setFilteredAttendees] = useState<Attendee[]>([]);
  const [conferences, setConferences] = useState<Conference[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('all');

  useEffect(() => {
    const fetchNetworkingData = async () => {
      try {
        setLoading(true);
        const api = await createAuthenticatedApi();
        
        // Fetch attendees
        const attendeesResponse = await api.get('/api/attendee/networking');
        setAttendees(attendeesResponse.data.attendees);
        setFilteredAttendees(attendeesResponse.data.attendees);
        
        // Extract conferences
        setConferences(attendeesResponse.data.conferences);
      } catch (error: any) {
        console.error('Error fetching networking data:', error);
        toast.error('Failed to load networking information');
      } finally {
        setLoading(false);
      }
    };

    fetchNetworkingData();
  }, []);

  useEffect(() => {
    // Filter attendees based on search term and active tab
    let filtered = attendees;
    
    if (searchTerm) {
      filtered = filtered.filter((attendee) => 
        attendee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        attendee.organization.toLowerCase().includes(searchTerm.toLowerCase()) ||
        attendee.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        attendee.interests.some(interest => 
          interest.toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
    }
    
    if (activeTab !== 'all') {
      if (activeTab === 'connected') {
        filtered = filtered.filter((attendee) => attendee.isConnected);
      } else if (activeTab === 'pending') {
        filtered = filtered.filter((attendee) => attendee.isPending);
      } else {
        // Filter by conference ID
        const conferenceId = parseInt(activeTab);
        filtered = filtered.filter((attendee) => 
          attendee.conferenceIds.includes(conferenceId)
        );
      }
    }
    
    setFilteredAttendees(filtered);
  }, [searchTerm, activeTab, attendees]);

  const handleConnect = async (attendeeId: number) => {
    try {
      const api = await createAuthenticatedApi();
      await api.post(`/api/attendee/connect`, { attendeeId });
      
      // Update local state
      setAttendees(attendees.map(attendee => 
        attendee.id === attendeeId 
          ? { ...attendee, isPending: true } 
          : attendee
      ));
      
      toast.success('Connection request sent');
    } catch (error) {
      console.error('Error connecting with attendee:', error);
      toast.error('Failed to send connection request');
    }
  };

  const handleMessage = (attendeeId: number) => {
    router.push(`/api/attendee/messages?recipient=${attendeeId}`);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center mb-4">
          <Skeleton className="h-8 w-36" />
          <Skeleton className="h-10 w-64" />
        </div>
        
        <div className="flex gap-2 mb-4">
          <Skeleton className="h-10 w-20" />
          <Skeleton className="h-10 w-20" />
          <Skeleton className="h-10 w-20" />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div>
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-4 w-24 mt-1" />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-3/4" />
                <div className="flex gap-1 mt-3">
                  <Skeleton className="h-6 w-16 rounded-full" />
                  <Skeleton className="h-6 w-16 rounded-full" />
                </div>
              </CardContent>
              <CardFooter>
                <Skeleton className="h-10 w-full" />
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h2 className="text-2xl font-bold">Conference Networking</h2>
        
        <div className="w-full sm:w-auto flex-1 sm:max-w-xs relative">
          <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            className="pl-10"
            placeholder="Search by name, org, or interest..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4 flex-wrap h-auto">
          <TabsTrigger value="all" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            All Attendees
          </TabsTrigger>
          <TabsTrigger value="connected" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            My Connections
          </TabsTrigger>
          <TabsTrigger value="pending" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            Pending
          </TabsTrigger>
          {conferences.map((conference) => (
            <TabsTrigger 
              key={conference.id} 
              value={conference.id.toString()}
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              {conference.name}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={activeTab} className="mt-0">
          {filteredAttendees.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredAttendees.map((attendee) => (
                <Card key={attendee.id} className={attendee.isConnected ? 'border-green-200' : ''}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-12 w-12">
                        <AvatarImage 
                          src={attendee.avatarUrl || '/placeholder-avatar.png'} 
                          alt={attendee.name}
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = '/placeholder-avatar.png';
                          }}
                        />
                        <AvatarFallback>{attendee.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="font-semibold flex items-center gap-2">
                          {attendee.name}
                          {attendee.isConnected && (
                            <CheckIcon className="h-4 w-4 text-green-500" />
                          )}
                        </h3>
                        <p className="text-sm text-gray-500 flex items-center gap-1">
                          <BriefcaseIcon className="h-3 w-3" />
                          {attendee.title} {attendee.organization ? `at ${attendee.organization}` : ''}
                        </p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {attendee.bio && (
                      <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                        {attendee.bio}
                      </p>
                    )}
                    
                    {attendee.location && (
                      <p className="text-xs text-gray-500 flex items-center gap-1 mb-2">
                        <MapPinIcon className="h-3 w-3" />
                        {attendee.location}
                      </p>
                    )}
                    
                    {attendee.interests && attendee.interests.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        <TagIcon className="h-3 w-3 text-gray-400 mr-1" />
                        {attendee.interests.slice(0, 3).map((interest, index) => (
                          <Badge key={index} variant="secondary" className="text-xs bg-gray-100">
                            {interest}
                          </Badge>
                        ))}
                        {attendee.interests.length > 3 && (
                          <Badge variant="secondary" className="text-xs bg-gray-100">
                            +{attendee.interests.length - 3}
                          </Badge>
                        )}
                      </div>
                    )}
                  </CardContent>
                  <CardFooter className="flex gap-2">
                    {attendee.isConnected ? (
                      <Button 
                        variant="outline" 
                        className="w-full"
                        onClick={() => handleMessage(attendee.id)}
                      >
                        <MessageCircleIcon className="h-4 w-4 mr-2" />
                        Message
                      </Button>
                    ) : attendee.isPending ? (
                      <Button disabled className="w-full" variant="outline">
                        <UserIcon className="h-4 w-4 mr-2" />
                        Request Pending
                      </Button>
                    ) : (
                      <Button 
                        variant="default" 
                        className="w-full"
                        onClick={() => handleConnect(attendee.id)}
                      >
                        <UserPlusIcon className="h-4 w-4 mr-2" />
                        Connect
                      </Button>
                    )}
                  </CardFooter>
                </Card>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <UsersIcon className="h-12 w-12 text-gray-300 mb-4" />
              <h3 className="text-lg font-medium mb-2">No Attendees Found</h3>
              <p className="text-gray-500 max-w-md">
                {searchTerm
                  ? "No attendees match your search criteria. Try a different search term."
                  : "There are no attendees available for this selection yet."}
              </p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default NetworkingSection;