"use client";

import { useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { format } from 'date-fns';
import { 
  MapPin, Calendar, Users, Heart, Download, 
  PlusCircle, CheckCircle, X, Star 
} from 'lucide-react';
import DashboardPageLayout from '@/components/DashboardPageLayout';

import { api } from '@/state/api';
import { useAuth } from '@/app/(auth)/authContext';
import ConferenceTreeView from '@/components/ConferenceTreeView';
import LoadingStates from '@/components/shared/LoadingStates';

import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog, DialogContent, DialogDescription, 
  DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { CancelButton } from '@/components/cancel-button';
import { toast } from 'sonner';

export default function ConferenceDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab');
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const conferenceId = params.id as string;

  const [activeTab, setActiveTab] = useState(tabParam || 'overview');

  useEffect(() => {
    if (tabParam) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  const { 
    data: conference, 
    isLoading,
    error 
  } = api.useConferenceDetailsQuery(conferenceId);

  const [toggleFavorite] = api.useToggleConferenceFavoriteMutation();
  const [registerForConference] = api.useRegisterForConferenceMutation();
  const [unregisterFromConference] = api.useUnregisterFromConferenceMutation();
  const [showConfirmation, setShowConfirmation] = useState(false);

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
    } catch (error: any) {
      console.error('Error registering for conference:', error);
      
      if (error.status === 400) {
        toast.error("You're already registered for this conference");
      } else if (error.status === 404) {
        toast.error("Conference not found or no longer available");
      } else {
        toast.error("Failed to register for this conference. Please try again.");
      }
    }
  };

  const handleUnregister = async () => {
    if (!isAuthenticated) {
      router.push(`/signin?redirect=/attendee/conferences/${conferenceId}`);
      return;
    }
    setShowConfirmation(true);
  };

  const confirmUnregister = async () => {
    try {
      await unregisterFromConference({ conferenceId: Number(conferenceId) }).unwrap();
      setShowConfirmation(false);
    } catch (error: any) {
      console.error('Error unregistering from conference:', error);
      toast.error("Failed to unregister from this conference. Please try again.");
    }
  };

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

  if (isLoading) return (
    <div className="space-y-4">
      <div className="text-center text-muted-foreground">
        Loading conference details...
      </div>
      <LoadingStates variant="cards" count={2} />
    </div>
  );
  
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

  const dateRange = conference.startDate && conference.endDate 
    ? `${format(new Date(conference.startDate), 'MMM d')} - ${format(new Date(conference.endDate), 'MMM d, yyyy')}`
    : 'Date TBD';

  return (
    <DashboardPageLayout
      title={conference.name}
      breadcrumbs={breadcrumbs}
      className="space-y-8"
    > 
      {/* Conference header */}
      <div className="relative rounded-xl overflow-hidden">
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
          variant="outline"
          onClick={handleFavoriteToggle}
          className={conference.userInteractions?.isFavorited ? 'text-rose-500 border-rose-200' : ''}
        >
          <Heart 
            className={`h-4 w-4 mr-2 ${conference.userInteractions?.isFavorited ? 'fill-rose-500' : ''}`} 
          />
          {conference.userInteractions?.isFavorited ? 'Favorited' : 'Add to Favorites'}
        </Button>

        {conference.userInteractions?.isRegistered ? (
          <Button
            variant="outline"
            onClick={handleUnregister}
            className="border-red-200 bg-red-100 text-red-600 hover:bg-red-50 hover:text-red-600"
          >
            <X className="h-4 w-4" />
            Cancel Registration
          </Button>
        ) : (
          <Button
            variant="default"
            onClick={handleRegister}
          >
            <PlusCircle className="h-4 w-4" />
            Register Now
          </Button>
        )}
        {conference.userInteractions?.isRegistered && (
          <Badge variant="default" className="bg-green-100 text-green-800 border-green-200 flex gap-2 items-center">
            <CheckCircle className="h-3.5 w-3.5" />
            <span>Registered</span>
          </Badge>
        )}
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-6 gap-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="schedule">Schedule</TabsTrigger>
          <TabsTrigger value="presenters">Presenters</TabsTrigger>
          <TabsTrigger value="materials">Materials</TabsTrigger>
        </TabsList>
        
        {/* Academic-style Overview */}
        <TabsContent value="overview" className="space-y-8">
          {/* Aims & Scope */}
          <Card>
            <CardHeader>
              <CardTitle>Aims &amp; Scope</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground whitespace-pre-line leading-relaxed">
                {conference.description || 'No description provided.'}
              </p>
            </CardContent>
          </Card>

          {/* Call for Papers */}
          <Card>
            <CardHeader>
              <CardTitle>Call for Papers</CardTitle>
              <CardDescription>
                We invite submissions in the following categories and presentation types.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {conference.presentationTypes?.length > 0 && (
                <div>
                  <h4 className="font-medium text-sm mb-2">Presentation Types</h4>
                  <div className="flex flex-wrap gap-2">
                    {conference.presentationTypes.map((type: { id: number | string; name: string }) => (
                      <Badge key={type.id} variant="outline">
                        {type.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {conference.topics?.length > 0 && (
                <div>
                  <h4 className="font-medium text-sm mb-2">Topics of Interest</h4>
                  <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                    {conference.topics.map((topic: string) => (
                      <li key={topic}>{topic}</li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Important Dates */}
          <Card>
            <CardHeader>
              <CardTitle>Important Dates</CardTitle>
            </CardHeader>
            <CardContent>
              {conference.deadlines?.length > 0 ? (
                <ul className="space-y-2 text-sm">
                  {conference.deadlines.map((d: { id: string | number; label: string; date: string }) => (
                    <li key={d.id} className="flex justify-between border-b pb-1">
                      <span className="font-medium">{d.label}</span>
                      <span>{format(new Date(d.date), 'MMM d, yyyy')}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-muted-foreground">No deadlines have been published yet.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Schedule */}
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
        
        {/* Presenters */}
        <TabsContent value="presenters">
          <Card>
            <CardHeader>
              <CardTitle>Presenters</CardTitle>
              <CardDescription>
                Meet the presenters at this conference.
              </CardDescription>
            </CardHeader>
            <CardContent>
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
        
        {/* Materials */}
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

      {showConfirmation && (
        <Dialog open={showConfirmation} onOpenChange={setShowConfirmation}>
          <DialogContent className="bg-gray-200">
            <DialogHeader>
              <DialogTitle>Confirm Unregistration</DialogTitle>
              <DialogDescription>
                Are you sure you want to cancel your registration for "{conference.name}"? 
                You can register again later if you change your mind.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => setShowConfirmation(false)}
              >
                Cancel
              </Button>
              <Button 
                onClick={confirmUnregister}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                Yes, Unregister
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </DashboardPageLayout>
  );
}
