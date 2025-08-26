"use client";

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { api } from '@/state/api';
import { format } from 'date-fns';
import { MapPin, Calendar, Users, Search, Filter } from 'lucide-react';
import DashboardPageLayout from '@/components/DashboardPageLayout';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

import ConferenceCard from '@/components/ConferenceCard';
import { EmptyStateNoResults } from '@/components/shared/EmptyStates';

export default function ConferenceDiscoveryPage() {
  // State for search and filters
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [sortOrder, setSortOrder] = useState('startDate-asc');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);

  // Parse sort order into API parameters
  const [sortField, sortDirection] = sortOrder.split('-');

  // Get search params for URL filtering
  const searchParams = useSearchParams();
  
  // Query conferences with current filters
  const { data: conferencesData, isLoading, isFetching } = api.useConferencesQuery({
    search: searchTerm || undefined,
    category: selectedCategory !== 'all' ? selectedCategory : undefined,
    page: currentPage,
    limit: 9,
    sort: sortField,
    order: sortDirection as 'asc' | 'desc',
  });

  // Query featured conferences for tabs
  const { data: featuredData } = api.useFeaturedConferencesQuery();
  
  // Query categories for filter dropdown
  const { data: categoriesData } = api.useConferenceCategoriesQuery();

  // Handle search input
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1); // Reset to first page on new search
  };

  // Handle page change
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Render loading skeletons
  const renderSkeletons = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array(6).fill(0).map((_, i) => (
        <Card key={i} className="h-[380px]">
          <CardHeader className="pb-2">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-6 w-5/6" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[160px] w-full mb-4" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          </CardContent>
          <CardFooter>
            <Skeleton className="h-10 w-full" />
          </CardFooter>
        </Card>
      ))}
    </div>
  );

  // Render conferences grid
  const renderConferenceGrid = () => {
    if (isLoading) return renderSkeletons();
    
    if (!conferencesData || conferencesData.conferences.length === 0) {
      return <EmptyStateNoResults message="No conferences found matching your criteria" />;
    }
    
    return (
      <>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {conferencesData.conferences.map((conference: any) => (
            <ConferenceCard 
              key={conference.id} 
              conference={conference}
              showActions
            />
          ))}
        </div>
        
        {/* Pagination */}
        {conferencesData.pagination.totalPages > 1 && (
          <div className="flex justify-center mt-8">
            <div className="flex space-x-2">
              <Button
                variant="outline"
                disabled={currentPage === 1}
                onClick={() => handlePageChange(currentPage - 1)}
              >
                Previous
              </Button>
              
              {Array.from({ length: conferencesData.pagination.totalPages }, (_, i) => i + 1).map(page => (
                <Button
                  key={page}
                  variant={currentPage === page ? "default" : "outline"}
                  onClick={() => handlePageChange(page)}
                >
                  {page}
                </Button>
              ))}
              
              <Button
                variant="outline"
                disabled={currentPage === conferencesData.pagination.totalPages}
                onClick={() => handlePageChange(currentPage + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </>
    );
  };

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
      title="Discover Conferences"
      description="Browse upcoming conferences, filter by category, or search for specific topics."
      className="space-y-6"
    >
      {/* Header with flexible search form placement */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        {searchForm}

        <div className="flex md:flex-row gap-2 w-full md:w-auto">
          <Select value={sortOrder} onValueChange={setSortOrder}>
            <SelectTrigger className="w-full md:w-[180px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent className="bg-white">
              <SelectItem value="startDate-asc">Date: Upcoming</SelectItem>
              <SelectItem value="startDate-desc">Date: Recent</SelectItem>
              <SelectItem value="name-asc">Name: A-Z</SelectItem>
              <SelectItem value="name-desc">Name: Z-A</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-full md:w-[180px]">
              <SelectValue placeholder="Filter by category" />
            </SelectTrigger>
            <SelectContent className="bg-white">
              <SelectItem value="all">All Categories</SelectItem>
              {categoriesData?.map(category => (
                <SelectItem key={category.name} value={category.name}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
          <TabsList className="bg-muted/60">
            <TabsTrigger value="all">All Conferences</TabsTrigger>
            <TabsTrigger value="popular">Popular</TabsTrigger>
            <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
          </TabsList>
          
        </div>

        <TabsContent value="all" className="mt-0">
          {renderConferenceGrid()}
        </TabsContent>
        
        <TabsContent value="popular" className="mt-0">
          {featuredData ? (
            featuredData.popular.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {featuredData.popular.map(conference => (
                  <ConferenceCard 
                    key={conference.id} 
                    conference={conference}
                    showActions
                  />
                ))}
              </div>
            ) : (
              <EmptyStateNoResults message="No popular conferences found" />
            )
          ) : (
            renderSkeletons()
          )}
        </TabsContent>
        
        <TabsContent value="upcoming" className="mt-0">
          {featuredData ? (
            featuredData.upcoming.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {featuredData.upcoming.map(conference => (
                  <ConferenceCard 
                    key={conference.id} 
                    conference={conference}
                    showActions
                  />
                ))}
              </div>
            ) : (
              <EmptyStateNoResults message="No upcoming conferences found" />
            )
          ) : (
            renderSkeletons()
          )}
        </TabsContent>
      </Tabs>
    </DashboardPageLayout>
  );
}