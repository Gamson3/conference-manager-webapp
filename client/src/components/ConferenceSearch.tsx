"use client";

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Search,
  Clock,
  Globe,
  Filter,
  X,
  ChevronDown,
  Calendar,
  MapPin,
  User,
  Loader2,
  History
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

// Shared components
import PresentationCard from '@/components/shared/PresentationCard';
import LoadingStates from '@/components/shared/LoadingStates';
import { EmptySearchResults } from '@/components/shared/EmptyStates';

// Hooks
import { useSearch } from '@/hooks/useSearch';
import { useFavorites } from '@/hooks/useFavorites';

// Types
import { SearchResult, ConferenceResult } from '@/types/search';

interface ConferenceSearchProps {
  conferenceId?: number;
  className?: string;
  placeholder?: string;
  onResultSelect?: (result: SearchResult) => void;
  showGlobalSearch?: boolean;
  showFilters?: boolean;
  maxResults?: number;
}

export default function ConferenceSearch({
  conferenceId,
  className = "",
  placeholder = "Search presentations, authors, or keywords...",
  onResultSelect,
  showGlobalSearch = false,
  showFilters = true,
  maxResults = 50
}: ConferenceSearchProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const { favoriteLoading, toggleFavorite } = useFavorites();
  
  const {
    searchTerm,
    setSearchTerm,
    searchType,
    setSearchType,
    suggestions,
    showSuggestions,
    setShowSuggestions,
    loading,
    searchResults,
    recentSearches,
    handleInputChange,
    handleSearch,
    clearSearch,
    saveRecentSearch
  } = useSearch(conferenceId, showGlobalSearch);

  const [isGlobalSearch, setIsGlobalSearch] = useState(false);

  // Focus input on mount
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  // Handle suggestion click
  const handleSuggestionClick = (suggestion: any) => {
    setSearchTerm(suggestion.value);
    setSearchType(suggestion.type || 'all');
    setShowSuggestions(false);
    handleSearch(suggestion.value, suggestion.type || 'all', maxResults);
  };

  // Handle recent search click
  const handleRecentSearchClick = (term: string) => {
    setSearchTerm(term);
    setShowSuggestions(false);
    handleSearch(term, searchType, maxResults);
  };

  // Handle presentation card favorite update
  const handleFavoriteUpdate = (id: number, newState: boolean) => {
    // This would update the search results with the new favorite state
    // Implementation depends on your search results structure
  };

  // Handle presentation card favorite toggle
  const handleFavoriteToggle = (presentationId: number) => {
    const presentation = searchResults?.presentations?.find(p => p.id === presentationId);
    if (!presentation) return;
    
    toggleFavorite(presentationId, presentation.isFavorite, handleFavoriteUpdate);
  };

  // Handle global search toggle
  const handleGlobalSearchToggle = () => {
    setIsGlobalSearch(!isGlobalSearch);
    if (searchTerm) {
      handleSearch(searchTerm, searchType, maxResults);
    }
  };

  // Handle key press
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      setShowSuggestions(false);
      handleSearch(searchTerm, searchType, maxResults);
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  // Handle outside click to close suggestions
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (inputRef.current && !inputRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [setShowSuggestions]);

  return (
    <div className={cn("relative w-full max-w-4xl mx-auto", className)}>
      {/* Search Input */}
      <div className="relative">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            ref={inputRef}
            placeholder={placeholder}
            value={searchTerm}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyDown={handleKeyPress}
            onFocus={() => setShowSuggestions(true)}
            className="pl-10 pr-20 h-12 text-base"
          />
          
          {/* Search Controls */}
          <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center gap-1">
            {searchTerm && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearSearch}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
            
            {loading && (
              <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
            )}
          </div>
        </div>

        {/* Filter and Global Search Controls */}
        {showFilters && (
          <div className="flex items-center gap-2 mt-3">
            {/* Search Type Filter */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Filter className="h-4 w-4 mr-2" />
                  {searchType === 'all' ? 'All' : searchType}
                  <ChevronDown className="h-4 w-4 ml-1" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => setSearchType('all')}>
                  All Types
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setSearchType('presentation')}>
                  Presentations
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSearchType('author')}>
                  Authors
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSearchType('keyword')}>
                  Keywords
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSearchType('section')}>
                  Sessions
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Global Search Toggle */}
            {showGlobalSearch && (
              <Button
                variant={isGlobalSearch ? "default" : "outline"}
                size="sm"
                onClick={handleGlobalSearchToggle}
              >
                <Globe className="h-4 w-4 mr-2" />
                {isGlobalSearch ? 'All Conferences' : 'This Conference'}
              </Button>
            )}
          </div>
        )}

        {/* Suggestions Dropdown */}
        <AnimatePresence>
          {showSuggestions && (searchTerm.length > 0 || recentSearches.length > 0) && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute top-full left-0 right-0 z-50 mt-1"
            >
              <Card className="border shadow-lg">
                <CardContent className="p-0">
                  {/* Suggestions */}
                  {suggestions.length > 0 && (
                    <div className="p-2">
                      <p className="text-xs font-medium text-gray-500 px-2 py-1">
                        Suggestions
                      </p>
                      {suggestions.slice(0, 5).map((suggestion, index) => (
                        <button
                          key={index}
                          onClick={() => handleSuggestionClick(suggestion)}
                          className="w-full text-left px-3 py-2 hover:bg-gray-50 rounded-md text-sm flex items-center gap-2"
                        >
                          <Search className="h-3 w-3 text-gray-400" />
                          <span>{suggestion.value}</span>
                          <Badge variant="outline" className="ml-auto text-xs">
                            {suggestion.type}
                          </Badge>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Recent Searches */}
                  {recentSearches.length > 0 && searchTerm.length === 0 && (
                    <div className="p-2">
                      {suggestions.length > 0 && <Separator className="mb-2" />}
                      <p className="text-xs font-medium text-gray-500 px-2 py-1">
                        Recent Searches
                      </p>
                      {recentSearches.slice(0, 3).map((term, index) => (
                        <button
                          key={index}
                          onClick={() => handleRecentSearchClick(term)}
                          className="w-full text-left px-3 py-2 hover:bg-gray-50 rounded-md text-sm flex items-center gap-2"
                        >
                          <History className="h-3 w-3 text-gray-400" />
                          <span>{term}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Search Results */}
      <AnimatePresence>
        {searchResults && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="mt-6"
          >
            {/* Results Summary */}
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="text-lg font-semibold">
                  Search Results
                  {searchResults.totalResults && (
                    <span className="text-sm font-normal text-gray-500 ml-2">
                      ({searchResults.totalResults.presentations} presentations
                      {searchResults.totalResults.conferences && 
                        `, ${searchResults.totalResults.conferences} conferences`
                      })
                    </span>
                  )}
                </h3>
                <p className="text-sm text-gray-500">
                  Results for "{searchResults.query}"
                  {searchType !== 'all' && ` in ${searchType}`}
                  {isGlobalSearch && ' across all conferences'}
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={clearSearch}>
                Clear
              </Button>
            </div>

            {/* Presentations Results */}
            {searchResults.presentations && searchResults.presentations.length > 0 && (
              <div className="mb-8">
                <h4 className="text-md font-medium mb-4 flex items-center">
                  <Calendar className="h-4 w-4 mr-2" />
                  Presentations ({searchResults.presentations.length})
                </h4>
                <div className="grid gap-4">
                  {searchResults.presentations.map((presentation) => (
                    <PresentationSearchResult
                      key={presentation.id}
                      presentation={presentation}
                      onSelect={onResultSelect}
                      onFavoriteToggle={handleFavoriteToggle}
                      favoriteLoading={favoriteLoading.has(presentation.id)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Conference Results */}
            {searchResults.conferences && searchResults.conferences.length > 0 && (
              <div>
                <h4 className="text-md font-medium mb-4 flex items-center">
                  <Globe className="h-4 w-4 mr-2" />
                  Conferences ({searchResults.conferences.length})
                </h4>
                <div className="grid gap-4">
                  {searchResults.conferences.map((conference) => (
                    <ConferenceSearchResult
                      key={conference.id}
                      conference={conference}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* No Results */}
            {(!searchResults.presentations || searchResults.presentations.length === 0) &&
             (!searchResults.conferences || searchResults.conferences.length === 0) && (
              <EmptySearchResults
                query={searchResults.query}
                onClearSearch={clearSearch}
                onTryGlobal={showGlobalSearch && !isGlobalSearch ? handleGlobalSearchToggle : undefined}
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Loading State */}
      {loading && (
        <div className="mt-6">
          <LoadingStates variant="search" />
        </div>
      )}
    </div>
  );
}

// Presentation Search Result Component
function PresentationSearchResult({
  presentation,
  onSelect,
  onFavoriteToggle,
  favoriteLoading
}: {
  presentation: SearchResult;
  onSelect?: (result: SearchResult) => void;
  onFavoriteToggle: (id: number) => void;
  favoriteLoading: boolean;
}) {
  const router = useRouter();

  const handleClick = () => {
    if (onSelect) {
      onSelect(presentation);
    } else {
      router.push(`/attendee/presentations/${presentation.id}`);
    }
  };

  return (
    <Card className="hover:shadow-md transition-shadow cursor-pointer">
      <CardContent className="p-4" onClick={handleClick}>
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <div className="flex items-start justify-between mb-2">
              <h5 className="font-semibold text-base line-clamp-2">
                {presentation.title}
              </h5>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onFavoriteToggle(presentation.id);
                }}
                disabled={favoriteLoading}
                className="ml-2"
              >
                <Clock className={cn(
                  "h-4 w-4",
                  presentation.isFavorite ? "fill-red-500 text-red-500" : "text-gray-400"
                )} />
              </Button>
            </div>

            {presentation.abstract && (
              <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                {presentation.abstract}
              </p>
            )}

            <div className="flex flex-wrap gap-2 mb-3">
              <Badge variant="outline">{presentation.section.type}</Badge>
              {presentation.section.day && (
                <Badge variant="secondary">
                  {new Date(presentation.section.day.date).toLocaleDateString()}
                </Badge>
              )}
              {presentation.matchedFields.length > 0 && (
                <Badge variant="outline" className="text-xs">
                  Matched: {presentation.matchedFields.join(', ')}
                </Badge>
              )}
            </div>

            <div className="flex items-center text-sm text-gray-500 space-x-4">
              {presentation.section.startTime && (
                <div className="flex items-center">
                  <Clock className="h-3 w-3 mr-1" />
                  {new Date(presentation.section.startTime).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </div>
              )}
              {presentation.section.room && (
                <div className="flex items-center">
                  <MapPin className="h-3 w-3 mr-1" />
                  {presentation.section.room}
                </div>
              )}
              {presentation.authors.length > 0 && (
                <div className="flex items-center">
                  <User className="h-3 w-3 mr-1" />
                  {presentation.authors[0].name}
                  {presentation.authors.length > 1 && ` +${presentation.authors.length - 1}`}
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Conference Search Result Component
function ConferenceSearchResult({
  conference
}: {
  conference: ConferenceResult;
}) {
  const router = useRouter();

  return (
    <Card 
      className="hover:shadow-md transition-shadow cursor-pointer"
      onClick={() => router.push(conference.navigationUrl)}
    >
      <CardContent className="p-4">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <h5 className="font-semibold text-base mb-2">{conference.name}</h5>
            
            {conference.description && (
              <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                {conference.description}
              </p>
            )}

            <div className="flex items-center text-sm text-gray-500 space-x-4">
              <div className="flex items-center">
                <Calendar className="h-3 w-3 mr-1" />
                {new Date(conference.startDate).toLocaleDateString()} - {new Date(conference.endDate).toLocaleDateString()}
              </div>
              <Badge variant={conference.status === 'active' ? 'default' : 'secondary'}>
                {conference.status}
              </Badge>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}