"use client";

import React from "react";
import { TreeScheduleData } from "../types";
import { DayNode } from "./DayNode";
import { useTreeNavigation } from "../hooks/useTreeNavigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Expand, 
  Shrink, 
  Search as SearchIcon,
  TreeDeciduous,
  X,
  User,
  Clock,
  MapPin,
  Heart,
  ExternalLink,
  Calendar,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ConferenceTreeProps {
  data: TreeScheduleData;
  highlightPresentationId?: number | null;
  onToggleFavorite?: (presentationId: number) => void;
  onViewPresentationDetails?: (presentationId: number) => void;
  isAuthenticated?: boolean;
  className?: string;
}

export function ConferenceTree({
  data,
  highlightPresentationId,
  onToggleFavorite,
  onViewPresentationDetails,
  isAuthenticated = false,
  className,
}: ConferenceTreeProps) {
  const {
    state,
    toggleDay,
    toggleSession,
    selectPresentation,
    expandAll,
    collapseAll,
    isDayExpanded,
  } = useTreeNavigation({ 
    days: data.days, 
    highlightPresentationId 
  });

  const [filterText, setFilterText] = React.useState("");

  // Filter presentations based on search text
  const filteredData = React.useMemo(() => {
    if (!filterText.trim()) return data;
    
    const searchLower = filterText.toLowerCase();
    
    return {
      ...data,
      days: data.days.map(day => ({
        ...day,
        sessions: day.sessions.map(session => ({
          ...session,
          presentations: session.presentations.filter(p => 
            p.title.toLowerCase().includes(searchLower) ||
            p.keywords.some(k => k.toLowerCase().includes(searchLower)) ||
            p.authors.some(a => a.authorName.toLowerCase().includes(searchLower))
          ),
        })).filter(s => s.presentations.length > 0 || s.type === "break"),
      })).filter(d => d.sessions.length > 0),
    };
  }, [data, filterText]);

  // Find selected presentation details
  const selectedPresentation = React.useMemo(() => {
    if (!state.selectedPresentationId) return null;
    
    for (const day of data.days) {
      for (const session of day.sessions) {
        const found = session.presentations.find(
          p => p.id === state.selectedPresentationId
        );
        if (found) {
          return { presentation: found, session, day };
        }
      }
    }
    return null;
  }, [state.selectedPresentationId, data.days]);


  return (
    <div className={cn("flex flex-col lg:flex-row gap-6", className)}>
      {/* Tree View */}
      <div className="flex-1 space-y-4">
        {/* **SIMPLIFIED: Search & Controls** */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <div className="relative flex-1">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Filter by title, author, keyword..."
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              className="pl-10 h-10 border-2"
            />
            {filterText && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                onClick={() => setFilterText("")}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={expandAll} className="flex-1 sm:flex-initial">
              <Expand className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Expand All</span>
            </Button>
            <Button variant="outline" size="sm" onClick={collapseAll} className="flex-1 sm:flex-initial">
              <Shrink className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Collapse All</span>
            </Button>
          </div>
        </div>

        {/* Tree Content */}
        <div className="space-y-4">
          {filteredData.days.length === 0 ? (
            <Card className="border-2">
              <CardContent className="py-12 text-center">
                <div className="inline-flex p-4 bg-muted/50 rounded-full mb-4">
                  <TreeDeciduous className="h-12 w-12 text-muted-foreground" />
                </div>
                <h3 className="font-semibold text-lg mb-2">
                  {filterText ? "No Results Found" : "No Schedule Available"}
                </h3>
                <p className="text-muted-foreground max-w-sm mx-auto">
                  {filterText 
                    ? "No presentations match your search criteria. Try different keywords."
                    : "The conference program has not been published yet."
                  }
                </p>
                {filterText && (
                  <Button 
                    variant="link" 
                    className="mt-4"
                    onClick={() => setFilterText("")}
                  >
                    Clear filter
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            // Standard tree view
            filteredData.days
              .sort((a, b) => a.order - b.order)
              .map((day) => (
                <DayNode
                  key={day.id}
                  day={day}
                  isExpanded={isDayExpanded(day.id)}
                  onToggle={() => toggleDay(day.id)}
                  expandedSessions={state.expandedSessions}
                  onToggleSession={toggleSession}
                  highlightedPresentationId={state.highlightedPresentationId}
                  selectedPresentationId={state.selectedPresentationId}
                  onSelectPresentation={selectPresentation}
                  onToggleFavorite={isAuthenticated ? onToggleFavorite : undefined}
                  onViewPresentationDetails={onViewPresentationDetails}
                />
              ))
          )}
        </div>
      </div>

      {/* **ENHANCED: Selected Presentation Detail Panel** */}
      {selectedPresentation && (
        <Card className="lg:w-96 lg:sticky lg:top-20 h-fit shadow-lg border-2">
          <div className="h-2 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500" />
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-2">
              <CardTitle className="text-base leading-snug pr-2">
                {selectedPresentation.presentation.title}
              </CardTitle>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 flex-shrink-0 hover:bg-red-100 hover:text-red-600"
                onClick={() => selectPresentation(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* **ENHANCED: Session & Time Info with icons** */}
            <div className="space-y-2 p-3 bg-blue-50 rounded-lg border border-blue-100">
              <div className="flex items-center gap-2 text-sm">
                <div className="p-1.5 bg-blue-100 rounded">
                  <Calendar className="h-3.5 w-3.5 text-blue-600" />
                </div>
                <span className="font-medium text-blue-900">{selectedPresentation.day.name}</span>
              </div>
              
              {selectedPresentation.session.startTime && (
                <div className="flex items-center gap-2 text-sm text-blue-800">
                  <div className="p-1.5 bg-blue-100 rounded">
                    <Clock className="h-3.5 w-3.5 text-blue-600" />
                  </div>
                  <span>
                    {new Date(selectedPresentation.session.startTime).toLocaleTimeString([], { 
                      hour: "2-digit", 
                      minute: "2-digit" 
                    })}
                    {selectedPresentation.session.endTime && (
                      <> - {new Date(selectedPresentation.session.endTime).toLocaleTimeString([], { 
                        hour: "2-digit", 
                        minute: "2-digit" 
                      })}</>
                    )}
                  </span>
                </div>
              )}
              
              <div className="flex items-center gap-2 text-sm text-blue-800">
                <div className="p-1.5 bg-blue-100 rounded">
                  <MapPin className="h-3.5 w-3.5 text-blue-600" />
                </div>
                <span className="font-medium">{selectedPresentation.session.name}</span>
                {selectedPresentation.session.room && (
                  <Badge variant="secondary" className="ml-auto bg-blue-200 text-blue-900">
                    {selectedPresentation.session.room}
                  </Badge>
                )}
              </div>
            </div>

            {/* Authors */}
            {selectedPresentation.presentation.authors.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-semibold flex items-center gap-2 text-gray-900">
                  <User className="h-4 w-4 text-purple-600" />
                  Authors
                </h4>
                <ul className="space-y-2 pl-1">
                  {selectedPresentation.presentation.authors.map((author, idx) => (
                    <li key={idx} className="text-sm">
                      <div className="flex items-start gap-2">
                        <div className="w-1 h-1 rounded-full bg-purple-400 mt-2" />
                        <div className="flex-1">
                          <span className={cn(
                            "block",
                            author.isPresenter ? "font-semibold text-gray-900" : "text-gray-700"
                          )}>
                            {author.authorName}
                          </span>
                          {author.isPresenter && (
                            <Badge variant="secondary" className="mt-1 text-xs bg-purple-100 text-purple-700">
                              Presenter
                            </Badge>
                          )}
                          {author.affiliation && (
                            <span className="text-muted-foreground text-xs block mt-0.5">
                              {author.affiliation}
                            </span>
                          )}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Keywords */}
            {selectedPresentation.presentation.keywords.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-gray-900">Keywords</h4>
                <div className="flex flex-wrap gap-1.5">
                  {selectedPresentation.presentation.keywords.map((keyword, idx) => (
                    <Badge 
                      key={idx} 
                      variant="secondary" 
                      className="text-xs bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-700 border-blue-200"
                    >
                      {keyword}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Abstract */}
            {selectedPresentation.presentation.abstract && (
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-gray-900">Abstract</h4>
                <div className="p-3 bg-gray-50 rounded-lg border">
                  <p className="text-sm text-gray-700 leading-relaxed">
                    {selectedPresentation.presentation.abstract}
                  </p>
                </div>
              </div>
            )}

            {/* **ENHANCED: Actions with better styling** */}
            <div className="flex gap-2 pt-2">
              {isAuthenticated && onToggleFavorite && (
                <Button
                  variant={selectedPresentation.presentation.isFavorite ? "default" : "outline"}
                  size="sm"
                  className={cn(
                    "flex-1",
                    selectedPresentation.presentation.isFavorite && "bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600"
                  )}
                  onClick={() => onToggleFavorite(selectedPresentation.presentation.id)}
                >
                  <Heart className={cn(
                    "h-4 w-4 mr-1",
                    selectedPresentation.presentation.isFavorite && "fill-current"
                  )} />
                  {selectedPresentation.presentation.isFavorite ? "Favorited" : "Favorite"}
                </Button>
              )}
              {onViewPresentationDetails && (
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 hover:bg-blue-50"
                  onClick={() => onViewPresentationDetails(selectedPresentation.presentation.id)}
                >
                  <ExternalLink className="h-4 w-4 mr-1" />
                  Full Details
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default ConferenceTree;