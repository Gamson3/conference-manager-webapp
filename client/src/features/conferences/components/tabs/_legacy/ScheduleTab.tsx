// ============================================================================
// ENHANCED SCHEDULE TAB - With Parallel Session Support
// ============================================================================
'use client';

import { useState, useMemo, useEffect } from 'react';
import { 
  Calendar, Clock, MapPin, ChevronDown, ChevronRight, Coffee, 
  Presentation, Award, Wrench, MessageSquare, Handshake, 
  Users as UsersIcon, Star, Layers, AlertTriangle 
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import { FavoriteButton } from '@/features/favorites';

export type SessionType = 'presentation' | 'break' | 'keynote' | 'workshop' | 'panel' | 'networking';

export interface SchedulePresentation {
  id: string;
  title: string;
  abstract?: string;
  keywords?: string[];
  authors: Array<{ id: string; name: string; affiliation?: string }>;
  startTime?: string;
  endTime?: string;
}

export interface ScheduleSession {
  id: string;
  title: string;
  type: SessionType;
  startTime: string;
  endTime: string;
  room?: string;
  chair?: string;
  capacity?: number;
  description?: string;
  presentations: SchedulePresentation[];
}

export interface ScheduleDay {
  id: string;
  date: string;
  label?: string;
  sessions: ScheduleSession[];
}

interface ScheduleTabProps {
  conferenceId: string;
  days: ScheduleDay[];
  isLoading?: boolean;
  onPresentationClick?: (presentationId: string) => void;
}

// **NEW: Group sessions by time slot**
interface TimeSlot {
  time: Date;
  timeString: string;
  sessions: ScheduleSession[];
  isParallel: boolean;
}

function groupSessionsByTime(sessions: ScheduleSession[]): TimeSlot[] {
  const timeMap = new Map<string, ScheduleSession[]>();
  
  sessions.forEach(session => {
    const time = new Date(session.startTime);
    const timeKey = time.toISOString();
    
    if (!timeMap.has(timeKey)) {
      timeMap.set(timeKey, []);
    }
    timeMap.get(timeKey)!.push(session);
  });
  
  // Sort by time and group
  return Array.from(timeMap.entries())
    .sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime())
    .map(([timeString, sessions]) => {
      // Sort sessions by room within each time slot
      const sortedSessions = sessions.sort((a, b) => 
        (a.room || '').localeCompare(b.room || '')
      );
      
      return {
        time: new Date(timeString),
        timeString,
        sessions: sortedSessions,
        isParallel: sessions.length > 1,
      };
    });
}

const sessionTypeConfig: Record<SessionType, { 
  icon: React.ComponentType<{ className?: string }>; 
  color: string; 
  bgColor: string;
  borderColor: string;
  label: string;
}> = {
  presentation: { 
    icon: Presentation, 
    color: 'text-blue-700', 
    bgColor: 'bg-blue-50', 
    borderColor: 'border-blue-500',
    label: 'Session'
  },
  break: { 
    icon: Coffee, 
    color: 'text-orange-700', 
    bgColor: 'bg-orange-50', 
    borderColor: 'border-orange-500',
    label: 'Break'
  },
  keynote: { 
    icon: Award, 
    color: 'text-purple-700', 
    bgColor: 'bg-purple-50', 
    borderColor: 'border-purple-500',
    label: 'Keynote'
  },
  workshop: { 
    icon: Wrench, 
    color: 'text-green-700', 
    bgColor: 'bg-green-50', 
    borderColor: 'border-green-500',
    label: 'Workshop'
  },
  panel: { 
    icon: MessageSquare, 
    color: 'text-cyan-700', 
    bgColor: 'bg-cyan-50', 
    borderColor: 'border-cyan-500',
    label: 'Panel'
  },
  networking: { 
    icon: Handshake, 
    color: 'text-pink-700', 
    bgColor: 'bg-pink-50', 
    borderColor: 'border-pink-500',
    label: 'Networking'
  },
};

function formatTime(timeString: string): string {
  try {
    const date = new Date(timeString);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return timeString;
  }
}

function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return dateString;
  }
}

function PresentationItem({
  presentation,
  onPresentationClick,
}: {
  presentation: SchedulePresentation;
  onPresentationClick?: (presentationId: string) => void;
}) {
  return (
    <div
      className="group p-4 rounded-lg border-2 border-transparent bg-white hover:border-blue-200 hover:shadow-md transition-all cursor-pointer"
      onClick={() => onPresentationClick?.(presentation.id)}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-sm leading-tight group-hover:text-blue-600 transition-colors">
            {presentation.title}
          </h4>
          <div className="flex items-center gap-2 mt-2">
            <UsersIcon className="h-3 w-3 text-muted-foreground shrink-0" />
            <p className="text-xs text-muted-foreground line-clamp-1">
              {presentation.authors.map((a) => a.name).join(', ')}
            </p>
          </div>
          {presentation.startTime && presentation.endTime && (
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1 font-medium">
              <Clock className="h-3 w-3" />
              {formatTime(presentation.startTime)} - {formatTime(presentation.endTime)}
            </p>
          )}
          {presentation.keywords && presentation.keywords.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {presentation.keywords.slice(0, 4).map((keyword) => (
                <Badge key={keyword} variant="secondary" className="text-xs py-0.5 px-2 bg-blue-100 text-blue-700">
                  {keyword}
                </Badge>
              ))}
            </div>
          )}
        </div>
        <FavoriteButton 
          presentationId={presentation.id} 
          buttonSize="sm"
        />
      </div>
    </div>
  );
}

function SessionCard({
  session,
  onPresentationClick,
  isParallel = false,
}: {
  session: ScheduleSession;
  onPresentationClick?: (presentationId: string) => void;
  isParallel?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(session.type !== 'break');
  const config = sessionTypeConfig[session.type] || sessionTypeConfig.presentation;
  const Icon = config.icon;

  // Break sessions have a simpler display
  if (session.type === 'break') {
    return (
      <Card className={cn('border-l-4 shadow-md hover:shadow-lg transition-shadow', config.borderColor, config.bgColor)}>
        <CardContent className="py-4 px-5">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white rounded-lg shadow-sm">
              <Icon className={cn('h-6 w-6', config.color)} />
            </div>
            <div className="flex-1">
              <p className="font-semibold">{session.title}</p>
              <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                <span className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  {formatTime(session.startTime)} - {formatTime(session.endTime)}
                </span>
                {session.room && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" />
                    {session.room}
                  </span>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className={cn(
        'border-l-4 shadow-md hover:shadow-lg transition-all',
        config.borderColor,
        isParallel && 'ring-2 ring-orange-200'
      )}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-accent/30 transition-colors py-4">
            <div className="flex items-start gap-4">
              <div className={cn('p-3 rounded-lg shadow-sm', config.bgColor)}>
                <Icon className={cn('h-6 w-6', config.color)} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <CardTitle className="text-base">{session.title}</CardTitle>
                  <Badge className={cn('text-xs capitalize', config.bgColor, config.color, 'border-0')}>
                    {config.label}
                  </Badge>
                  {isParallel && (
                    <Badge className="text-xs bg-orange-100 text-orange-700 border-orange-300">
                      <Layers className="h-3 w-3 mr-1" />
                      Parallel Track
                    </Badge>
                  )}
                  {session.presentations.length > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      {session.presentations.length} talk{session.presentations.length !== 1 ? 's' : ''}
                    </Badge>
                  )}
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1.5 font-medium">
                    <Clock className="h-4 w-4" />
                    {formatTime(session.startTime)} - {formatTime(session.endTime)}
                  </span>
                  {session.room && (
                    <span className="flex items-center gap-1.5 font-semibold text-orange-600">
                      <MapPin className="h-4 w-4" />
                      {session.room}
                    </span>
                  )}
                  {session.capacity && (
                    <span className="flex items-center gap-1.5">
                      <UsersIcon className="h-4 w-4" />
                      Capacity: {session.capacity}
                    </span>
                  )}
                </div>
                {session.chair && (
                  <p className="text-xs text-muted-foreground mt-2">
                    <span className="font-semibold">Chair:</span> {session.chair}
                  </p>
                )}
              </div>
              {session.presentations.length > 0 && (
                <Button variant="ghost" size="sm" className="shrink-0">
                  {isOpen ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                </Button>
              )}
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        
        {session.presentations.length > 0 && (
          <CollapsibleContent>
            <CardContent className="pt-0 pb-5 px-5">
              <div className="space-y-2 pl-14">
                {session.presentations.map((presentation) => (
                  <PresentationItem
                    key={presentation.id}
                    presentation={presentation}
                    onPresentationClick={onPresentationClick}
                  />
                ))}
              </div>
            </CardContent>
          </CollapsibleContent>
        )}
      </Card>
    </Collapsible>
  );
}

// **NEW: Parallel Session Group Component**
function ParallelSessionGroup({
  timeSlot,
  onPresentationClick,
}: {
  timeSlot: TimeSlot;
  onPresentationClick?: (presentationId: string) => void;
}) {
  return (
    <div className="space-y-3">
      {/* Time Header with Parallel Warning */}
      <div className="flex items-center justify-between bg-gradient-to-r from-orange-50 to-amber-50 p-3 rounded-lg border-2 border-orange-200">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-orange-100 rounded-lg">
            <Clock className="h-5 w-5 text-orange-600" />
          </div>
          <div>
            <p className="font-bold text-orange-900">
              {timeSlot.time.toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
            {timeSlot.isParallel && (
              <p className="text-xs text-orange-700 font-medium">
                Choose one track - sessions run simultaneously
              </p>
            )}
          </div>
        </div>
        {timeSlot.isParallel && (
          <Badge className="bg-orange-600 text-white">
            <Layers className="h-3 w-3 mr-1" />
            {timeSlot.sessions.length} Parallel Tracks
          </Badge>
        )}
      </div>

      {/* Sessions Grid */}
      <div className={cn(
        "grid gap-3",
        timeSlot.isParallel ? "md:grid-cols-2 xl:grid-cols-3" : "grid-cols-1"
      )}>
        {timeSlot.sessions.map((session) => (
          <SessionCard
            key={session.id}
            session={session}
            onPresentationClick={onPresentationClick}
            isParallel={timeSlot.isParallel}
          />
        ))}
      </div>
    </div>
  );
}

export function ScheduleTab({
  conferenceId: _conferenceId,
  days,
  isLoading,
  onPresentationClick,
}: ScheduleTabProps) {
  const [selectedDayId, setSelectedDayId] = useState<string>('');

  useEffect(() => {
    if (days.length > 0 && !selectedDayId) {
      setSelectedDayId(days[0].id);
    }
  }, [days, selectedDayId]);

  const selectedDay = useMemo(
    () => days.find((d) => d.id === selectedDayId) || days[0],
    [days, selectedDayId]
  );

  // **NEW: Group sessions by time for selected day**
  const timeSlots = useMemo(() => {
    if (!selectedDay?.sessions) return [];
    return groupSessionsByTime(selectedDay.sessions);
  }, [selectedDay]);

  // **NEW: Detect if any parallel sessions exist**
  const hasParallelSessions = useMemo(() => {
    return timeSlots.some(slot => slot.isParallel);
  }, [timeSlots]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-12 bg-gradient-to-r from-muted via-muted/50 to-muted rounded-lg animate-pulse" />
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="py-4">
              <div className="h-6 bg-muted rounded w-2/3" />
              <div className="h-4 bg-muted rounded w-1/2 mt-2" />
            </CardHeader>
          </Card>
        ))}
      </div>
    );
  }

  if (days.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="inline-flex p-4 bg-muted/50 rounded-full mb-4">
          <Calendar className="h-12 w-12 text-muted-foreground" />
        </div>
        <h3 className="font-bold text-xl mb-2">Schedule Not Available</h3>
        <p className="text-muted-foreground max-w-md mx-auto">
          The conference schedule has not been published yet. Check back later for updates.
        </p>
      </div>
    );
  }

  const totalPresentations = selectedDay?.sessions?.reduce((total, session) => 
    total + (session.presentations?.length || 0), 0
  ) || 0;

  return (
    <div className="space-y-6">
      {/* Day selector */}
      {days.length > 1 && (
        <Tabs value={selectedDayId} onValueChange={setSelectedDayId}>
          <TabsList className="w-full justify-start overflow-x-auto bg-white shadow-md p-2 rounded-lg">
            {days.map((day, idx) => (
              <TabsTrigger 
                key={day.id} 
                value={day.id} 
                className="min-w-fit data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-indigo-600 data-[state=active]:text-white px-4 py-2 rounded-lg"
              >
                <Calendar className="h-4 w-4 mr-2" />
                <span className="font-medium">
                  Day {idx + 1}: {day.label || formatDate(day.date).split(',')[0]}
                </span>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      )}

      {/* **NEW: Parallel Sessions Alert** */}
      {hasParallelSessions && (
        <Alert className="border-l-4 border-l-orange-500 bg-orange-50/50">
          <AlertTriangle className="h-4 w-4 text-orange-600" />
          <AlertDescription>
            <strong className="text-orange-900">Parallel Sessions Notice:</strong>
            <span className="text-orange-800"> Multiple sessions run at the same time. You&apos;ll need to choose which track to attend. Check room locations carefully!</span>
          </AlertDescription>
        </Alert>
      )}

      {/* Day header with stats */}
      {selectedDay && (
        <div className="flex items-center justify-between bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border-2 border-blue-100">
          <div>
            <h3 className="text-xl font-bold text-blue-900">
              {selectedDay.label || formatDate(selectedDay.date)}
            </h3>
            <div className="flex items-center gap-4 mt-1 text-sm text-blue-700">
              <span className="flex items-center gap-1">
                <Presentation className="h-4 w-4" />
                {selectedDay.sessions?.length || 0} sessions
              </span>
              <span className="flex items-center gap-1">
                <Star className="h-4 w-4" />
                {totalPresentations} presentations
              </span>
              {hasParallelSessions && (
                <span className="flex items-center gap-1">
                  <Layers className="h-4 w-4" />
                  {timeSlots.filter(s => s.isParallel).length} parallel slots
                </span>
              )}
            </div>
          </div>
          <Badge className="bg-blue-600 text-white px-3 py-1.5">
            {new Date(selectedDay.date).toLocaleDateString('en-US', { 
              weekday: 'short',
              month: 'short',
              day: 'numeric'
            })}
          </Badge>
        </div>
      )}

      {/* **ENHANCED: Timeline with parallel session grouping** */}
      {selectedDay && (
        <div className="space-y-6">
          {selectedDay.sessions && selectedDay.sessions.length > 0 ? (
            timeSlots.map((timeSlot, idx) => (
              <ParallelSessionGroup
                key={idx}
                timeSlot={timeSlot}
                onPresentationClick={onPresentationClick}
              />
            ))
          ) : (
            <div className="text-center py-16">
              <p className="text-muted-foreground">No sessions scheduled for this day</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}