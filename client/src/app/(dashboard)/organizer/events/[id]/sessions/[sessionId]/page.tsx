"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { 
  Calendar, Clock, MapPin, Users, ArrowLeft, Edit, ChevronRight,
  FileText, UserPlus, BarChart, ChevronLeft, Bookmark, Star 
} from "lucide-react";
import { createAuthenticatedApi } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";
import { toast } from "sonner";

export default function SessionDetailPage() {
  const { id, sessionId } = useParams();
  const router = useRouter();
  const [event, setEvent] = useState<any>(null);
  const [session, setSession] = useState<any>(null);
  const [presentations, setPresentations] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<any>({ stats: {}, attendance: [] });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("presentations");
  
  // Fetch session details and related data
  useEffect(() => {
    if (!id || !sessionId) return;
    
    const fetchData = async () => {
      setLoading(true);
      try {
        const api = await createAuthenticatedApi();
        
        // Get event details
        const eventResponse = await api.get(`/events/${id}`);
        setEvent(eventResponse.data);
        
        // Get session details
        const sessionResponse = await api.get(`/sections/${sessionId}`);
        setSession(sessionResponse.data);
        
        // Load initial tab data
        await loadPresentations();
        
      } catch (error) {
        console.error("Error fetching data:", error);
        toast.error("Failed to load session details");
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [id, sessionId]);
  
  const loadPresentations = async () => {
    try {
      const api = await createAuthenticatedApi();
      const response = await api.get(`/sections/${sessionId}/presentations`);
      setPresentations(response.data);
    } catch (error) {
      console.error("Error fetching presentations:", error);
      toast.error("Failed to load presentations");
    }
  };
  
  const loadAttendance = async () => {
    try {
      const api = await createAuthenticatedApi();
      const response = await api.get(`/sections/${sessionId}/attendance`);
      setAttendance(response.data);
    } catch (error) {
      console.error("Error fetching attendance:", error);
      toast.error("Failed to load attendance data");
    }
  };
  
  const handleTabChange = async (value: string) => {
    setActiveTab(value);
    
    if (value === "attendance" && attendance.attendance.length === 0) {
      await loadAttendance();
    }
  };
  
  const formatDateTime = (dateTimeStr: string) => {
    if (!dateTimeStr) return "TBD";
    const date = new Date(dateTimeStr);
    return format(date, "MMM d, yyyy h:mm a");
  };
  
  if (loading) {
    return (
      <div className="p-8 max-w-6xl mx-auto space-y-6">
        <div className="flex items-center mb-6">
          <Skeleton className="h-8 w-40 mr-2" />
          <Skeleton className="h-8 w-5" />
          <Skeleton className="h-8 w-40 ml-2" />
        </div>
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-40" />
        <Skeleton className="h-60" />
      </div>
    );
  }
  
  if (!session) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center p-8">
        <div className="bg-red-50 text-red-500 p-4 rounded-lg mb-4">
          <h2 className="text-xl font-bold mb-2">Session Not Found</h2>
          <p className="text-sm opacity-80 mb-4">The session you're looking for could not be found or you don't have permission to view it.</p>
        </div>
        <Button onClick={() => router.push(`/organizer/events/${id}/sessions`)} variant="outline" className="group">
          <ArrowLeft className="mr-2 h-4 w-4 group-hover:translate-x-[-2px] transition-transform" />
          Back to Sessions
        </Button>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      {/* Breadcrumb Navigation */}
      <div className="flex flex-wrap items-center mb-6">
        <Button 
          variant="ghost" 
          className="p-0 h-8 hover:bg-transparent hover:text-primary" 
          onClick={() => router.push("/organizer/events")}
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          <span className="text-sm font-medium">Events</span>
        </Button>
        <span className="text-gray-400 mx-2">/</span>
        <Button 
          variant="ghost" 
          className="p-0 h-8 hover:bg-transparent hover:text-primary" 
          onClick={() => router.push(`/organizer/events/${id}`)}
        >
          <span className="text-sm font-medium truncate max-w-[150px]">
            {event?.name || "Event"}
          </span>
        </Button>
        <span className="text-gray-400 mx-2">/</span>
        <Button 
          variant="ghost" 
          className="p-0 h-8 hover:bg-transparent hover:text-primary" 
          onClick={() => router.push(`/organizer/events/${id}/sessions`)}
        >
          <span className="text-sm font-medium">Sessions</span>
        </Button>
        <span className="text-gray-400 mx-2">/</span>
        <span className="text-sm font-medium truncate max-w-[150px]">{session.name}</span>
      </div>
      
      {/* Header with Edit Button */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{session.name}</h1>
          {session.type && (
            <Badge 
              variant="outline" 
              className="mt-2 capitalize bg-primary-50 text-primary-700 border-primary-200"
            >
              {session.type}
            </Badge>
          )}
        </div>
        <Button 
          onClick={() => router.push(`/organizer/events/${id}/sessions?edit=${sessionId}`)}
          className="bg-primary-700 text-white hover:bg-primary-800"
        >
          <Edit className="h-4 w-4 mr-2" />
          Edit Session
        </Button>
      </div>
      
      {/* Session Details Card */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          {session.description && (
            <p className="text-gray-700 mb-4">{session.description}</p>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              {session.startTime && (
                <div className="flex items-center">
                  <Calendar className="h-5 w-5 mr-3 text-gray-500" />
                  <div>
                    <div className="font-medium">Start Time</div>
                    <div className="text-gray-600">{formatDateTime(session.startTime)}</div>
                  </div>
                </div>
              )}
              {session.endTime && (
                <div className="flex items-center">
                  <Clock className="h-5 w-5 mr-3 text-gray-500" />
                  <div>
                    <div className="font-medium">End Time</div>
                    <div className="text-gray-600">{formatDateTime(session.endTime)}</div>
                  </div>
                </div>
              )}
            </div>
            <div className="space-y-3">
              {session.room && (
                <div className="flex items-center">
                  <MapPin className="h-5 w-5 mr-3 text-gray-500" />
                  <div>
                    <div className="font-medium">Room</div>
                    <div className="text-gray-600">{session.room}</div>
                  </div>
                </div>
              )}
              {session.capacity && (
                <div className="flex items-center">
                  <Users className="h-5 w-5 mr-3 text-gray-500" />
                  <div>
                    <div className="font-medium">Capacity</div>
                    <div className="text-gray-600">{session.capacity} attendees</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Tabs for Presentations and Attendance */}
      <Tabs 
        defaultValue="presentations" 
        value={activeTab}
        onValueChange={handleTabChange}
      >
        <TabsList className="mb-6">
          <TabsTrigger value="presentations">
            Presentations ({session._count?.presentations || 0})
          </TabsTrigger>
          <TabsTrigger value="attendance">
            Attendance
          </TabsTrigger>
        </TabsList>
        
        {/* Presentations Tab */}
        <TabsContent value="presentations" className="mt-0">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Presentations</h2>
            <Button 
              onClick={() => router.push(`/organizer/events/${id}/sessions/${sessionId}/presentations/new`)}
              className="bg-primary-700 text-white hover:bg-primary-800"
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Add Presentation
            </Button>
          </div>
          
          {presentations.length === 0 ? (
            <Card className="border-dashed border-2 bg-gray-50">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <div className="rounded-full bg-primary-50 p-3 mb-4">
                  <FileText className="h-6 w-6 text-primary-700" />
                </div>
                <h3 className="font-semibold text-lg mb-2">No Presentations Yet</h3>
                <p className="text-gray-500 text-center max-w-md mb-6">
                  Add presentations to this session to manage speakers and content.
                </p>
                <Button 
                  onClick={() => router.push(`/organizer/events/${id}/sessions/${sessionId}/presentations/new`)}
                  className="bg-primary-700 text-white hover:bg-primary-800"
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add Your First Presentation
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {presentations.map((presentation) => (
                <Card key={presentation.id} className="hover:shadow-sm transition-shadow">
                  <CardContent className="p-5">
                    <div className="flex justify-between">
                      <div>
                        <h3 className="font-medium text-lg mb-1">{presentation.title}</h3>
                        {presentation.status && (
                          <Badge 
                            variant="outline" 
                            className={`capitalize ${
                              presentation.status === 'submitted' 
                                ? 'bg-green-50 text-green-700 border-green-200'
                                : 'bg-blue-50 text-blue-700 border-blue-200'
                            }`}
                          >
                            {presentation.status}
                          </Badge>
                        )}
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => router.push(`/organizer/events/${id}/sessions/${sessionId}/presentations/${presentation.id}`)}
                      >
                        View
                      </Button>
                    </div>
                    
                    {presentation.abstract && (
                      <p className="text-gray-600 text-sm mt-2 line-clamp-2">
                        {presentation.abstract}
                      </p>
                    )}
                    
                    <div className="mt-3 pt-3 border-t">
                      <div className="text-sm text-gray-600 flex justify-between">
                        <div>
                          <span className="font-medium">Authors: </span>
                          {presentation.authorAssignments && presentation.authorAssignments.length > 0 ? (
                            presentation.authorAssignments
                              .map((assignment: any) => 
                                assignment.internalAuthor?.name || assignment.externalEmail
                              )
                              .join(', ')
                          ) : (
                            <span className="italic">No authors assigned</span>
                          )}
                        </div>
                        <div>
                          <span>{presentation._count?.materials || 0} materials</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
        
        {/* Attendance Tab */}
        <TabsContent value="attendance" className="mt-0">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Attendance</h2>
            <Button 
              onClick={() => router.push(`/organizer/events/${id}/sessions/${sessionId}/check-in`)}
              className="bg-primary-700 text-white hover:bg-primary-800"
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Check In Attendees
            </Button>
          </div>
          
          {/* Attendance Stats Card */}
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-gray-50 p-4 rounded-lg text-center">
                  <div className="text-3xl font-bold text-primary-700">
                    {attendance.stats.total || 0}
                  </div>
                  <div className="text-gray-600 mt-1">Total Registered</div>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg text-center">
                  <div className="text-3xl font-bold text-green-600">
                    {attendance.stats.checkedIn || 0}
                  </div>
                  <div className="text-gray-600 mt-1">Checked In</div>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg text-center">
                  <div className="text-3xl font-bold text-blue-600">
                    {attendance.stats.checkedInPercentage || 0}%
                  </div>
                  <div className="text-gray-600 mt-1">Attendance Rate</div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Attendee List */}
          {attendance.attendance.length === 0 ? (
            <Card className="border-dashed border-2 bg-gray-50">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <div className="rounded-full bg-primary-50 p-3 mb-4">
                  <Users className="h-6 w-6 text-primary-700" />
                </div>
                <h3 className="font-semibold text-lg mb-2">No Attendance Data Yet</h3>
                <p className="text-gray-500 text-center max-w-md mb-6">
                  No attendees have registered for this session yet, or check-in hasn't started.
                </p>
                <Button 
                  onClick={() => router.push(`/organizer/events/${id}/sessions/${sessionId}/check-in`)}
                  className="bg-primary-700 text-white hover:bg-primary-800"
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  Check In Attendees
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white rounded-lg overflow-hidden">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Attendee
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Check-in Time
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {attendance.attendance.map((item: any) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-medium">{item.user.name}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                        {item.user.email}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {item.checkedIn ? (
                          <Badge className="bg-green-100 text-green-800 border-green-200">
                            Checked In
                          </Badge>
                        ) : (
                          <Badge className="bg-gray-100 text-gray-800 border-gray-200">
                            Registered
                          </Badge>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                        {item.checkinTime ? formatDateTime(item.checkinTime) : "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}