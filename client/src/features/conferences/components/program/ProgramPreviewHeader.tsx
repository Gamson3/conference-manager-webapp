import React from 'react';

interface ProgramPreviewHeaderProps {
  totalDays: number;
  totalPresentations: number;
  totalSessions: number;
}

export function ProgramPreviewHeader({
  totalDays,
  totalPresentations,
  totalSessions,
}: ProgramPreviewHeaderProps) {
  return (
    <div className="space-y-2">
      <h2 className="text-2xl font-bold tracking-tight">Program Highlights</h2>
      <p className="text-muted-foreground">
        {totalDays} {totalDays === 1 ? 'day' : 'days'} · {totalPresentations} talks · {totalSessions} sessions
      </p>
    </div>
  );
}
