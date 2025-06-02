import { useState, useRef, useCallback, useEffect } from 'react';
import { createAuthenticatedApi } from '@/lib/utils';
import { toast } from 'sonner';
import { SearchSuggestion, SearchResponse } from '@/types/search';

export function useSearch(conferenceId?: number, showGlobalSearch: boolean = false) {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchType, setSearchType] = useState<string>('all');
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResponse | null>(null);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Load recent searches from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('conference-recent-searches');
    if (stored) {
      try {
        setRecentSearches(JSON.parse(stored));
      } catch (e) {
        console.error('Error loading recent searches:', e);
      }
    }
  }, []);

  // Fetch suggestions with debouncing
  const fetchSuggestions = useCallback(async (term: string) => {
    if (term.length < 2 || !conferenceId) {
      setSuggestions([]);
      return;
    }

    try {
      const api = await createAuthenticatedApi();
      const response = await api.get(`/conferences/${conferenceId}/search/suggestions`, {
        params: { q: term }
      });
      setSuggestions(response.data.suggestions || []);
    } catch (error) {
      console.error('Error fetching suggestions:', error);
      setSuggestions([]);
    }
  }, [conferenceId]);

  // Handle input change with debouncing
  const handleInputChange = (value: string) => {
    setSearchTerm(value);
    setShowSuggestions(true);

    // Clear existing debounce timer
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    // Set new debounce timer for suggestions
    debounceRef.current = setTimeout(() => {
      fetchSuggestions(value);
    }, 300);
  };

  // Perform search
  const handleSearch = async (term: string = searchTerm, type: string = searchType, maxResults: number = 50) => {
    if (!term.trim()) {
      setSearchResults(null);
      return;
    }

    try {
      setLoading(true);
      setShowSuggestions(false);
      
      const api = await createAuthenticatedApi();
      
      let response;
      if (showGlobalSearch && !conferenceId) {
        // Global search
        response = await api.get('/search/global', {
          params: { 
            q: term,
            limit: maxResults
          }
        });
      } else if (conferenceId) {
        // Conference-specific search
        response = await api.get(`/conferences/${conferenceId}/search`, {
          params: { 
            q: term,
            type: type !== 'all' ? type : undefined,
            limit: maxResults
          }
        });
      } else {
        throw new Error('No search context provided');
      }

      setSearchResults(response.data);
      
      // Save to recent searches
      saveRecentSearch(term);
      
      // Update URL
      const params = new URLSearchParams();
      params.set('q', term);
      if (type !== 'all') params.set('type', type);
      
      const newUrl = `${window.location.pathname}?${params.toString()}`;
      window.history.replaceState({}, '', newUrl);

    } catch (error: any) {
      console.error('Error performing search:', error);
      toast.error(error.response?.data?.message || 'Search failed');
      setSearchResults(null);
    } finally {
      setLoading(false);
    }
  };

  // Save search to recent searches
  const saveRecentSearch = (term: string) => {
    const trimmed = term.trim();
    if (!trimmed) return;

    const updated = [trimmed, ...recentSearches.filter(s => s !== trimmed)].slice(0, 5);
    setRecentSearches(updated);
    localStorage.setItem('conference-recent-searches', JSON.stringify(updated));
  };

  // Clear search
  const clearSearch = () => {
    setSearchTerm('');
    setSearchResults(null);
    setShowSuggestions(false);
    window.history.replaceState({}, '', window.location.pathname);
  };

  return {
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
  };
}