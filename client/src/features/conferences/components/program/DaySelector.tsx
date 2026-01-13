import React from 'react';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';

interface DaySelectorProps {
  days: Array<{
    id: string;
    date: string;
    label: string;
  }>;
  selectedDayId: string;
  onSelectDay: (dayId: string) => void;
}

export function DaySelector({ days, selectedDayId, onSelectDay }: DaySelectorProps) {
  if (days.length === 0) {
    return null;
  }

  return (
    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
      {days.map((day) => {
        const isSelected = day.id === selectedDayId;
        const dateObj = parseISO(day.date);
        const dayName = format(dateObj, 'EEE');
        const dayNumber = format(dateObj, 'MMM d');

        return (
          <button
            key={day.id}
            onClick={() => onSelectDay(day.id)}
            className={cn(
              'flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors',
              'border border-border hover:border-primary',
              isSelected
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-background text-foreground'
            )}
          >
            <span className="hidden sm:inline">{day.label}</span>
            <span className="sm:hidden">
              {dayName} {dayNumber}
            </span>
          </button>
        );
      })}
    </div>
  );
}
