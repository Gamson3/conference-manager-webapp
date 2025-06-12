"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
  closestCenter,
} from "@dnd-kit/core";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  ArrowLeftIcon,
  CalendarIcon,
  ClockIcon,
  MapPinIcon,
  UsersIcon,
  GripVerticalIcon,
  CheckCircleIcon,
  XCircleIcon,
  EyeIcon,
  MoveIcon,
  InfoIcon,
} from "lucide-react";
import { createAuthenticatedApi } from "@/lib/utils";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

// Updated interfaces to work with real session data
interface SessionEvent {
  id: number;
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  duration: number; // in minutes
  type: 'keynote' | 'break' | 'lunch' | 'opening' | 'closing' | 'presentation';
  isFixed: boolean;
  isAdjustable: boolean; // Can organizer adjust timing?
  speakerName?: string;
  sectionId: number;
}

interface TimeSlot {
  id: number;
  startTime: string;
  endTime: string;
  duration: number; // in minutes
  isOccupied: boolean;
  isFixed: boolean;
  event?: SessionEvent;
  presentationId?: number;
  presentation?: Presentation;
  sectionId: number;
  isAdjustable: boolean; // Can this slot be resized?
}

// Remove Conference interface, use existing Section structure
interface Section {
  id: number;
  name: string;
  startTime: string;
  endTime: string;
  room: string;
  capacity: number;
  conferenceId: number;
  categoryId?: number;
  category?: Category;
  events: SessionEvent[]; // Fixed events (keynotes, breaks, etc.)
  timeSlots: TimeSlot[]; // Generated time slots
}

interface ConferenceDay {
  date: string;
  label: string;
  sections: Section[];
}

interface ScheduleData {
  conferenceId: number;
  conferenceName: string;
  startDate: string;
  endDate: string;
  categories: Category[];
  days: ConferenceDay[];
}

export default function ScheduleBuilderPage() {
  const params = useParams();
  const router = useRouter();
  const conferenceId = params.id as string;

  // State
  const [scheduleData, setScheduleData] = useState<ScheduleData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [selectedDay, setSelectedDay] = useState<string>("");
  const [draggedPresentation, setDraggedPresentation] = useState<Presentation | null>(null);
  const [selectedPresentation, setSelectedPresentation] = useState<Presentation | null>(null);
  const [isAdjustingSlot, setIsAdjustingSlot] = useState<number | null>(null);
  const [tempSlotDuration, setTempSlotDuration] = useState<number>(0);

  // Fetch real data from existing APIs
  const fetchScheduleData = async () => {
    try {
      setLoading(true);
      const api = await createAuthenticatedApi();

      // Fetch conference details
      const conferenceRes = await api.get(`/api/conferences/${conferenceId}`);
      const conference = conferenceRes.data;

      // Fetch categories with presentations
      const categoriesRes = await api.get(`/api/conferences/${conferenceId}/categories`);
      const categoriesWithPresentations = await Promise.all(
        categoriesRes.data.map(async (category: any) => {
          try {
            const presentationsRes = await api.get(`/api/categories/${category.id}/presentations/approved`);
            return {
              ...category,
              presentations: presentationsRes.data
            };
          } catch (error) {
            return { ...category, presentations: [] };
          }
        })
      );

      // Fetch sections (existing session management)
      const sectionsRes = await api.get(`/sections/conference/${conferenceId}`);
      const sections = sectionsRes.data;

      // Fetch fixed events for each section
      const sectionsWithEvents = await Promise.all(
        sections.map(async (section: any) => {
          try {
            // Try to fetch fixed events for this section
            const eventsRes = await api.get(`/sections/${section.id}/events`);
            const events = eventsRes.data.map((event: any) => ({
              ...event,
              isFixed: true,
              type: event.eventType || 'presentation'
            }));

            // Generate time slots based on section schedule and fixed events
            const timeSlots = generateTimeSlotsWithEvents(section, events);

            return {
              ...section,
              events,
              timeSlots
            };
          } catch (error) {
            // If no events API exists, create empty schedule
            const timeSlots = generateEmptyTimeSlots(section);
            return {
              ...section,
              events: [],
              timeSlots
            };
          }
        })
      );

      // Group sections by days
      const days = groupSectionsByDays(conference, sectionsWithEvents);

      const scheduleData: ScheduleData = {
        conferenceId: Number(conferenceId),
        conferenceName: conference.name,
        startDate: conference.startDate,
        endDate: conference.endDate,
        categories: categoriesWithPresentations,
        days
      };

      setScheduleData(scheduleData);
      
      // Set initial selections
      if (categoriesWithPresentations.length > 0) {
        setSelectedCategory(categoriesWithPresentations[0].id);
      }
      if (days.length > 0) {
        setSelectedDay(days[0].date);
      }

    } catch (error) {
      console.error('Error fetching schedule data:', error);
      toast.error('Failed to load schedule data');
      
      // Fallback to mock data for demo
      const mockData = generateFallbackMockData();
      setScheduleData(mockData);
      setSelectedCategory(mockData.categories[0]?.id || null);
      setSelectedDay(mockData.days[0]?.date || "");
    } finally {
      setLoading(false);
    }
  };

  // Generate time slots with fixed events
  const generateTimeSlotsWithEvents = (section: any, events: SessionEvent[]): TimeSlot[] => {
    const slots: TimeSlot[] = [];
    const startTime = new Date(`${section.startDate || '2024-07-15'}T${section.startTime || '09:00:00'}`);
    const endTime = new Date(`${section.startDate || '2024-07-15'}T${section.endTime || '17:00:00'}`);

    // Sort events by start time
    const sortedEvents = events.sort((a, b) => 
      new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
    );

    let currentTime = new Date(startTime);
    let slotIndex = 0;

    // Create slots with proper timing
    while (currentTime < endTime && slotIndex < 50) {
      // Check if there's a fixed event at this time
      const eventAtTime = sortedEvents.find(event => {
        const eventStart = new Date(event.startTime);
        return Math.abs(eventStart.getTime() - currentTime.getTime()) < 60000; // Within 1 minute
      });

      if (eventAtTime) {
        // Add fixed event slot with its actual duration
        slots.push({
          id: Number(`${section.id}${slotIndex}`),
          startTime: eventAtTime.startTime,
          endTime: eventAtTime.endTime,
          duration: eventAtTime.duration,
          isOccupied: true,
          isFixed: true,
          isAdjustable: eventAtTime.isAdjustable,
          event: eventAtTime,
          sectionId: section.id
        });
        
        currentTime = new Date(eventAtTime.endTime);
      } else {
        // Add assignable slot (default 25 minutes to accommodate various presentation lengths)
        const defaultDuration = 25; // minutes
        const slotEndTime = new Date(currentTime.getTime() + defaultDuration * 60000);
        
        // Don't create slot if it would exceed section end time
        if (slotEndTime > endTime) break;
        
        slots.push({
          id: Number(`${section.id}${slotIndex}`),
          startTime: currentTime.toISOString(),
          endTime: slotEndTime.toISOString(),
          duration: defaultDuration,
          isOccupied: false,
          isFixed: false,
          isAdjustable: true,
          sectionId: section.id
        });
        
        // Add 5-minute buffer between presentations
        currentTime = new Date(slotEndTime.getTime() + 5 * 60000);
      }
      
      slotIndex++;
    }

    return slots;
  };

  // Generate empty time slots for sections without events
  const generateEmptyTimeSlots = (section: any): TimeSlot[] => {
    const slots: TimeSlot[] = [];
    const startTime = new Date(`${section.startDate || '2024-07-15'}T${section.startTime || '09:00:00'}`);
    const endTime = new Date(`${section.startDate || '2024-07-15'}T${section.endTime || '17:00:00'}`);

    let currentTime = new Date(startTime);
    let slotIndex = 0;

    while (currentTime < endTime && slotIndex < 12) {
      const slotEndTime = new Date(currentTime.getTime() + 30 * 60000);
      
      slots.push({
        id: Number(`${section.id}${slotIndex}`),
        startTime: currentTime.toISOString(),
        endTime: slotEndTime.toISOString(),
        isOccupied: false,
        sectionId: section.id
      });
      
      currentTime = new Date(slotEndTime.getTime() + 15 * 60000);
      slotIndex++;
    }

    return slots;
  };

  // Group sections by days
  const groupSectionsByDays = (conference: any, sections: Section[]): ConferenceDay[] => {
    const days: ConferenceDay[] = [];
    const startDate = new Date(conference.startDate);
    const endDate = new Date(conference.endDate);
    
    let currentDate = new Date(startDate);
    let dayIndex = 1;
    
    while (currentDate <= endDate) {
      const dateString = currentDate.toISOString().split('T')[0];
      
      // Filter sections for this day (you might have date info in sections)
      const daySections = sections.filter(section => {
        // If sections have date info, use it, otherwise assume all sections run all days
        return section.startDate ? section.startDate === dateString : true;
      });
      
      days.push({
        date: dateString,
        label: `Day ${dayIndex}`,
        sections: daySections
      });
      
      currentDate.setDate(currentDate.getDate() + 1);
      dayIndex++;
    }
    
    return days;
  };

  // Fallback mock data (simplified version of current mock)
  const generateFallbackMockData = (): ScheduleData => {
    // Simplified version of your current mock data structure
    // ... (keep existing mock data logic but return ScheduleData format)
  };

  // Rest of drag and drop logic (same as before)
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const presentation = findPresentationById(Number(active.id));
    setDraggedPresentation(presentation);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setDraggedPresentation(null);

    if (!over) return;

    const presentationId = Number(active.id);

    if (over.id.toString().startsWith("slot-")) {
      const actualTimeSlotId = Number(over.id.toString().replace("slot-", ""));
      assignPresentationToTimeSlot(presentationId, actualTimeSlotId);
    }
  };

  // Updated helper functions
  const findPresentationById = (id: number): Presentation | null => {
    if (!scheduleData) return null;

    for (const category of scheduleData.categories) {
      const presentation = category.presentations.find((p) => p.id === id);
      if (presentation) return presentation;
    }
    return null;
  };

  const assignPresentationToTimeSlot = async (presentationId: number, timeSlotId: number) => {
    try {
      if (scheduleData) {
        const updatedScheduleData = { ...scheduleData };
        const presentation = findPresentationById(presentationId);
        
        if (presentation) {
          // Remove from unassigned
          updatedScheduleData.categories = updatedScheduleData.categories.map(cat => ({
            ...cat,
            presentations: cat.presentations.filter(p => p.id !== presentationId)
          }));

          // Find the time slot and adjust duration
          updatedScheduleData.days = updatedScheduleData.days.map(day => ({
            ...day,
            sections: day.sections.map(section => ({
              ...section,
              timeSlots: adjustTimeSlotsAfterAssignment(
                section.timeSlots, 
                timeSlotId, 
                presentation
              )
            }))
          }));

          setScheduleData(updatedScheduleData);
          toast.success(`Presentation assigned! Slot adjusted to ${presentation.duration} minutes.`);
        }
      }
    } catch (error: any) {
      console.error('Error assigning presentation:', error);
      toast.error('Failed to assign presentation');
    }
  };

  // Adjust time slots dynamically based on presentation duration
  const adjustTimeSlotsAfterAssignment = (
    timeSlots: TimeSlot[], 
    targetSlotId: number, 
    presentation: Presentation
  ): TimeSlot[] => {
    const adjustedSlots = [...timeSlots];
    const targetIndex = adjustedSlots.findIndex(slot => slot.id === targetSlotId);
    
    if (targetIndex === -1) return adjustedSlots;

    const targetSlot = adjustedSlots[targetIndex];
    const presentationDuration = presentation.duration;
    const currentDuration = targetSlot.duration;
    const timeDifference = presentationDuration - currentDuration; // positive = longer, negative = shorter

    // Update the target slot
    const newEndTime = new Date(new Date(targetSlot.startTime).getTime() + presentationDuration * 60000);
    adjustedSlots[targetIndex] = {
      ...targetSlot,
      endTime: newEndTime.toISOString(),
      duration: presentationDuration,
      isOccupied: true,
      presentationId: presentation.id,
      presentation
    };

    // Adjust subsequent slots
    for (let i = targetIndex + 1; i < adjustedSlots.length; i++) {
      const slot = adjustedSlots[i];
      
      if (slot.isFixed && !slot.isAdjustable) {
        // Fixed slot that can't be moved - check for conflicts
        const slotStart = new Date(slot.startTime);
        if (newEndTime > slotStart) {
          toast.warning(`Conflict detected with ${slot.event?.title}. You may need to adjust manually.`);
          break;
        }
      } else {
        // Adjustable slot - shift it
        const previousSlot = adjustedSlots[i - 1];
        const newStartTime = new Date(previousSlot.endTime);
        const newSlotEndTime = new Date(newStartTime.getTime() + slot.duration * 60000);
        
        adjustedSlots[i] = {
          ...slot,
          startTime: newStartTime.toISOString(),
          endTime: newSlotEndTime.toISOString()
        };
      }
    }

    return adjustedSlots;
  };

  // Unassign with slot readjustment
  const unassignPresentation = (presentationId: number) => {
    if (scheduleData) {
      const updatedScheduleData = { ...scheduleData };
      let presentationToMove: Presentation | null = null;

      // Find and remove from time slots, readjust to default duration
      updatedScheduleData.days = updatedScheduleData.days.map(day => ({
        ...day,
        sections: day.sections.map(section => ({
          ...section,
          timeSlots: section.timeSlots.map(slot => {
            if (slot.presentationId === presentationId) {
              presentationToMove = slot.presentation || null;
              
              // Reset to default 25-minute slot
              const defaultDuration = 25;
              const newEndTime = new Date(new Date(slot.startTime).getTime() + defaultDuration * 60000);
              
              return {
                ...slot,
                endTime: newEndTime.toISOString(),
                duration: defaultDuration,
                isOccupied: false,
                presentationId: undefined,
                presentation: undefined
              };
            }
            return slot;
          })
        }))
      }));

      // Add back to unassigned
      if (presentationToMove) {
        updatedScheduleData.categories = updatedScheduleData.categories.map(cat => {
          if (cat.id === presentationToMove!.categoryId) {
            return {
              ...cat,
              presentations: [...cat.presentations, presentationToMove!]
            };
          }
          return cat;
        });
      }

      setScheduleData(updatedScheduleData);
      toast.success('Presentation unassigned and slot reset to default duration.');
    }
  };

  // Manual slot duration adjustment
  const adjustSlotDuration = (slotId: number, newDuration: number) => {
    if (scheduleData) {
      const updatedScheduleData = { ...scheduleData };
      
      updatedScheduleData.days = updatedScheduleData.days.map(day => ({
        ...day,
        sections: day.sections.map(section => ({
          ...section,
          timeSlots: section.timeSlots.map(slot => {
            if (slot.id === slotId && slot.isAdjustable) {
              const newEndTime = new Date(new Date(slot.startTime).getTime() + newDuration * 60000);
              return {
                ...slot,
                endTime: newEndTime.toISOString(),
                duration: newDuration
              };
            }
            return slot;
          })
        }))
      }));

      setScheduleData(updatedScheduleData);
      toast.success('Slot duration adjusted successfully!');
    }
  };

  // Get current data
  const currentDay = scheduleData?.days.find(day => day.date === selectedDay);
  const selectedCategoryData = scheduleData?.categories.find(cat => cat.id === selectedCategory);
  const unassignedPresentations = selectedCategoryData?.presentations || [];

  useEffect(() => {
    fetchScheduleData();
  }, [conferenceId]);

  if (loading) {
    return (
      <div className="p-8 max-w-7xl mx-auto">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-8"></div>
          <div className="grid grid-cols-12 gap-6">
            <div className="col-span-4">
              <div className="h-96 bg-gray-200 rounded"></div>
            </div>
            <div className="col-span-8">
              <div className="h-96 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <DndContext
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="p-6 max-w-7xl mx-auto min-h-screen bg-gray-50">
        {/* Header with workflow guidance */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              onClick={() => router.push(`/organizer/events/${conferenceId}`)}
              className="p-0 hover:bg-transparent"
            >
              <ArrowLeftIcon className="h-4 w-4 mr-2" />
              Back to Event
            </Button>
            <div>
              <h1 className="text-3xl font-bold">Schedule Builder</h1>
              <p className="text-gray-600 mt-1">
                Drag approved presentations to assign them to time slots. Slots adjust automatically.
              </p>
              <Badge variant="outline" className="mt-2">
                <InfoIcon className="h-3 w-3 mr-1" />
                Workflow: Sessions → Categories → Presentations → Review → Schedule
              </Badge>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => router.push(`/organizer/events/${conferenceId}/sessions`)}
            >
              Manage Sessions
            </Button>
            <Button
              variant="outline"
              onClick={() => router.push(`/organizer/events/${conferenceId}/categories`)}
            >
              Categories & Types
            </Button>
            <Button
              variant="outline"
              onClick={() => router.push(`/organizer/events/${conferenceId}/presentations`)}
            >
              Review Presentations
            </Button>
            <Button className="bg-green-600 hover:bg-green-700">
              Publish Schedule
            </Button>
          </div>
        </div>

        {/* Workflow Status Banner */}
        <WorkflowStatusBanner conferenceId={conferenceId} />

        {/* Day Tabs */}
        {scheduleData && scheduleData.days.length > 1 && (
          <Card className="mb-6">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Conference Days</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs value={selectedDay} onValueChange={setSelectedDay}>
                <TabsList className={`grid w-full grid-cols-${scheduleData.days.length}`}>
                  {scheduleData.days.map((day) => (
                    <TabsTrigger key={day.date} value={day.date}>
                      {day.label} - {new Date(day.date).toLocaleDateString('en-US', { 
                        weekday: 'short', 
                        month: 'short', 
                        day: 'numeric' 
                      })}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            </CardContent>
          </Card>
        )}

        {/* Main Interface */}
        <div className="grid grid-cols-12 gap-6 min-h-[600px]">
          {/* Left Panel: Unassigned Presentations */}
          <div className="col-span-4">
            <Card className="sticky top-0 max-h-[80vh]">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center">
                  <CalendarIcon className="h-5 w-5 mr-2" />
                  Unassigned Presentations
                </CardTitle>

                {/* Category Tabs */}
                {scheduleData && scheduleData.categories.length > 0 && (
                  <Tabs
                    value={selectedCategory?.toString()}
                    onValueChange={(value) => setSelectedCategory(Number(value))}
                  >
                    <TabsList className={`grid grid-cols-${Math.min(scheduleData.categories.length, 3)}`}>
                      {scheduleData.categories.slice(0, 3).map((category) => (
                        <TabsTrigger
                          key={category.id}
                          value={category.id.toString()}
                          className="text-xs"
                        >
                          <div
                            className="w-2 h-2 rounded-full mr-1"
                            style={{ backgroundColor: category.color }}
                          />
                          {category.name} ({category.presentations.length})
                        </TabsTrigger>
                      ))}
                    </TabsList>
                  </Tabs>
                )}
              </CardHeader>
              
              <CardContent className="flex-1 overflow-y-auto max-h-[60vh]">
                {unassignedPresentations.length === 0 ? (
                  <div className="text-center py-12">
                    <CheckCircleIcon className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                    <p className="text-gray-500">All presentations assigned!</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {unassignedPresentations.map((presentation) => (
                      <DraggablePresentationCard
                        key={presentation.id}
                        presentation={presentation}
                        onView={() => setSelectedPresentation(presentation)}
                      />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Panel: Daily Schedule */}
          <div className="col-span-8">
            <Card className="min-h-full">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center">
                    <ClockIcon className="h-5 w-5 mr-2" />
                    {currentDay?.label} Schedule
                  </div>
                  
                  {/* Quick actions */}
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push(`/organizer/events/${conferenceId}/sessions/new`)}
                    >
                      Add Session
                    </Button>
                  </div>
                </CardTitle>
                <p className="text-sm text-gray-600">
                  Parallel sessions are displayed side by side. Fixed events from session management appear automatically.
                </p>
              </CardHeader>
              
              <CardContent className="pb-8">
                {currentDay ? (
                  <ParallelSessionsTimeline 
                    sections={currentDay.sections}
                    onPresentationView={setSelectedPresentation}
                    onPresentationUnassign={unassignPresentation}
                  />
                ) : (
                  <div className="text-center py-12">
                    <CalendarIcon className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                    <p className="text-gray-500 mb-4">No sessions scheduled for this day</p>
                    <Button
                      onClick={() => router.push(`/organizer/events/${conferenceId}/sessions/new`)}
                    >
                      Create First Session
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Drag Overlay */}
        <DragOverlay>
          {draggedPresentation ? (
            <DraggablePresentationCard
              presentation={draggedPresentation}
              isDragging={true}
            />
          ) : null}
        </DragOverlay>

        {/* Presentation Detail Dialog */}
        <Dialog
          open={!!selectedPresentation}
          onOpenChange={() => setSelectedPresentation(null)}
        >
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto bg-white">
            <DialogHeader>
              <DialogTitle className="text-xl pr-8">
                {selectedPresentation?.title}
              </DialogTitle>
            </DialogHeader>

            {selectedPresentation && (
              <div className="space-y-6 mt-4">
                <div className="flex flex-wrap gap-2">
                  <Badge
                    className="px-3 py-1"
                    style={{
                      backgroundColor: `${selectedPresentation.category.color}20`,
                      color: selectedPresentation.category.color,
                      border: `1px solid ${selectedPresentation.category.color}40`,
                    }}
                  >
                    {selectedPresentation.category.name}
                  </Badge>
                  <Badge variant="outline" className="px-3 py-1">
                    {selectedPresentation.presentationType.name}
                  </Badge>
                  <Badge variant="outline" className="px-3 py-1">
                    <ClockIcon className="h-3 w-3 mr-1" />
                    {selectedPresentation.duration} minutes
                  </Badge>
                  <Badge variant="outline" className="px-3 py-1">
                    {selectedPresentation.reviewStatus}
                  </Badge>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-semibold mb-3 text-gray-900">Authors</h4>
                  <div className="space-y-2">
                    {selectedPresentation.authors.map((author, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between bg-white rounded p-3 border"
                      >
                        <div>
                          <span className="font-medium text-gray-900">
                            {author.name}
                          </span>
                          <p className="text-sm text-gray-600">
                            {author.affiliation}
                          </p>
                        </div>
                        {author.isPresenter && (
                          <Badge
                            variant="default"
                            className="bg-blue-100 text-blue-800 border-blue-200"
                          >
                            Presenter
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-semibold mb-3 text-gray-900">Abstract</h4>
                  <div className="bg-white rounded p-4 border">
                    <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                      {selectedPresentation.abstract}
                    </p>
                  </div>
                </div>

                <div className="flex justify-end pt-4 border-t">
                  <Button
                    variant="outline"
                    onClick={() => setSelectedPresentation(null)}
                    className="px-6"
                  >
                    Close
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DndContext>
  );
}

// Updated Draggable Presentation Card Component
function DraggablePresentationCard({
  presentation,
  isDragging = false,
  onView,
}: {
  presentation: Presentation;
  isDragging?: boolean;
  onView?: () => void;
}) {
  const { useDraggable } = require("@dnd-kit/core");
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging: isCurrentlyDragging,
  } = useDraggable({
    id: presentation.id,
  });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "border rounded-lg bg-white shadow-sm transition-all hover:shadow-md overflow-hidden", // Added overflow-hidden
        isCurrentlyDragging && "opacity-50",
        isDragging && "rotate-2 shadow-lg"
      )}
    >
      {/* Draggable Header */}
      <div
        {...listeners}
        {...attributes}
        className="p-4 cursor-grab active:cursor-grabbing"
      >
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1">
            <h4 className="font-medium text-sm leading-tight line-clamp-2">
              {presentation.title}
            </h4>
            <p className="text-xs text-gray-500 mt-1">
              {presentation.authors[0]?.name}{" "}
              {presentation.authors.length > 1 &&
                `+${presentation.authors.length - 1}`}
            </p>
          </div>
          <GripVerticalIcon className="h-4 w-4 text-gray-400 ml-2 flex-shrink-0" />
        </div>

        <div className="flex items-center justify-between">
          <Badge
            variant="secondary"
            className="text-xs"
            style={{
              backgroundColor: `${presentation.category.color}20`,
              color: presentation.category.color,
            }}
          >
            {presentation.category.name}
          </Badge>
          <span className="text-xs text-gray-500 flex items-center">
            <ClockIcon className="h-3 w-3 mr-1" />
            {presentation.duration}min
          </span>
        </div>
      </div>

      {/* Action Buttons - Removed border-t */}
      <div className="px-4 pb-3 bg-gray-50/50"> {/* Removed border-t, made background lighter */}
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start text-xs hover:bg-gray-100"
          onClick={onView}
        >
          <EyeIcon className="h-3 w-3 mr-2" />
          View Details
        </Button>
      </div>
    </div>
  );
}

// Updated Section Timeline View Component
function SectionTimelineView({
  section,
  onPresentationView,
  onPresentationUnassign,
}: {
  section: Section;
  onPresentationView: (presentation: Presentation) => void;
  onPresentationUnassign: (presentationId: number) => void;
}) {
  return (
    <div className="border rounded-lg p-4 bg-white">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold">{section.name}</h3>
          <div className="flex items-center gap-4 text-sm text-gray-500">
            <span className="flex items-center">
              <MapPinIcon className="h-4 w-4 mr-1" />
              {section.room}
            </span>
            <span className="flex items-center">
              <UsersIcon className="h-4 w-4 mr-1" />
              {section.capacity}
            </span>
            {section.category && (
              <Badge
                variant="outline"
                style={{
                  borderColor: section.category.color,
                  color: section.category.color,
                }}
              >
                {section.category.name}
              </Badge>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2">
        {section.timeSlots.map((slot) => (
          <DroppableTimeSlot
            key={slot.id}
            timeSlot={slot}
            onPresentationView={onPresentationView}
            onPresentationUnassign={onPresentationUnassign}
          />
        ))}
      </div>
    </div>
  );
}

// Updated Droppable Time Slot Component
function DroppableTimeSlot({
  timeSlot,
  onPresentationView,
  onPresentationUnassign,
}: {
  timeSlot: TimeSlot;
  onPresentationView: (presentation: Presentation) => void;
  onPresentationUnassign: (presentationId: number) => void;
}) {
  const { useDroppable } = require("@dnd-kit/core");
  
  // Only make assignable slots droppable
  const { isOver, setNodeRef } = useDroppable({
    id: timeSlot.isFixed ? `fixed-${timeSlot.id}` : `slot-${timeSlot.id}`,
    disabled: timeSlot.isFixed, // Disable dropping on fixed slots
  });

  const startTime = new Date(timeSlot.startTime).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  const endTime = new Date(timeSlot.endTime).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  // Get styling based on slot type
  const getSlotStyling = () => {
    if (timeSlot.isFixed) {
      switch (timeSlot.type) {
        case 'keynote':
          return "border-solid border-purple-300 bg-purple-50";
        case 'break':
          return "border-solid border-orange-300 bg-orange-50";
        case 'lunch':
          return "border-solid border-yellow-300 bg-yellow-50";
        case 'opening':
        case 'closing':
          return "border-solid border-indigo-300 bg-indigo-50";
        default:
          return "border-solid border-gray-300 bg-gray-50";
      }
    }
    
    // Assignable slots
    if (timeSlot.isOccupied && timeSlot.presentation) {
      return "border-solid border-green-200 bg-green-50";
    }
    
    if (isOver) {
      return "border-blue-400 bg-blue-50";
    }
    
    return "border-2 border-dashed border-gray-200";
  };

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "rounded-lg h-full transition-all relative",
        getSlotStyling()
      )}
    >
      <div className="p-3 h-full flex flex-col">
        {/* Section header */}
        <div className="mb-2">
          <div className="flex items-center justify-between">
            <h5 className="font-medium text-sm text-gray-900">{section.name}</h5>
            {section.category && (
              <Badge
                variant="outline"
                className="text-xs"
                style={{
                  borderColor: section.category.color,
                  color: section.category.color,
                }}
              >
                {section.category.name}
              </Badge>
            )}
          </div>
          <p className="text-xs text-gray-500">
            {section.room} • {section.capacity} seats
          </p>
        </div>

        {/* Slot content */}
        <div className="flex-1">
          {timeSlot.isFixed ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge 
                  variant="outline" 
                  className="text-xs"
                  style={{
                    borderColor: timeSlot.type === 'keynote' ? '#9333ea' : 
                                 timeSlot.type === 'break' ? '#ea580c' :
                                 timeSlot.type === 'lunch' ? '#ca8a04' : '#4f46e5',
                    color: timeSlot.type === 'keynote' ? '#9333ea' : 
                           timeSlot.type === 'break' ? '#ea580c' :
                           timeSlot.type === 'lunch' ? '#ca8a04' : '#4f46e5'
                  }}
                >
                  {timeSlot.type.toUpperCase()}
                </Badge>
              </div>
              <h6 className="font-medium text-sm text-gray-900">
                {timeSlot.title}
              </h6>
              {timeSlot.description && (
                <p className="text-xs text-gray-600">
                  {timeSlot.description}
                </p>
              )}
            </div>
          ) : timeSlot.presentation ? (
            <div className="bg-white rounded border p-3 h-full flex flex-col">
              <h6 className="font-medium text-sm mb-1 flex-1">
                {timeSlot.presentation.title}
              </h6>
              <p className="text-xs text-gray-500 mb-2">
                {timeSlot.presentation.authors[0]?.name}
              </p>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs px-2 py-1 h-auto"
                  onClick={() => onPresentationView(timeSlot.presentation!)}
                >
                  <EyeIcon className="h-3 w-3 mr-1" />
                  View
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs px-2 py-1 h-auto"
                  onClick={() => onPresentationUnassign(timeSlot.presentation!.id)}
                >
                  <MoveIcon className="h-3 w-3 mr-1" />
                  Move
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center text-gray-400 text-xs py-8">
              {isOver ? "Drop here" : "Available"}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ScheduleLegend() {
  const legendItems = [
    { type: 'keynote', color: 'border-purple-300 bg-purple-50', label: 'Keynote' },
    { type: 'break', color: 'border-orange-300 bg-orange-50', label: 'Break' },
    { type: 'lunch', color: 'border-yellow-300 bg-yellow-50', label: 'Lunch' },
    { type: 'opening', color: 'border-indigo-300 bg-indigo-50', label: 'Opening/Closing' },
    { type: 'assignable', color: 'border-dashed border-gray-200', label: 'Assignable' },
    { type: 'assigned', color: 'border-solid border-green-200 bg-green-50', label: 'Assigned' },
  ];

  return (
    <Card className="mb-6">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">Schedule Legend</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {legendItems.map((item) => (
            <div key={item.type} className="flex items-center gap-2">
              <div className={cn("w-4 h-4 rounded border", item.color)} />
              <span className="text-xs text-gray-600">{item.label}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// New component for parallel sessions timeline
function ParallelSessionsTimeline({
  sections,
  onPresentationView,
  onPresentationUnassign,
}: {
  sections: Section[];
  onPresentationView: (presentation: Presentation) => void;
  onPresentationUnassign: (presentationId: number) => void;
}) {
  // Group sections by time slots to show parallel sessions
  const timeSlotGroups = useMemo(() => {
    const groups: { [timeKey: string]: { time: string; sections: { section: Section; slot: TimeSlot }[] } } = {};
    
    sections.forEach(section => {
      section.timeSlots.forEach(slot => {
        const timeKey = `${slot.startTime}-${slot.endTime}`;
        if (!groups[timeKey]) {
          groups[timeKey] = {
            time: `${new Date(slot.startTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })} - ${new Date(slot.endTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}`,
            sections: []
          };
        }
        groups[timeKey].sections.push({ section, slot });
      });
    });
    
    return Object.entries(groups)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, group]) => group);
  }, [sections]);

  return (
    <div className="space-y-4">
      {timeSlotGroups.map((group, index) => (
        <div key={index} className="border rounded-lg p-4 bg-white">
          <div className="mb-3">
            <h4 className="font-semibold text-lg text-gray-900">{group.time}</h4>
          </div>
          
          {/* Parallel sessions in a grid */}
          <div className={cn(
            "grid gap-4",
            group.sections.length === 1 ? "grid-cols-1" :
            group.sections.length === 2 ? "grid-cols-2" :
            group.sections.length === 3 ? "grid-cols-3" :
            "grid-cols-2 xl:grid-cols-3" // For 4+ sessions, wrap to multiple rows
          )}>
            {group.sections.map(({ section, slot }) => (
              <div key={`${section.id}-${slot.id}`} className="min-h-[120px]">
                <ParallelSessionSlot
                  section={section}
                  timeSlot={slot}
                  onPresentationView={onPresentationView}
                  onPresentationUnassign={onPresentationUnassign}
                />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// Component for individual parallel session slot
function ParallelSessionSlot({
  section,
  timeSlot,
  onPresentationView,
  onPresentationUnassign,
}: {
  section: Section;
  timeSlot: TimeSlot;
  onPresentationView: (presentation: Presentation) => void;
  onPresentationUnassign: (presentationId: number) => void;
}) {
  const { useDroppable } = require("@dnd-kit/core");
  
  const { isOver, setNodeRef } = useDroppable({
    id: timeSlot.isFixed ? `fixed-${timeSlot.id}` : `slot-${timeSlot.id}`,
    disabled: timeSlot.isFixed,
  });

  const getSlotStyling = () => {
    if (timeSlot.isFixed) {
      switch (timeSlot.type) {
        case 'keynote':
          return "border-solid border-purple-300 bg-purple-50";
        case 'break':
          return "border-solid border-orange-300 bg-orange-50";
        case 'lunch':
          return "border-solid border-yellow-300 bg-yellow-50";
        case 'opening':
        case 'closing':
          return "border-solid border-indigo-300 bg-indigo-50";
        default:
          return "border-solid border-gray-300 bg-gray-50";
      }
    }
    
    if (timeSlot.isOccupied && timeSlot.presentation) {
      return "border-solid border-green-200 bg-green-50";
    }
    
    if (isOver) {
      return "border-blue-400 bg-blue-50";
    }
    
    return "border-2 border-dashed border-gray-200";
  };

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "rounded-lg h-full transition-all relative",
        getSlotStyling()
      )}
    >
      <div className="p-3 h-full flex flex-col">
        {/* Section header */}
        <div className="mb-2">
          <div className="flex items-center justify-between">
            <h5 className="font-medium text-sm text-gray-900">{section.name}</h5>
            {section.category && (
              <Badge
                variant="outline"
                className="text-xs"
                style={{
                  borderColor: section.category.color,
                  color: section.category.color,
                }}
              >
                {section.category.name}
              </Badge>
            )}
          </div>
          <p className="text-xs text-gray-500">
            {section.room} • {section.capacity} seats
          </p>
        </div>

        {/* Slot content */}
        <div className="flex-1">
          {timeSlot.isFixed ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge 
                  variant="outline" 
                  className="text-xs"
                  style={{
                    borderColor: timeSlot.type === 'keynote' ? '#9333ea' : 
                                 timeSlot.type === 'break' ? '#ea580c' :
                                 timeSlot.type === 'lunch' ? '#ca8a04' : '#4f46e5',
                    color: timeSlot.type === 'keynote' ? '#9333ea' : 
                           timeSlot.type === 'break' ? '#ea580c' :
                           timeSlot.type === 'lunch' ? '#ca8a04' : '#4f46e5'
                  }}
                >
                  {timeSlot.type.toUpperCase()}
                </Badge>
              </div>
              <h6 className="font-medium text-sm text-gray-900">
                {timeSlot.title}
              </h6>
              {timeSlot.description && (
                <p className="text-xs text-gray-600">
                  {timeSlot.description}
                </p>
              )}
            </div>
          ) : timeSlot.presentation ? (
            <div className="bg-white rounded border p-3 h-full flex flex-col">
              <h6 className="font-medium text-sm mb-1 flex-1">
                {timeSlot.presentation.title}
              </h6>
              <p className="text-xs text-gray-500 mb-2">
                {timeSlot.presentation.authors[0]?.name}
              </p>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs px-2 py-1 h-auto"
                  onClick={() => onPresentationView(timeSlot.presentation!)}
                >
                  <EyeIcon className="h-3 w-3 mr-1" />
                  View
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs px-2 py-1 h-auto"
                  onClick={() => onPresentationUnassign(timeSlot.presentation!.id)}
                >
                  <MoveIcon className="h-3 w-3 mr-1" />
                  Move
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center text-gray-400 text-xs py-8">
              {isOver ? "Drop here" : "Available"}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// New workflow status component
function WorkflowStatusBanner({ conferenceId }: { conferenceId: string }) {
  const [workflowStatus, setWorkflowStatus] = useState({
    hasSessions: false,
    hasCategories: false,
    isPublished: false,
    pendingReviews: 0,
    approvedPresentations: 0
  });

  // This would fetch real status from your APIs
  useEffect(() => {
    // Fetch workflow status
    // setWorkflowStatus(status);
  }, [conferenceId]);

  return (
    <Card className="mb-6 border-blue-200 bg-blue-50">
      <CardContent className="py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <CheckCircleIcon className="h-4 w-4 text-green-600" />
              <span className="text-sm">Sessions Created</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircleIcon className="h-4 w-4 text-green-600" />
              <span className="text-sm">Categories Setup</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircleIcon className="h-4 w-4 text-green-600" />
              <span className="text-sm">Published for Submissions</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">{workflowStatus.approvedPresentations} Approved</Badge>
              {workflowStatus.pendingReviews > 0 && (
                <Badge variant="outline" className="border-orange-300 text-orange-700">
                  {workflowStatus.pendingReviews} Pending Review
                </Badge>
              )}
            </div>
          </div>
          
          {workflowStatus.pendingReviews > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push(`/organizer/events/${conferenceId}/presentations?filter=pending`)}
            >
              Review Pending
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Enhanced DroppableTimeSlot with manual adjustment capability
function EnhancedDroppableTimeSlot({
  timeSlot,
  section,
  onPresentationView,
  onPresentationUnassign,
  onDurationAdjust,
}: {
  timeSlot: TimeSlot;
  section: Section;
  onPresentationView: (presentation: Presentation) => void;
  onPresentationUnassign: (presentationId: number) => void;
  onDurationAdjust: (slotId: number, duration: number) => void;
}) {
  const { useDroppable } = require("@dnd-kit/core");
  const [isAdjusting, setIsAdjusting] = useState(false);
  const [tempDuration, setTempDuration] = useState(timeSlot.duration);
  
  const isFixed = timeSlot.event?.isFixed || false;
  const { isOver, setNodeRef } = useDroppable({
    id: isFixed ? `fixed-${timeSlot.id}` : `slot-${timeSlot.id}`,
    disabled: isFixed,
  });

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  };

  const handleDurationSave = () => {
    onDurationAdjust(timeSlot.id, tempDuration);
    setIsAdjusting(false);
  };

  const getSlotStyling = () => {
    if (isFixed && timeSlot.event) {
      switch (timeSlot.event.type) {
        case 'keynote':
          return "border-solid border-purple-300 bg-purple-50 shadow-sm";
        case 'break':
          return "border-solid border-orange-300 bg-orange-50 shadow-sm";
        case 'lunch':
          return "border-solid border-yellow-300 bg-yellow-50 shadow-sm";
        case 'opening':
        case 'closing':
          return "border-solid border-indigo-300 bg-indigo-50 shadow-sm";
        default:
          return "border-solid border-gray-300 bg-gray-50 shadow-sm";
      }
    }
    
    if (timeSlot.isOccupied && timeSlot.presentation) {
      return "border-solid border-green-200 bg-green-50 shadow-sm";
    }
    
    if (isOver) {
      return "border-blue-400 bg-blue-50 shadow-md";
    }
    
    return "border-2 border-dashed border-gray-200 hover:border-gray-300";
  };

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "rounded-lg transition-all relative",
        getSlotStyling()
      )}
      style={{ minHeight: `${Math.max(timeSlot.duration * 2, 80)}px` }} // Dynamic height based on duration
    >
      <div className="p-4 h-full flex flex-col">
        {/* Header with time and duration adjustment */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700">
              {formatTime(timeSlot.startTime)} - {formatTime(timeSlot.endTime)}
            </span>
            <Badge variant="outline" className="text-xs px-1">
              {timeSlot.duration}min
            </Badge>
          </div>
          
          <div className="flex items-center gap-1">
            {timeSlot.isAdjustable && !isFixed && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={() => setIsAdjusting(!isAdjusting)}
                title="Adjust duration"
              >
                <ClockIcon className="h-3 w-3" />
              </Button>
            )}
            
            {isFixed && timeSlot.event && (
              <Badge 
                variant="secondary"
                className="text-xs px-2"
                style={{
                  backgroundColor: timeSlot.event.type === 'keynote' ? '#f3f4f6' : '#fef3c7',
                  color: timeSlot.event.type === 'keynote' ? '#374151' : '#92400e'
                }}
              >
                {timeSlot.event.type}
              </Badge>
            )}
            
            {timeSlot.isOccupied && !isFixed && (
              <CheckCircleIcon className="h-4 w-4 text-green-600" />
            )}
          </div>
        </div>

        {/* Duration adjustment controls */}
        {isAdjusting && (
          <div className="mb-3 p-2 bg-white rounded border">
            <div className="flex items-center gap-2">
              <label className="text-xs font-medium">Duration:</label>
              <input
                type="number"
                min="5"
                max="120"
                step="5"
                value={tempDuration}
                onChange={(e) => setTempDuration(Number(e.target.value))}
                className="w-16 text-xs border rounded px-1"
              />
              <span className="text-xs">min</span>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs"
                onClick={handleDurationSave}
              >
                Save
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs"
                onClick={() => {
                  setIsAdjusting(false);
                  setTempDuration(timeSlot.duration);
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Slot content */}
        <div className="flex-1">
          {isFixed && timeSlot.event ? (
            <div className="space-y-2">
              <h6 className="font-semibold text-sm text-gray-900">
                {timeSlot.event.title}
              </h6>
              {timeSlot.event.speakerName && (
                <p className="text-xs text-gray-600 font-medium">
                  {timeSlot.event.speakerName}
                </p>
              )}
              {timeSlot.event.description && (
                <p className="text-xs text-gray-600">
                  {timeSlot.event.description}
                </p>
              )}
              {timeSlot.event.isAdjustable && (
                <div className="flex justify-end mt-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs px-2 py-1 h-auto"
                    onClick={() => setIsAdjusting(!isAdjusting)}
                  >
                    Adjust Timing
                  </Button>
                </div>
              )}
            </div>
          ) : timeSlot.presentation ? (
            <div className="bg-white rounded border p-3 h-full flex flex-col">
              <h6 className="font-medium text-sm mb-1 flex-1">
                {timeSlot.presentation.title}
              </h6>
              <p className="text-xs text-gray-500 mb-2">
                {timeSlot.presentation.authors[0]?.name}
              </p>
              <div className="flex items-center justify-between">
                <Badge 
                  variant="outline" 
                  className="text-xs"
                  style={{
                    backgroundColor: `${timeSlot.presentation.category.color}20`,
                    borderColor: timeSlot.presentation.category.color,
                    color: timeSlot.presentation.category.color
                  }}
                >
                  {timeSlot.presentation.duration}min
                </Badge>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs px-2 py-1 h-auto"
                    onClick={() => onPresentationView(timeSlot.presentation!)}
                  >
                    <EyeIcon className="h-3 w-3 mr-1" />
                    View
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs px-2 py-1 h-auto"
                    onClick={() => onPresentationUnassign(timeSlot.presentation!.id)}
                  >
                    <MoveIcon className="h-3 w-3 mr-1" />
                    Move
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center text-gray-400 text-sm py-4 h-full flex items-center justify-center">
              {isOver ? "Drop presentation here" : `Available ${timeSlot.duration}-min slot`}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
