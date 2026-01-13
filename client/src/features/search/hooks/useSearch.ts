// useSearch hook - manages search state and API calls
'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { searchConference, getSearchSuggestions } from '../api/searchApi';
import type { SearchState, SearchFiltersState, SearchField, SearchResult, SearchSuggestion } from '../types';

interface UseSearchOptions {
  conferenceId: string;
  /**
   * Debounce delay in milliseconds
   * @default 300
   */
  debounceMs?: number;
  /**
   * Minimum query length to trigger search
   * @default 2
   */
  minQueryLength?: number;
  /**
   * Maximum results to fetch
   * @default 50
   */
  limit?: number;
  /**
   * Callback when search completes
   */
  onSearchComplete?: (results: SearchResult[]) => void;
  /**
   * Callback on error
   */
  onError?: (error: Error) => void;
}

const defaultFilters: SearchFiltersState = {
  query: '',
  field: 'all',
  dayIds: [],
  sessionTypes: [],
};

export function useSearch(options: UseSearchOptions) {
  const { 
    conferenceId, 
    debounceMs = 300, 
    minQueryLength = 2,
    limit = 50,
    onSearchComplete,
    onError 
  } = options;

  const [filters, setFilters] = useState<SearchFiltersState>(defaultFilters);
  const [state, setState] = useState<SearchState>({
    results: [],
    totalCount: 0,
    isLoading: false,
    error: null,
    hasSearched: false,
  });
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Refs for debouncing
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const suggestionsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
      if (suggestionsTimeoutRef.current) clearTimeout(suggestionsTimeoutRef.current);
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
  }, []);

  // Execute search
  const executeSearch = useCallback(async (searchFilters: SearchFiltersState) => {
    // Cancel any pending request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Check minimum query length
    if (searchFilters.query.length < minQueryLength) {
      setState((prev) => ({
        ...prev,
        results: [],
        totalCount: 0,
        hasSearched: false,
      }));
      return;
    }

    abortControllerRef.current = new AbortController();
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const response = await searchConference({
        conferenceId,
        query: searchFilters.query,
        field: searchFilters.field,
        dayIds: searchFilters.dayIds,
        sessionTypes: searchFilters.sessionTypes,
        limit,
      });

      setState({
        results: response.results,
        totalCount: response.total,
        isLoading: false,
        error: null,
        hasSearched: true,
      });

      onSearchComplete?.(response.results);
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        return; // Ignore aborted requests
      }

      const err = error instanceof Error ? error : new Error('Search failed');
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: err.message,
        hasSearched: true,
      }));
      onError?.(err);
    }
  }, [conferenceId, limit, minQueryLength, onSearchComplete, onError]);

  // Debounced search
  const debouncedSearch = useCallback((searchFilters: SearchFiltersState) => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      executeSearch(searchFilters);
    }, debounceMs);
  }, [debounceMs, executeSearch]);

  // Update query
  const setQuery = useCallback((query: string) => {
    const newFilters = { ...filters, query };
    setFilters(newFilters);
    debouncedSearch(newFilters);

    // Also fetch suggestions
    if (suggestionsTimeoutRef.current) {
      clearTimeout(suggestionsTimeoutRef.current);
    }

    if (query.length >= 2) {
      suggestionsTimeoutRef.current = setTimeout(async () => {
        const newSuggestions = await getSearchSuggestions(conferenceId, query);
        setSuggestions(newSuggestions);
        setShowSuggestions(true);
      }, 150);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }, [filters, debouncedSearch, conferenceId]);

  // Update search field
  const setField = useCallback((field: SearchField) => {
    const newFilters = { ...filters, field };
    setFilters(newFilters);
    if (filters.query.length >= minQueryLength) {
      debouncedSearch(newFilters);
    }
  }, [filters, minQueryLength, debouncedSearch]);

  // Update day filters
  const setDayFilters = useCallback((dayIds: string[]) => {
    const newFilters = { ...filters, dayIds };
    setFilters(newFilters);
    if (filters.query.length >= minQueryLength) {
      debouncedSearch(newFilters);
    }
  }, [filters, minQueryLength, debouncedSearch]);

  // Update session type filters
  const setSessionTypeFilters = useCallback((sessionTypes: string[]) => {
    const newFilters = { ...filters, sessionTypes };
    setFilters(newFilters);
    if (filters.query.length >= minQueryLength) {
      debouncedSearch(newFilters);
    }
  }, [filters, minQueryLength, debouncedSearch]);

  // Clear all filters
  const clearFilters = useCallback(() => {
    setFilters(defaultFilters);
    setState({
      results: [],
      totalCount: 0,
      isLoading: false,
      error: null,
      hasSearched: false,
    });
    setSuggestions([]);
  }, []);

  // Immediate search (no debounce)
  const searchNow = useCallback(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    executeSearch(filters);
  }, [executeSearch, filters]);

  // Select a suggestion
  const selectSuggestion = useCallback((suggestion: SearchSuggestion) => {
    const newQuery = suggestion.value;
    const newField = suggestion.type === 'author' ? 'author' 
      : suggestion.type === 'keyword' ? 'keyword'
      : suggestion.type === 'session' ? 'session'
      : 'all';
    
    const newFilters = { ...filters, query: newQuery, field: newField as SearchField };
    setFilters(newFilters);
    setShowSuggestions(false);
    executeSearch(newFilters);
  }, [filters, executeSearch]);

  return {
    // State
    results: state.results,
    totalCount: state.totalCount,
    isLoading: state.isLoading,
    error: state.error,
    hasSearched: state.hasSearched,

    // Filters
    filters,
    query: filters.query,
    field: filters.field,
    dayIds: filters.dayIds,
    sessionTypes: filters.sessionTypes,

    // Suggestions
    suggestions,
    showSuggestions,
    setShowSuggestions,
    selectSuggestion,

    // Actions
    setQuery,
    setField,
    setDayFilters,
    setSessionTypeFilters,
    clearFilters,
    searchNow,
  };
}

export type UseSearchReturn = ReturnType<typeof useSearch>;
