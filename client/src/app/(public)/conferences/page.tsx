// Public Conferences List Page - Booking.com Style Layout
'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { 
  Search, 
  Calendar, 
  MapPin, 
  Users, 
  ChevronRight,
  Grid3X3, 
  List,
  X,
  SlidersHorizontal,
  ArrowUpDown,
  FileText,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import apiClient from '@/lib/api/client';
import API_ENDPOINTS from '@/lib/api/endpoints';

// Types
interface ConferenceData {
  id: number | string;
  name: string;
  slug?: string;
  description?: string;
  startDate: string;
  endDate: string;
  location?: string;
  venue?: string;
  bannerImageUrl?: string;
  topics?: string[];
  isRegistrationOpen?: boolean;
  isSubmissionOpen?: boolean;
  participantCount?: number;
  websiteUrl?: string;
  status?: string;
}

type SortOption = 'date-asc' | 'date-desc' | 'name-asc' | 'name-desc' | 'popular';
type ViewMode = 'list' | 'grid';

interface Filters {
  search: string;
  upcoming: boolean;
  past: boolean;
  registrationOpen: boolean;
  cfpOpen: boolean;
  topics: string[];
}

// Utility functions
function formatDateRange(startDate: string, endDate: string): string {
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
  const startStr = start.toLocaleDateString('en-US', options);
  const endStr = end.toLocaleDateString('en-US', options);
  const year = start.getFullYear();
  
  if (startStr === endStr) {
    return `${startStr}, ${year}`;
  }
  return `${startStr} - ${endStr}, ${year}`;
}

function getConferenceStatus(conf: ConferenceData): 'upcoming' | 'ongoing' | 'past' {
  const now = new Date();
  const start = new Date(conf.startDate);
  const end = new Date(conf.endDate);
  
  if (now < start) return 'upcoming';
  if (now > end) return 'past';
  return 'ongoing';
}

function getDaysUntil(dateString: string): number {
  const date = new Date(dateString);
  const now = new Date();
  const diff = date.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

// Filter Sidebar Component
function FilterSidebar({
  filters,
  onFilterChange,
  availableTopics,
  counts,
  className,
}: {
  filters: Filters;
  onFilterChange: (filters: Filters) => void;
  availableTopics: string[];
  counts: {
    upcoming: number;
    past: number;
    registrationOpen: number;
    cfpOpen: number;
  };
  className?: string;
}) {
  const activeFiltersCount = 
    (filters.upcoming ? 1 : 0) +
    (filters.past ? 1 : 0) +
    (filters.registrationOpen ? 1 : 0) +
    (filters.cfpOpen ? 1 : 0) +
    filters.topics.length;

  return (
    <div className={cn('space-y-6', className)}>
      {/* Filter Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-lg">Filter by:</h3>
        {activeFiltersCount > 0 && (
          <Button 
            variant="ghost" 
            size="sm"
            className="text-xs h-7"
            onClick={() => onFilterChange({
              search: filters.search,
              upcoming: false,
              past: false,
              registrationOpen: false,
              cfpOpen: false,
              topics: [],
            })}
          >
            Clear all
          </Button>
        )}
      </div>

      {/* Conference Status */}
      <div className="space-y-3">
        <h4 className="font-medium text-sm text-muted-foreground">Status</h4>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="upcoming"
                checked={filters.upcoming}
                onCheckedChange={(checked) =>
                  onFilterChange({ ...filters, upcoming: !!checked, past: false })
                }
              />
              <Label htmlFor="upcoming" className="text-sm cursor-pointer">
                Upcoming
              </Label>
            </div>
            <span className="text-xs text-muted-foreground">{counts.upcoming}</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="past"
                checked={filters.past}
                onCheckedChange={(checked) =>
                  onFilterChange({ ...filters, past: !!checked, upcoming: false })
                }
              />
              <Label htmlFor="past" className="text-sm cursor-pointer">
                Past conferences
              </Label>
            </div>
            <span className="text-xs text-muted-foreground">{counts.past}</span>
          </div>
        </div>
      </div>

      <Separator />

      {/* Registration & CFP */}
      <div className="space-y-3">
        <h4 className="font-medium text-sm text-muted-foreground">Open for</h4>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="registration"
                checked={filters.registrationOpen}
                onCheckedChange={(checked) =>
                  onFilterChange({ ...filters, registrationOpen: !!checked })
                }
              />
              <Label htmlFor="registration" className="text-sm cursor-pointer">
                Registration
              </Label>
            </div>
            <span className="text-xs text-muted-foreground">{counts.registrationOpen}</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="cfp"
                checked={filters.cfpOpen}
                onCheckedChange={(checked) =>
                  onFilterChange({ ...filters, cfpOpen: !!checked })
                }
              />
              <Label htmlFor="cfp" className="text-sm cursor-pointer">
                Call for Papers
              </Label>
            </div>
            <span className="text-xs text-muted-foreground">{counts.cfpOpen}</span>
          </div>
        </div>
      </div>

      {/* Topics */}
      {availableTopics.length > 0 && (
        <>
          <Separator />
          <div className="space-y-3">
            <h4 className="font-medium text-sm text-muted-foreground">Topics</h4>
            <ScrollArea className="h-[200px] pr-4">
              <div className="space-y-2">
                {availableTopics.map((topic) => (
                  <div key={topic} className="flex items-center space-x-2">
                    <Checkbox
                      id={`topic-${topic}`}
                      checked={filters.topics.includes(topic)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          onFilterChange({ ...filters, topics: [...filters.topics, topic] });
                        } else {
                          onFilterChange({
                            ...filters,
                            topics: filters.topics.filter((t) => t !== topic),
                          });
                        }
                      }}
                    />
                    <Label htmlFor={`topic-${topic}`} className="text-sm cursor-pointer">
                      {topic}
                    </Label>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        </>
      )}
    </div>
  );
}

// Conference Card Component - List Style (like Booking.com)
function ConferenceListCard({ conference }: { conference: ConferenceData }) {
  const status = getConferenceStatus(conference);
  const daysUntil = status === 'upcoming' ? getDaysUntil(conference.startDate) : 0;

  return (
    <Link href={`/conferences/${conference.id}`} className="block group">
      <Card className="overflow-hidden hover:shadow-lg transition-shadow border-l-4 border-l-transparent hover:border-l-primary">
        <div className="flex flex-col sm:flex-row">
          {/* Image Section */}
          <div className="relative w-full sm:w-56 h-40 sm:h-auto shrink-0 bg-muted">
            {conference.bannerImageUrl ? (
              <Image
                src={conference.bannerImageUrl}
                alt={conference.name}
                fill
                className="object-cover"
                sizes="(max-width: 640px) 100vw, 224px"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5">
                <Calendar className="h-12 w-12 text-primary/30" />
              </div>
            )}
          </div>

          {/* Content Section */}
          <CardContent className="flex-1 p-4 sm:p-5">
            <div className="flex flex-col h-full">
              {/* Header with title and status */}
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold text-primary group-hover:underline line-clamp-1">
                    {conference.name}
                  </h3>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mt-0.5">
                    <MapPin className="h-3.5 w-3.5" />
                    <span className="line-clamp-1">
                      {conference.location || conference.venue || 'Location TBD'}
                    </span>
                  </div>
                </div>

                {/* Status Badge */}
                <div className="flex flex-col items-end gap-1 shrink-0">
                  {status === 'upcoming' && daysUntil <= 30 && (
                    <Badge variant="destructive" className="text-xs">
                      {daysUntil <= 7 ? `${daysUntil} days left` : 'Soon'}
                    </Badge>
                  )}
                  {status === 'ongoing' && (
                    <Badge className="bg-green-600 text-xs">Happening Now</Badge>
                  )}
                  {status === 'past' && (
                    <Badge variant="secondary" className="text-xs">Completed</Badge>
                  )}
                </div>
              </div>

              {/* Description */}
              {conference.description && (
                <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                  {conference.description}
                </p>
              )}

              {/* Meta info */}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-muted-foreground mb-3">
                <span className="flex items-center gap-1.5">
                  <Calendar className="h-4 w-4" />
                  {formatDateRange(conference.startDate, conference.endDate)}
                </span>
                {conference.participantCount !== undefined && conference.participantCount > 0 && (
                  <span className="flex items-center gap-1.5">
                    <Users className="h-4 w-4" />
                    {conference.participantCount} registered
                  </span>
                )}
              </div>

              {/* Topics */}
              {conference.topics && conference.topics.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {conference.topics.slice(0, 3).map((topic) => (
                    <Badge key={topic} variant="outline" className="text-xs font-normal">
                      {topic}
                    </Badge>
                  ))}
                  {conference.topics.length > 3 && (
                    <Badge variant="outline" className="text-xs font-normal">
                      +{conference.topics.length - 3}
                    </Badge>
                  )}
                </div>
              )}

              {/* Footer with open badges and action */}
              <div className="flex items-center justify-between mt-auto pt-2">
                <div className="flex flex-wrap gap-2">
                  {conference.isRegistrationOpen && (
                    <Badge className="bg-green-600/90 text-xs gap-1">
                      <CheckCircle2 className="h-3 w-3" />
                      Registration Open
                    </Badge>
                  )}
                  {conference.isSubmissionOpen && (
                    <Badge className="bg-purple-600/90 text-xs gap-1">
                      <FileText className="h-3 w-3" />
                      CFP Open
                    </Badge>
                  )}
                </div>
                <Button variant="default" size="sm" className="gap-1 shrink-0">
                  View Details
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </div>
      </Card>
    </Link>
  );
}

// Conference Card Component - Grid Style
function ConferenceGridCard({ conference }: { conference: ConferenceData }) {
  const status = getConferenceStatus(conference);

  return (
    <Link href={`/conferences/${conference.id}`} className="block group">
      <Card className="overflow-hidden h-full hover:shadow-lg transition-shadow">
        {/* Image */}
        <div className="relative h-36 bg-muted">
          {conference.bannerImageUrl ? (
            <Image
              src={conference.bannerImageUrl}
              alt={conference.name}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 33vw"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5">
              <Calendar className="h-10 w-10 text-primary/30" />
            </div>
          )}
          {/* Status badge on image */}
          <div className="absolute top-2 right-2">
            {status === 'ongoing' && (
              <Badge className="bg-green-600 text-xs shadow">Live</Badge>
            )}
            {status === 'past' && (
              <Badge variant="secondary" className="text-xs shadow">Past</Badge>
            )}
          </div>
        </div>

        <CardContent className="p-4">
          <h3 className="font-semibold text-base line-clamp-2 group-hover:text-primary transition-colors mb-1">
            {conference.name}
          </h3>
          
          <div className="text-sm text-muted-foreground space-y-1 mb-3">
            <div className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" />
              <span>{formatDateRange(conference.startDate, conference.endDate)}</span>
            </div>
            {conference.location && (
              <div className="flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5" />
                <span className="line-clamp-1">{conference.location}</span>
              </div>
            )}
          </div>

          {/* Open badges */}
          <div className="flex flex-wrap gap-1.5">
            {conference.isRegistrationOpen && (
              <Badge className="bg-green-600/90 text-xs">Registration</Badge>
            )}
            {conference.isSubmissionOpen && (
              <Badge className="bg-purple-600/90 text-xs">CFP</Badge>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

// Skeleton loaders
function ConferenceListCardSkeleton() {
  return (
    <Card className="overflow-hidden">
      <div className="flex flex-col sm:flex-row">
        <div className="w-full sm:w-56 h-40 sm:h-[180px] shrink-0 bg-muted animate-pulse" />
        <CardContent className="flex-1 p-4 sm:p-5 space-y-3">
          <div className="h-5 w-3/4 bg-muted animate-pulse rounded" />
          <div className="h-4 w-1/2 bg-muted animate-pulse rounded" />
          <div className="h-12 w-full bg-muted animate-pulse rounded" />
          <div className="flex gap-2">
            <div className="h-5 w-24 bg-muted animate-pulse rounded" />
            <div className="h-5 w-20 bg-muted animate-pulse rounded" />
          </div>
        </CardContent>
      </div>
    </Card>
  );
}

function ConferenceGridCardSkeleton() {
  return (
    <Card className="overflow-hidden">
      <div className="h-36 bg-muted animate-pulse" />
      <CardContent className="p-4 space-y-2">
        <div className="h-5 w-3/4 bg-muted animate-pulse rounded" />
        <div className="h-4 w-1/2 bg-muted animate-pulse rounded" />
        <div className="h-4 w-2/3 bg-muted animate-pulse rounded" />
      </CardContent>
    </Card>
  );
}

// Main Page Component
export default function ConferencesListPage() {
  const [conferences, setConferences] = useState<ConferenceData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filter/sort state
  const [filters, setFilters] = useState<Filters>({
    search: '',
    upcoming: false,
    past: false,
    registrationOpen: false,
    cfpOpen: false,
    topics: [],
  });
  const [sortBy, setSortBy] = useState<SortOption>('date-asc');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  // Fetch conferences
  useEffect(() => {
    const fetchConferences = async () => {
      try {
        setLoading(true);
        setError(null);
        const { data } = await apiClient.get(API_ENDPOINTS.CONFERENCES.BASE);
        const conferenceList = Array.isArray(data) ? data : data.conferences || [];
        setConferences(conferenceList);
      } catch (err) {
        console.error('Failed to fetch conferences:', err);
        setError('Failed to load conferences. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchConferences();
  }, []);

  // Compute available topics from all conferences
  const availableTopics = useMemo(() => {
    const topicsSet = new Set<string>();
    conferences.forEach((conf) => {
      conf.topics?.forEach((topic) => topicsSet.add(topic));
    });
    return Array.from(topicsSet).sort();
  }, [conferences]);

  // Compute counts for filters
  const counts = useMemo(() => {
    const now = new Date();
    return {
      upcoming: conferences.filter((c) => new Date(c.startDate) > now).length,
      past: conferences.filter((c) => new Date(c.endDate) < now).length,
      registrationOpen: conferences.filter((c) => c.isRegistrationOpen).length,
      cfpOpen: conferences.filter((c) => c.isSubmissionOpen).length,
    };
  }, [conferences]);

  // Filter and sort conferences
  const filteredConferences = useMemo(() => {
    let result = [...conferences];
    const now = new Date();

    // Apply search filter
    if (filters.search.trim()) {
      const query = filters.search.toLowerCase();
      result = result.filter((conf) =>
        conf.name.toLowerCase().includes(query) ||
        conf.description?.toLowerCase().includes(query) ||
        conf.location?.toLowerCase().includes(query) ||
        conf.topics?.some((t) => t.toLowerCase().includes(query))
      );
    }

    // Apply status filters
    if (filters.upcoming) {
      result = result.filter((conf) => new Date(conf.startDate) > now);
    }
    if (filters.past) {
      result = result.filter((conf) => new Date(conf.endDate) < now);
    }

    // Apply open for filters
    if (filters.registrationOpen) {
      result = result.filter((conf) => conf.isRegistrationOpen);
    }
    if (filters.cfpOpen) {
      result = result.filter((conf) => conf.isSubmissionOpen);
    }

    // Apply topic filters
    if (filters.topics.length > 0) {
      result = result.filter((conf) =>
        filters.topics.some((topic) => conf.topics?.includes(topic))
      );
    }

    // Apply sorting
    result.sort((a, b) => {
      switch (sortBy) {
        case 'date-asc':
          return new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
        case 'date-desc':
          return new Date(b.startDate).getTime() - new Date(a.startDate).getTime();
        case 'name-asc':
          return a.name.localeCompare(b.name);
        case 'name-desc':
          return b.name.localeCompare(a.name);
        case 'popular':
          return (b.participantCount || 0) - (a.participantCount || 0);
        default:
          return 0;
      }
    });

    return result;
  }, [conferences, filters, sortBy]);

  const activeFiltersCount = 
    (filters.upcoming ? 1 : 0) +
    (filters.past ? 1 : 0) +
    (filters.registrationOpen ? 1 : 0) +
    (filters.cfpOpen ? 1 : 0) +
    filters.topics.length;

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Page Header */}
      <section className="bg-background border-b">
        <div className="app-container py-6">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
            Browse Conferences
          </h1>
          <p className="text-muted-foreground mt-1 max-w-2xl">
            Discover academic conferences, view schedules, and submit your research
          </p>
        </div>
      </section>

      {/* Search Bar */}
      <section className="bg-background border-b sticky top-[var(--navbar-height)] z-30">
        <div className="app-container py-3">
          <div className="relative max-w-2xl">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search by conference name, topic, or location..."
              value={filters.search}
              onChange={(e) =>
                setFilters({ ...filters, search: e.target.value })
              }
              className="pl-10 pr-10 h-11"
            />
            {filters.search && (
              <button
                onClick={() => setFilters({ ...filters, search: '' })}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Main Content */}
{/* <section className="bg-muted/30">
  <div className="app-container py-6">
    <div className="flex gap-6"> */}

      {/* Main Content */}
      <section className="bg-muted/30">
        <div className="app-container py-6">
          <div className="flex gap-6">
            {/* Left Sidebar - Desktop */}
            <aside className="hidden lg:block w-64 shrink-0">
              <div className="sticky top-32 bg-background rounded-lg border p-4">
                <FilterSidebar
                  filters={filters}
                  onFilterChange={setFilters}
                  availableTopics={availableTopics}
                  counts={counts}
                />
              </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 min-w-0">
              {/* Results Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-3">
                  {/* Mobile filter button */}
                  <Sheet open={mobileFiltersOpen} onOpenChange={setMobileFiltersOpen}>
                    <SheetTrigger asChild>
                      <Button variant="outline" size="sm" className="lg:hidden gap-2">
                        <SlidersHorizontal className="h-4 w-4" />
                        Filters
                        {activeFiltersCount > 0 && (
                          <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 justify-center">
                            {activeFiltersCount}
                          </Badge>
                        )}
                      </Button>
                    </SheetTrigger>
                    <SheetContent side="left" className="w-80">
                      <SheetHeader>
                        <SheetTitle>Filters</SheetTitle>
                      </SheetHeader>
                      <div className="mt-6">
                        <FilterSidebar
                          filters={filters}
                          onFilterChange={(newFilters) => {
                            setFilters(newFilters);
                          }}
                          availableTopics={availableTopics}
                          counts={counts}
                        />
                      </div>
                    </SheetContent>
                  </Sheet>

                  {/* Results count */}
                  <p className="text-sm text-muted-foreground">
                    <span className="font-medium text-foreground">{filteredConferences.length}</span>
                    {' '}conference{filteredConferences.length !== 1 ? 's' : ''} found
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {/* Sort */}
                  <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
                    <SelectTrigger className="w-[160px] h-9">
                      <ArrowUpDown className="h-3.5 w-3.5 mr-2" />
                      <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="date-asc">Date (Soonest)</SelectItem>
                      <SelectItem value="date-desc">Date (Latest)</SelectItem>
                      <SelectItem value="name-asc">Name (A-Z)</SelectItem>
                      <SelectItem value="name-desc">Name (Z-A)</SelectItem>
                      <SelectItem value="popular">Most Popular</SelectItem>
                    </SelectContent>
                  </Select>

                  {/* View toggle */}
                  <div className="flex border rounded-md">
                    <Button
                      variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                      size="sm"
                      className="rounded-r-none px-2.5"
                      onClick={() => setViewMode('list')}
                    >
                      <List className="h-4 w-4" />
                    </Button>
                    <Button
                      variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                      size="sm"
                      className="rounded-l-none px-2.5"
                      onClick={() => setViewMode('grid')}
                    >
                      <Grid3X3 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Active Filters Pills */}
              {activeFiltersCount > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {filters.upcoming && (
                    <Badge variant="secondary" className="gap-1 pr-1">
                      Upcoming
                      <button 
                        onClick={() => setFilters({ ...filters, upcoming: false })}
                        className="ml-1 hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  )}
                  {filters.past && (
                    <Badge variant="secondary" className="gap-1 pr-1">
                      Past
                      <button 
                        onClick={() => setFilters({ ...filters, past: false })}
                        className="ml-1 hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  )}
                  {filters.registrationOpen && (
                    <Badge variant="secondary" className="gap-1 pr-1">
                      Registration Open
                      <button 
                        onClick={() => setFilters({ ...filters, registrationOpen: false })}
                        className="ml-1 hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  )}
                  {filters.cfpOpen && (
                    <Badge variant="secondary" className="gap-1 pr-1">
                      CFP Open
                      <button 
                        onClick={() => setFilters({ ...filters, cfpOpen: false })}
                        className="ml-1 hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  )}
                  {filters.topics.map((topic) => (
                    <Badge key={topic} variant="secondary" className="gap-1 pr-1">
                      {topic}
                      <button 
                        onClick={() => setFilters({ 
                          ...filters, 
                          topics: filters.topics.filter((t) => t !== topic) 
                        })}
                        className="ml-1 hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}

              {/* Conference List */}
              {loading ? (
                <div className={viewMode === 'list' 
                  ? 'space-y-4' 
                  : 'grid gap-4 sm:grid-cols-2 xl:grid-cols-3'
                }>
                  {[1, 2, 3, 4, 5].map((i) =>
                    viewMode === 'list' 
                      ? <ConferenceListCardSkeleton key={i} />
                      : <ConferenceGridCardSkeleton key={i} />
                  )}
                </div>
              ) : error ? (
                <div className="text-center py-12 bg-background rounded-lg border">
                  <AlertCircle className="h-12 w-12 text-destructive/50 mx-auto mb-4" />
                  <p className="text-destructive mb-4">{error}</p>
                  <Button onClick={() => window.location.reload()}>Try Again</Button>
                </div>
              ) : filteredConferences.length === 0 ? (
                <div className="text-center py-16 bg-background rounded-lg border">
                  <Calendar className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
                  <h3 className="font-semibold text-lg mb-2">No conferences found</h3>
                  <p className="text-sm text-muted-foreground max-w-sm mx-auto mb-4">
                    {activeFiltersCount > 0 || filters.search
                      ? 'Try adjusting your search or filters to find more conferences.'
                      : 'Check back later for upcoming academic conferences.'}
                  </p>
                  {(activeFiltersCount > 0 || filters.search) && (
                    <Button
                      variant="outline"
                      onClick={() => setFilters({
                        search: '',
                        upcoming: false,
                        past: false,
                        registrationOpen: false,
                        cfpOpen: false,
                        topics: [],
                      })}
                    >
                      Clear all filters
                    </Button>
                  )}
                </div>
              ) : (
                <div className={viewMode === 'list' 
                  ? 'space-y-4' 
                  : 'grid gap-4 sm:grid-cols-2 xl:grid-cols-3'
                }>
                  {filteredConferences.map((conference) =>
                    viewMode === 'list' 
                      ? <ConferenceListCard key={conference.id} conference={conference} />
                      : <ConferenceGridCard key={conference.id} conference={conference} />
                  )}
                </div>
              )}
            </main>
          </div>
        </div>
      </section>
    </div>
  );
}
