"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
  closestCenter,
} from "@dnd-kit/core";
import { useDroppable, useDraggable } from "@dnd-kit/core";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ArrowLeftIcon,
  CalendarIcon,
  ClockIcon,
  MapPinIcon,
  UsersIcon,
  GripVerticalIcon,
  EyeIcon,
  MoveIcon,
  PlayIcon,
  AlertCircleIcon,
} from "lucide-react";
import { createAuthenticatedApi } from "@/lib/utils";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// Types based on actual schema
interface Presentation {
  id: number;
  title: string;
  abstract: string;
  duration: number;
  authors: Array<{
    id: number;
    authorName: string;
    authorEmail: string;
    affiliation: string;
    isPresenter: boolean;
  }>;
  category: {
    id: number;
    name: string;
    color: string;
  };
  presentationType?: {
    id: number;
    name: string;
    defaultDuration: number;
  };
}

interface Section {
  id: number;
  name: string;
  room?: string;
  capacity?: number;
  type: string;
  startTime?: string;
  endTime?: string;
  presentations: Presentation[];
}

interface Day {
  id: number;
  name: string;
  date: string;
  order: number;
  sections: Section[];
}

interface CategoryWithPresentations {
  category: {
    id: number;
    name: string;
    color: string;
  };
  presentations: Presentation[];
}

interface ScheduleData {
  conference: {
    id: number;
    name: string;
    startDate: string;
    endDate: string;
    status: string;
  };
  days: Day[];
  statistics: {
    totalPresentations: number;
    scheduledPresentations: number;
    unscheduledPresentations: number;
    schedulingProgress: number;
  };
}

export default function ScheduleBuilderPage() {
  const params = useParams();
  const router = useRouter();
  const conferenceId = params.id as string;

  // State
  const [scheduleData, setScheduleData] = useState<ScheduleData | null>(null);
  const [unscheduledByCategory, setUnscheduledByCategory] = useState<CategoryWithPresentations[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [draggedPresentation, setDraggedPresentation] = useState<Presentation | null>(null);
  const [selectedPresentation, setSelectedPresentation] = useState<Presentation | null>(null);

  // Fetch data using EXISTING endpoints
  const fetchScheduleData = async () => {
    try {
      setLoading(true);
      const api = await createAuthenticatedApi();

      // Use existing endpoints
      const [scheduleRes, unscheduledRes] = await Promise.all([
        api.get(`/api/schedule-builder/conferences/${conferenceId}`), // getScheduleOverview
        api.get(`/api/schedule-builder/conferences/${conferenceId}/presentations/unscheduled`) // getUnscheduledPresentations
      ]);

      console.log('Schedule data:', scheduleRes.data);
      console.log('Unscheduled data:', unscheduledRes.data);

      setScheduleData(scheduleRes.data);
      
      // Ensure unscheduledRes.data is an array
      const unscheduledData = Array.isArray(unscheduledRes.data) ? unscheduledRes.data : [];
      setUnscheduledByCategory(unscheduledData);

      // Set initial selections
      if (scheduleRes.data?.days?.length > 0) {
        setSelectedDay(scheduleRes.data.days[0].date);
      }
      if (unscheduledData.length > 0) {
        setSelectedCategory(unscheduledData[0].category.id.toString());
      }

    } catch (error) {
      console.error('Error fetching schedule data:', error);
      toast.error('Failed to load schedule data');
    } finally {
      setLoading(false);
    }
  };

  // Handle drag start
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const presentation = findPresentationById(Number(active.id));
    setDraggedPresentation(presentation);
  };

  // Handle drag end - assign presentation to section
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setDraggedPresentation(null);

    if (!over) return;

    const presentationId = Number(active.id);
    const dropId = over.id.toString();
    
    // Parse drop target: "section-{sectionId}"
    if (!dropId.startsWith('section-')) return;
    
    const sectionId = Number(dropId.replace('section-', ''));

    try {
      const api = await createAuthenticatedApi();
      
      // Use existing endpoint
      await api.post(`/api/schedule-builder/presentations/${presentationId}/assign-section`, {
        sectionId
      });

      toast.success('Presentation scheduled successfully!');
      
      // Refresh data
      await fetchScheduleData();

    } catch (error: any) {
      console.error('Error scheduling presentation:', error);
      toast.error(error.response?.data?.message || 'Failed to schedule presentation');
    }
  };

  // Unschedule presentation
  const unschedulePresentation = async (presentationId: number) => {
    try {
      const api = await createAuthenticatedApi();
      
      // Use existing endpoint
      await api.post(`/api/schedule-builder/presentations/${presentationId}/unassign-section`);
      
      toast.success('Presentation unscheduled successfully!');
      await fetchScheduleData();

    } catch (error: any) {
      console.error('Error unscheduling presentation:', error);
      toast.error(error.response?.data?.message || 'Failed to unschedule presentation');
    }
  };

  // Helper function to find presentation by ID
  const findPresentationById = (id: number): Presentation | null => {
    if (!Array.isArray(unscheduledByCategory)) return null;
    
    for (const categoryData of unscheduledByCategory) {
      if (categoryData?.presentations && Array.isArray(categoryData.presentations)) {
        const presentation = categoryData.presentations.find(p => p.id === id);
        if (presentation) return presentation;
      }
    }
    return null;
  };

  // Get current day data
  const currentDay = scheduleData?.days?.find(day => day.date === selectedDay);
  const selectedCategoryData = unscheduledByCategory.find(
    cat => cat?.category?.id?.toString() === selectedCategory
  );

  // Separate fixed sessions from regular sections - with null checks
  const fixedSessions = currentDay?.sections?.filter(s => 
    s && ['break', 'lunch', 'keynote', 'networking', 'opening', 'closing'].includes(s.type)
  ) || [];
  
  const regularSections = currentDay?.sections?.filter(s => 
    s && ['presentation', 'workshop', 'panel'].includes(s.type)
  ) || [];

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

  if (!scheduleData) {
    return (
      <div className="p-8 max-w-7xl mx-auto">
        <div className="text-center py-12">
          <AlertCircleIcon className="h-12 w-12 mx-auto text-gray-400 mb-4" />
          <p className="text-gray-500">Failed to load schedule data</p>
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
        {/* Header */}
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
                Drag unscheduled presentations to sections to build your conference schedule
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => router.push(`/organizer/events/${conferenceId}/sessions`)}
            >
              Manage Sessions
            </Button>
            <Button className="bg-green-600 hover:bg-green-700">
              <PlayIcon className="h-4 w-4 mr-1" />
              Publish Schedule
            </Button>
          </div>
        </div>

        {/* Statistics */}
        {scheduleData.statistics && (
          <Card className="mb-6 border-blue-200 bg-blue-50">
            <CardContent className="py-4">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-blue-800">
                    {scheduleData.statistics.scheduledPresentations || 0} / {scheduleData.statistics.totalPresentations || 0}
                  </div>
                  <div className="text-sm text-blue-600">Presentations Scheduled</div>
                </div>
                
                <div>
                  <div className="text-2xl font-bold text-orange-800">
                    {scheduleData.statistics.unscheduledPresentations || 0}
                  </div>
                  <div className="text-sm text-orange-600">Unscheduled</div>
                </div>
                
                <div>
                  <div className="text-2xl font-bold text-green-800">
                    {Math.round(scheduleData.statistics.schedulingProgress || 0)}%
                  </div>
                  <div className="text-sm text-green-600">Progress</div>
                  <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                    <div 
                      className="bg-green-600 h-2 rounded-full" 
                      style={{ width: `${scheduleData.statistics.schedulingProgress || 0}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Main Interface */}
        <div className="grid grid-cols-12 gap-6 min-h-[600px]">
          {/* Left Panel: Unscheduled Presentations */}
          <div className="col-span-4">
            <Card className="sticky top-0 max-h-[80vh]">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center">
                  <CalendarIcon className="h-5 w-5 mr-2" />
                  Unscheduled Presentations
                </CardTitle>
                <p className="text-sm text-gray-600">
                  Drag these to sections to schedule them
                </p>
              </CardHeader>
              
              <CardContent className="flex-1">
                {Array.isArray(unscheduledByCategory) && unscheduledByCategory.length > 0 ? (
                  <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
                    <TabsList className="grid w-full grid-cols-2 mb-4">
                      {unscheduledByCategory.slice(0, 4).map((categoryData) => (
                        categoryData?.category && (
                          <TabsTrigger
                            key={categoryData.category.id}
                            value={categoryData.category.id.toString()}
                            className="text-xs"
                          >
                            <div
                              className="w-2 h-2 rounded-full mr-1"
                              style={{ backgroundColor: categoryData.category.color || '#6B7280' }}
                            />
                            {categoryData.category.name} ({categoryData.presentations?.length || 0})
                          </TabsTrigger>
                        )
                      ))}
                    </TabsList>

                    {unscheduledByCategory.map((categoryData) => (
                      categoryData?.category && (
                        <TabsContent 
                          key={categoryData.category.id} 
                          value={categoryData.category.id.toString()}
                          className="mt-0 max-h-[55vh] overflow-y-auto"
                        >
                          <div className="space-y-3">
                            {Array.isArray(categoryData.presentations) && categoryData.presentations.map((presentation) => (
                              <DraggablePresentationCard
                                key={presentation.id}
                                presentation={presentation}
                                onView={() => setSelectedPresentation(presentation)}
                              />
                            ))}
                          </div>
                        </TabsContent>
                      )
                    ))}
                  </Tabs>
                ) : (
                  <div className="text-center py-12">
                    <CalendarIcon className="h-12 w-12 mx-auto text-green-500 mb-4" />
                    <p className="text-green-600 font-medium mb-2">All presentations are scheduled!</p>
                    <p className="text-gray-500 text-sm">Great job organizing the conference.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Panel: Conference Schedule */}
          <div className="col-span-8">
            <Card className="min-h-full">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center">
                    <ClockIcon className="h-5 w-5 mr-2" />
                    Conference Schedule
                  </div>
                </CardTitle>

                {/* Day Tabs */}
                {Array.isArray(scheduleData.days) && scheduleData.days.length > 1 && (
                  <Tabs value={selectedDay} onValueChange={setSelectedDay} className="w-full">
                    <TabsList className="grid w-full grid-cols-3">
                      {scheduleData.days.map((day) => (
                        <TabsTrigger key={day.date} value={day.date}>
                          {day.name} - {new Date(day.date).toLocaleDateString('en-US', { 
                            weekday: 'short', 
                            month: 'short', 
                            day: 'numeric' 
                          })}
                        </TabsTrigger>
                      ))}
                    </TabsList>
                  </Tabs>
                )}
              </CardHeader>
              
              <CardContent className="pb-8">
                {currentDay ? (
                  <>
                    {/* Fixed Sessions */}
                    {fixedSessions.length > 0 && (
                      <div className="mb-6">
                        <h3 className="font-semibold text-lg mb-3">Fixed Sessions</h3>
                        <div className="space-y-2">
                          {fixedSessions.map((session) => (
                            <FixedSessionCard key={session.id} session={session} />
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Regular Sections */}
                    <div>
                      <h3 className="font-semibold text-lg mb-3">Presentation Sections</h3>
                      <div className="space-y-4">
                        {regularSections.map((section) => (
                          <SectionCard
                            key={section.id}
                            section={section}
                            onPresentationView={setSelectedPresentation}
                            onPresentationUnschedule={unschedulePresentation}
                          />
                        ))}
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-12">
                    <CalendarIcon className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                    <p className="text-gray-500">No conference days configured</p>
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
        <PresentationDetailDialog
          presentation={selectedPresentation}
          onClose={() => setSelectedPresentation(null)}
        />
      </div>
    </DndContext>
  );
}

// Draggable Presentation Card
function DraggablePresentationCard({
  presentation,
  isDragging = false,
  onView,
}: {
  presentation: Presentation;
  isDragging?: boolean;
  onView?: () => void;
}) {
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
        "border rounded-lg bg-white shadow-sm transition-all hover:shadow-md overflow-hidden",
        isCurrentlyDragging && "opacity-50",
        isDragging && "rotate-2 shadow-lg"
      )}
    >
      <div
        {...listeners}
        {...attributes}
        className="p-3 cursor-grab active:cursor-grabbing"
      >
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1">
            <h4 className="font-medium text-sm leading-tight line-clamp-2">
              {presentation.title}
            </h4>
            <p className="text-xs text-gray-500 mt-1">
              {presentation.authors?.[0]?.authorName}
              {presentation.authors && presentation.authors.length > 1 && ` +${presentation.authors.length - 1}`}
            </p>
          </div>
          <GripVerticalIcon className="h-4 w-4 text-gray-400 ml-2 flex-shrink-0" />
        </div>

        <div className="flex items-center justify-between">
          <Badge
            variant="secondary"
            className="text-xs"
            style={{
              backgroundColor: `${presentation.category?.color || '#6B7280'}20`,
              color: presentation.category?.color || '#6B7280',
            }}
          >
            {presentation.category?.name || 'Uncategorized'}
          </Badge>
          <span className="text-xs text-gray-500 flex items-center">
            <ClockIcon className="h-3 w-3 mr-1" />
            {presentation.duration || 0}min
          </span>
        </div>
      </div>

      <div className="px-3 pb-3 bg-gray-50/50">
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

// Fixed Session Card
function FixedSessionCard({ session }: { session: Section }) {
  const getSessionColor = () => {
    switch (session.type) {
      case 'keynote': return 'bg-purple-100 border-purple-300 text-purple-800';
      case 'break': return 'bg-orange-100 border-orange-300 text-orange-800';
      case 'lunch': return 'bg-yellow-100 border-yellow-300 text-yellow-800';
      case 'opening': return 'bg-indigo-100 border-indigo-300 text-indigo-800';
      case 'closing': return 'bg-indigo-100 border-indigo-300 text-indigo-800';
      case 'networking': return 'bg-green-100 border-green-300 text-green-800';
      default: return 'bg-gray-100 border-gray-300 text-gray-800';
    }
  };

  return (
    <div className={cn("border rounded p-3", getSessionColor())}>
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <h5 className="font-medium text-sm">{session.name}</h5>
          {session.room && <p className="text-xs opacity-75 mt-1">{session.room}</p>}
        </div>
        <div className="text-xs opacity-75">
          {session.startTime && session.endTime && (
            `${new Date(session.startTime).toLocaleTimeString('en-US', { 
              hour: '2-digit', 
              minute: '2-digit', 
              hour12: false 
            })} - ${new Date(session.endTime).toLocaleTimeString('en-US', { 
              hour: '2-digit', 
              minute: '2-digit', 
              hour12: false 
            })}`
          )}
        </div>
      </div>
    </div>
  );
}

// Section Card (Droppable)
function SectionCard({
  section,
  onPresentationView,
  onPresentationUnschedule,
}: {
  section: Section;
  onPresentationView: (presentation: any) => void;
  onPresentationUnschedule: (presentationId: number) => void;
}) {
  const { isOver, setNodeRef } = useDroppable({
    id: `section-${section.id}`,
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "border rounded-lg bg-white transition-all min-h-[150px]",
        isOver ? "border-blue-400 bg-blue-50 shadow-md" : "border-gray-200"
      )}
    >
      <div className="p-4">
        {/* Section Header */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-lg">{section.name}</h3>
            <Badge variant="outline" className="text-xs">
              {section.presentations?.length || 0} presentations
            </Badge>
          </div>
          
          <div className="flex items-center gap-4 text-sm text-gray-500">
            {section.room && (
              <span className="flex items-center">
                <MapPinIcon className="h-4 w-4 mr-1" />
                {section.room}
              </span>
            )}
            {section.capacity && (
              <span className="flex items-center">
                <UsersIcon className="h-4 w-4 mr-1" />
                {section.capacity}
              </span>
            )}
            {section.startTime && section.endTime && (
              <span className="flex items-center">
                <ClockIcon className="h-4 w-4 mr-1" />
                {new Date(section.startTime).toLocaleTimeString('en-US', { 
                  hour: '2-digit', 
                  minute: '2-digit', 
                  hour12: false 
                })} - {new Date(section.endTime).toLocaleTimeString('en-US', { 
                  hour: '2-digit', 
                  minute: '2-digit', 
                  hour12: false 
                })}
              </span>
            )}
          </div>
        </div>

        {/* Drop Zone */}
        <div className={cn(
          "min-h-[100px] border-2 border-dashed rounded-lg p-3 transition-all",
          isOver ? "border-blue-400 bg-blue-50" : "border-gray-200"
        )}>
          {!Array.isArray(section.presentations) || section.presentations.length === 0 ? (
            <div className="text-center text-gray-400 py-8">
              {isOver ? "Drop presentation here" : "No presentations scheduled"}
            </div>
          ) : (
            <div className="space-y-2">
              {section.presentations.map((presentation) => (
                <ScheduledPresentationCard
                  key={presentation.id}
                  presentation={presentation}
                  onView={() => onPresentationView(presentation)}
                  onUnschedule={() => onPresentationUnschedule(presentation.id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Scheduled Presentation Card
function ScheduledPresentationCard({
  presentation,
  onView,
  onUnschedule,
}: {
  presentation: any;
  onView: () => void;
  onUnschedule: () => void;
}) {
  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h4 className="font-medium text-sm line-clamp-2">{presentation.title}</h4>
          <p className="text-xs text-gray-500 mt-1">
            {presentation.authors?.[0]?.authorName}
            {presentation.authors && presentation.authors.length > 1 && ` +${presentation.authors.length - 1}`}
          </p>
          <div className="flex items-center gap-2 mt-2">
            {presentation.category && (
              <Badge
                variant="outline"
                className="text-xs"
                style={{
                  backgroundColor: `${presentation.category.color || '#6B7280'}20`,
                  borderColor: presentation.category.color || '#6B7280',
                  color: presentation.category.color || '#6B7280',
                }}
              >
                {presentation.category.name}
              </Badge>
            )}
            <span className="text-xs text-gray-500 flex items-center">
              <ClockIcon className="h-3 w-3 mr-1" />
              {presentation.duration || 0}min
            </span>
          </div>
        </div>
        <div className="flex gap-1 ml-2">
          <Button
            variant="ghost"
            size="sm"
            className="text-xs px-2 py-1 h-auto"
            onClick={onView}
          >
            <EyeIcon className="h-3 w-3 mr-1" />
            View
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-xs px-2 py-1 h-auto"
            onClick={onUnschedule}
          >
            <MoveIcon className="h-3 w-3 mr-1" />
            Unschedule
          </Button>
        </div>
      </div>
    </div>
  );
}

// Presentation Detail Dialog
function PresentationDetailDialog({
  presentation,
  onClose,
}: {
  presentation: Presentation | null;
  onClose: () => void;
}) {
  return (
    <Dialog open={!!presentation} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto bg-white">
        <DialogHeader>
          <DialogTitle className="text-xl pr-8">
            {presentation?.title}
          </DialogTitle>
        </DialogHeader>

        {presentation && (
          <div className="space-y-6 mt-4">
            <div className="flex flex-wrap gap-2">
              <Badge
                className="px-3 py-1"
                style={{
                  backgroundColor: `${presentation.category?.color || '#6B7280'}20`,
                  color: presentation.category?.color || '#6B7280',
                  border: `1px solid ${presentation.category?.color || '#6B7280'}40`,
                }}
              >
                {presentation.category?.name || 'Uncategorized'}
              </Badge>
              {presentation.presentationType && (
                <Badge variant="outline" className="px-3 py-1">
                  {presentation.presentationType.name}
                </Badge>
              )}
              <Badge variant="outline" className="px-3 py-1">
                <ClockIcon className="h-3 w-3 mr-1" />
                {presentation.duration || 0} minutes
              </Badge>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-semibold mb-3 text-gray-900">Authors</h4>
              <div className="space-y-2">
                {Array.isArray(presentation.authors) && presentation.authors.map((author, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between bg-white rounded p-3 border"
                  >
                    <div>
                      <span className="font-medium text-gray-900">
                        {author.authorName}
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
                  {presentation.abstract}
                </p>
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t">
              <Button variant="outline" onClick={onClose} className="px-6">
                Close
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}