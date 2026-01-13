"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import apiClient, { handleApiError } from '@/lib/api/client';
import { API_ENDPOINTS } from '@/lib/api/endpoints';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  CalendarDays, 
  Clock,
  MapPin,
  ChevronRight,
  Search,
  Calendar,
  Users,
  Building2,
  AlertCircle
} from 'lucide-react';

interface RegisteredConference {
  id: number;
  slug?: string;
  title: string;
  description?: string;
  startDate: string;
  endDate: string;
  location?: string;
  organizer?: string;
  registrationDate: string;
  registrationId: string;
  status: 'upcoming' | 'active' | 'past';
}

export default function MyConferencesListPage() {
  const [conferences, setConferences] = useState<RegisteredConference[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('all');

  useEffect(() => {
    const fetchConferences = async () => {
      try {
        setLoading(true);
        setError(null);
        const { data } = await apiClient.get(API_ENDPOINTS.ACCOUNT.MY_CONFERENCES);
        setConferences(data);
      } catch (err) {
        console.error('Fetch conferences error:', err);
        setError(handleApiError(err));
      } finally {
        setLoading(false);
      }
    };

    fetchConferences();
  }, []);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatDateRange = (start: string, end: string) => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    
    if (startDate.toDateString() === endDate.toDateString()) {
      return formatDate(start);
    }
    
    const startStr = startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const endStr = endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    return `${startStr} - ${endStr}`;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'upcoming':
        return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">Upcoming</Badge>;
      case 'active':
        return <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Happening Now</Badge>;
      case 'past':
        return <Badge variant="secondary">Completed</Badge>;
      default:
        return null;
    }
  };

  const getDaysUntil = (dateString: string): number => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = date.getTime() - now.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  const filteredConferences = conferences.filter(conf => {
    if (activeTab === 'all') return true;
    return conf.status === activeTab;
  });

  const counts = {
    all: conferences.length,
    upcoming: conferences.filter(c => c.status === 'upcoming').length,
    active: conferences.filter(c => c.status === 'active').length,
    past: conferences.filter(c => c.status === 'past').length,
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-72" />
        </div>
        <Skeleton className="h-10 w-96" />
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <AlertCircle className="h-12 w-12 text-destructive/50 mb-4" />
        <p className="text-destructive mb-4">{error}</p>
        <Button onClick={() => window.location.reload()}>Try Again</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <CalendarDays className="h-6 w-6 text-primary" />
            My Conferences
          </h1>
          <p className="text-muted-foreground mt-1">
            Conferences you&apos;re registered for
          </p>
        </div>
        <Button asChild>
          <Link href="/conferences">
            <Search className="h-4 w-4 mr-2" />
            Find More Conferences
          </Link>
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">
            All
            <Badge variant="secondary" className="ml-2 h-5 min-w-5 flex items-center justify-center text-xs">
              {counts.all}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="upcoming">
            Upcoming
            <Badge variant="secondary" className="ml-2 h-5 min-w-5 flex items-center justify-center text-xs">
              {counts.upcoming}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="active">
            Active
            {counts.active > 0 && (
              <Badge className="ml-2 h-5 min-w-5 flex items-center justify-center text-xs bg-green-100 text-green-700">
                {counts.active}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="past">
            Past
            <Badge variant="secondary" className="ml-2 h-5 min-w-5 flex items-center justify-center text-xs">
              {counts.past}
            </Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          {filteredConferences.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <CalendarDays className="h-16 w-16 text-muted-foreground/30 mb-4" />
                <h3 className="font-semibold text-lg mb-2">
                  {activeTab === 'all' 
                    ? "No conferences yet" 
                    : `No ${activeTab} conferences`}
                </h3>
                <p className="text-sm text-muted-foreground mb-4 text-center max-w-sm">
                  {activeTab === 'all' 
                    ? "You haven't registered for any conferences yet. Start exploring!"
                    : `You don't have any ${activeTab} conferences.`}
                </p>
                <Button asChild>
                  <Link href="/conferences">Browse Conferences</Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredConferences.map((conf) => {
                const daysUntil = getDaysUntil(conf.startDate);
                
                return (
                  <Card key={conf.id} className="overflow-hidden hover:shadow-md transition-shadow">
                    <div className="flex flex-col sm:flex-row">
                      {/* Left side - Date badge */}
                      <div className="sm:w-28 p-4 bg-muted/50 flex flex-col items-center justify-center text-center border-b sm:border-b-0 sm:border-r">
                        <Calendar className="h-6 w-6 text-primary mb-1" />
                        <div className="text-2xl font-bold">
                          {new Date(conf.startDate).getDate()}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {new Date(conf.startDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                        </div>
                        {conf.status === 'upcoming' && daysUntil > 0 && daysUntil <= 30 && (
                          <Badge className="mt-2 bg-amber-100 text-amber-700 hover:bg-amber-100">
                            {daysUntil === 1 ? 'Tomorrow' : `${daysUntil} days`}
                          </Badge>
                        )}
                      </div>

                      {/* Right side - Content */}
                      <CardContent className="flex-1 p-4 sm:p-5">
                        <div className="flex flex-col h-full">
                          <div className="flex items-start justify-between gap-3 mb-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="font-semibold text-lg line-clamp-1">
                                  {conf.title}
                                </h3>
                                {getStatusBadge(conf.status)}
                              </div>
                            </div>
                          </div>

                          {conf.description && (
                            <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                              {conf.description}
                            </p>
                          )}

                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-muted-foreground mb-4">
                            <span className="flex items-center gap-1.5">
                              <Clock className="h-4 w-4" />
                              {formatDateRange(conf.startDate, conf.endDate)}
                            </span>
                            {conf.location && (
                              <span className="flex items-center gap-1.5">
                                <MapPin className="h-4 w-4" />
                                {conf.location}
                              </span>
                            )}
                            {conf.organizer && (
                              <span className="flex items-center gap-1.5">
                                <Building2 className="h-4 w-4" />
                                {conf.organizer}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center justify-between mt-auto pt-2 border-t">
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Users className="h-3.5 w-3.5" />
                              <span>Registered: {formatDate(conf.registrationDate)}</span>
                              <span className="text-muted-foreground/50">•</span>
                              <span className="font-mono">{conf.registrationId}</span>
                            </div>
                            <Button variant="ghost" size="sm" asChild className="gap-1">
                              <Link href={`/conferences/${conf.slug || conf.id}`}>
                                View
                                <ChevronRight className="h-4 w-4" />
                              </Link>
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
