'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Calendar, Clock, Coffee, Download, Grid3x3, MapPin, Search, TreePine, Users, Utensils, View } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { TreeViewTab } from '@/features/conferences/components/tabs/TreeViewTab';
import { ClassicProgramView } from '@/features/conferences/components/tabs/ClassicProgramView';
import { useFavoritesContext } from '@/features/favorites';
import type { TreeScheduleData } from '@/features/tree-view';

export type SessionType = 'presentation' | 'break' | 'keynote' | 'workshop' | 'panel' | 'networking';

export interface ProgramPresentation {
  id: string;
  title: string;
  abstract?: string;
  keywords?: string[];
  authors: Array<{ id: string; name: string; affiliation?: string; isPresenter?: boolean }>;
}

export interface ProgramSession {
  id: string;
  title: string;
  type: SessionType;
  startTime: string;
  endTime: string;
  room?: string;
  chair?: string;
  presentations: ProgramPresentation[];
}

export interface ProgramDay {
  id: string;
  date: string;
  label: string;
  sessions: ProgramSession[];
  rooms: string[];
}

interface ProgramTabProps {
  conferenceId: string;
  days: ProgramDay[];
  isLoading?: boolean;
  onPresentationClick?: (presentationId: string) => void;
  isAuthenticated?: boolean;
  onToggleFavorite?: (presentationId: number) => void;
}

interface TimeSlot {
  time: Date;
  sessions: ProgramSession[];
  isParallel: boolean;
}

const formatTime = (value?: string): string => {
  if (!value) {
    return '';
  }

  return new Date(value).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
};


const deriveRooms = (day: ProgramDay): string[] => {
  if (day.rooms.length > 0) {
    return day.rooms;
  }

  return Array.from(
    new Set(day.sessions.flatMap((session) => (session.room ? [session.room] : [])))
  );
};
const groupSessionsByTime = (sessions: ProgramSession[]): TimeSlot[] => {
  const timeMap = new Map<string, ProgramSession[]>();

  sessions.forEach((session) => {
    const timeKey = new Date(session.startTime).toISOString();
    if (!timeMap.has(timeKey)) {
      timeMap.set(timeKey, []);
    }
    timeMap.get(timeKey)!.push(session);
  });

  return Array.from(timeMap.entries())
    .sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime())
    .map(([timeString, slotSessions]) => ({
      time: new Date(timeString),
      sessions: slotSessions.sort((a, b) => (a.room || '').localeCompare(b.room || '')),
      isParallel: slotSessions.length > 1,
    }));
};

const GridView = ({ days }: { days: ProgramDay[] }): React.ReactElement => {
  const [selectedDayId, setSelectedDayId] = useState<string>(days[0]?.id ?? '');

  useEffect(() => {
    if (!selectedDayId && days.length > 0) {
      setSelectedDayId(days[0].id);
      return;
    }

    if (selectedDayId && !days.some((day) => day.id === selectedDayId) && days.length > 0) {
      setSelectedDayId(days[0].id);
    }
  }, [days, selectedDayId]);

  const selectedDay = days.find((day) => day.id === selectedDayId) ?? days[0];
  const timeSlots = selectedDay ? groupSessionsByTime(selectedDay.sessions) : [];
  const rooms = selectedDay ? deriveRooms(selectedDay) : [];

  const dailyScheduleItems = useMemo(() => {
    if (!selectedDay) return [] as Array<{ time: string; description: string; icon: 'coffee' | 'meal' | 'registration' | 'social' }>;

    const items: Array<{ time: string; description: string; icon: 'coffee' | 'meal' | 'registration' | 'social' }> = [];

    for (const session of selectedDay.sessions) {
      if (session.type === 'break') {
        let icon: 'coffee' | 'meal' | 'registration' | 'social' = 'coffee';
        const lowerTitle = session.title.toLowerCase();
        if (lowerTitle.includes('lunch') || lowerTitle.includes('dinner')) {
          icon = 'meal';
        } else if (lowerTitle.includes('registration')) {
          icon = 'registration';
        } else if (lowerTitle.includes('networking') || lowerTitle.includes('social')) {
          icon = 'social';
        }

        items.push({
          time: formatTime(session.startTime),
          description: session.title,
          icon,
        });
      }
    }

    return items.sort((a, b) => a.time.localeCompare(b.time));
  }, [selectedDay]);

  const iconMap = {
    registration: Users,
    coffee: Coffee,
    meal: Utensils,
    social: Users,
  };

  const handleDownload = (): void => {
    if (!selectedDay) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      window.alert('Please allow popups to download the program.');
      return;
    }

    const dayLabel = selectedDay.label || 'Program';
    const dayDate = selectedDay.date || '';

    const tableRows = timeSlots.map((slot) => {
      const sessionsByRoom = new Map<string, ProgramSession>();
      slot.sessions.forEach((session) => {
        if (session.room) sessionsByRoom.set(session.room, session);
      });

      const firstSession = slot.sessions[0];
      const isBreak = firstSession && firstSession.type === 'break';
      const isKeynote = firstSession && firstSession.type === 'keynote';

      if (isBreak || isKeynote) {
        const bgColor = isKeynote ? '#f3e8ff' : '#fef3c7';
        const textColor = isKeynote ? '#6b21a8' : '#92400e';
        return `
          <tr>
            <td class="time-col">${formatTime(slot.time.toISOString())}</td>
            <td colspan="${Math.max(rooms.length, 1)}" style="background: ${bgColor}; text-align: center; font-weight: 600; color: ${textColor};">
              ${firstSession.title}
            </td>
          </tr>
        `;
      }

      const cells = rooms.map((room) => {
        const session = sessionsByRoom.get(room);
        if (!session) {
          return '<td class="empty-cell">–</td>';
        }
        const talkCount = session.presentations.length;
        const countText = talkCount > 0 ? `<div class="session-count">${talkCount} talk${talkCount !== 1 ? 's' : ''}</div>` : '';
        return `<td><div class="session-title">${session.title}</div>${countText}</td>`;
      }).join('');

      return `
        <tr>
          <td class="time-col">${formatTime(slot.time.toISOString())}</td>
          ${cells}
        </tr>
      `;
    }).join('');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Program at a Glance - ${dayLabel}</title>
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 20px; }
          h1 { font-size: 24px; margin-bottom: 8px; color: #1e3a5f; }
          h2 { font-size: 14px; color: #666; margin-bottom: 20px; }
          table { width: 100%; border-collapse: collapse; font-size: 11px; margin-top: 16px; }
          th, td { border: 1px solid #d1d5db; padding: 10px 8px; text-align: left; vertical-align: top; }
          th { background: linear-gradient(to right, #f1f5f9, #f8fafc); font-weight: 600; font-size: 10px; }
          th.room-header { background: #eff6ff; text-align: center; }
          .time-col { width: 80px; white-space: nowrap; background: #f8fafc; font-weight: 600; }
          .session-title { font-weight: 600; font-size: 11px; color: #1f2937; margin-bottom: 2px; }
          .session-count { color: #6b7280; font-size: 10px; }
          .empty-cell { color: #9ca3af; text-align: center; }
          @media print {
            body { padding: 10px; }
            @page { margin: 1cm; size: landscape; }
            table { page-break-inside: auto; }
            tr { page-break-inside: avoid; }
          }
        </style>
      </head>
      <body>
        <h1>📅 Program at a Glance</h1>
        <h2>${dayLabel}${dayDate ? ` — ${dayDate}` : ''}</h2>
        <table>
          <thead>
            <tr>
              <th>Time</th>
              ${rooms.map((room) => `<th class="room-header">📍 ${room}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
        </table>
      </body>
      </html>
    `);

    printWindow.document.close();

    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="text-lg font-semibold">Program at a Glance</div>
        <Button variant="outline" size="sm" onClick={handleDownload} className="border-slate-300 hover:bg-slate-50">
          <Download className="h-4 w-4 mr-2" />
          Download PDF
        </Button>
      </div>

      {days.length > 1 && (
        <Tabs value={selectedDayId} onValueChange={setSelectedDayId}>
          <TabsList className="w-full justify-start overflow-x-auto bg-white border border-slate-200">
            {days.map((day) => (
              <TabsTrigger
                key={day.id}
                value={day.id}
                className="shrink-0 data-[state=active]:bg-blue-600 data-[state=active]:text-white"
              >
                <Calendar className="h-4 w-4 mr-2" />
                {day.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      )}

      {selectedDay && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-xl border-2 border-blue-100">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h2 className="text-xl font-bold text-blue-900">{selectedDay.label}</h2>
              <p className="text-blue-700 text-sm">{selectedDay.date}</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge className="bg-blue-600 text-white">
                {rooms.length} rooms
              </Badge>
              <Badge className="bg-purple-600 text-white">
                {timeSlots.length} time slots
              </Badge>
            </div>
          </div>
        </div>
      )}

      {selectedDay && (
        <div className="grid lg:grid-cols-4 gap-4">
          <div className="lg:col-span-1">
            <Card className="border-2 shadow-sm">
              <CardHeader className="pb-3 bg-gradient-to-r from-green-50 to-emerald-50">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Clock className="h-4 w-4 text-green-600" />
                  Daily Schedule
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                {dailyScheduleItems.length > 0 ? (
                  <div className="space-y-2">
                    {dailyScheduleItems.map((item, idx) => {
                      const Icon = iconMap[item.icon];
                      return (
                        <div key={idx} className="flex items-start gap-2 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                          <div className="p-1.5 bg-green-100 rounded-lg shrink-0">
                            <Icon className="h-3 w-3 text-green-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-xs">{item.time}</div>
                            <div className="text-xs text-muted-foreground">{item.description}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground text-center py-4">
                    No breaks scheduled
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-3">
            <Card className="border-2 shadow-sm overflow-hidden">
              <CardHeader className="pb-3 bg-gradient-to-r from-blue-50 to-indigo-50">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Grid3x3 className="h-4 w-4 text-blue-600" />
                  Conference Sessions - Parallel Tracks
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full border-collapse text-sm">
                    <thead>
                      <tr className="bg-gradient-to-r from-slate-100 to-slate-50">
                        <th className="border border-slate-300 p-2 text-left font-semibold text-xs bg-slate-200">
                          Time
                        </th>
                        {rooms.map((room) => (
                          <th key={room} className="border border-slate-300 p-2 text-center font-semibold text-xs bg-blue-50">
                            <div className="flex items-center justify-center gap-1">
                              <MapPin className="h-3 w-3 text-blue-600" />
                              {room}
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {timeSlots.map((slot, idx) => {
                        const sessionsByRoom = new Map<string, ProgramSession>();
                        slot.sessions.forEach((session) => {
                          if (session.room) sessionsByRoom.set(session.room, session);
                        });

                        const firstSession = slot.sessions[0];
                        const isFullWidthRow = firstSession &&
                          (firstSession.type === 'break' || firstSession.type === 'keynote');

                        if (isFullWidthRow) {
                          let bgClass = 'bg-amber-50 hover:bg-amber-100';
                          let iconColor = 'text-amber-600';
                          let textColor = 'text-amber-900';

                          if (firstSession.type === 'keynote') {
                            bgClass = 'bg-purple-50 hover:bg-purple-100';
                            iconColor = 'text-purple-600';
                            textColor = 'text-purple-900';
                          }

                          return (
                            <tr key={idx} className={`${bgClass} transition-colors`}>
                              <td className="border border-slate-300 p-2 font-semibold text-xs whitespace-nowrap">
                                {formatTime(slot.time.toISOString())}
                              </td>
                              <td colSpan={Math.max(rooms.length, 1)} className="border border-slate-300 p-3 text-center">
                                <div className="flex items-center justify-center gap-2">
                                  {firstSession.type === 'break' && <Coffee className={`h-4 w-4 ${iconColor}`} />}
                                  {firstSession.type === 'keynote' && <Users className={`h-4 w-4 ${iconColor}`} />}
                                  <span className={`font-bold text-sm ${textColor}`}>{firstSession.title}</span>
                                </div>
                              </td>
                            </tr>
                          );
                        }

                        return (
                          <tr key={idx} className="hover:bg-slate-50 transition-colors">
                            <td className="border border-slate-300 p-2 font-semibold text-xs whitespace-nowrap align-top bg-slate-50">
                              {formatTime(slot.time.toISOString())}
                            </td>
                            {rooms.map((room) => {
                              const session = sessionsByRoom.get(room);
                              if (!session) {
                                return (
                                  <td key={room} className="border border-slate-300 p-2 text-center bg-slate-50">
                                    <span className="text-slate-400 text-xs">–</span>
                                  </td>
                                );
                              }
                              return (
                                <td key={room} className="border border-slate-300 p-2 align-top">
                                  <div className="p-1.5 rounded-lg hover:bg-blue-50 transition-colors">
                                    <p className="font-semibold text-xs text-gray-900">{session.title}</p>
                                    {session.presentations.length > 0 && (
                                      <p className="text-xs text-muted-foreground mt-0.5">
                                        {session.presentations.length} talk{session.presentations.length !== 1 ? 's' : ''}
                                      </p>
                                    )}
                                  </div>
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="md:hidden p-3 space-y-3">
                  {timeSlots.map((slot, idx) => {
                    const firstSession = slot.sessions[0];
                    const isFullWidthRow = firstSession &&
                      (firstSession.type === 'break' || firstSession.type === 'keynote');

                    if (isFullWidthRow) {
                      let borderColor = 'border-l-amber-500';
                      let bgColor = 'bg-amber-50';
                      let iconColor = 'text-amber-600';
                      let textColor = 'text-amber-900';

                      if (firstSession.type === 'keynote') {
                        borderColor = 'border-l-purple-500';
                        bgColor = 'bg-purple-50';
                        iconColor = 'text-purple-600';
                        textColor = 'text-purple-900';
                      }

                      return (
                        <Card key={idx} className={`border-l-4 ${borderColor} ${bgColor}`}>
                          <CardContent className="p-3">
                            <div className="flex items-center gap-2">
                              {firstSession.type === 'break' && <Coffee className={`h-4 w-4 ${iconColor}`} />}
                              {firstSession.type === 'keynote' && <Users className={`h-4 w-4 ${iconColor}`} />}
                              <div>
                                <p className={`font-bold text-sm ${textColor}`}>{firstSession.title}</p>
                                <p className="text-xs text-slate-600">{formatTime(slot.time.toISOString())}</p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    }

                    return (
                      <Card key={idx} className="border">
                        <CardHeader className="pb-2 bg-slate-50">
                          <div className="flex items-center gap-2">
                            <Clock className="h-3 w-3 text-slate-600" />
                            <span className="font-bold text-xs">{formatTime(slot.time.toISOString())}</span>
                            {slot.sessions.length > 1 && (
                              <Badge variant="secondary" className="ml-auto text-xs">
                                {slot.sessions.length} parallel
                              </Badge>
                            )}
                          </div>
                        </CardHeader>
                        <CardContent className="pt-2 space-y-2">
                          {slot.sessions.map((session) => (
                            <div key={session.id} className="p-2 rounded border hover:border-blue-300 hover:bg-blue-50">
                              <p className="font-semibold text-xs">{session.title}</p>
                              {session.room && (
                                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                                  <MapPin className="h-3 w-3" />
                                  {session.room}
                                </p>
                              )}
                            </div>
                          ))}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
};

export function ProgramTab({
  conferenceId,
  days,
  isLoading = false,
  onPresentationClick,
  isAuthenticated = false,
  onToggleFavorite,
}: ProgramTabProps): React.ReactElement {
  const searchParams = useSearchParams();
  const highlightParam = searchParams.get('highlight');
  const highlightPresentationId = highlightParam ? Number(highlightParam) : undefined;
  const { favoriteIds } = useFavoritesContext();
  const [viewMode, setViewMode] = useState<'tree' | 'classic' | 'grid'>('classic');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedDayId, setSelectedDayId] = useState<string>(days[0]?.id ?? '');

  useEffect(() => {
    if (!selectedDayId && days.length > 0) {
      setSelectedDayId(days[0].id);
      return;
    }

    if (selectedDayId && !days.some((day) => day.id === selectedDayId) && days.length > 0) {
      setSelectedDayId(days[0].id);
    }
  }, [days, selectedDayId]);

  useEffect(() => {
    if (highlightParam) {
      setViewMode('tree');
    }
  }, [highlightParam]);

  const treeData = useMemo<TreeScheduleData>(() => {
    const toNumber = (value: string): number => {
      const parsed = Number.parseInt(value, 10);
      return Number.isNaN(parsed) ? 0 : parsed;
    };

    return {
      conferenceId: toNumber(conferenceId),
      conferenceName: '',
      days: days.map((day, index) => ({
        id: toNumber(day.id),
        date: day.date,
        name: day.label || `Day ${index + 1}`,
        order: index,
        sessions: day.sessions.map((session) => ({
          id: toNumber(session.id),
          name: session.title,
          type: session.type,
          startTime: session.startTime,
          endTime: session.endTime,
          room: session.room,
          presentations: session.presentations.map((presentation, presentationIndex) => ({
            id: toNumber(presentation.id),
            title: presentation.title,
            abstract: presentation.abstract,
            keywords: presentation.keywords ?? [],
            order: presentationIndex,
            status: 'scheduled',
            authors: presentation.authors.map((author, authorIndex) => ({
              id: toNumber(author.id),
              authorName: author.name,
              affiliation: author.affiliation,
              isPresenter: author.isPresenter ?? authorIndex === 0,
            })),
            isFavorite: favoriteIds.has(presentation.id),
          })),
        })),
      })),
    };
  }, [days, favoriteIds, conferenceId]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-10 w-64 rounded-lg bg-muted animate-pulse" />
        <div className="h-64 rounded-lg bg-muted animate-pulse" />
      </div>
    );
  }

  if (days.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
        The program schedule will appear here once sessions are published.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative w-full lg:max-w-md">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search sessions or presenters..."
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant={viewMode === 'classic' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('classic')}
          >
            <View className="mr-2 h-4 w-4" />
            Classic
          </Button>
          <Button
            variant={viewMode === 'tree' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('tree')}
          >
            <TreePine className="mr-2 h-4 w-4" />
            Tree View
          </Button>
          <Button
            variant={viewMode === 'grid' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('grid')}
          >
            <Grid3x3 className="mr-2 h-4 w-4" />
            Grid View
          </Button>
          
        </div>
      </div>

      {viewMode === 'grid' ? (
        <GridView days={days} />
      ) : viewMode === 'tree' ? (
        <TreeViewTab
          conferenceId={conferenceId}
          scheduleData={treeData}
          isLoading={false}
          isAuthenticated={isAuthenticated}
          onToggleFavorite={onToggleFavorite}
        />
      ) : (
        <ClassicProgramView
          days={days}
          selectedDayId={selectedDayId}
          onDayChange={setSelectedDayId}
          searchQuery={searchQuery}
          onPresentationClick={onPresentationClick}
          isAuthenticated={isAuthenticated}
          onToggleFavorite={onToggleFavorite}
          favoriteIds={favoriteIds}
          highlightPresentationId={highlightPresentationId}
        />
      )}

    </div>
  );
}
