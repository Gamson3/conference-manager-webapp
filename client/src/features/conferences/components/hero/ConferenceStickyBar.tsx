'use client';

import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Calendar, FileText, UserPlus } from 'lucide-react';

interface ConferenceStickyBarProps {
  conferenceName: string;
  onRegister?: () => void;
  onSubmit?: () => void;
  cfpOpen?: boolean;
  registrationOpen?: boolean;
  submissionDeadline?: string;
  registrationDeadline?: string;
}

export function ConferenceStickyBar({
  conferenceName,
  onRegister,
  onSubmit,
  cfpOpen = false,
  registrationOpen = true,
  submissionDeadline,
  registrationDeadline,
}: ConferenceStickyBarProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      // Show sticky bar after scrolling 500px
      setIsVisible(window.scrollY > 500);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  if (!isVisible) return null;

  const activeDeadline = cfpOpen ? submissionDeadline : registrationDeadline;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm border-b shadow-lg animate-in slide-in-from-top duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-semibold truncate">{conferenceName}</h2>
            {activeDeadline && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                Deadline: {new Date(activeDeadline).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric'
                })}
              </p>
            )}
          </div>

          <div className="flex gap-2">
            {registrationOpen && onRegister && (
              <Button size="sm" onClick={onRegister}>
                <UserPlus className="h-4 w-4 mr-1" />
                <span className="hidden sm:inline">Register</span>
              </Button>
            )}
            {cfpOpen && onSubmit && (
              <Button size="sm" variant="secondary" onClick={onSubmit}>
                <FileText className="h-4 w-4 mr-1" />
                <span className="hidden sm:inline">Submit</span>
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
