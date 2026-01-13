"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import apiClient, { handleApiError } from "@/lib/api/client";
import { API_ENDPOINTS } from "@/lib/api/endpoints";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Users,
  Search,
  Mail,
  Building2,
  Mic,
  Presentation,
  Calendar,
  AlertCircle,
} from "lucide-react";

interface Speaker {
  id: number;
  name: string;
  email: string;
  organization: string | null;
  presentations: Array<{
    id: number;
    title: string;
    status: string;
    session?: {
      id: number;
      name: string;
      day?: {
        id: number;
        name: string;
        date: string;
      };
    };
  }>;
}

interface Submission {
  id: number;
  title: string;
  status: string;
  author: {
    id: number;
    name: string;
    email: string;
    organization: string | null;
  };
  coAuthors?: Array<{
    name: string;
    email: string;
    organization?: string;
  }>;
  presentation?: {
    id: number;
    status: string;
    section?: {
      id: number;
      name: string;
      day?: {
        id: number;
        name: string;
        date: string;
      };
    };
  };
}

export default function SpeakersPage() {
  const params = useParams();
  const conferenceId = Number(params?.id);

  const [speakers, setSpeakers] = useState<Speaker[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchSpeakers = useCallback(async () => {
    if (!conferenceId) return;
    setLoading(true);
    setError(null);

    try {
      // Fetch all accepted submissions to build speaker list
      const res = await apiClient.get(API_ENDPOINTS.ORGANIZER.SUBMISSIONS(conferenceId));
      const submissions: Submission[] = res.data.submissions || res.data || [];

      // Filter for accepted submissions and extract unique speakers
      const speakerMap = new Map<string, Speaker>();

      submissions
        .filter((sub) => sub.status === "accepted")
        .forEach((sub) => {
          // Add primary author as speaker
          const authorKey = sub.author.email.toLowerCase();
          if (!speakerMap.has(authorKey)) {
            speakerMap.set(authorKey, {
              id: sub.author.id,
              name: sub.author.name,
              email: sub.author.email,
              organization: sub.author.organization,
              presentations: [],
            });
          }
          speakerMap.get(authorKey)?.presentations.push({
            id: sub.id,
            title: sub.title,
            status: sub.presentation?.status || "pending",
            session: sub.presentation?.section
              ? {
                  id: sub.presentation.section.id,
                  name: sub.presentation.section.name,
                  day: sub.presentation.section.day,
                }
              : undefined,
          });

          // Add co-authors as speakers
          if (sub.coAuthors) {
            sub.coAuthors.forEach((coAuthor, idx) => {
              const coAuthorKey = coAuthor.email?.toLowerCase() || `${sub.id}-coauthor-${idx}`;
              if (coAuthor.email && !speakerMap.has(coAuthorKey)) {
                speakerMap.set(coAuthorKey, {
                  id: sub.author.id * 1000 + idx, // Generate unique ID for co-authors
                  name: coAuthor.name,
                  email: coAuthor.email,
                  organization: coAuthor.organization || null,
                  presentations: [],
                });
              }
              if (coAuthor.email) {
                speakerMap.get(coAuthorKey)?.presentations.push({
                  id: sub.id,
                  title: sub.title,
                  status: sub.presentation?.status || "pending",
                  session: sub.presentation?.section
                    ? {
                        id: sub.presentation.section.id,
                        name: sub.presentation.section.name,
                        day: sub.presentation.section.day,
                      }
                    : undefined,
                });
              }
            });
          }
        });

      setSpeakers(Array.from(speakerMap.values()));
    } catch (err) {
      setError(handleApiError(err));
    } finally {
      setLoading(false);
    }
  }, [conferenceId]);

  useEffect(() => {
    fetchSpeakers();
  }, [fetchSpeakers]);

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  // Filter speakers
  const filteredSpeakers = speakers.filter((speaker) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      speaker.name.toLowerCase().includes(query) ||
      speaker.email.toLowerCase().includes(query) ||
      speaker.organization?.toLowerCase().includes(query) ||
      speaker.presentations.some((p) => p.title.toLowerCase().includes(query))
    );
  });

  // Sort by number of presentations
  const sortedSpeakers = [...filteredSpeakers].sort(
    (a, b) => b.presentations.length - a.presentations.length
  );

  // Stats
  const totalPresentations = speakers.reduce((acc, s) => acc + s.presentations.length, 0);
  const scheduledPresentations = speakers.reduce(
    (acc, s) => acc + s.presentations.filter((p) => p.session).length,
    0
  );

  if (!conferenceId) return null;

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-12" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3 text-destructive">
            <AlertCircle className="h-5 w-5" />
            <p>{error}</p>
          </div>
          <Button variant="outline" className="mt-4" onClick={fetchSpeakers}>
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold flex items-center gap-2">
          <Mic className="h-6 w-6 text-primary" />
          Speakers Directory
        </h1>
        <p className="text-muted-foreground mt-1">
          Directory of speakers and presenters with their assigned presentations
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-purple-500/10">
                <Users className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{speakers.length}</p>
                <p className="text-sm text-muted-foreground">Total Speakers</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-blue-500/10">
                <Presentation className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalPresentations}</p>
                <p className="text-sm text-muted-foreground">Presentations</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-green-500/10">
                <Calendar className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{scheduledPresentations}</p>
                <p className="text-sm text-muted-foreground">Scheduled</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, email, organization, or presentation title..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Speakers Grid */}
      {sortedSpeakers.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                {searchQuery ? "No speakers found matching your search" : "No speakers yet"}
              </p>
              {!searchQuery && (
                <p className="text-sm text-muted-foreground mt-1">
                  Speakers will appear here when submissions are accepted
                </p>
              )}
              {searchQuery && (
                <Button variant="link" onClick={() => setSearchQuery("")}>
                  Clear search
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {sortedSpeakers.map((speaker) => (
            <Card key={speaker.id} className="overflow-hidden hover:shadow-lg transition-shadow">
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <Avatar className="h-12 w-12">
                    <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/40 text-primary font-semibold">
                      {getInitials(speaker.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold truncate">{speaker.name}</h3>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                      <Mail className="h-3 w-3 shrink-0" />
                      <span className="truncate">{speaker.email}</span>
                    </div>
                    {speaker.organization && (
                      <div className="flex items-center gap-1 text-sm text-muted-foreground mt-0.5">
                        <Building2 className="h-3 w-3 shrink-0" />
                        <span className="truncate">{speaker.organization}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">
                      {speaker.presentations.length} Presentation{speaker.presentations.length !== 1 ? "s" : ""}
                    </span>
                    <Badge variant="secondary" className="text-xs">
                      {speaker.presentations.filter((p) => p.session).length} scheduled
                    </Badge>
                  </div>

                  <div className="space-y-2">
                    {speaker.presentations.slice(0, 2).map((presentation) => (
                      <Link
                        key={presentation.id}
                        href={`/organizer/conferences/${conferenceId}/submissions/${presentation.id}`}
                      >
                        <div className="group p-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors cursor-pointer">
                          <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">
                            {presentation.title}
                          </p>
                          {presentation.session ? (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                              <Calendar className="h-3 w-3" />
                              <span>
                                {presentation.session.day?.name || "TBD"} • {presentation.session.name}
                              </span>
                            </div>
                          ) : (
                            <div className="text-xs text-amber-500 mt-1">Not yet scheduled</div>
                          )}
                        </div>
                      </Link>
                    ))}
                    {speaker.presentations.length > 2 && (
                      <p className="text-xs text-muted-foreground text-center pt-1">
                        +{speaker.presentations.length - 2} more presentation{speaker.presentations.length - 2 !== 1 ? "s" : ""}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Results count */}
      {sortedSpeakers.length > 0 && (
        <p className="text-sm text-muted-foreground text-center">
          Showing {sortedSpeakers.length} of {speakers.length} speakers
        </p>
      )}
    </div>
  );
}
