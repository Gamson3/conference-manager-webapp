"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/app/(auth)/authContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "next/navigation";
import { PlusCircle, Upload, Clock, Check, AlertTriangle, CalendarDays, FilePlus } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchAuthSession } from "aws-amplify/auth";
import axios from "axios";

// Define presentation type for typescript
interface Presentation {
  id: number;
  title: string;
  abstract: string;
  status: string;
  conferenceName: string;
  conferenceId: number;
  startTime?: string;
  endTime?: string;
  section?: string;
}

export default function PresenterDashboard() {
  const { user } = useAuth();
  const router = useRouter();
  const [presentations, setPresentations] = useState<Presentation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("upcoming");

  useEffect(() => {
    const fetchPresentations = async () => {
      try {
        setIsLoading(true);
        const session = await fetchAuthSession();
        
        if (!session.tokens?.idToken) {
          console.error("No auth token available");
          return;
        }
        
        const response = await axios.get(
          `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/presenter/presentations`, 
          {
            headers: {
              Authorization: `Bearer ${session.tokens.idToken.toString()}`
            }
          }
        );
        
        setPresentations(response.data.presentations || []);
      } catch (error) {
        console.error("Error fetching presentations:", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchPresentations();
  }, []);

  // Helper function to get status badge
  const getStatusBadge = (status: string) => {
    switch(status.toLowerCase()) {
      case 'draft':
        return <Badge variant="outline" className="bg-gray-100 text-gray-800">Draft</Badge>;
      case 'submitted':
        return <Badge variant="outline" className="bg-blue-100 text-blue-800">Submitted</Badge>;
      case 'approved':
        return <Badge variant="outline" className="bg-green-100 text-green-800">Approved</Badge>;
      case 'scheduled':
        return <Badge variant="outline" className="bg-purple-100 text-purple-800">Scheduled</Badge>;
      case 'rejected':
        return <Badge variant="outline" className="bg-red-100 text-red-800">Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Filter presentations based on active tab
  const filteredPresentations = presentations.filter(presentation => {
    if (activeTab === "upcoming") {
      return presentation.startTime && new Date(presentation.startTime) > new Date();
    } else if (activeTab === "all") {
      return true;
    } else {
      return presentation.status.toLowerCase() === activeTab;
    }
  });

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <Skeleton className="h-10 w-64" />
            <Skeleton className="h-4 w-48 mt-2" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-10 w-36" />
            <Skeleton className="h-10 w-36" />
          </div>
        </div>
        
        <Skeleton className="h-12 w-full mb-6" />
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <Skeleton key={i} className="h-64 w-full rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold">Presenter Dashboard</h1>
          <p className="text-muted-foreground">Manage your conference presentations</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => router.push("/presenter/submit")}
            className="flex items-center gap-2"
          >
            <FilePlus className="h-4 w-4" />
            New Submission
          </Button>
          <Button 
            variant="default" 
            onClick={() => router.push("/presenter/materials")}
            className="flex items-center gap-2"
          >
            <Upload className="h-4 w-4" />
            Upload Materials
          </Button>
        </div>
      </div>

      <Tabs defaultValue="upcoming" className="mb-8" onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-5 mb-4">
          <TabsTrigger value="upcoming" className="flex items-center gap-1">
            <CalendarDays className="h-4 w-4" />
            Upcoming
          </TabsTrigger>
          <TabsTrigger value="draft" className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            Drafts
          </TabsTrigger>
          <TabsTrigger value="submitted" className="flex items-center gap-1">
            <AlertTriangle className="h-4 w-4" />
            Pending
          </TabsTrigger>
          <TabsTrigger value="scheduled" className="flex items-center gap-1">
            <Check className="h-4 w-4" />
            Approved
          </TabsTrigger>
          <TabsTrigger value="all">All Presentations</TabsTrigger>
        </TabsList>
        
        <TabsContent value={activeTab}>
          {filteredPresentations.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-10">
                <div className="rounded-full bg-gray-100 p-3 mb-4">
                  {activeTab === "upcoming" ? (
                    <CalendarDays className="h-6 w-6 text-muted-foreground" />
                  ) : activeTab === "draft" ? (
                    <Clock className="h-6 w-6 text-muted-foreground" />
                  ) : (
                    <AlertTriangle className="h-6 w-6 text-muted-foreground" />
                  )}
                </div>
                <h3 className="text-lg font-medium">No presentations found</h3>
                <p className="text-muted-foreground text-center max-w-md mt-2">
                  {activeTab === "upcoming" 
                    ? "You don't have any upcoming presentations scheduled."
                    : activeTab === "draft" 
                    ? "You don't have any draft presentations. Create one to get started."
                    : `You don't have any presentations with status "${activeTab}".`
                  }
                </p>
                {activeTab === "draft" && (
                  <Button 
                    className="mt-4" 
                    onClick={() => router.push('/presenter/submit')}
                  >
                    Create New Submission
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredPresentations.map(presentation => (
                <Card key={presentation.id} className="overflow-hidden">
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-lg font-semibold line-clamp-2">
                        {presentation.title}
                      </CardTitle>
                      {getStatusBadge(presentation.status)}
                    </div>
                    <CardDescription>
                      {presentation.conferenceName}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground line-clamp-3 mb-4">
                      {presentation.abstract || "No abstract provided"}
                    </p>
                    
                    {presentation.startTime && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                        <CalendarDays className="h-4 w-4" />
                        <span>
                          {new Date(presentation.startTime).toLocaleDateString()} at{' '}
                          {new Date(presentation.startTime).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>
                    )}
                    
                    <div className="flex justify-end mt-4">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => router.push(`/presenter/presentations/${presentation.id}`)}
                      >
                        View Details
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}