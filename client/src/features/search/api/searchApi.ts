// Search API functions for conference search

import { API_ENDPOINTS } from '@/lib/api/endpoints';
import type { SearchApiParams, SearchApiResponse, SearchSuggestion } from '../types';

/**
 * Search presentations within a conference
 */
export async function searchConference(
  params: SearchApiParams
): Promise<SearchApiResponse> {
  const { conferenceId, query, field = 'all', dayIds = [], sessionTypes = [], limit = 50, offset = 0 } = params;

  // Build query string
  const searchParams = new URLSearchParams();
  searchParams.set('q', query);
  searchParams.set('field', field);
  searchParams.set('limit', String(limit));
  searchParams.set('offset', String(offset));
  
  if (dayIds.length > 0) {
    searchParams.set('days', dayIds.join(','));
  }
  
  if (sessionTypes.length > 0) {
    searchParams.set('types', sessionTypes.join(','));
  }

  const url = `${API_ENDPOINTS.CONFERENCES.SEARCH(Number(conferenceId))}?${searchParams.toString()}`;

  const response = await fetch(url, {
    method: 'GET',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Search failed: ${response.statusText}`);
  }

  const data = await response.json();
  
  return {
    results: data.results || data.presentations || [],
    total: data.total || data.count || data.results?.length || 0,
    query,
    filters: {
      field,
      dayIds,
      sessionTypes,
    },
  };
}

/**
 * Get search suggestions (autocomplete) for a conference
 */
export async function getSearchSuggestions(
  conferenceId: string,
  query: string
): Promise<SearchSuggestion[]> {
  if (!query || query.length < 2) {
    return [];
  }

  try {
    const url = `${API_ENDPOINTS.CONFERENCES.SEARCH_SUGGESTIONS(Number(conferenceId))}?q=${encodeURIComponent(query)}`;

    const response = await fetch(url, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      return [];
    }

    const data = await response.json();
    return data.suggestions || [];
  } catch {
    return [];
  }
}

/**
 * Client-side search for when we have all data locally
 * Useful for filtering already-loaded schedule data
 */
export function localSearch<T extends { 
  title?: string; 
  abstract?: string;
  keywords?: string[];
  authors?: Array<{ name: string }>;
}>(
  items: T[],
  query: string,
  options: {
    fields?: ('title' | 'abstract' | 'keywords' | 'authors')[];
    caseSensitive?: boolean;
  } = {}
): T[] {
  const { fields = ['title', 'abstract', 'keywords', 'authors'], caseSensitive = false } = options;

  if (!query.trim()) {
    return items;
  }

  const searchTerm = caseSensitive ? query.trim() : query.trim().toLowerCase();
  const searchTerms = searchTerm.split(/\s+/);

  return items.filter((item) => {
    const searchableText: string[] = [];

    if (fields.includes('title') && item.title) {
      searchableText.push(caseSensitive ? item.title : item.title.toLowerCase());
    }

    if (fields.includes('abstract') && item.abstract) {
      searchableText.push(caseSensitive ? item.abstract : item.abstract.toLowerCase());
    }

    if (fields.includes('keywords') && item.keywords) {
      searchableText.push(
        ...item.keywords.map((k) => (caseSensitive ? k : k.toLowerCase()))
      );
    }

    if (fields.includes('authors') && item.authors) {
      searchableText.push(
        ...item.authors.map((a) => (caseSensitive ? a.name : a.name.toLowerCase()))
      );
    }

    const fullText = searchableText.join(' ');

    // All search terms must match
    return searchTerms.every((term) => fullText.includes(term));
  });
}

/**
 * Highlight search matches in text
 */
export function highlightMatches(
  text: string,
  query: string,
  highlightClass: string = 'bg-yellow-200 dark:bg-yellow-800'
): string {
  if (!query.trim() || !text) {
    return text;
  }

  const terms = query.trim().split(/\s+/);
  let result = text;

  terms.forEach((term) => {
    const regex = new RegExp(`(${escapeRegex(term)})`, 'gi');
    result = result.replace(regex, `<mark class="${highlightClass}">$1</mark>`);
  });

  return result;
}

function escapeRegex(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
