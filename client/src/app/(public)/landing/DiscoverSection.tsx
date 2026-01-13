'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, MapPin, ExternalLink, ArrowRight } from 'lucide-react';
import { API_ENDPOINTS } from '@/lib/api/endpoints';
import apiClient from '@/lib/api/client';
import { cn } from '@/lib/utils';
import { LandingButton } from './LandingButton';
import { LandingContainer } from './LandingContainer';

interface Conference {
  id: number;
  slug?: string;
  name: string;
  description: string | null;
  startDate: string;
  endDate: string;
  location: string | null;
  venue: string | null;
  topics: string[];
  organizer: string;
  attendeeCount?: number;
  capacity: number | null;
  websiteUrl: string | null;
  isRegistered: boolean;
  isSubmissionOpen: boolean;
  isRegistrationOpen: boolean;
}

interface DiscoverResponse {
  conferences: Conference[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  userContext: {
    isAuthenticated: boolean;
    userRole: string;
  };
}

export default function DiscoverSection() {
  const [conferences, setConferences] = useState<Conference[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(0); // 0 for first 9, 1 for next 9
  const [total, setTotal] = useState(0);

  useEffect(() => {
    fetchConferences();
  }, []);

  const fetchConferences = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get(`${API_ENDPOINTS.PUBLIC.DISCOVER}?limit=18&status=upcoming`);
      
      const data: DiscoverResponse = response.data;
      setConferences(data.conferences);
      setTotal(data.pagination.total);
    } catch (error) {
      console.error('Error fetching conferences:', error);
      setConferences([]);
    } finally {
      setLoading(false);
    }
  };

  // Get current 9 conferences to display
  const displayedConferences = conferences.slice(currentPage * 9, (currentPage + 1) * 9);
  const hasSecondPage = conferences.length > 9;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  const getConferenceStatus = (startDate: string, endDate: string) => {
    const now = new Date();
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (start > now) return { label: 'Upcoming', color: 'bg-blue-500/10 text-blue-700 border-blue-200' };
    if (end < now) return { label: 'Past', color: 'bg-gray-500/10 text-gray-700 border-gray-200' };
    return { label: 'Active', color: 'bg-green-500/10 text-green-700 border-green-200' };
  };

  return (
    <section className="w-full py-16 md:py-24 bg-background">
      <LandingContainer size="wide">
        {/* Header with pagination dots */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-3xl md:text-4xl font-bold">Featured Conferences</h2>
            <p className="mt-3 text-muted-foreground max-w-2xl">
              Explore upcoming academic conferences from leading institutions worldwide
            </p>
          </div>
          
          {hasSecondPage && !loading && (
            <button
              onClick={() => setCurrentPage(prev => (prev === 0 ? 1 : 0))}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border-2 border-dashed border-primary/30 hover:border-primary/60 hover:bg-primary/5 transition-colors group"
              aria-label="Toggle conference page"
            >
              <span className="text-sm font-medium text-muted-foreground group-hover:text-foreground">
                {currentPage === 0 ? 'Next 9' : 'First 9'}
              </span>
              <div className="flex gap-1">
                <span className={cn(
                  "w-2 h-2 rounded-full transition-colors",
                  currentPage === 0 ? "bg-primary" : "bg-primary/30"
                )} />
                <span className={cn(
                  "w-2 h-2 rounded-full transition-colors",
                  currentPage === 1 ? "bg-primary" : "bg-primary/30"
                )} />
              </div>
            </button>
          )}
        </div>

        {/* Loading State */}
        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
            {[...Array(9)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <div className="h-6 bg-muted rounded w-3/4 mb-2" />
                  <div className="h-4 bg-muted rounded w-full" />
                </CardHeader>
                <CardContent>
                  <div className="h-20 bg-muted rounded" />
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && conferences.length === 0 && (
          <div className="text-center py-16">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
              <Calendar className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-semibold mb-2">No Conferences Yet</h3>
            <p className="text-muted-foreground max-w-md mx-auto mb-6">
              There are currently no published conferences available. Be the first to host one!
            </p>
            <LandingButton href="/conferences/new" variant="outline" icon={ArrowRight}>
              Host a Conference
            </LandingButton>
          </div>
        )}

        {/* Conference Cards Grid */}
        {!loading && displayedConferences.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
            {displayedConferences.map((conference) => {
              const status = getConferenceStatus(conference.startDate, conference.endDate);
              
              return (
                <Card 
                  key={conference.id} 
                  className="group hover:shadow-xl transition-all duration-300 hover:border-primary/50 flex flex-col h-full"
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <Badge variant="outline" className={cn("text-xs", status.color)}>
                        {status.label}
                      </Badge>
                      {conference.isRegistrationOpen && (
                        <Badge className="text-xs bg-green-500/10 text-green-700 border-green-200">
                          Registration Open
                        </Badge>
                      )}
                    </div>
                    <CardTitle className="line-clamp-2 group-hover:text-primary transition-colors text-lg font-semibold">
                      {conference.name}
                    </CardTitle>
                    <CardDescription className="line-clamp-2">
                      {conference.description || 'Academic conference'}
                    </CardDescription>
                  </CardHeader>
                  
                  <CardContent className="flex-1 flex flex-col justify-between pt-0 pb-4">
                    <div className="space-y-2.5 mb-3">
                      {/* Date */}
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="w-4 h-4 flex-shrink-0" />
                        <span className="truncate">
                          {formatDate(conference.startDate)}
                          {conference.endDate !== conference.startDate && 
                            ` - ${formatDate(conference.endDate)}`}
                        </span>
                      </div>
                      
                      {/* Location */}
                      {conference.location && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <MapPin className="w-4 h-4 flex-shrink-0" />
                          <span className="truncate">{conference.location}</span>
                        </div>
                      )}
                      
                      {/* Topics */}
                      {conference.topics && conference.topics.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {conference.topics.slice(0, 3).map((topic, idx) => (
                            <Badge 
                              key={idx} 
                              variant="secondary" 
                              className="text-xs px-2 py-0.5"
                            >
                              {topic}
                            </Badge>
                          ))}
                          {conference.topics.length > 3 && (
                            <Badge variant="secondary" className="text-xs px-2 py-0.5">
                              +{conference.topics.length - 3}
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                    
                    {/* Action Button */}
                    <Button 
                      asChild 
                      className="w-full mt-auto group/btn"
                      variant="outline"
                    >
                      <Link href={`/conferences/${conference.slug || conference.id}`}>
                        View Details
                        <ExternalLink className="ml-2 w-4 h-4 group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5 transition-transform" />
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* CTA Buttons */}
        {!loading && conferences.length > 0 && (
          <div className="text-center pt-8 border-t">
            <p className="text-sm text-muted-foreground mb-6">
              Showing {displayedConferences.length} of {total} upcoming conferences
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <LandingButton href="/conferences" variant="primary" icon={ArrowRight}>
                Browse All Conferences
              </LandingButton>
              <LandingButton href="/conferences/new" variant="outline" icon={ExternalLink}>
                Host a Conference
              </LandingButton>
            </div>
          </div>
)}
      </LandingContainer>
    </section>
  );
}
