'use client';

import { useSearchParams } from 'next/navigation';
import { FolderTree } from 'lucide-react';
import { ConferenceTree } from '@/features/tree-view';
import type { TreeScheduleData } from '@/features/tree-view';

interface TreeViewTabProps {
  conferenceId: string;
  scheduleData: TreeScheduleData;
  isLoading?: boolean;
  isAuthenticated?: boolean;
  onToggleFavorite?: (presentationId: number) => void;
}

export function TreeViewTab({ 
  scheduleData, 
  isLoading, 
  isAuthenticated = false,
  onToggleFavorite 
}: TreeViewTabProps) {
  const searchParams = useSearchParams();
  const highlightParam = searchParams.get('highlight');
  const highlightId = highlightParam ? Number(highlightParam) : undefined;

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="animate-pulse">
            <div className="h-12 bg-gradient-to-r from-muted via-muted/50 to-muted rounded mb-2" />
            <div className="ml-6 space-y-2">
              <div className="h-10 bg-muted/70 rounded" />
              <div className="h-10 bg-muted/70 rounded" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (scheduleData.days.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="inline-flex p-4 bg-muted/50 rounded-full mb-4">
          <FolderTree className="h-12 w-12 text-muted-foreground" />
        </div>
        <h3 className="font-bold text-xl mb-2">Program Not Available</h3>
        <p className="text-muted-foreground max-w-md mx-auto">
          The conference program tree has not been published yet. Check back later.
        </p>
      </div>
    );
  }

  return (
    <ConferenceTree
      data={scheduleData}
      highlightPresentationId={highlightId}
      isAuthenticated={isAuthenticated}
      onToggleFavorite={onToggleFavorite}
    />
  );
}