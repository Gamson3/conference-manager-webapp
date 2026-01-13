import React from 'react';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface ViewFullProgramCTAProps {
  conferenceId: string;
}

export function ViewFullProgramCTA({ conferenceId }: ViewFullProgramCTAProps) {
  const router = useRouter();

  return (
    <div className="flex flex-col items-center gap-2 pt-4">
      <Button
        size="lg"
        onClick={() => router.push(`/conferences/${conferenceId}/program`)}
        className="gap-2"
      >
        Explore Full Program
        <ArrowRight className="h-4 w-4" />
      </Button>
      <p className="text-xs text-muted-foreground">
        Search, filter, and save talks
      </p>
    </div>
  );
}
