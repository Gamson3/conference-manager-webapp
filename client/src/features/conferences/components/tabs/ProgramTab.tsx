// ============================================================================
// PROGRAM TAB - Tree View with Grid Overlay
// ============================================================================
'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { 
  Calendar, Clock, MapPin, Search,
  Grid3x3, Download, X, ChevronDown, Layers, List, Coffee, Utensils, Users, Info
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import { TreeViewTab } from './TreeViewTab';
import { ClassicProgramView } from './ClassicProgramView';
import { useFavoritesContext } from '@/features/favorites';
import type { TreeScheduleData } from '@/features/tree-view';

// Reuse types from enhanced tabs
export type SessionType = 'presentation' | 'break' | 'keynote' | 'workshop' | 'panel' | 'networking';

/**
 * Presentation data for public program display.
 * NOTE: File-related fields are intentionally excluded from public views.
 * Files are only accessible to authors (own submissions) and organizers.
 */
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

// Timeline Session Card Component
function TimelineSessionCard({
  session,
  isParallel,
  onPresentationClick,
}: {
  session: ProgramSession;
  isParallel: boolean;
  onPresentationClick?: (presentationId: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);

  if (session.type === 'break') {
    return (
      <Card className="border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
        <CardContent className="py-3 px-4">
          <div className="flex items-center gap-3">
            <Coffee className="h-5 w-5 text-amber-600" />
            <div className="flex-1">
              <p className="font-semibold text-sm">{session.title}</p>
              <p className="text-xs text-slate-600">
                {formatTime(session.startTime)} - {formatTime(session.endTime)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className={cn(
        "border border-slate-200 shadow-sm hover:shadow-md transition-all",
        isParallel && "ring-1 ring-amber-200"
      )}>
        <CollapsibleTrigger asChild>
          <div className="cursor-pointer hover:bg-slate-50 transition-colors p-4">
            <div className="flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <p className="font-semibold text-sm">{session.title}</p>
                  {isParallel && (
                    <Badge className="text-xs bg-amber-100 text-amber-700 border-0">
                      Parallel
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-600">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatTime(session.startTime)} - {formatTime(session.endTime)}
                  </span>
                  {session.room && (
                    <span className="flex items-center gap-1 font-semibold">
                      <MapPin className="h-3 w-3" />
                      {session.room}
                    </span>
                  )}
                  {session.presentations.length > 0 && (
                    <span>{session.presentations.length} talks</span>
                  )}
                </div>
              </div>
              {session.presentations.length > 0 && (
                <ChevronDown className={cn(
                  "h-5 w-5 text-slate-400 transition-transform",
                  isOpen && "rotate-180"
                )} />
              )}
            </div>
          </div>
        </CollapsibleTrigger>
        
        {session.presentations.length > 0 && (
          <CollapsibleContent>
            <div className="px-4 pb-4 space-y-2">
              {session.presentations.map((presentation) => (
                <button
                  key={presentation.id}
                  onClick={() => onPresentationClick?.(presentation.id)}
                  className="w-full text-left p-3 rounded border border-slate-200 hover:border-blue-300 hover:bg-blue-50 transition-colors"
                >
                  <p className="font-medium text-sm">{presentation.title}</p>
                  <p className="text-xs text-slate-600 mt-1">
                    {presentation.authors.map(a => a.name).join(', ')}
                  </p>
                  {presentation.keywords && presentation.keywords.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {presentation.keywords.slice(0, 3).map((keyword) => (
                        <Badge key={keyword} variant="secondary" className="text-xs py-0 px-1.5 bg-slate-100 text-slate-700">
                          {keyword}
                        </Badge>
                      ))}
                    </div>
                  )}
                </button>
              ))}
            </div>
          </CollapsibleContent>
        )}
      </Card>
    </Collapsible>
  );
}

// Group sessions by time slot for grid view
function groupSessionsByTime(sessions: ProgramSession[]) {
  const timeMap = new Map<string, ProgramSession[]>();
  
  sessions.forEach(session => {
    const timeKey = new Date(session.startTime).toISOString();
    if (!timeMap.has(timeKey)) {
      timeMap.set(timeKey, []);
    }
    timeMap.get(timeKey)!.push(session);
  });
  
  return Array.from(timeMap.entries())
    .sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime())
    .map(([timeString, sessions]) => ({
      time: new Date(timeString),
      sessions: sessions.sort((a, b) => (a.room || '').localeCompare(b.room || '')),
      isParallel: sessions.length > 1,
    }));
}

// Grid Overlay Dialog Component - Full ProgramOverviewTab Design
function GridOverlay({
  isOpen,
  onClose,
  days,
}: {
  isOpen: boolean;
  onClose: () => void;
  days: ProgramDay[];
}) {
  const [selectedDayId, setSelectedDayId] = useState(days[0]?.id || '');
  const selectedDay = days.find(d => d.id === selectedDayId) || days[0];
  const timeSlots = selectedDay ? groupSessionsByTime(selectedDay.sessions) : [];

  // Extract real breaks and special sessions from the day's sessions
  const dailyScheduleItems = useMemo(() => {
    if (!selectedDay) return [];
    
    const items: Array<{ time: string; description: string; icon: 'coffee' | 'meal' | 'registration' | 'social' }> = [];
    
    for (const session of selectedDay.sessions) {
      if (session.type === 'break') {
        // Determine icon based on title
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
    
    // Sort by time
    return items.sort((a, b) => a.time.localeCompare(b.time));
  }, [selectedDay]);

  const iconMap = {
    registration: Users,
    coffee: Coffee,
    meal: Utensils,
    social: Users,
  };

  // Handle PDF download - generates clean HTML table matching what user sees
  const handleDownload = (): void => {
    if (!selectedDay) return;
    
    // Create a new window for printing
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Please allow popups to download the program.');
      return;
    }

    const dayLabel = selectedDay.label || 'Program';
    const dayDate = selectedDay.date || '';
    const rooms = selectedDay.rooms;

    // Generate table rows from timeSlots (same data displayed in the grid)
    const tableRows = timeSlots.map((slot) => {
      const sessionsByRoom = new Map<string, ProgramSession>();
      slot.sessions.forEach(s => {
        if (s.room) sessionsByRoom.set(s.room, s);
      });

      const firstSession = slot.sessions[0];
      const isBreak = firstSession && firstSession.type === 'break';
      const isKeynote = firstSession && firstSession.type === 'keynote';

      // Full-width row for breaks and keynotes
      if (isBreak || isKeynote) {
        const bgColor = isKeynote ? '#f3e8ff' : '#fef3c7';
        const textColor = isKeynote ? '#6b21a8' : '#92400e';
        return `
          <tr>
            <td class="time-col">${formatTime(slot.time.toISOString())}</td>
            <td colspan="${rooms.length}" style="background: ${bgColor}; text-align: center; font-weight: 600; color: ${textColor};">
              ${firstSession.title}
            </td>
          </tr>
        `;
      }

      // Regular session row
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

    // Generate the full HTML document
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
              ${rooms.map(room => `<th class="room-header">📍 ${room}</th>`).join('')}
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
    
    // Wait for content to load then print
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl lg:min-w-7xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <Grid3x3 className="h-5 w-5" />
              Program at a Glance
            </DialogTitle>
            <Button variant="outline" size="sm" onClick={handleDownload} className="border-slate-300 hover:bg-slate-50 print:hidden">
              <Download className="h-4 w-4 mr-2" />
              Download PDF
            </Button>
          </div>
        </DialogHeader>

        {/* Info Alert */}
        <Alert className="border-l-4 border-l-blue-500 bg-blue-50/50 print:hidden">
          <Info className="h-4 w-4 text-blue-600" />
          <AlertDescription>
            <strong className="text-blue-900">Program at a Glance:</strong>
            <span className="text-blue-800"> This overview shows all sessions side-by-side in a time × room grid.</span>
          </AlertDescription>
        </Alert>

        {/* Day Tabs */}
        {days.length > 1 && (
          <Tabs value={selectedDayId} onValueChange={setSelectedDayId}>
            <TabsList className="w-full justify-start bg-white border border-slate-200">
              {days.map((day) => (
                <TabsTrigger 
                  key={day.id} 
                  value={day.id}
                  className="data-[state=active]:bg-blue-600 data-[state=active]:text-white"
                >
                  <Calendar className="h-4 w-4 mr-2" />
                  {day.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        )}

        {/* Day Header */}
        {selectedDay && (
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-xl border-2 border-blue-100">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <h2 className="text-xl font-bold text-blue-900">{selectedDay.label}</h2>
                <p className="text-blue-700 text-sm">{selectedDay.date}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge className="bg-blue-600 text-white">
                  {selectedDay.rooms.length} rooms
                </Badge>
                <Badge className="bg-purple-600 text-white">
                  {timeSlots.length} time slots
                </Badge>
              </div>
            </div>
          </div>
        )}

        {/* Content Grid: Daily Timeline + Session Grid */}
        {selectedDay && (
          <div className="grid lg:grid-cols-4 gap-4">
            {/* Daily Timeline Sidebar (1/4 width) */}
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

            {/* Session Grid Table (3/4 width) */}
            <div className="lg:col-span-3">
              <Card className="border-2 shadow-sm overflow-hidden">
                <CardHeader className="pb-3 bg-gradient-to-r from-blue-50 to-indigo-50">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Grid3x3 className="h-4 w-4 text-blue-600" />
                    Conference Sessions - Parallel Tracks
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  {/* Desktop Table View */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full border-collapse text-sm">
                      <thead>
                        <tr className="bg-gradient-to-r from-slate-100 to-slate-50">
                          <th className="border border-slate-300 p-2 text-left font-semibold text-xs bg-slate-200">
                            Time
                          </th>
                          {selectedDay.rooms.map((room) => (
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
                          const sessionsByRoom = new Map();
                          slot.sessions.forEach(s => {
                            if (s.room) sessionsByRoom.set(s.room, s);
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
                                <td colSpan={selectedDay.rooms.length} className="border border-slate-300 p-3 text-center">
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
                              {selectedDay.rooms.map((room) => {
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

                  {/* Mobile Card View */}
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
      </DialogContent>
    </Dialog>
  );
}

export function ProgramTab({
  conferenceId,
  days,
  isLoading,
  onPresentationClick,
  isAuthenticated = false,
  onToggleFavorite,
}: ProgramTabProps) {
  const { favoriteIds } = useFavoritesContext();
  const [viewMode, setViewMode] = useState<'timeline' | 'tree' | 'classic'>('timeline');
  const [selectedDayId, setSelectedDayId] = useState(days[0]?.id || '');
  const searchParams = useSearchParams();
  
  // Get highlight param for favorites navigation
  const highlightParam = searchParams.get('highlight');
  const highlightPresentationId = highlightParam ? Number(highlightParam) : undefined;
  
  // Auto-switch to tree view if highlight param is present (from favorites "View in Program")
  // Unless already in classic mode
  useEffect(() => {
    if (highlightParam && viewMode === 'timeline') {
      setViewMode('tree');
    }
  }, [highlightParam, viewMode]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showGridOverlay, setShowGridOverlay] = useState(false);

  const selectedDay = days.find(d => d.id === selectedDayId) || days[0];
  const timeSlots = selectedDay ? groupSessionsByTime(selectedDay.sessions) : [];

  // Transform to TreeScheduleData for tree view
  const treeData: TreeScheduleData = useMemo(() => ({
    conferenceId: parseInt(conferenceId),
    conferenceName: '', // Tree view doesn't display this
    days: days.map((day, index) => ({
      id: parseInt(day.id),
      date: day.date,
      name: day.label,
      order: index,
      sessions: day.sessions.map((session) => ({
        id: parseInt(session.id),
        name: session.title, // TreeSession uses 'name' field
        type: session.type,
        startTime: session.startTime,
        endTime: session.endTime,
        room: session.room,
        presentations: session.presentations.map((pres, presIndex) => ({
          id: parseInt(pres.id),
          title: pres.title,
          abstract: pres.abstract,
          // NOTE: File-related fields are intentionally excluded from public views.
          keywords: pres.keywords || [],
          authors: pres.authors.map((author, authorIndex) => ({
            id: parseInt(author.id),
            authorName: author.name,
            affiliation: author.affiliation,
            isPresenter: authorIndex === 0, // First author is presenter
          })),
          isFavorite: favoriteIds.has(pres.id),
          order: presIndex,
          status: 'scheduled' as const,
        })),
      })),
    })),
  }), [days, conferenceId, favoriteIds]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-12 bg-slate-200 rounded animate-pulse" />
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4">
              <div className="h-4 bg-slate-200 rounded w-1/2 mb-2" />
              <div className="h-3 bg-slate-200 rounded w-1/3" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (days.length === 0) {
    return (
      <div className="text-center py-16">
        <Calendar className="h-12 w-12 text-slate-400 mx-auto mb-4" />
        <h3 className="font-semibold text-lg mb-2">Program Not Available</h3>
        <p className="text-slate-600">The conference program has not been published yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search & Controls */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search Bar */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search presentations, authors, keywords..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 border-slate-300"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
              onClick={() => setSearchQuery('')}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* View Controls */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowGridOverlay(true)}
            className="border-slate-300 hover:bg-slate-50"
          >
            <Grid3x3 className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Grid View</span>
          </Button>

          {/* View Mode Cycle: Timeline → Tree → Classic */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const modes: Array<'timeline' | 'tree' | 'classic'> = ['timeline', 'tree', 'classic'];
              const currentIdx = modes.indexOf(viewMode);
              const nextIdx = (currentIdx + 1) % modes.length;
              setViewMode(modes[nextIdx]);
            }}
            className="border-slate-300 hover:bg-slate-50 min-w-[100px]"
          >
            <List className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline capitalize">{viewMode}</span>
          </Button>
        </div>
      </div>

      {/* Day Selector - only for timeline/tree modes (classic has its own) */}
      {days.length > 1 && viewMode !== 'classic' && (
        <Tabs value={selectedDayId} onValueChange={setSelectedDayId}>
          <TabsList className="w-full justify-start bg-white border border-slate-200">
            {days.map((day) => (
              <TabsTrigger 
                key={day.id} 
                value={day.id}
                className="data-[state=active]:bg-blue-600 data-[state=active]:text-white"
              >
                {day.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      )}

      {/* Timeline Content */}
      {viewMode === 'timeline' && (
        <div className="space-y-4">
          {timeSlots.length === 0 ? (
            <Card className="border border-slate-200 shadow-sm">
              <CardContent className="py-12 text-center">
                <p className="text-slate-600">
                  {searchQuery ? 'No results match your search' : 'No sessions scheduled'}
                </p>
              </CardContent>
            </Card>
          ) : (
            timeSlots.map((slot, idx) => (
              <div key={idx} className="space-y-3">
                {/* Time Header for Parallel Sessions */}
                {slot.isParallel && (
                  <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 rounded border border-amber-200">
                    <Layers className="h-4 w-4 text-amber-600" />
                    <span className="text-sm font-semibold text-amber-900">
                      {formatTime(slot.time.toISOString())} - {slot.sessions.length} parallel sessions
                    </span>
                  </div>
                )}

                {/* Sessions */}
                <div className={cn(
                  "grid gap-3",
                  slot.isParallel ? "md:grid-cols-2" : "grid-cols-1"
                )}>
                  {slot.sessions.map((session) => (
                    <TimelineSessionCard
                      key={session.id}
                      session={session}
                      isParallel={slot.isParallel}
                      onPresentationClick={onPresentationClick}
                    />
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Tree View */}
      {viewMode === 'tree' && (
        <TreeViewTab
          conferenceId={conferenceId}
          scheduleData={treeData}
          isLoading={false}
          isAuthenticated={isAuthenticated}
          onToggleFavorite={onToggleFavorite}
        />
      )}

      {/* Classic View - EasyChair-inspired minimal design */}
      {viewMode === 'classic' && (
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

      {/* Grid Overlay Dialog */}
      <GridOverlay
        isOpen={showGridOverlay}
        onClose={() => setShowGridOverlay(false)}
        days={days}
      />
    </div>
  );
}
