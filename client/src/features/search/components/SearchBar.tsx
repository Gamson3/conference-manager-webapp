// SearchBar - Main search input with field selector
'use client';

import { Search, X, ChevronDown } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import type { SearchField, SearchSuggestion } from '../types';
import type { UseSearchReturn } from '../hooks/useSearch';

interface SearchBarProps {
  searchHook: UseSearchReturn;
  placeholder?: string;
  showFieldSelector?: boolean;
  className?: string;
}

const fieldLabels: Record<SearchField, string> = {
  all: 'All Fields',
  title: 'Title',
  author: 'Author',
  keyword: 'Keyword',
  abstract: 'Abstract',
  session: 'Session',
};

export function SearchBar({
  searchHook,
  placeholder = 'Search presentations...',
  showFieldSelector = true,
  className,
}: SearchBarProps) {
  const {
    query,
    field,
    setQuery,
    setField,
    suggestions,
    showSuggestions,
    setShowSuggestions,
    selectSuggestion,
    isLoading,
  } = searchHook;

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  return (
    <div className={cn('relative', className)}>
      <div className="flex gap-2">
        {/* Field selector dropdown */}
        {showFieldSelector && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="shrink-0 gap-1">
                {fieldLabels[field]}
                <ChevronDown className="h-4 w-4 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {Object.entries(fieldLabels).map(([value, label]) => (
                <DropdownMenuItem
                  key={value}
                  onClick={() => setField(value as SearchField)}
                  className={cn(field === value && 'bg-accent')}
                >
                  {label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {/* Search input */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            placeholder={placeholder}
            className={cn(
              'pl-10 pr-10',
              isLoading && 'pr-16'
            )}
          />
          
          {/* Clear button */}
          {query && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2"
              onClick={() => setQuery('')}
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Clear search</span>
            </Button>
          )}

          {/* Loading indicator */}
          {isLoading && (
            <div className="absolute right-10 top-1/2 -translate-y-1/2">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          )}
        </div>
      </div>

      {/* Suggestions dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1 rounded-md border bg-popover shadow-md">
          <ul className="py-1">
            {suggestions.map((suggestion, index) => (
              <SuggestionItem
                key={`${suggestion.type}-${suggestion.value}-${index}`}
                suggestion={suggestion}
                onSelect={() => selectSuggestion(suggestion)}
              />
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function SuggestionItem({
  suggestion,
  onSelect,
}: {
  suggestion: SearchSuggestion;
  onSelect: () => void;
}) {
  const typeLabel = {
    author: '👤 Author',
    keyword: '🏷️ Keyword',
    session: '📅 Session',
    title: '📄 Title',
  }[suggestion.type];

  return (
    <li>
      <button
        type="button"
        className="w-full px-3 py-2 text-left hover:bg-accent flex items-center justify-between gap-2"
        onClick={onSelect}
      >
        <span className="truncate">{suggestion.value}</span>
        <span className="text-xs text-muted-foreground shrink-0">
          {typeLabel}
          {suggestion.count !== undefined && ` (${suggestion.count})`}
        </span>
      </button>
    </li>
  );
}
