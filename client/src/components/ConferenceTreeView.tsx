"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  ChevronRight,
  ChevronDown,
  Calendar,
  Clock,
  MapPin,
  Users,
  Search,
  Heart,
  Star,
  BookOpen,
  Filter,
  SortAsc,
  Eye,
  User,
  X,
} from "lucide-react";
import { createAuthenticatedApi } from "@/lib/utils";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

// Shared components
import PresentationCard from "@/components/shared/PresentationCard";
import LoadingStates from "@/components/shared/LoadingStates";
import { EmptySchedule } from "@/components/shared/EmptyStates";

// Hooks
import { useFavorites } from "@/hooks/useFavorites";

// Types
import {
  ConferenceSchedule,
  Day,
  Section,
  Presentation,
} from "@/types/schedule";

interface ConferenceTreeViewProps {
  conferenceId: number;
  className?: string;
  showSearch?: boolean;
  expandedByDefault?: boolean;
  highlightPresentationId?: number;
  onPresentationSelect?: (presentation: Presentation) => void;
}

export default function ConferenceTreeView({
  conferenceId,
  className = "",
  showSearch = true,
  expandedByDefault = false,
  highlightPresentationId,
  onPresentationSelect,
}: ConferenceTreeViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { favoriteLoading, toggleFavorite } = useFavorites();

  // State management
  const [schedule, setSchedule] = useState<ConferenceSchedule | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedDays, setExpandedDays] = useState<Set<number>>(new Set());
  const [expandedSections, setExpandedSections] = useState<Set<number>>(
    new Set()
  );
  const [sortBy, setSortBy] = useState<"time" | "name" | "popularity">("time");
  const [filterType, setFilterType] = useState<string>("all");
  const [searchResults, setSearchResults] = useState<number[]>([]);

  // URL parameters handling
  useEffect(() => {
    const expandDay = searchParams.get("expandDay");
    const expandSection = searchParams.get("expandSection");
    const highlight = searchParams.get("highlight");

    if (expandDay) {
      setExpandedDays((prev) => new Set([...prev, Number(expandDay)]));
    }
    if (expandSection) {
      setExpandedSections((prev) => new Set([...prev, Number(expandSection)]));
    }
    if (highlight) {
      setTimeout(() => {
        const element = document.getElementById(`presentation-${highlight}`);
        if (element) {
          element.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }, 500);
    }
  }, [searchParams]);

  // Fetch conference schedule
  const fetchSchedule = useCallback(async () => {
    try {
      setLoading(true);
      const api = await createAuthenticatedApi();
      const response = await api.get(`/conferences/${conferenceId}/schedule`);
      setSchedule(response.data);

      if (expandedByDefault && response.data.days.length > 0) {
        const dayIds = response.data.days.map((day: Day) => day.id);
        const sectionIds = response.data.days.flatMap((day: Day) =>
          day.sections.map((section) => section.id)
        );
        setExpandedDays(new Set(dayIds));
        setExpandedSections(new Set(sectionIds));
      }
    } catch (error: any) {
      console.error("Error fetching schedule:", error);
      setError(
        error.response?.data?.message || "Failed to load conference schedule"
      );
      toast.error("Failed to load conference schedule");
    } finally {
      setLoading(false);
    }
  }, [conferenceId, expandedByDefault]);

  useEffect(() => {
    fetchSchedule();
  }, [fetchSchedule]);

  // Handle favorite update
  const handleFavoriteUpdate = (id: number, newState: boolean) => {
    if (!schedule) return;

    setSchedule((prev) => {
      if (!prev) return prev;

      return {
        ...prev,
        days: prev.days.map((day) => ({
          ...day,
          sections: day.sections.map((section) => ({
            ...section,
            presentations: section.presentations.map((p) =>
              p.id === id
                ? {
                    ...p,
                    isFavorite: newState,
                    favoriteCount: newState
                      ? p.favoriteCount + 1
                      : p.favoriteCount - 1,
                  }
                : p
            ),
          })),
        })),
      };
    });
  };

  // Handle favorite toggle
  const handleFavoriteToggle = (presentationId: number) => {
    const presentation = schedule?.days
      .flatMap((day) => day.sections)
      .flatMap((section) => section.presentations)
      .find((p) => p.id === presentationId);

    if (!presentation) return;

    toggleFavorite(
      presentationId,
      presentation.isFavorite,
      handleFavoriteUpdate
    );
  };

  // Toggle functions
  const toggleDay = (dayId: number) => {
    setExpandedDays((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(dayId)) {
        newSet.delete(dayId);
      } else {
        newSet.add(dayId);
      }
      return newSet;
    });
  };

  const toggleSection = (sectionId: number) => {
    setExpandedSections((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId);
      } else {
        newSet.add(sectionId);
      }
      return newSet;
    });
  };

  const navigateToPresentation = useCallback(
    (presentationId: number) => {
      if (!schedule) return;

      // Find the presentation and its hierarchy
      for (const day of schedule.days) {
        for (const section of day.sections) {
          const presentation = section.presentations.find(
            (p) => p.id === presentationId
          );
          if (presentation) {
            // Expand the day and section
            setExpandedDays((prev) => new Set([...prev, day.id]));
            setExpandedSections((prev) => new Set([...prev, section.id]));

            // Scroll to presentation after a brief delay for expansion animation
            setTimeout(() => {
              const element = document.getElementById(
                `presentation-${presentationId}`
              );
              if (element) {
                element.scrollIntoView({
                  behavior: "smooth",
                  block: "center",
                });

                // Add temporary highlight effect
                element.classList.add("ring-2", "ring-blue-500", "bg-blue-50");
                setTimeout(() => {
                  element.classList.remove(
                    "ring-2",
                    "ring-blue-500",
                    "bg-blue-50"
                  );
                }, 2000);
              }
            }, 300);

            return true;
          }
        }
      }
      return false;
    },
    [schedule]
  );

  const performSearch = useCallback(
    (term: string) => {
      if (!schedule || !term) {
        setSearchResults([]);
        return;
      }

      const results: number[] = [];
      const searchLower = term.toLowerCase();

      schedule.days.forEach((day) => {
        day.sections.forEach((section) => {
          section.presentations.forEach((presentation) => {
            const matches =
              presentation.title.toLowerCase().includes(searchLower) ||
              presentation.abstract?.toLowerCase().includes(searchLower) ||
              presentation.keywords.some((keyword) =>
                keyword.toLowerCase().includes(searchLower)
              ) ||
              presentation.authors.some(
                (author) =>
                  author.name.toLowerCase().includes(searchLower) ||
                  author.affiliation?.toLowerCase().includes(searchLower)
              );

            if (matches) {
              results.push(presentation.id);
            }
          });
        });
      });

      setSearchResults(results);

      // Auto-expand sections with results
      if (results.length > 0) {
        const relevantDays = new Set<number>();
        const relevantSections = new Set<number>();

        schedule.days.forEach((day) => {
          day.sections.forEach((section) => {
            if (section.presentations.some((p) => results.includes(p.id))) {
              relevantDays.add(day.id);
              relevantSections.add(section.id);
            }
          });
        });

        setExpandedDays(relevantDays);
        setExpandedSections(relevantSections);
      }
    },
    [schedule]
  );

  // Effect to handle URL-based navigation
  useEffect(() => {
    const handleNavigateFromUrl = () => {
      const highlightParam = searchParams.get("highlight");
      if (highlightParam && schedule) {
        const presentationId = Number(highlightParam);
        navigateToPresentation(presentationId);
      }
    };

    if (schedule) {
      handleNavigateFromUrl();
    }
  }, [schedule, searchParams, navigateToPresentation]);

  // Keyboard shortcut for search
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ctrl/Cmd + K to focus search
      if ((event.ctrlKey || event.metaKey) && event.key === "k") {
        event.preventDefault();
        const searchInput = document.querySelector(
          'input[placeholder*="Search presentations"]'
        ) as HTMLInputElement;
        if (searchInput) {
          searchInput.focus();
        }
      }

      // Escape to clear search
      if (event.key === "Escape" && searchTerm) {
        setSearchTerm("");
        setSearchResults([]);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [searchTerm]);

  // Filter and sort functions
  const getFilteredAndSortedDays = () => {
    if (!schedule) return [];

    let days = [...schedule.days];

    // Apply search filter
    if (searchTerm) {
      days = days
        .map((day) => ({
          ...day,
          sections: day.sections
            .map((section) => ({
              ...section,
              presentations: section.presentations.filter(
                (presentation) =>
                  presentation.title
                    .toLowerCase()
                    .includes(searchTerm.toLowerCase()) ||
                  presentation.abstract
                    ?.toLowerCase()
                    .includes(searchTerm.toLowerCase()) ||
                  presentation.keywords.some((keyword) =>
                    keyword.toLowerCase().includes(searchTerm.toLowerCase())
                  ) ||
                  presentation.authors.some(
                    (author) =>
                      author.name
                        .toLowerCase()
                        .includes(searchTerm.toLowerCase()) ||
                      author.affiliation
                        ?.toLowerCase()
                        .includes(searchTerm.toLowerCase())
                  )
              ),
            }))
            .filter((section) => section.presentations.length > 0),
        }))
        .filter((day) => day.sections.length > 0);
    }

    // Apply type filter
    if (filterType !== "all") {
      days = days
        .map((day) => ({
          ...day,
          sections: day.sections.filter(
            (section) => section.type === filterType
          ),
        }))
        .filter((day) => day.sections.length > 0);
    }

    // Sort sections within days
    days = days.map((day) => ({
      ...day,
      sections: [...day.sections].sort((a, b) => {
        switch (sortBy) {
          case "time":
            if (!a.startTime || !b.startTime) return a.order - b.order;
            return (
              new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
            );
          case "name":
            return a.name.localeCompare(b.name);
          case "popularity":
            return b.attendeeCount - a.attendeeCount;
          default:
            return a.order - b.order;
        }
      }),
    }));

    return days;
  };

  // Helper functions
  const formatTime = (timeString?: string) => {
    if (!timeString) return "";
    return new Date(timeString).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString([], {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const isSessionActive = (startTime?: string, endTime?: string) => {
    if (!startTime || !endTime) return false;
    const now = new Date();
    const start = new Date(startTime);
    const end = new Date(endTime);
    return now >= start && now <= end;
  };

  const isSessionUpcoming = (startTime?: string) => {
    if (!startTime) return false;
    const now = new Date();
    const start = new Date(startTime);
    const timeDiff = start.getTime() - now.getTime();
    return timeDiff > 0 && timeDiff <= 30 * 60 * 1000; // Within 30 minutes
  };

  const getSessionStatusBadge = (startTime?: string, endTime?: string) => {
    if (isSessionActive(startTime, endTime)) {
      return (
        <Badge className="bg-green-500 text-white animate-pulse">
          <div className="h-2 w-2 bg-white rounded-full mr-1"></div>
          Live Now
        </Badge>
      );
    }

    if (isSessionUpcoming(startTime)) {
      return (
        <Badge className="bg-orange-500 text-white">
          <Clock className="h-3 w-3 mr-1" />
          Starting Soon
        </Badge>
      );
    }

    return null;
  };

  const getSectionTypeIcon = (type: string) => {
    switch (type) {
      case "keynote":
        return <Star className="h-4 w-4" />;
      case "presentation":
        return <BookOpen className="h-4 w-4" />;
      case "workshop":
        return <Users className="h-4 w-4" />;
      case "break":
        return <Clock className="h-4 w-4" />;
      default:
        return <Calendar className="h-4 w-4" />;
    }
  };

  const getSectionTypeBadgeColor = (type: string) => {
    switch (type) {
      case "keynote":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "presentation":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "workshop":
        return "bg-green-100 text-green-800 border-green-200";
      case "break":
        return "bg-gray-100 text-gray-800 border-gray-200";
      default:
        return "bg-purple-100 text-purple-800 border-purple-200";
    }
  };

  // Loading state
  if (loading) {
    return <LoadingStates variant="tree" className={className} />;
  }

  // Error state
  if (error || !schedule) {
    return (
      <div className={cn("text-center py-8", className)}>
        <h3 className="text-lg font-semibold text-red-600 mb-2">
          {error || "Conference schedule not available"}
        </h3>
        <Button variant="outline" onClick={fetchSchedule}>
          Try Again
        </Button>
      </div>
    );
  }

  const filteredDays = getFilteredAndSortedDays();

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header and Controls */}
      <div className="flex flex-col gap-4 mb-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">
            {schedule.conference.name} - Schedule
          </h2>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setExpandedDays(new Set(schedule.days.map((day) => day.id)));
                setExpandedSections(
                  new Set(
                    schedule.days.flatMap((day) =>
                      day.sections.map((section) => section.id)
                    )
                  )
                );
              }}
            >
              Expand All
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setExpandedDays(new Set());
                setExpandedSections(new Set());
              }}
            >
              Collapse All
            </Button>
          </div>
        </div>

        {/* Search and Filters */}
        {showSearch && (
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search presentations, authors, or keywords... (Ctrl+K)"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  performSearch(e.target.value);
                }}
                className="pl-10 pr-10"
              />
              {searchTerm && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                  onClick={() => {
                    setSearchTerm("");
                    setSearchResults([]);
                  }}
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Filter className="h-4 w-4 mr-2" />
                  Filter
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => setFilterType("all")}>
                  All Types
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setFilterType("keynote")}>
                  Keynotes
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setFilterType("presentation")}>
                  Presentations
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setFilterType("workshop")}>
                  Workshops
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setFilterType("panel")}>
                  Panel Discussions
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <SortAsc className="h-4 w-4 mr-2" />
                  Sort
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => setSortBy("time")}>
                  By Time
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortBy("name")}>
                  By Name
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortBy("popularity")}>
                  By Popularity
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}

        {searchTerm && (
          <div className="text-sm text-gray-500 flex items-center justify-between bg-blue-50 p-3 rounded-lg border">
            <span className="flex items-center gap-2">
              <Search className="h-4 w-4" />
              {searchResults.length} result
              {searchResults.length !== 1 ? "s" : ""} found
              {searchTerm && ` for "${searchTerm}"`}
            </span>
            {searchResults.length > 0 && (
              <div className="flex gap-2">
                <Button
                  variant="link"
                  size="sm"
                  className="p-0 h-auto text-blue-600 hover:text-blue-800"
                  onClick={() => {
                    if (searchResults.length > 0) {
                      navigateToPresentation(searchResults[0]);
                    }
                  }}
                >
                  Jump to first result
                </Button>
                {searchResults.length > 1 && (
                  <span className="text-xs text-gray-400">
                    ({searchResults.length - 1} more)
                  </span>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Tree View */}
      <div className="space-y-4">
        {filteredDays.length === 0 ? (
          <EmptySchedule
            filterType={filterType}
            onResetFilters={() => {
              setFilterType("all");
              setSearchTerm("");
            }}
          />
        ) : (
          <AnimatePresence>
            {filteredDays.map((day) => (
              <motion.div
                key={day.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <Card className="overflow-hidden">
                  <Collapsible
                    open={expandedDays.has(day.id)}
                    onOpenChange={() => toggleDay(day.id)}
                  >
                    <CollapsibleTrigger asChild>
                      <CardHeader className="cursor-pointer hover:bg-gray-50 transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            {expandedDays.has(day.id) ? (
                              <ChevronDown className="h-5 w-5 text-gray-500" />
                            ) : (
                              <ChevronRight className="h-5 w-5 text-gray-500" />
                            )}
                            <div>
                              <CardTitle className="text-lg">
                                {day.name}
                              </CardTitle>
                              <p className="text-sm text-gray-500 mt-1">
                                {formatDate(day.date)}
                              </p>
                            </div>
                          </div>
                          <Badge variant="outline" className="bg-blue-50">
                            {day.sections.length} sections
                          </Badge>
                        </div>
                      </CardHeader>
                    </CollapsibleTrigger>

                    <CollapsibleContent>
                      <CardContent className="pt-0">
                        <div className="space-y-3 ml-8">
                          {day.sections.map((section) => (
                            <Card
                              key={section.id}
                              className="border-l-4 border-l-gray-200"
                            >
                              <Collapsible
                                open={expandedSections.has(section.id)}
                                onOpenChange={() => toggleSection(section.id)}
                              >
                                <CollapsibleTrigger asChild>
                                  <CardHeader className="cursor-pointer hover:bg-gray-50 transition-colors pb-3">
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-3">
                                        {expandedSections.has(section.id) ? (
                                          <ChevronDown className="h-4 w-4 text-gray-500" />
                                        ) : (
                                          <ChevronRight className="h-4 w-4 text-gray-500" />
                                        )}
                                        <div className="flex items-center gap-2">
                                          {getSectionTypeIcon(section.type)}
                                          <div>
                                            <CardTitle className="text-base">
                                              {section.name}
                                            </CardTitle>
                                            <div className="flex items-center gap-3 text-sm text-gray-500 mt-1">
                                              {section.startTime &&
                                                section.endTime && (
                                                  <div className="flex items-center gap-1">
                                                    <Clock className="h-3 w-3" />
                                                    {formatTime(
                                                      section.startTime
                                                    )}{" "}
                                                    -{" "}
                                                    {formatTime(
                                                      section.endTime
                                                    )}
                                                  </div>
                                                )}
                                              {section.room && (
                                                <div className="flex items-center gap-1">
                                                  <MapPin className="h-3 w-3" />
                                                  {section.room}
                                                </div>
                                              )}
                                              <div className="flex items-center gap-1">
                                                <Users className="h-3 w-3" />
                                                {section.attendeeCount}{" "}
                                                attending
                                              </div>
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <Badge
                                          variant="outline"
                                          className={getSectionTypeBadgeColor(
                                            section.type
                                          )}
                                        >
                                          {section.type}
                                        </Badge>
                                        <Badge
                                          variant="outline"
                                          className="text-xs"
                                        >
                                          {section.presentations.length}{" "}
                                          presentations
                                        </Badge>
                                        {getSessionStatusBadge(
                                          section.startTime,
                                          section.endTime
                                        )}
                                      </div>
                                    </div>
                                  </CardHeader>
                                </CollapsibleTrigger>

                                <CollapsibleContent>
                                  <CardContent className="pt-0">
                                    {section.description && (
                                      <p className="text-sm text-gray-600 mb-4 ml-7">
                                        {section.description}
                                      </p>
                                    )}

                                    <div className="space-y-3 ml-7">
                                      {section.presentations.map(
                                        (presentation) => (
                                          <div
                                            key={presentation.id}
                                            id={`presentation-${presentation.id}`}
                                            className={cn(
                                              "group",
                                              highlightPresentationId ===
                                                presentation.id &&
                                                "animate-pulse"
                                            )}
                                          >
                                            <PresentationCard
                                              presentation={presentation}
                                              onFavoriteToggle={
                                                handleFavoriteToggle
                                              }
                                              onSelect={onPresentationSelect}
                                              favoriteLoading={favoriteLoading.has(
                                                presentation.id
                                              )}
                                              compact={true}
                                              showActions={true}
                                              highlighted={
                                                highlightPresentationId ===
                                                  presentation.id ||
                                                (searchTerm &&
                                                  searchResults.includes(
                                                    presentation.id
                                                  ))
                                              }
                                            />
                                          </div>
                                        )
                                      )}
                                    </div>
                                  </CardContent>
                                </CollapsibleContent>
                              </Collapsible>
                            </Card>
                          ))}
                        </div>
                      </CardContent>
                    </CollapsibleContent>
                  </Collapsible>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
