"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { fetchAuthSession } from "aws-amplify/auth";
import axios from "axios";
import { Skeleton } from "@/components/ui/skeleton";
import { Edit, Calendar, Tag, Clock, Info, ArrowLeft, Upload, Trash2, CheckCircle, XCircle } from "lucide-react";
import { MaterialUploader } from "@/components/presenter/MaterialUploader";
import { MaterialsList } from "@/components/presenter/MaterialsList";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface PresentationDetail {
  id: number;
  title: string;
  abstract: string;
  status: string;
  conferenceId: number;
  conferenceName: string;
  presentationTypeName: string;
  keywords: string[];
  affiliations: string[];
  duration: number;
  startTime?: string;
  endTime?: string;
  sectionName?: string;
  reviewStatus?: string;
  reviewComments?: string;
  materials: {
    id: number;
    title: string;
    fileUrl: string;
    fileType: string;
    uploadedAt: string;
  }[];
}

export default function PresentationDetail() {
  const params = useParams();
  const router = useRouter();
  const [presentation, setPresentation] = useState<PresentationDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [activeTab, setActiveTab] = useState("details");

  useEffect(() => {
    const fetchPresentationDetails = async () => {
      try {
        setIsLoading(true);
        const session = await fetchAuthSession();
        
        if (!session.tokens?.idToken) {
          console.error("No auth token available");
          return;
        }
        
        const response = await axios.get(
          `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/presenter/presentations/${params.id}`, 
          {
            headers: {
              Authorization: `Bearer ${session.tokens.idToken.toString()}`
            }
          }
        );
        
        setPresentation(response.data);
      } catch (error) {
        console.error("Error fetching presentation details:", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchPresentationDetails();
  }, [params.id]);

  const handleDeletePresentation = async () => {
    if (!window.confirm("Are you sure you want to delete this presentation? This action cannot be undone.")) {
      return;
    }
    
    try {
      setIsDeleting(true);
      const session = await fetchAuthSession();
      
      if (!session.tokens?.idToken) {
        console.error("No auth token available");
        return;
      }
      
      await axios.delete(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/presenter/presentations/${params.id}`, 
        {
          headers: {
            Authorization: `Bearer ${session.tokens.idToken.toString()}`
          }
        }
      );
      
      router.push("/presenter/dashboard");
    } catch (error) {
      console.error("Error deleting presentation:", error);
      alert("Failed to delete the presentation. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  };

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

  // Helper function to get review status badge
  const getReviewStatusBadge = (status?: string) => {
    if (!status) return null;
    
    switch(status.toLowerCase()) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-100 text-yellow-800">Review Pending</Badge>;
      case 'approved':
        return <Badge variant="outline" className="bg-green-100 text-green-800">Approved</Badge>;
      case 'rejected':
        return <Badge variant="outline" className="bg-red-100 text-red-800">Rejected</Badge>;
      case 'revision_requested':
        return <Badge variant="outline" className="bg-orange-100 text-orange-800">Revision Requested</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="mb-6">
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-4 w-32" />
        </div>
        
        <Skeleton className="h-12 w-full mb-6" />
        
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-3/4 mb-2" />
            <Skeleton className="h-4 w-1/2" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-6 w-1/3" />
            <Skeleton className="h-6 w-1/2" />
            <Skeleton className="h-6 w-1/4" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!presentation) {
    return (
      <div className="container mx-auto p-6">
        <Alert variant="destructive">
          <AlertTitle>Presentation not found</AlertTitle>
          <AlertDescription>
            The presentation you are looking for does not exist or you don't have permission to view it.
          </AlertDescription>
        </Alert>
        <div className="flex justify-center mt-6">
          <Button onClick={() => router.push('/presenter/dashboard')}>
            Return to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <Button 
          variant="ghost" 
          className="pl-0 flex items-center gap-2"
          onClick={() => router.push('/presenter/dashboard')}
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Button>
        
        <div className="flex gap-2">
          {presentation.status === 'draft' && (
            <Button 
              variant="default" 
              onClick={() => router.push(`/presenter/edit/${presentation.id}`)}
              className="flex items-center gap-2"
            >
              <Edit className="h-4 w-4" />
              Edit Presentation
            </Button>
          )}
          
          {(presentation.status === 'draft' || presentation.status === 'submitted') && (
            <Button 
              variant="destructive" 
              onClick={handleDeletePresentation}
              disabled={isDeleting}
              className="flex items-center gap-2"
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </Button>
          )}
        </div>
      </div>

      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-1">{presentation.title}</h1>
        <div className="flex flex-wrap gap-2 mb-2">
          {getStatusBadge(presentation.status)}
          {presentation.reviewStatus && getReviewStatusBadge(presentation.reviewStatus)}
        </div>
        <p className="text-muted-foreground">
          Conference: {presentation.conferenceName}
        </p>
      </div>

      <Tabs defaultValue="details" className="mb-8" onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-3 mb-4">
          <TabsTrigger value="details" className="flex items-center gap-1">
            <Info className="h-4 w-4" />
            Details
          </TabsTrigger>
          <TabsTrigger value="materials" className="flex items-center gap-1">
            <Upload className="h-4 w-4" />
            Materials
          </TabsTrigger>
          <TabsTrigger value="status" className="flex items-center gap-1">
            <CheckCircle className="h-4 w-4" />
            Review Status
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="details">
          <Card>
            <CardHeader>
              <CardTitle>{presentation.title}</CardTitle>
              <CardDescription>
                {presentation.presentationTypeName} ({presentation.duration} min)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">Abstract</h3>
                <p className="text-gray-700 whitespace-pre-line">{presentation.abstract}</p>
              </div>
              
              <div className="flex items-start gap-2">
                <Tag className="h-4 w-4 mt-1 text-muted-foreground" />
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Keywords</h3>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {presentation.keywords.map((keyword, index) => (
                      <Badge key={index} variant="secondary" className="bg-gray-100 text-gray-800">
                        {keyword}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
              
              {presentation.affiliations && presentation.affiliations.length > 0 && (
                <div className="flex items-start gap-2">
                  <Info className="h-4 w-4 mt-1 text-muted-foreground" />
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">Affiliations</h3>
                    <p className="text-gray-700">{presentation.affiliations.join(", ")}</p>
                  </div>
                </div>
              )}
              
              {presentation.startTime && (
                <div className="flex items-start gap-2">
                  <Calendar className="h-4 w-4 mt-1 text-muted-foreground" />
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">Schedule</h3>
                    <p className="text-gray-700">
                      {new Date(presentation.startTime).toLocaleDateString()} at{' '}
                      {new Date(presentation.startTime).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                      {presentation.sectionName && ` in ${presentation.sectionName}`}
                    </p>
                  </div>
                </div>
              )}
              
              <div className="flex items-start gap-2">
                <Clock className="h-4 w-4 mt-1 text-muted-foreground" />
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Duration</h3>
                  <p className="text-gray-700">{presentation.duration} minutes</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="materials">
          <Card>
            <CardHeader>
              <CardTitle>Presentation Materials</CardTitle>
              <CardDescription>
                Upload and manage materials for your presentation
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-6">
                <MaterialUploader 
                  presentationId={presentation.id}
                  onUploadComplete={() => {
                    // Refresh the presentation data to get updated materials
                    window.location.reload();
                  }}
                />
              </div>
              
              <MaterialsList 
                materials={presentation.materials || []}
                onDelete={() => {
                  // Refresh the presentation data to get updated materials
                  window.location.reload();
                }}
              />
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="status">
          <Card>
            <CardHeader>
              <CardTitle>Review Status</CardTitle>
              <CardDescription>
                Current status and feedback for your presentation
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <h3 className="font-medium">Status:</h3>
                  <div className="flex items-center">
                    {presentation.status === 'draft' ? (
                      <Badge variant="outline" className="bg-gray-100 text-gray-800">Draft</Badge>
                    ) : presentation.reviewStatus ? (
                      getReviewStatusBadge(presentation.reviewStatus)
                    ) : (
                      <Badge variant="outline" className="bg-yellow-100 text-yellow-800">Pending Review</Badge>
                    )}
                  </div>
                </div>
                
                {presentation.reviewStatus === 'rejected' && (
                  <Alert variant="destructive">
                    <XCircle className="h-4 w-4" />
                    <AlertTitle>Presentation Rejected</AlertTitle>
                    <AlertDescription>
                      Your presentation has been rejected. Please review the comments below.
                    </AlertDescription>
                  </Alert>
                )}
                
                {presentation.reviewStatus === 'revision_requested' && (
                  <Alert variant="destructive">
                    <AlertTitle>Revision Requested</AlertTitle>
                    <AlertDescription>
                      The reviewers have requested revisions to your presentation. Please review the comments below.
                    </AlertDescription>
                  </Alert>
                )}
                
                {presentation.reviewStatus === 'approved' && (
                  <Alert>
                    <CheckCircle className="h-4 w-4" />
                    <AlertTitle>Presentation Approved</AlertTitle>
                    <AlertDescription>
                      Your presentation has been approved and will be scheduled for the conference.
                    </AlertDescription>
                  </Alert>
                )}
                
                {presentation.reviewComments && (
                  <div className="mt-4">
                    <h3 className="font-medium mb-2">Reviewer Comments:</h3>
                    <div className="p-4 bg-gray-50 rounded-md border border-gray-200 whitespace-pre-line">
                      {presentation.reviewComments}
                    </div>
                  </div>
                )}
                
                {presentation.status === 'draft' && (
                  <div className="mt-6">
                    <Alert>
                      <AlertTitle>This presentation is still a draft</AlertTitle>
                      <AlertDescription>
                        Submit your presentation to have it reviewed for the conference.
                      </AlertDescription>
                    </Alert>
                    <div className="flex justify-end mt-4">
                      <Button>Submit for Review</Button>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}