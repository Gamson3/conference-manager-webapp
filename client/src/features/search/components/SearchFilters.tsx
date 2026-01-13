// SearchFilters - Additional filter controls for search
'use client';

import { Filter, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import type { UseSearchReturn } from '../hooks/useSearch';

interface SearchFiltersProps {
  searchHook: UseSearchReturn;
  /**
   * Available days to filter by
   */
  days: Array<{ id: string; date: string; label?: string }>;
  /**
   * Available session types to filter by
   */
  sessionTypes?: Array<{ value: string; label: string }>;
  className?: string;
}

const defaultSessionTypes = [
  { value: 'presentation', label: 'Presentations' },
  { value: 'keynote', label: 'Keynotes' },
  { value: 'workshop', label: 'Workshops' },
  { value: 'panel', label: 'Panels' },
];

function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateString;
  }
}

export function SearchFilters({
  searchHook,
  days,
  sessionTypes = defaultSessionTypes,
  className,
}: SearchFiltersProps) {
  const { dayIds, sessionTypes: selectedTypes, setDayFilters, setSessionTypeFilters } = searchHook;

  const activeFiltersCount = dayIds.length + selectedTypes.length;

  const toggleDay = (dayId: string) => {
    if (dayIds.includes(dayId)) {
      setDayFilters(dayIds.filter((id) => id !== dayId));
    } else {
      setDayFilters([...dayIds, dayId]);
    }
  };

  const toggleSessionType = (type: string) => {
    if (selectedTypes.includes(type)) {
      setSessionTypeFilters(selectedTypes.filter((t) => t !== type));
    } else {
      setSessionTypeFilters([...selectedTypes, type]);
    }
  };

  const clearAllFilters = () => {
    setDayFilters([]);
    setSessionTypeFilters([]);
  };

  return (
    <div className={cn('flex items-center gap-2 flex-wrap', className)}>
      {/* Filter popover */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <Filter className="h-4 w-4" />
            Filters
            {activeFiltersCount > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                {activeFiltersCount}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-72" align="start">
          <div className="space-y-4">
            {/* Days section */}
            {days.length > 0 && (
              <div>
                <h4 className="font-medium text-sm mb-2">Days</h4>
                <div className="space-y-2">
                  {days.map((day) => (
                    <div key={day.id} className="flex items-center gap-2">
                      <Checkbox
                        id={`day-${day.id}`}
                        checked={dayIds.includes(day.id)}
                        onCheckedChange={() => toggleDay(day.id)}
                      />
                      <Label
                        htmlFor={`day-${day.id}`}
                        className="text-sm font-normal cursor-pointer"
                      >
                        {day.label || formatDate(day.date)}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {days.length > 0 && sessionTypes.length > 0 && <Separator />}

            {/* Session types section */}
            {sessionTypes.length > 0 && (
              <div>
                <h4 className="font-medium text-sm mb-2">Session Types</h4>
                <div className="space-y-2">
                  {sessionTypes.map((type) => (
                    <div key={type.value} className="flex items-center gap-2">
                      <Checkbox
                        id={`type-${type.value}`}
                        checked={selectedTypes.includes(type.value)}
                        onCheckedChange={() => toggleSessionType(type.value)}
                      />
                      <Label
                        htmlFor={`type-${type.value}`}
                        className="text-sm font-normal cursor-pointer"
                      >
                        {type.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Clear button */}
            {activeFiltersCount > 0 && (
              <>
                <Separator />
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full"
                  onClick={clearAllFilters}
                >
                  Clear all filters
                </Button>
              </>
            )}
          </div>
        </PopoverContent>
      </Popover>

      {/* Active filter badges */}
      {dayIds.map((dayId) => {
        const day = days.find((d) => d.id === dayId);
        if (!day) return null;
        return (
          <Badge
            key={`badge-day-${dayId}`}
            variant="secondary"
            className="gap-1 cursor-pointer hover:bg-secondary/80"
            onClick={() => toggleDay(dayId)}
          >
            {day.label || formatDate(day.date)}
            <X className="h-3 w-3" />
          </Badge>
        );
      })}

      {selectedTypes.map((type) => {
        const sessionType = sessionTypes.find((t) => t.value === type);
        if (!sessionType) return null;
        return (
          <Badge
            key={`badge-type-${type}`}
            variant="secondary"
            className="gap-1 cursor-pointer hover:bg-secondary/80"
            onClick={() => toggleSessionType(type)}
          >
            {sessionType.label}
            <X className="h-3 w-3" />
          </Badge>
        );
      })}

      {/* Clear all button (when many filters) */}
      {activeFiltersCount > 2 && (
        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-2 text-xs"
          onClick={clearAllFilters}
        >
          Clear all
        </Button>
      )}
    </div>
  );
}
