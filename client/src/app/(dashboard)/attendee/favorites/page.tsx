"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { Search, Calendar, User, Heart, ArrowRight, Presentation, Tag } from 'lucide-react';
import DashboardPageLayout from '@/components/DashboardPageLayout';
import { api } from '@/state/api';
import { useAuth } from '@/app/(auth)/authContext';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';


export default function FavoritesPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('presentations');
  const [currentPage, setCurrentPage] = useState(1);
  

  // Handle search input
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1); // Reset to first page on new search
  };
  
  // Fetch user's favorite presentations
  const { data: favoritePresentations, isLoading: presentationsLoading } = 
    api.useGetUserFavoritePresentationsQuery();
  
  // Fetch user's favorite conferences
  const { data: favoriteConferences, isLoading: conferencesLoading } = 
    api.useConferenceFavoritesQuery();
    
  // Toggle favorite mutations
  const [togglePresentationFavorite] = api.useTogglePresentationFavoriteMutation();
  const [toggleConferenceFavorite] = api.useToggleConferenceFavoriteMutation();

  // Filtered presentations based on search term
  const filteredPresentations = favoritePresentations?.filter(favorite => {
    const presentation = favorite.presentation;
    const searchLower = searchTerm.toLowerCase();
    
    return (
      presentation.title.toLowerCase().includes(searchLower) ||
      presentation.authors.some(a => a.authorName.toLowerCase().includes(searchLower)) ||
      presentation.conference.name.toLowerCase().includes(searchLower)
    );
  });
  
  // Filtered conferences based on search term
  const filteredConferences = favoriteConferences?.filter(conference => {
    const searchLower = searchTerm.toLowerCase();
    
    return (
      conference.name.toLowerCase().includes(searchLower) ||
      (conference.description && conference.description.toLowerCase().includes(searchLower)) ||
      (conference.location && conference.location.toLowerCase().includes(searchLower))
    );
  });

  // Handle removing a presentation from favorites
  const handleRemovePresentationFavorite = async (presentationId: number) => {
    try {
      await togglePresentationFavorite({
        presentationId,
        isFavorite: false
      }).unwrap();
      
      toast.success('Removed from favorites');
    } catch (error) {
      console.error('Error removing favorite:', error);
      toast.error('Failed to remove from favorites');
    }
  };
  
  // Handle removing a conference from favorites
  const handleRemoveConferenceFavorite = async (conferenceId: number) => {
    try {
      await toggleConferenceFavorite({
        conferenceId,
        isFavorite: false
      }).unwrap();
      
      toast.success('Removed from favorites');
    } catch (error) {
      console.error('Error removing favorite:', error);
      toast.error('Failed to remove from favorites');
    }
  };
  
  // Navigate to conference details and open the presentation in the tree view
  const navigateToPresentation = (conferenceId: number, presentationId: number) => {
    // Set the selected presentation ID in localStorage so the tree view can open it
    localStorage.setItem('selectedPresentationId', presentationId.toString());
    // Navigate to the conference page with the schedule tab active
    router.push(`/attendee/conferences/${conferenceId}?tab=schedule`);
  };
  
  // Render loading state
  if (presentationsLoading || conferencesLoading) {
    return (
      <DashboardPageLayout
        title="My Favorites"
        description="Manage your saved presentations and conferences"
        className="space-y-6"
      >
        <div className="grid gap-6">
          {[1, 2, 3].map(i => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              </CardContent>
              <CardFooter>
                <Skeleton className="h-10 w-32" />
              </CardFooter>
            </Card>
          ))}
        </div>
      </DashboardPageLayout>
    );
  }

  // Search form action component
  const searchForm = (
    <form onSubmit={handleSearch} className="flex gap-2">
      <div className="relative flex-grow">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search conferences..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-8 w-full md:w-[300px]"
        />
      </div>
      <Button type="submit" className="shrink-0">Search</Button>
    </form>
  );

  return (
    <DashboardPageLayout
      title="My Favorites"
      description="Manage your saved presentations and conferences"
      className="space-y-6"
    >
      {/* Search and filter */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        {/* <div className="relative w-full md:w-auto">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search your favorites..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 w-full md:w-[300px]"
          />
        </div> */}
        {searchForm}
        
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="flex justify-start w-full md:w-auto gap-4 mb-4">
          <TabsList>
            <TabsTrigger value="presentations">Presentations</TabsTrigger>
            <TabsTrigger value="conferences">Conferences</TabsTrigger>
          </TabsList>
        </div>
        
        {/* Favorites content */}
        <TabsContent value="presentations" className="mt-0">
          {!filteredPresentations || filteredPresentations.length === 0 ? (
            <div className="text-center py-16 bg-muted/20 rounded-lg">
              <div className="mb-4 bg-primary-50 h-20 w-20 rounded-full flex items-center justify-center mx-auto">
                <Presentation className="h-10 w-10 text-primary-500" />
              </div>
              <h3 className="text-xl font-semibold mb-2">No favorited presentations</h3>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                When you find interesting presentations, mark them as favorites to view them here.
              </p>
              <Button onClick={() => router.push('/attendee/discover')}>
                Discover Conferences
              </Button>
            </div>
          ) : (
            <div className="grid gap-4">
              {filteredPresentations.map(favorite => (
                <Card key={favorite.id} className="overflow-hidden group hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex flex-col md:flex-row gap-4 justify-between">
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center text-sm text-muted-foreground mb-1">
                          <Calendar className="h-4 w-4 mr-1" />
                          {format(new Date(favorite.createdAt), 'MMM d, yyyy')}
                          <span className="mx-2">•</span>
                          <Badge variant="outline" className="text-xs">
                            {favorite.presentation.conference.name}
                          </Badge>
                        </div>
                        
                        <h3 className="text-lg font-semibold group-hover:text-primary-600 transition-colors">
                          {favorite.presentation.title}
                        </h3>
                        
                        {favorite.presentation.authors.length > 0 && (
                          <div className="flex items-center text-sm mb-2">
                            <User className="h-4 w-4 mr-1 text-muted-foreground" />
                            <span>
                              {favorite.presentation.authors
                                .map(author => author.authorName)
                                .join(', ')}
                            </span>
                          </div>
                        )}
                        
                        {favorite.presentation.category && (
                          <Badge 
                            className="mt-1"
                            style={{ 
                              backgroundColor: favorite.presentation.category.color 
                                ? `${favorite.presentation.category.color}20` 
                                : undefined,
                              color: favorite.presentation.category.color || undefined
                            }}
                          >
                            <Tag className="h-3 w-3 mr-1" />
                            {favorite.presentation.category.name}
                          </Badge>
                        )}
                      </div>
                      
                      <div className="flex flex-row md:flex-col gap-2 items-center md:items-end justify-end">
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="text-rose-500 border-rose-200 hover:bg-rose-50"
                          onClick={() => handleRemovePresentationFavorite(favorite.presentation.id)}
                        >
                          <Heart className="h-4 w-4 mr-2 fill-rose-500" />
                          Remove
                        </Button>
                        
                        <Button 
                          variant="default" 
                          size="sm"
                          onClick={() => navigateToPresentation(
                            favorite.presentation.conferenceId,
                            favorite.presentation.id
                          )}
                        >
                          View in Schedule <ArrowRight className="h-4 w-4 ml-1" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="conferences" className="mt-0">
          {!filteredConferences || filteredConferences.length === 0 ? (
            <div className="text-center py-16 bg-muted/20 rounded-lg">
              <div className="mb-4 bg-primary-50 h-20 w-20 rounded-full flex items-center justify-center mx-auto">
                <Calendar className="h-10 w-10 text-primary-500" />
              </div>
              <h3 className="text-xl font-semibold mb-2">No favorited conferences</h3>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                When you find interesting conferences, mark them as favorites to view them here.
              </p>
              <Button onClick={() => router.push('/attendee/discover')}>
                Discover Conferences
              </Button>
            </div>
          ) : (
            <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
              {filteredConferences.map(conference => (
                <Card key={conference.id} className="overflow-hidden">
                  {/* Use your ConferenceCard component here */}
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">{conference.name}</CardTitle>
                    {conference.startDate && conference.endDate && (
                      <CardDescription>
                        {format(new Date(conference.startDate), 'MMM d')} - {format(new Date(conference.endDate), 'MMM d, yyyy')}
                      </CardDescription>
                    )}
                  </CardHeader>
                  
                  <CardContent className="pb-2">
                    {conference.location && (
                      <div className="text-sm mb-2">{conference.location}</div>
                    )}
                    {conference.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {conference.description}
                      </p>
                    )}
                  </CardContent>
                  
                  <CardFooter className="flex justify-between">
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="text-rose-500 border-rose-200 hover:bg-rose-50"
                      onClick={() => handleRemoveConferenceFavorite(conference.id)}
                    >
                      <Heart className="h-4 w-4 mr-2 fill-rose-500" />
                      Remove
                    </Button>
                    
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => router.push(`/attendee/conferences/${conference.id}`)}
                    >
                      View Details
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
      
    </DashboardPageLayout>
  );
}