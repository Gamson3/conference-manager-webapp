import React from 'react';
import { Calendar, Users, Tag } from 'lucide-react';

interface ProgramMetaRowProps {
  totalDays: number;
  totalSpeakers: number;
  topics: string[];
}

export function ProgramMetaRow({ totalDays, totalSpeakers, topics }: ProgramMetaRowProps) {
  const displayTopics = topics.slice(0, 3);
  const hasMoreTopics = topics.length > 3;

  return (
    <div className="flex flex-wrap gap-4 text-sm text-muted-foreground py-3 border-t">
      <div className="flex items-center gap-1.5">
        <Calendar className="h-4 w-4" />
        <span>{totalDays} {totalDays === 1 ? 'day' : 'days'}</span>
      </div>
      
      <div className="flex items-center gap-1.5">
        <Users className="h-4 w-4" />
        <span>{totalSpeakers} speakers</span>
      </div>
      
      {displayTopics.length > 0 && (
        <div className="flex items-center gap-1.5">
          <Tag className="h-4 w-4" />
          <span>
            Topics: {displayTopics.join(', ')}
            {hasMoreTopics && ` +${topics.length - 3} more`}
          </span>
        </div>
      )}
    </div>
  );
}
