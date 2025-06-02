import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import PresentationCard from '@/components/shared/PresentationCard';
import { Presentation } from '@/types/presentation';

interface ScheduleGroupingProps {
  groupedPresentations: { [key: string]: Presentation[] };
  groupBy: string;
  viewMode: 'list' | 'grid';
  onPresentationSelect?: (presentation: Presentation) => void;
  onFavoriteToggle: (id: number) => void;
  favoriteLoading: Set<number>;
}

export default function ScheduleGrouping({
  groupedPresentations,
  groupBy,
  viewMode,
  onPresentationSelect,
  onFavoriteToggle,
  favoriteLoading
}: ScheduleGroupingProps) {
  const groupKeys = Object.keys(groupedPresentations);

  return (
    <div className="space-y-8">
      {groupKeys.map((groupKey) => (
        <motion.div
          key={groupKey}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2 }}
        >
          {groupBy !== 'none' && (
            <div className="mb-6">
              <h3 className="text-xl font-semibold mb-2">{groupKey}</h3>
              <div className="h-px bg-gradient-to-r from-primary-200 to-transparent" />
            </div>
          )}
          
          <div className={cn(
            "grid gap-6",
            viewMode === 'grid' 
              ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3" 
              : "grid-cols-1 max-w-4xl"
          )}>
            {groupedPresentations[groupKey].map((presentation) => (
              <PresentationCard 
                key={presentation.id} 
                presentation={presentation}
                onFavoriteToggle={onFavoriteToggle}
                onSelect={onPresentationSelect}
                favoriteLoading={favoriteLoading.has(presentation.id)}
                compact={viewMode === 'grid'}
                showActions={true}
              />
            ))}
          </div>
        </motion.div>
      ))}
    </div>
  );
}