// ============================================================================
// PROGRAM OVERVIEW TAB - "At a Glance" Grid View
// ============================================================================
'use client';

import { useState, useMemo } from 'react';
import { 
  Calendar, Clock, MapPin, Coffee, Utensils, Users, 
  Info, ChevronRight, Download, Eye, Grid3x3
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';

export interface ProgramSession {
  id: string;
  title: string;
  room?: string;
  type: 'session' | 'break' | 'meal' | 'registration' | 'opening' | 'social';
  pageNumber?: number; // Reference to detailed program page
}

export interface ProgramTimeSlot {
  startTime: string;
  endTime: string;
  sessions: ProgramSession[]; // Multiple sessions = parallel tracks
}

export interface ProgramDay {
  id: string;
  date: string;
  label: string; // e.g., "Day 1, Monday"
  generalSchedule: Array<{ // Daily overview (registration, breaks, etc.)
    time: string;
    description: string;
    location?: string;
    requiresTicket?: boolean;
    icon?: 'registration' | 'coffee' | 'meal' | 'social';
  }>;
  timeSlots: ProgramTimeSlot[];
  rooms: string[]; // All rooms used this day
}

interface ProgramOverviewTabProps {
  days: ProgramDay[];
  isLoading?: boolean;
  onSessionClick?: (sessionId: string) => void;
  onViewFullSchedule?: () => void;
}

const iconMap = {
  registration: Users,
  coffee: Coffee,
  meal: Utensils,
  social: Users,
};

// **Daily Timeline Component**
function DailyTimeline({ 
  schedule 
}: { 
  schedule: ProgramDay['generalSchedule'] 
}) {
  return (
    <Card className="border-2 shadow-sm">
      <CardHeader className="pb-3 bg-gradient-to-r from-green-50 to-emerald-50">
        <CardTitle className="text-base flex items-center gap-2">
          <Clock className="h-5 w-5 text-green-600" />
          Daily Schedule
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="space-y-2">
          {schedule.map((item, idx) => {
            const Icon = item.icon ? iconMap[item.icon] : Info;
            return (
              <div 
                key={idx}
                className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="p-1.5 bg-green-100 rounded-lg shrink-0">
                  <Icon className="h-4 w-4 text-green-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <span className="font-semibold text-sm">{item.time}</span>
                    <span className="text-sm text-muted-foreground">{item.description}</span>
                  </div>
                  {item.location && (
                    <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {item.location}
                    </p>
                  )}
                  {item.requiresTicket && (
                    <Badge variant="outline" className="mt-1 text-xs bg-amber-50 text-amber-700 border-amber-300">
                      Ticket Required
                    </Badge>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

// **Session Grid Table Component**
function SessionGridTable({
  timeSlots,
  rooms,
  onSessionClick,
}: {
  timeSlots: ProgramTimeSlot[];
  rooms: string[];
  onSessionClick?: (sessionId: string) => void;
}) {
  return (
    <Card className="border-2 shadow-sm overflow-hidden">
      <CardHeader className="pb-3 bg-gradient-to-r from-blue-50 to-indigo-50">
        <CardTitle className="text-base flex items-center gap-2">
          <Grid3x3 className="h-5 w-5 text-blue-600" />
          Conference Sessions - Parallel Tracks
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gradient-to-r from-slate-100 to-slate-50">
                <th className="border border-slate-300 p-3 text-left font-semibold text-sm bg-slate-200">
                  Time
                </th>
                {rooms.map((room) => (
                  <th 
                    key={room} 
                    className="border border-slate-300 p-3 text-center font-semibold text-sm bg-blue-50"
                  >
                    <div className="flex items-center justify-center gap-2">
                      <MapPin className="h-4 w-4 text-blue-600" />
                      {room}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {timeSlots.map((slot, slotIdx) => {
                // Group sessions by room
                const sessionsByRoom = new Map<string, ProgramSession>();
                slot.sessions.forEach(session => {
                  if (session.room) {
                    sessionsByRoom.set(session.room, session);
                  }
                });

                // Check if this is a full-width row (break, meal, registration, or opening/keynote)
                const firstSession = slot.sessions[0];
                const isFullWidthRow = firstSession && 
                  (firstSession.type === 'break' || 
                   firstSession.type === 'meal' || 
                   firstSession.type === 'registration' ||
                   firstSession.type === 'opening' ||
                   (firstSession.type === 'social' && slot.sessions.length === 1));

                if (isFullWidthRow) {
                  // Determine background color based on type
                  let bgClass = 'bg-orange-50 hover:bg-orange-100';
                  let iconColor = 'text-orange-600';
                  let textColor = 'text-orange-900';
                  
                  if (firstSession.type === 'opening') {
                    bgClass = 'bg-purple-50 hover:bg-purple-100';
                    iconColor = 'text-purple-600';
                    textColor = 'text-purple-900';
                  }
                  
                  return (
                    <tr key={slotIdx} className={`${bgClass} transition-colors`}>
                      <td className="border border-slate-300 p-3 font-semibold text-sm whitespace-nowrap">
                        {slot.startTime}–{slot.endTime}
                      </td>
                      <td 
                        colSpan={rooms.length} 
                        className="border border-slate-300 p-4 text-center"
                      >
                        <div className="flex items-center justify-center gap-2">
                          {firstSession.type === 'meal' && <Utensils className={`h-5 w-5 ${iconColor}`} />}
                          {firstSession.type === 'break' && <Coffee className={`h-5 w-5 ${iconColor}`} />}
                          {firstSession.type === 'opening' && <Users className={`h-5 w-5 ${iconColor}`} />}
                          {firstSession.type === 'social' && <Users className={`h-5 w-5 ${iconColor}`} />}
                          {firstSession.type === 'registration' && <Users className={`h-5 w-5 ${iconColor}`} />}
                          <span className={`font-bold ${textColor}`}>{firstSession.title}</span>
                        </div>
                        {firstSession.pageNumber && (
                          <p className={`text-xs ${textColor} mt-1`}>📄 Page {firstSession.pageNumber}</p>
                        )}
                      </td>
                    </tr>
                  );
                }

                return (
                  <tr key={slotIdx} className="hover:bg-slate-50 transition-colors">
                    <td className="border border-slate-300 p-3 font-semibold text-sm whitespace-nowrap align-top bg-slate-50">
                      {slot.startTime}–{slot.endTime}
                    </td>
                    {rooms.map((room) => {
                      const session = sessionsByRoom.get(room);
                      
                      if (!session) {
                        return (
                          <td 
                            key={room} 
                            className="border border-slate-300 p-3 text-center bg-slate-50"
                          >
                            <span className="text-slate-400 text-sm">–</span>
                          </td>
                        );
                      }

                      return (
                        <td 
                          key={room} 
                          className="border border-slate-300 p-3 align-top"
                        >
                          <button
                            onClick={() => onSessionClick?.(session.id)}
                            className="w-full text-left p-2 rounded-lg hover:bg-blue-50 transition-colors group"
                          >
                            <div className="space-y-1">
                              <p className="font-semibold text-sm text-gray-900 group-hover:text-blue-600 leading-tight">
                                {session.title}
                              </p>
                              {session.pageNumber && (
                                <p className="text-xs text-muted-foreground flex items-center gap-1">
                                  <Eye className="h-3 w-3" />
                                  Page {session.pageNumber}
                                </p>
                              )}
                            </div>
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden p-4 space-y-4">
          {timeSlots.map((slot, slotIdx) => {
            const firstSession = slot.sessions[0];
            const isFullWidthRow = firstSession && 
              (firstSession.type === 'break' || 
               firstSession.type === 'meal' || 
               firstSession.type === 'registration' ||
               firstSession.type === 'opening' ||
               (firstSession.type === 'social' && slot.sessions.length === 1));

            if (isFullWidthRow) {
              let borderColor = 'border-l-orange-500';
              let bgColor = 'bg-orange-50';
              let iconColor = 'text-orange-600';
              let textColor = 'text-orange-900';
              let timeColor = 'text-orange-700';
              
              if (firstSession.type === 'opening') {
                borderColor = 'border-l-purple-500';
                bgColor = 'bg-purple-50';
                iconColor = 'text-purple-600';
                textColor = 'text-purple-900';
                timeColor = 'text-purple-700';
              }
              
              return (
                <Card key={slotIdx} className={`border-l-4 ${borderColor} ${bgColor}`}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      {firstSession.type === 'meal' && <Utensils className={`h-5 w-5 ${iconColor}`} />}
                      {firstSession.type === 'break' && <Coffee className={`h-5 w-5 ${iconColor}`} />}
                      {firstSession.type === 'opening' && <Users className={`h-5 w-5 ${iconColor}`} />}
                      {firstSession.type === 'social' && <Users className={`h-5 w-5 ${iconColor}`} />}
                      {firstSession.type === 'registration' && <Users className={`h-5 w-5 ${iconColor}`} />}
                      <div className="flex-1">
                        <p className={`font-bold ${textColor}`}>{firstSession.title}</p>
                        <p className={`text-sm ${timeColor}`}>{slot.startTime}–{slot.endTime}</p>
                        {firstSession.pageNumber && (
                          <p className={`text-xs ${timeColor} mt-1`}>📄 Page {firstSession.pageNumber}</p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            }

            return (
              <Card key={slotIdx} className="border-2">
                <CardHeader className="pb-2 bg-slate-50">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-slate-600" />
                    <span className="font-bold text-sm">{slot.startTime}–{slot.endTime}</span>
                    {slot.sessions.length > 1 && (
                      <Badge variant="secondary" className="ml-auto text-xs">
                        {slot.sessions.length} parallel
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="pt-3 space-y-2">
                  {slot.sessions.map((session) => (
                    <button
                      key={session.id}
                      onClick={() => onSessionClick?.(session.id)}
                      className="w-full text-left p-3 rounded-lg border-2 hover:border-blue-300 hover:bg-blue-50 transition-colors"
                    >
                      <div className="space-y-1">
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-semibold text-sm">{session.title}</p>
                          <ChevronRight className="h-4 w-4 text-slate-400 shrink-0" />
                        </div>
                        {session.room && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {session.room}
                          </p>
                        )}
                        {session.pageNumber && (
                          <p className="text-xs text-muted-foreground">
                            Page {session.pageNumber}
                          </p>
                        )}
                      </div>
                    </button>
                  ))}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

export function ProgramOverviewTab({
  days,
  isLoading,
  onSessionClick,
  onViewFullSchedule,
}: ProgramOverviewTabProps) {
  const [selectedDayId, setSelectedDayId] = useState<string>('');

  const selectedDay = useMemo(() => {
    if (!selectedDayId && days.length > 0) {
      setSelectedDayId(days[0].id);
      return days[0];
    }
    return days.find(d => d.id === selectedDayId) || days[0];
  }, [selectedDayId, days]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-12 bg-gradient-to-r from-muted via-muted/50 to-muted rounded-lg animate-pulse" />
        <div className="grid md:grid-cols-2 gap-4">
          <Card className="animate-pulse">
            <CardContent className="p-6 space-y-3">
              <div className="h-4 bg-muted rounded w-2/3" />
              <div className="h-4 bg-muted rounded w-1/2" />
              <div className="h-4 bg-muted rounded w-3/4" />
            </CardContent>
          </Card>
          <Card className="animate-pulse">
            <CardContent className="p-6 space-y-3">
              <div className="h-4 bg-muted rounded w-2/3" />
              <div className="h-4 bg-muted rounded w-1/2" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (days.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="inline-flex p-4 bg-muted/50 rounded-full mb-4">
          <Calendar className="h-12 w-12 text-muted-foreground" />
        </div>
        <h3 className="font-bold text-xl mb-2">Program Overview Not Available</h3>
        <p className="text-muted-foreground max-w-md mx-auto">
          The conference program overview has not been published yet.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Info Alert */}
      <Alert className="border-l-4 border-l-blue-500 bg-blue-50/50">
        <Info className="h-4 w-4 text-blue-600" />
        <AlertDescription>
          <strong className="text-blue-900">Program at a Glance:</strong>
          <span className="text-blue-800"> This overview shows all sessions side-by-side. Click any session to view full details or switch to </span>
          <button 
            onClick={onViewFullSchedule}
            className="text-blue-600 hover:text-blue-700 underline font-medium"
          >
            detailed schedule view
          </button>
          <span className="text-blue-800"> for more information.</span>
        </AlertDescription>
      </Alert>

      {/* Day Selector */}
      {days.length > 1 && (
        <Tabs value={selectedDayId} onValueChange={setSelectedDayId}>
          <TabsList className="w-full justify-start overflow-x-auto bg-white shadow-md p-2 rounded-lg">
            {days.map((day) => (
              <TabsTrigger 
                key={day.id} 
                value={day.id} 
                className="min-w-fit data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-indigo-600 data-[state=active]:text-white px-4 py-2 rounded-lg"
              >
                <Calendar className="h-4 w-4 mr-2" />
                <span className="font-medium">
                  {day.label}
                </span>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      )}

      {/* Day Header */}
      {selectedDay && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-5 rounded-xl border-2 border-blue-100">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h2 className="text-2xl font-bold text-blue-900">{selectedDay.label}</h2>
              <p className="text-blue-700 mt-1">
                {new Date(selectedDay.date).toLocaleDateString('en-US', {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge className="bg-blue-600 text-white px-3 py-1.5">
                {selectedDay.rooms.length} rooms
              </Badge>
              <Badge className="bg-purple-600 text-white px-3 py-1.5">
                {selectedDay.timeSlots.length} time slots
              </Badge>
            </div>
          </div>
        </div>
      )}

      {/* Content Grid */}
      {selectedDay && (
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left: Daily Timeline (1/3 width) */}
          <div className="lg:col-span-1">
            <DailyTimeline schedule={selectedDay.generalSchedule} />
          </div>

          {/* Right: Session Grid (2/3 width) */}
          <div className="lg:col-span-2">
            <SessionGridTable
              timeSlots={selectedDay.timeSlots}
              rooms={selectedDay.rooms}
              onSessionClick={onSessionClick}
            />
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex items-center justify-center gap-3 pt-4 border-t">
        <Button variant="outline" size="lg" onClick={onViewFullSchedule}>
          <Eye className="h-4 w-4 mr-2" />
          View Detailed Schedule
        </Button>
        <Button variant="outline" size="lg">
          <Download className="h-4 w-4 mr-2" />
          Download Program PDF
        </Button>
      </div>
    </div>
  );
}
