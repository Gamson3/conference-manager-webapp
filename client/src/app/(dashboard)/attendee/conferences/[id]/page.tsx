"use client";

import { useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { format } from 'date-fns';
import { MapPin, Calendar, Users, Heart, Clock, Download, ArrowLeft, Star } from 'lucide-react';
import DashboardPageLayout from '@/components/DashboardPageLayout';

import { api } from '@/state/api';
import { useAuth } from '@/app/(auth)/authContext';
import ConferenceTreeView from '@/components/ConferenceTreeView';
import LoadingStates from '@/components/shared/LoadingStates';

import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CancelButton } from '@/components/cancel-button';
import { toast } from 'sonner';

export default function ConferenceDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab');
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const conferenceId = params.id as string;

  // Set initial tab based on query parameter
  const [activeTab, setActiveTab] = useState(tabParam || 'overview');

  // Update the tab when query parameter changes
  useEffect(() => {
    if (tabParam) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  // Fetch conference details
  const { 
    data: conference, 
    isLoading,
    error 
  } = api.useConferenceDetailsQuery(conferenceId);

  // Mutations
  const [toggleFavorite] = api.useToggleConferenceFavoriteMutation();
  const [registerForConference] = api.useRegisterForConferenceMutation();

  // Handle favorite toggle
  const handleFavoriteToggle = async () => {
    if (!isAuthenticated) {
      router.push(`/signin?redirect=/attendee/conference/${conferenceId}`);
      return;
    }
    
    try {
      await toggleFavorite({
        conferenceId: Number(conferenceId),
        isFavorite: !(conference?.userInteractions?.isFavorited ?? false)
      }).unwrap();
    } catch (error) {
      console.error('Error toggling favorite:', error);
    }
  };

  // Handle registration
  const handleRegister = async () => {
    if (!isAuthenticated) {
      router.push(`/signin?redirect=/attendee/conferences/${conferenceId}`);
      return;
    }
    
    try {
      await registerForConference({ 
        conferenceId: Number(conferenceId) 
      }).unwrap();
      toast.success("Successfully registered for this conference");
    } catch (error) {
      console.error('Error registering for conference:', error);
      toast.error("Failed to register for this conference. Please try again.");
    }
  };

  // Create a breadcrumb component
  const breadcrumbs = (
    <div className="flex items-center text-sm text-muted-foreground">
      <Button 
        variant="link" 
        className="p-0 h-auto font-normal" 
        onClick={() => router.push('/attendee/discover')}
      >
        Discover
      </Button>
      <span className="mx-2">/</span>
      <span>Conference Details</span>
    </div>
  );

  // Create action buttons
  // const actionButtons = (
  //   <>
  //     <Button
  //       variant={conference?.userInteractions?.isRegistered ? "outline" : "default"}
  //       onClick={handleRegister}
  //       disabled={conference?.userInteractions?.isRegistered}
  //     >
  //       {conference?.userInteractions?.isRegistered ? "Registered" : "Register Now"}
  //     </Button>
  //     <Button
  //       variant="outline"
  //       onClick={handleFavoriteToggle}
  //       className={conference?.userInteractions?.isFavorited ? 'text-rose-500 border-rose-200' : ''}
  //     >
  //       <Heart 
  //         className={`h-4 w-4 mr-2 ${conference?.userInteractions?.isFavorited ? 'fill-rose-500' : ''}`} 
  //       />
  //       {conference?.userInteractions?.isFavorited ? 'Favorited' : 'Add to Favorites'}
  //     </Button>
  //   </>
  // );

  // Loading state
  if (isLoading) return (
    <div className="space-y-4">
      <div className="text-center text-muted-foreground">
        Loading conference details...
      </div>
      <LoadingStates variant="cards" count={2} />
    </div>
  );
  
  // Error state
  if (error || !conference) {
    return (
      <div className="container mx-auto py-8">
        <div className="bg-white rounded-lg shadow-lg p-6 text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-2">Error</h1>
          <p className="text-gray-600 mb-4">Failed to load conference details</p>
          <CancelButton fallbackPath="/attendee/discover">Back to Discover</CancelButton>
        </div>
      </div>
    );
  }

  // Format date range
  const dateRange = conference.startDate && conference.endDate 
    ? `${format(new Date(conference.startDate), 'MMM d')} - ${format(new Date(conference.endDate), 'MMM d, yyyy')}`
    : 'Date TBD';

  return (
    <DashboardPageLayout
      title={conference.name}
      breadcrumbs={breadcrumbs}
      // actions={actionButtons}
      className="space-y-8"
    > 
      {/* Conference header */}
      <div className="relative rounded-xl overflow-hidden">
        {/* Banner image */}
        {conference.bannerImageUrl ? (
          <div className="relative h-48 md:h-64 lg:h-80">
            <div className="absolute inset-0 bg-black/30 z-10" />
            <img 
              src={conference.bannerImageUrl} 
              alt={conference.name}
              className="w-full h-full object-cover" 
            />
          </div>
        ) : (
          <div className="h-48 md:h-64 lg:h-80 bg-gradient-to-r from-primary-500 to-primary-700" />
        )}
        
        {/* Header content */}
        <div className="absolute bottom-0 left-0 right-0 z-20 p-6 text-white">
          <div className="flex flex-wrap gap-2 mb-2">
            {conference.categories?.map(category => (
              <Badge 
                key={category.id} 
                style={{ backgroundColor: category.color || undefined }}
                className="text-xs"
              >
                {category.name}
              </Badge>
            ))}
          </div>
          <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold mb-2 drop-shadow-md">
            {conference.name}
          </h1>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm drop-shadow-md">
            <div className="flex items-center">
              <Calendar className="h-4 w-4 mr-1" />
              {dateRange}
            </div>
            {conference.location && (
              <div className="flex items-center">
                <MapPin className="h-4 w-4 mr-1" />
                {conference.location}
              </div>
            )}
            <div className="flex items-center">
              <Users className="h-4 w-4 mr-1" />
              {conference._count?.attendances || 0} registered
            </div>
          </div>
        </div>
      </div>
      
      {/* Actions bar */}
      <div className="flex flex-wrap gap-3 py-2">
        <Button
          variant={conference.userInteractions?.isRegistered ? "outline" : "default"}
          onClick={handleRegister}
          disabled={conference.userInteractions?.isRegistered}
        >
          {conference.userInteractions?.isRegistered ? "Registered" : "Register Now"}
        </Button>
        <Button
          variant="outline"
          onClick={handleFavoriteToggle}
          className={conference.userInteractions?.isFavorited ? 'text-rose-500 border-rose-200' : ''}
        >
          <Heart 
            className={`h-4 w-4 mr-2 ${conference.userInteractions?.isFavorited ? 'fill-rose-500' : ''}`} 
          />
          {conference.userInteractions?.isFavorited ? 'Favorited' : 'Add to Favorites'}
        </Button>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="schedule">Schedule</TabsTrigger>
          <TabsTrigger value="presenters">Presenters</TabsTrigger>
          <TabsTrigger value="materials">Materials</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-6">
          {/* Description */}
          <Card>
            <CardHeader>
              <CardTitle>About this Conference</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground whitespace-pre-line">
                {conference.description || 'No description provided.'}
              </p>
            </CardContent>
          </Card>
          
          {/* Details */}
          <Card>
            <CardHeader>
              <CardTitle>Conference Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium text-sm text-muted-foreground mb-1">Dates</h4>
                    <p className="flex items-center">
                      <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                      {dateRange}
                    </p>
                  </div>
                  
                  {conference.location && (
                    <div>
                      <h4 className="font-medium text-sm text-muted-foreground mb-1">Location</h4>
                      <p className="flex items-center">
                        <MapPin className="h-4 w-4 mr-2 text-muted-foreground" />
                        {conference.location}
                      </p>
                    </div>
                  )}
                  
                  {conference.venue && (
                    <div>
                      <h4 className="font-medium text-sm text-muted-foreground mb-1">Venue</h4>
                      <p>{conference.venue}</p>
                      {conference.venueAddress && <p className="text-sm text-muted-foreground">{conference.venueAddress}</p>}
                    </div>
                  )}
                </div>
                
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium text-sm text-muted-foreground mb-1">Organized by</h4>
                    <p>{conference.createdBy?.name || 'Unknown'}</p>
                    {conference.createdBy?.organization && (
                      <p className="text-sm text-muted-foreground">{conference.createdBy.organization}</p>
                    )}
                  </div>
                  
                  {conference.presentationTypes && conference.presentationTypes.length > 0 && (
                    <div>
                      <h4 className="font-medium text-sm text-muted-foreground mb-1">Presentation Types</h4>
                      <div className="flex flex-wrap gap-2">
                        {conference.presentationTypes.map((type: { id: number | string; name: string }) => (
                          <Badge key={type.id} variant="outline">
                            {type.name}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {conference.topics && conference.topics.length > 0 && (
                    <div>
                      <h4 className="font-medium text-sm text-muted-foreground mb-1">Topics</h4>
                      <div className="flex flex-wrap gap-2">
                        {conference.topics.map((topic: string) => (
                          <Badge key={topic} variant="secondary">
                            {topic}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              {conference.websiteUrl && (
                <div className="pt-2">
                  <h4 className="font-medium text-sm text-muted-foreground mb-1">Website</h4>
                  <a 
                    href={conference.websiteUrl} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="text-primary-600 hover:underline"
                  >
                    {conference.websiteUrl}
                  </a>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="schedule" className="min-h-[400px]">
          <Card>
            <CardHeader>
              <CardTitle>Conference Schedule</CardTitle>
              <CardDescription>
                Browse the conference schedule organized by day and section.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {conference.days && conference.days.length > 0 ? (
                <ConferenceTreeView conference={conference} />
              ) : (
                <div className="text-center py-10">
                  <p className="text-muted-foreground">
                    No schedule has been published yet.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="presenters">
          <Card>
            <CardHeader>
              <CardTitle>Presenters</CardTitle>
              <CardDescription>
                Meet the presenters at this conference.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Collect unique presenters from presentations */}
              {(() => {
                const presenters: {
                  name: string;
                  affiliation?: string | null;
                  presentations: { id: number; title: string }[]
                }[] = [];
                
                conference.days?.forEach(day => {
                  day.sections?.forEach(section => {
                    section.timeSlots?.forEach(slot => {
                      if (slot.presentation) {
                        slot.presentation.authors?.forEach(author => {
                          if (author.isPresenter) {
                            // Check if presenter already exists in the array
                            const existingPresenter = presenters.find(p => 
                              p.name === author.authorName
                            );
                            
                            if (existingPresenter) {
                              existingPresenter.presentations.push({
                                id: slot.presentation!.id,
                                title: slot.presentation!.title
                              });
                            } else {
                              presenters.push({
                                name: author.authorName,
                                affiliation: author.affiliation,
                                presentations: [{
                                  id: slot.presentation!.id,
                                  title: slot.presentation!.title
                                }]
                              });
                            }
                          }
                        });
                      }
                    });
                  });
                });
                
                return presenters.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {presenters.map((presenter, index) => (
                      <Card key={index} className="bg-muted/40">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base">{presenter.name}</CardTitle>
                          {presenter.affiliation && (
                            <CardDescription>{presenter.affiliation}</CardDescription>
                          )}
                        </CardHeader>
                        <CardContent>
                          <h4 className="text-sm font-medium mb-2">Presentations:</h4>
                          <ul className="space-y-1 text-sm">
                            {presenter.presentations.map(presentation => (
                              <li key={presentation.id} className="flex">
                                <Star className="h-3.5 w-3.5 mr-2 text-muted-foreground flex-shrink-0 mt-0.5" />
                                {presentation.title}
                              </li>
                            ))}
                          </ul>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-10">
                    <p className="text-muted-foreground">
                      No presenter information available yet.
                    </p>
                  </div>
                );
              })()}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="materials">
          <Card>
            <CardHeader>
              <CardTitle>Conference Materials</CardTitle>
              <CardDescription>
                Access materials shared by the conference organizers.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {conference.materials && conference.materials.length > 0 ? (
                <div className="space-y-4">
                  {conference.materials.map(material => (
                    <div key={material.id} className="flex items-center justify-between border rounded-md p-4">
                      <div>
                        <h4 className="font-medium">{material.title}</h4>
                        {material.description && (
                          <p className="text-sm text-muted-foreground">{material.description}</p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          Added on {format(new Date(material.uploadedAt), 'MMM d, yyyy')}
                        </p>
                      </div>
                      <a 
                        href={material.fileUrl} 
                        target="_blank"
                        rel="noopener noreferrer"
                        className="shrink-0"
                      >
                        <Button size="sm" variant="outline">
                          <Download className="h-4 w-4 mr-1" />
                          Download
                        </Button>
                      </a>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-10">
                  <p className="text-muted-foreground">
                    No materials have been shared yet.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </DashboardPageLayout>
  );
}