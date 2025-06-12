"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  ArrowLeft, 
  Calendar, 
  Clock, 
  MapPin, 
  Users, 
  Plus, 
  Save,
  Eye,
  AlertTriangle,
  CheckCircle,
  GripVertical,
  Trash2,
  RotateCcw,
  Download
} from "lucide-react";
import { toast } from "sonner";
import { createAuthenticatedApi } from "@/lib/utils";
import { format, addMinutes, isSameDay, parseISO } from "date-fns";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";

interface Presentation {
  id: number;
  title: string;
  abstract: string;
  duration: number;
  speakers: string[];
  category: string;
  presentationType: string;
  status: 'accepted' | 'pending' | 'rejected';
  scheduledSectionId?: number;
  scheduledOrder?: number;
}

interface Section {
  id: number;
  name: string;
  description: string;
  startTime: string;
  endTime: string;
  room: string;
  capacity: number;
  type: 'presentation' | 'keynote' | 'break' | 'lunch';
  categoryId?: number;
  presentations: Presentation[];
}

interface ScheduleConflict {
  type: 'speaker_conflict' | 'room_conflict' | 'duration_mismatch';
  message: string;
  presentations: number[];
}

export default function ScheduleBuilderPage() {
  const router = useRouter();
  const params = useParams();
  const eventId = Number(params.id);

  const [event, setEvent] = useState<any>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [unscheduledPresentations, setUnscheduledPresentations] = useState<Presentation[]>([]);
  const [scheduledPresentations, setScheduledPresentations] = useState<Presentation[]>([]);
  const [conflicts, setConflicts] = useState<ScheduleConflict[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [viewMode, setViewMode] = useState<'timeline' | 'list'>('timeline');

  useEffect(() => {
    if (eventId) {
      fetchScheduleData();
    }
  }, [eventId]);

  const fetchScheduleData = async () => {
    try {
      setLoading(true);
      const api = await createAuthenticatedApi();

      const [eventRes, sectionsRes, presentationsRes] = await Promise.all([
        api.get(`/events/${eventId}`),
        api.get(`/sections/conference/${eventId}`),
        // api.get(`/events/${eventId}/presentations`),
        api.get(`/api/conferences/${eventId}/presentations`).catch(() => ({ data: [] }))
      ]);

      setEvent(eventRes.data);
      setSections(sectionsRes.data);

      // Separate scheduled and unscheduled presentations
      const allPresentations = presentationsRes.data.filter((p: Presentation) => p.status === 'accepted');

      const scheduled = allPresentations.filter((p: Presentation) => p.scheduledSectionId || p.sectionId);
      const unscheduled = allPresentations.filter((p: Presentation) => !p.scheduledSectionId && !p.sectionId);

      setScheduledPresentations(scheduled);
      setUnscheduledPresentations(unscheduled);
      
      // Check for conflicts
      detectConflicts(sectionsRes.data, scheduled);

    } catch (error: any) {
      console.error('Error fetching schedule data:', error);
      toast.error('Failed to load schedule data');
    } finally {
      setLoading(false);
    }
  };

  const detectConflicts = (sectionsList: Section[], presentationsList: Presentation[]) => {
    const newConflicts: ScheduleConflict[] = [];

    // Check for speaker conflicts (same speaker in overlapping time slots)
    const speakerTimeSlots: { [speaker: string]: { startTime: string; endTime: string; presentationId: number }[] } = {};

    presentationsList.forEach(presentation => {
      const section = sectionsList.find(s => s.id === presentation.scheduledSectionId);
      if (section) {
        presentation.speakers.forEach(speaker => {
          if (!speakerTimeSlots[speaker]) {
            speakerTimeSlots[speaker] = [];
          }
          speakerTimeSlots[speaker].push({
            startTime: section.startTime,
            endTime: section.endTime,
            presentationId: presentation.id
          });
        });
      }
    });

    // Detect overlapping time slots for same speaker
    Object.entries(speakerTimeSlots).forEach(([speaker, timeSlots]) => {
      for (let i = 0; i < timeSlots.length; i++) {
        for (let j = i + 1; j < timeSlots.length; j++) {
          const slot1 = timeSlots[i];
          const slot2 = timeSlots[j];
          
          if (timeSlotsOverlap(slot1.startTime, slot1.endTime, slot2.startTime, slot2.endTime)) {
            newConflicts.push({
              type: 'speaker_conflict',
              message: `Speaker "${speaker}" has overlapping presentations`,
              presentations: [slot1.presentationId, slot2.presentationId]
            });
          }
        }
      }
    });

    setConflicts(newConflicts);
  };

  const timeSlotsOverlap = (start1: string, end1: string, start2: string, end2: string): boolean => {
    const s1 = new Date(start1);
    const e1 = new Date(end1);
    const s2 = new Date(start2);
    const e2 = new Date(end2);
    
    return s1 < e2 && s2 < e1;
  };

  const handleDragEnd = async (result: any) => {
    const { source, destination, draggableId } = result;

    if (!destination) return;

    const presentationId = Number(draggableId.split('-')[1]);
    
    // Handle moving from unscheduled to scheduled
    if (source.droppableId === 'unscheduled' && destination.droppableId.startsWith('section-')) {
      const sectionId = Number(destination.droppableId.split('-')[1]);
      await schedulePresentation(presentationId, sectionId, destination.index);
    }
    // Handle moving between sections
    else if (source.droppableId.startsWith('section-') && destination.droppableId.startsWith('section-')) {
      const newSectionId = Number(destination.droppableId.split('-')[1]);
      await reschedulePresentation(presentationId, newSectionId, destination.index);
    }
    // Handle moving from scheduled back to unscheduled
    else if (source.droppableId.startsWith('section-') && destination.droppableId === 'unscheduled') {
      await unschedulePresentation(presentationId);
    }
  };

  const schedulePresentation = async (presentationId: number, sectionId: number, order: number) => {
    try {
      const api = await createAuthenticatedApi();
      
      await api.put(`/presentations/${presentationId}/schedule`, {
        sectionId,
        order
      });

      // Update local state
      const presentation = unscheduledPresentations.find(p => p.id === presentationId);
      if (presentation) {
        presentation.scheduledSectionId = sectionId;
        presentation.scheduledOrder = order;
        
        setUnscheduledPresentations(prev => prev.filter(p => p.id !== presentationId));
        setScheduledPresentations(prev => [...prev, presentation]);
        
        toast.success('Presentation scheduled successfully');
      }

      // Re-detect conflicts
      detectConflicts(sections, [...scheduledPresentations, { ...presentation!, scheduledSectionId: sectionId }]);

    } catch (error: any) {
      console.error('Error scheduling presentation:', error);
      toast.error('Failed to schedule presentation');
    }
  };

  const reschedulePresentation = async (presentationId: number, newSectionId: number, newOrder: number) => {
    try {
      const api = await createAuthenticatedApi();
      
      await api.put(`/presentations/${presentationId}/schedule`, {
        sectionId: newSectionId,
        order: newOrder
      });

      // Update local state
      setScheduledPresentations(prev => 
        prev.map(p => 
          p.id === presentationId 
            ? { ...p, scheduledSectionId: newSectionId, scheduledOrder: newOrder }
            : p
        )
      );

      toast.success('Presentation rescheduled successfully');

    } catch (error: any) {
      console.error('Error rescheduling presentation:', error);
      toast.error('Failed to reschedule presentation');
    }
  };

  const unschedulePresentation = async (presentationId: number) => {
    try {
      const api = await createAuthenticatedApi();
      
      await api.delete(`/presentations/${presentationId}/schedule`);

      // Update local state
      const presentation = scheduledPresentations.find(p => p.id === presentationId);
      if (presentation) {
        presentation.scheduledSectionId = undefined;
        presentation.scheduledOrder = undefined;
        
        setScheduledPresentations(prev => prev.filter(p => p.id !== presentationId));
        setUnscheduledPresentations(prev => [...prev, presentation]);
        
        toast.success('Presentation unscheduled');
      }

    } catch (error: any) {
      console.error('Error unscheduling presentation:', error);
      toast.error('Failed to unschedule presentation');
    }
  };

  const saveSchedule = async () => {
    try {
      setSaving(true);
      const api = await createAuthenticatedApi();
      
      await api.post(`/events/${eventId}/schedule/publish`);
      
      toast.success('Schedule published successfully!');
      
    } catch (error: any) {
      console.error('Error saving schedule:', error);
      toast.error('Failed to publish schedule');
    } finally {
      setSaving(false);
    }
  };

  const exportSchedule = async () => {
    try {
      const api = await createAuthenticatedApi();
      const response = await api.get(`/events/${eventId}/schedule/export`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${event?.name || 'conference'}-schedule.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      toast.success('Schedule exported successfully');
      
    } catch (error: any) {
      console.error('Error exporting schedule:', error);
      toast.error('Failed to export schedule');
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-96 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="max-w-7xl mx-auto p-6 text-center">
        <h2 className="text-2xl font-bold text-red-600 mb-4">Event not found</h2>
        <Button onClick={() => router.push('/organizer/events')}>
          Back to Events
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            onClick={() => router.push(`/organizer/events/${eventId}`)}
            className="pl-0"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Event
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Schedule Builder</h1>
            <p className="text-gray-600">{event.name}</p>
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setViewMode(viewMode === 'timeline' ? 'list' : 'timeline')}
          >
            <Eye className="h-4 w-4 mr-2" />
            {viewMode === 'timeline' ? 'List View' : 'Timeline View'}
          </Button>
          
          <Button
            variant="outline"
            onClick={exportSchedule}
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          
          <Button
            onClick={saveSchedule}
            disabled={saving || conflicts.length > 0}
            className="bg-primary-700 hover:bg-primary-800"
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Publishing...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Publish Schedule
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Conflicts Alert */}
      {conflicts.length > 0 && (
        <Alert className="mb-6 border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            <div className="font-medium mb-2">Schedule Conflicts Detected:</div>
            <ul className="list-disc list-inside space-y-1">
              {conflicts.map((conflict, index) => (
                <li key={index}>{conflict.message}</li>
              ))}
            </ul>
            <p className="mt-2 text-sm">Please resolve conflicts before publishing the schedule.</p>
          </AlertDescription>
        </Alert>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{scheduledPresentations.length}</div>
              <div className="text-sm text-gray-600">Scheduled</div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{unscheduledPresentations.length}</div>
              <div className="text-sm text-gray-600">Unscheduled</div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{sections.length}</div>
              <div className="text-sm text-gray-600">Time Slots</div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <div className={`text-2xl font-bold ${conflicts.length > 0 ? 'text-red-600' : 'text-green-600'}`}>
                {conflicts.length}
              </div>
              <div className="text-sm text-gray-600">Conflicts</div>
            </div>
          </CardContent>
        </Card>
      </div>

      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          
          {/* Unscheduled Presentations Pool */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Unscheduled Presentations
                  <Badge variant="outline">{unscheduledPresentations.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Droppable droppableId="unscheduled">
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`space-y-2 min-h-96 p-2 rounded-lg border-2 border-dashed transition-colors ${
                        snapshot.isDraggingOver ? 'border-blue-400 bg-blue-50' : 'border-gray-200'
                      }`}
                    >
                      {unscheduledPresentations.map((presentation, index) => (
                        <Draggable
                          key={presentation.id}
                          draggableId={`presentation-${presentation.id}`}
                          index={index}
                        >
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className={`p-3 bg-white border rounded-lg shadow-sm cursor-move transition-shadow ${
                                snapshot.isDragging ? 'shadow-lg rotate-2' : 'hover:shadow-md'
                              }`}
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <h4 className="font-medium text-sm line-clamp-2">{presentation.title}</h4>
                                  <p className="text-xs text-gray-600 mt-1">
                                    {presentation.speakers.join(', ')}
                                  </p>
                                  <div className="flex items-center gap-2 mt-2">
                                    <Badge variant="outline" className="text-xs">
                                      {presentation.duration}min
                                    </Badge>
                                    <Badge variant="outline" className="text-xs">
                                      {presentation.category}
                                    </Badge>
                                  </div>
                                </div>
                                <GripVertical className="h-4 w-4 text-gray-400 ml-2" />
                              </div>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                      
                      {unscheduledPresentations.length === 0 && (
                        <div className="text-center py-8 text-gray-500">
                          <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-500" />
                          <p className="text-sm">All presentations scheduled!</p>
                        </div>
                      )}
                    </div>
                  )}
                </Droppable>
              </CardContent>
            </Card>
          </div>

          {/* Schedule Grid */}
          <div className="lg:col-span-3">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Conference Schedule
                </CardTitle>
              </CardHeader>
              <CardContent>
                
                {viewMode === 'timeline' ? (
                  /* Timeline View */
                  <div className="space-y-4">
                    {sections.map((section) => (
                      <div key={section.id} className="border rounded-lg p-4">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h3 className="font-medium">{section.name}</h3>
                            <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
                              <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {format(new Date(section.startTime), "MMM d, HH:mm")} - {format(new Date(section.endTime), "HH:mm")}
                              </div>
                              <div className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {section.room}
                              </div>
                              <div className="flex items-center gap-1">
                                <Users className="h-3 w-3" />
                                {section.capacity} capacity
                              </div>
                            </div>
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {section.type}
                          </Badge>
                        </div>

                        <Droppable droppableId={`section-${section.id}`}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.droppableProps}
                              className={`min-h-24 p-3 rounded-lg border-2 border-dashed transition-colors ${
                                snapshot.isDraggingOver ? 'border-blue-400 bg-blue-50' : 'border-gray-200 bg-gray-50'
                              }`}
                            >
                              <div className="space-y-2">
                                {scheduledPresentations
                                  .filter(p => p.scheduledSectionId === section.id)
                                  .sort((a, b) => (a.scheduledOrder || 0) - (b.scheduledOrder || 0))
                                  .map((presentation, index) => (
                                    <Draggable
                                      key={presentation.id}
                                      draggableId={`presentation-${presentation.id}`}
                                      index={index}
                                    >
                                      {(provided, snapshot) => (
                                        <div
                                          ref={provided.innerRef}
                                          {...provided.draggableProps}
                                          {...provided.dragHandleProps}
                                          className={`p-3 bg-white border rounded-lg shadow-sm cursor-move transition-shadow ${
                                            snapshot.isDragging ? 'shadow-lg rotate-1' : 'hover:shadow-md'
                                          }`}
                                        >
                                          <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                              <h4 className="font-medium text-sm line-clamp-2">{presentation.title}</h4>
                                              <p className="text-xs text-gray-600 mt-1">
                                                {presentation.speakers.join(', ')}
                                              </p>
                                              <div className="flex items-center gap-2 mt-2">
                                                <Badge variant="outline" className="text-xs">
                                                  {presentation.duration}min
                                                </Badge>
                                                <Badge variant="outline" className="text-xs">
                                                  {presentation.category}
                                                </Badge>
                                              </div>
                                            </div>
                                            <div className="flex items-center gap-1 ml-2">
                                              <GripVertical className="h-4 w-4 text-gray-400" />
                                              <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => unschedulePresentation(presentation.id)}
                                                className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                                              >
                                                <Trash2 className="h-3 w-3" />
                                              </Button>
                                            </div>
                                          </div>
                                        </div>
                                      )}
                                    </Draggable>
                                  ))}
                              </div>
                              {provided.placeholder}
                              
                              {scheduledPresentations.filter(p => p.scheduledSectionId === section.id).length === 0 && (
                                <div className="text-center py-4 text-gray-400">
                                  <p className="text-sm">Drop presentations here</p>
                                </div>
                              )}
                            </div>
                          )}
                        </Droppable>
                      </div>
                    ))}
                  </div>
                ) : (
                  /* List View */
                  <div className="space-y-4">
                    {sections.map((section) => {
                      const sectionPresentations = scheduledPresentations.filter(p => p.scheduledSectionId === section.id);
                      return (
                        <div key={section.id} className="border rounded-lg p-4">
                          <div className="flex justify-between items-center mb-2">
                            <h3 className="font-medium">{section.name}</h3>
                            <Badge variant="outline">{sectionPresentations.length} presentations</Badge>
                          </div>
                          
                          <div className="text-sm text-gray-600 mb-3">
                            {format(new Date(section.startTime), "MMM d, HH:mm")} - {format(new Date(section.endTime), "HH:mm")} • {section.room}
                          </div>
                          
                          {sectionPresentations.length > 0 ? (
                            <div className="space-y-2">
                              {sectionPresentations
                                .sort((a, b) => (a.scheduledOrder || 0) - (b.scheduledOrder || 0))
                                .map((presentation, index) => (
                                  <div key={presentation.id} className="flex items-center gap-3 p-2 bg-gray-50 rounded">
                                    <div className="text-sm font-medium text-gray-500">
                                      #{index + 1}
                                    </div>
                                    <div className="flex-1">
                                      <div className="font-medium text-sm">{presentation.title}</div>
                                      <div className="text-xs text-gray-600">{presentation.speakers.join(', ')}</div>
                                    </div>
                                    <Badge variant="outline" className="text-xs">
                                      {presentation.duration}min
                                    </Badge>
                                  </div>
                                ))}
                            </div>
                          ) : (
                            <p className="text-sm text-gray-500 italic">No presentations scheduled</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </DragDropContext>
    </div>
  );
}
