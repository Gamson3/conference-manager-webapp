"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { 
  DndContext, DragEndEvent, DragStartEvent, 
  DragOverlay, closestCenter,
} from "@dnd-kit/core";
import { useDroppable, useDraggable } from "@dnd-kit/core";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  ArrowLeftIcon, CalendarIcon, ClockIcon, MapPinIcon, UsersIcon, Plus,
  GripVerticalIcon, EyeIcon, MoveIcon, PlayIcon, AlertCircleIcon, Coffee,
  Utensils, Users as NetworkingIcon, Trash2, Edit, Clock, PauseCircle,
} from "lucide-react";
import { createAuthenticatedApi } from "@/lib/utils";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import {
  SectionCreationDialog, 
  BreakManagementDialog,
  SectionCard,
  DraggablePresentationCard,
  FixedSessionCard,
  PresentationDetailDialog,
} from "@/components/organizer";
import { Presentation, BreakSlot, Section, CategoryWithPresentations, ScheduleData } from "@/types/scheduleBuilder";



export default function ScheduleBuilderPage() {
  const params = useParams();
  const router = useRouter();
  const conferenceId = params.id as string;

  // State
  const [scheduleData, setScheduleData] = useState<ScheduleData | null>(null);
  const [unscheduledByCategory, setUnscheduledByCategory] = useState<
    CategoryWithPresentations[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [draggedPresentation, setDraggedPresentation] =
    useState<Presentation | null>(null);
  const [selectedPresentation, setSelectedPresentation] =
    useState<Presentation | null>(null);

  const [selectedSection, setSelectedSection] = useState<Section | null>(null);
  const [showBreakDialog, setShowBreakDialog] = useState(false);
  const [editingBreak, setEditingBreak] = useState<BreakSlot | null>(null);
  const [showSectionDialog, setShowSectionDialog] = useState(false);
  const [editingSection, setEditingSection] = useState<Section | null>(null);


  // Update the handleCreateSection function to handle both creation and updates
  const handleCreateOrUpdateSection = async (sectionData: any) => {
    try {
      const api = await createAuthenticatedApi();

      if (sectionData.id) {
        // Update existing section
        await api.put(`/sections/${sectionData.id}`, sectionData);
        toast.success("Section updated successfully!");
      } else {
        // Add conferenceId to the data for new sections
        const fullSectionData = {
          ...sectionData,
          conferenceId: parseInt(conferenceId),
          dayId: currentDay?.id,
        };

        await api.post("/sections", fullSectionData);
        toast.success("Section created successfully!");
      }

      await fetchScheduleData();
      setEditingSection(null);
    } catch (error: any) {
      console.error("Error saving section:", error);
      toast.error(error.response?.data?.message || "Failed to save section");
      throw error;
    }
  };

  const handleEditSection = (section: Section) => {
    setEditingSection(section);
    setShowSectionDialog(true);
  };

  const handleDeleteSection = async (sectionId: number) => {
    if (
      !confirm(
        "Are you sure you want to delete this section? This will also remove all presentations scheduled in this section."
      )
    )
      return;

    try {
      const api = await createAuthenticatedApi();
      await api.delete(`/sections/${sectionId}`);

      toast.success("Section deleted successfully!");
      await fetchScheduleData();
    } catch (error: any) {
      console.error("Error deleting section:", error);
      toast.error(error.response?.data?.message || "Failed to delete section");
    }
  };

  // Add this function to your ScheduleBuilderPage component
  const groupSectionsIntoParallelTracks = (
    sections: Section[]
  ): Section[][] => {
    const tracks: Section[][] = [];

    // Sort sections by start time to improve grouping
    const sortedSections = [...sections].sort(
      (a, b) =>
        new Date(a.startTime || "").getTime() -
        new Date(b.startTime || "").getTime()
    );

    sortedSections.forEach((section) => {
      let placed = false;

      // Try to fit in existing track
      for (const track of tracks) {
        const conflict = track.some((s) =>
          timesOverlap(
            s.startTime || "",
            s.endTime || "",
            section.startTime || "",
            section.endTime || ""
          )
        );

        if (!conflict) {
          track.push(section);
          placed = true;
          break;
        }
      }

      // Create new track if needed
      if (!placed) {
        tracks.push([section]);
      }
    });

    return tracks;
  };

  const timesOverlap = (
    start1: string,
    end1: string,
    start2: string,
    end2: string
  ): boolean => {
    // Handle potential undefined times
    if (!start1 || !end1 || !start2 || !end2) return false;

    return (
      new Date(start1) < new Date(end2) && new Date(start2) < new Date(end1)
    );
  };

  // Fetch data using EXISTING endpoints
  const fetchScheduleData = async () => {
    try {
      setLoading(true);
      const api = await createAuthenticatedApi();

      // Use existing endpoints
      const [scheduleRes, unscheduledRes] = await Promise.all([
        api.get(`/api/schedule-builder/conferences/${conferenceId}`), // getScheduleOverview
        api.get(
          `/api/schedule-builder/conferences/${conferenceId}/presentations/unscheduled`
        ), // getUnscheduledPresentations
      ]);

      console.log("Schedule data:", scheduleRes.data);
      console.log("Unscheduled data:", unscheduledRes.data);

      setScheduleData(scheduleRes.data);

      // Ensure unscheduledRes.data is an array
      const unscheduledData = Array.isArray(unscheduledRes.data)
        ? unscheduledRes.data
        : [];
      setUnscheduledByCategory(unscheduledData);

      // Set initial selections
      if (scheduleRes.data?.days?.length > 0) {
        setSelectedDay(scheduleRes.data.days[0].date);
      }
      if (unscheduledData.length > 0) {
        setSelectedCategory(unscheduledData[0].category.id.toString());
      }
    } catch (error) {
      console.error("Error fetching schedule data:", error);
      toast.error("Failed to load schedule data");
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
    if (!dropId.startsWith("section-")) return;

    const sectionId = Number(dropId.replace("section-", ""));

    try {
      const api = await createAuthenticatedApi();

      // Use existing endpoint
      await api.post(
        `/api/schedule-builder/presentations/${presentationId}/assign-section`,
        {
          sectionId,
        }
      );

      toast.success("Presentation scheduled successfully!");

      // Refresh data
      await fetchScheduleData();
    } catch (error: any) {
      console.error("Error scheduling presentation:", error);
      toast.error(
        error.response?.data?.message || "Failed to schedule presentation"
      );
    }
  };

  // Unschedule presentation
  const unschedulePresentation = async (presentationId: number) => {
    try {
      const api = await createAuthenticatedApi();

      // Use existing endpoint
      await api.delete(
        `/api/schedule-builder/presentations/${presentationId}/unassign-section`
      );

      toast.success("Presentation unscheduled successfully!");
      await fetchScheduleData();
    } catch (error: any) {
      console.error("Error unscheduling presentation:", error);
      toast.error(
        error.response?.data?.message || "Failed to unschedule presentation"
      );
    }
  };

  // convertTimeToISO helper function
  const convertTimeToISO = (
    timeString: string,
    section: Section | null = null,
    existingBreak: BreakSlot | null = null
  ): string => {
    // If it's already an ISO string, return it
    if (timeString.includes("T") && timeString.includes("Z")) {
      return timeString;
    }

    // If we have HH:MM format (5 chars)
    if (timeString.length === 5 && timeString.includes(":")) {
      const [hours, minutes] = timeString.split(":").map(Number);

      // Decide which date to use as base
      let baseDate: Date;

      if (existingBreak) {
        // For editing: use the original break's date
        baseDate = new Date(existingBreak.startTime);
      } else if (section?.startTime) {
        // For new breaks: use section date
        baseDate = new Date(section.startTime);
      } else {
        // Fallback to current date
        baseDate = new Date();
      }

      // Create a new date with the base date and the new time
      const combinedDateTime = new Date(baseDate);
      combinedDateTime.setHours(hours, minutes, 0, 0);

      // Return ISO string
      return combinedDateTime.toISOString();
    }

    // If we got here, return the original string as fallback
    return timeString;
  };

  const handleCreateBreak = async (sectionId: number, breakData: any) => {
    try {
      const api = await createAuthenticatedApi();
      let startTimeISO = convertTimeToISO(breakData.startTime, selectedSection);

      await api.post(`/api/schedule-builder/sections/${sectionId}/breaks`, {
        title: breakData.title,
        duration: breakData.duration,
        breakType: breakData.breakType,
        startTime: startTimeISO,
      });

      toast.success("Break created successfully!");
      setShowBreakDialog(false);
      await fetchScheduleData();
    } catch (error: any) {
      console.error("Error creating break:", error);
      toast.error(error.response?.data?.message || "Failed to create break");
    }
  };

  const handleUpdateBreak = async (breakData: any) => {
    if (!editingBreak) return;

    try {
      const api = await createAuthenticatedApi();
      let startTimeISO = convertTimeToISO(
        breakData.startTime,
        null,
        editingBreak
      );

      await api.put(`/api/schedule-builder/breaks/${editingBreak.id}`, {
        title: breakData.title,
        duration: breakData.duration,
        breakType: breakData.breakType,
        startTime: startTimeISO,
      });

      toast.success("Break updated successfully!");
      setShowBreakDialog(false);
      setEditingBreak(null);
      await fetchScheduleData();
    } catch (error: any) {
      console.error("Error updating break:", error);
      toast.error(error.response?.data?.message || "Failed to update break");
    }
  };

  // Delete break
  const deleteBreak = async (breakId: number) => {
    if (!confirm("Are you sure you want to delete this break?")) return;

    try {
      const api = await createAuthenticatedApi();

      await api.delete(`/api/schedule-builder/breaks/${breakId}`);

      toast.success("Break deleted successfully!");
      await fetchScheduleData();
    } catch (error: any) {
      console.error("Error deleting break:", error);
      toast.error(error.response?.data?.message || "Failed to delete break");
    }
  };

  // Helper function to find presentation by ID
  const findPresentationById = (id: number): Presentation | null => {
    if (!Array.isArray(unscheduledByCategory)) return null;

    for (const categoryData of unscheduledByCategory) {
      if (
        categoryData?.presentations &&
        Array.isArray(categoryData.presentations)
      ) {
        const presentation = categoryData.presentations.find(
          (p) => p.id === id
        );
        if (presentation) return presentation;
      }
    }
    return null;
  };

  // Get current day data
  const currentDay = scheduleData?.days?.find(
    (day) => day.date === selectedDay
  );
  const selectedCategoryData = unscheduledByCategory.find(
    (cat) => cat?.category?.id?.toString() === selectedCategory
  );

  // Separate fixed sessions from regular sections - with null checks
  const fixedSessions =
    currentDay?.sections?.filter(
      (s) =>
        s &&
        [
          "break",
          "lunch",
          "keynote",
          "networking",
          "opening",
          "closing",
        ].includes(s.type)
    ) || [];

  const regularSections =
    currentDay?.sections?.filter(
      (s) => s && ["presentation", "workshop", "panel"].includes(s.type)
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

  const publishSchedule = async () => {
    try {
      const api = await createAuthenticatedApi();
      await api.post(
        `/api/schedule-builder/conferences/${conferenceId}/publish`
      );
      toast.success("Schedule published successfully!");
      router.push("/organizer/events");
    } catch (error: any) {
      console.error("Error publishing schedule:", error);
      toast.error("Failed to publish schedule");
    }
  };

  return (
    <DndContext
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="p-6 max-w-6xl mx-auto min-h-screen bg-gray-50">
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
                Drag unscheduled presentations to sections to build your
                conference schedule
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() =>
                router.push(
                  `/organizer/create-event/sessions?eventId=${conferenceId}`
                )
              }
            >
              Manage Sessions
            </Button>
            <Button
              className="bg-green-600 hover:bg-green-700"
              onClick={publishSchedule}
            >
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
                    {scheduleData.statistics.scheduledPresentations || 0} /{" "}
                    {scheduleData.statistics.totalPresentations || 0}
                  </div>
                  <div className="text-sm text-blue-600">
                    Presentations Scheduled
                  </div>
                </div>

                <div>
                  <div className="text-2xl font-bold text-orange-800">
                    {scheduleData.statistics.unscheduledPresentations || 0}
                  </div>
                  <div className="text-sm text-orange-600">Unscheduled</div>
                </div>

                <div>
                  <div className="text-2xl font-bold text-green-800">
                    {Math.round(
                      scheduleData.statistics.schedulingProgress || 0
                    )}
                    %
                  </div>
                  <div className="text-sm text-green-600">Progress</div>
                  <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                    <div
                      className="bg-green-600 h-2 rounded-full"
                      style={{
                        width: `${
                          scheduleData.statistics.schedulingProgress || 0
                        }%`,
                      }}
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
                {Array.isArray(unscheduledByCategory) &&
                unscheduledByCategory.length > 0 ? (
                  <Tabs
                    value={selectedCategory}
                    onValueChange={setSelectedCategory}
                  >
                    <TabsList className="grid w-full grid-cols-2 mb-4">
                      {unscheduledByCategory.slice(0, 4).map(
                        (categoryData) =>
                          categoryData?.category && (
                            <TabsTrigger
                              key={categoryData.category.id}
                              value={categoryData.category.id.toString()}
                              className="text-xs"
                            >
                              <div
                                className="w-2 h-2 rounded-full mr-1"
                                style={{
                                  backgroundColor:
                                    categoryData.category.color || "#6B7280",
                                }}
                              />
                              {categoryData.category.name} (
                              {categoryData.presentations?.length || 0})
                            </TabsTrigger>
                          )
                      )}
                    </TabsList>

                    {unscheduledByCategory.map(
                      (categoryData) =>
                        categoryData?.category && (
                          <TabsContent
                            key={categoryData.category.id}
                            value={categoryData.category.id.toString()}
                            className="mt-0 max-h-[55vh] overflow-y-auto"
                          >
                            <div className="space-y-3">
                              {Array.isArray(categoryData.presentations) &&
                                categoryData.presentations.map(
                                  (presentation) => (
                                    <DraggablePresentationCard
                                      key={presentation.id}
                                      presentation={presentation}
                                      onView={() =>
                                        setSelectedPresentation(presentation)
                                      }
                                    />
                                  )
                                )}
                            </div>
                          </TabsContent>
                        )
                    )}
                  </Tabs>
                ) : (
                  <div className="text-center py-12">
                    <CalendarIcon className="h-12 w-12 mx-auto text-green-500 mb-4" />
                    <p className="text-green-600 font-medium mb-2">
                      All presentations are scheduled!
                    </p>
                    <p className="text-gray-500 text-sm">
                      Great job organizing the conference.
                    </p>
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

                  {/* Button for creating presentation sections */}
                  <Button
                    onClick={() => {
                      setEditingSection(null);
                      setShowSectionDialog(true);
                    }}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Section
                  </Button>
                </CardTitle>

                {/* Day Tabs */}
                {Array.isArray(scheduleData.days) &&
                  scheduleData.days.length > 1 && (
                    <Tabs
                      value={selectedDay}
                      onValueChange={setSelectedDay}
                      className="w-full"
                    >
                      <TabsList className="grid w-full grid-cols-3">
                        {scheduleData.days.map((day) => (
                          <TabsTrigger key={day.date} value={day.date}>
                            {day.name} -{" "}
                            {new Date(day.date).toLocaleDateString("en-US", {
                              weekday: "short",
                              month: "short",
                              day: "numeric",
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
                        <h3 className="font-semibold text-lg mb-3">
                          Fixed Sessions
                        </h3>
                        <div className="space-y-2">
                          {fixedSessions.map((session) => (
                            <FixedSessionCard
                              key={session.id}
                              session={session}
                            />
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Regular Sections */}
                    <div>
                      <h3 className="font-semibold text-lg mb-3">
                        Presentation Sections
                      </h3>
                      {(() => {
                        const parallelTracks =
                          groupSectionsIntoParallelTracks(regularSections);
                        // For safety, limit to a reasonable number of columns
                        const colsCount = Math.min(
                          parallelTracks.length || 1,
                          4
                        );

                        // Use a conditional to select the right grid class based on colsCount
                        let gridClassName = "grid gap-4 grid-cols-1";
                        if (colsCount === 2) {
                          gridClassName =
                            "grid gap-4 grid-cols-1 md:grid-cols-2";
                        } else if (colsCount === 3) {
                          gridClassName =
                            "grid gap-4 grid-cols-1 md:grid-cols-3";
                        } else if (colsCount >= 4) {
                          gridClassName =
                            "grid gap-4 grid-cols-1 md:grid-cols-4";
                        }

                        return (
                          <div className={gridClassName}>
                            {parallelTracks.map((track, trackIndex) => (
                              <div key={trackIndex} className="space-y-4">
                                {track.map((section) => (
                                  <SectionCard
                                    key={section.id}
                                    section={section}
                                    onPresentationView={setSelectedPresentation}
                                    onPresentationUnschedule={
                                      unschedulePresentation
                                    }
                                    onCreateBreak={(section) => {
                                      setSelectedSection(section);
                                      setEditingBreak(null);
                                      setShowBreakDialog(true);
                                    }}
                                    onEditBreak={(breakSlot, section) => {
                                      setEditingBreak(breakSlot);
                                      setSelectedSection(section);
                                      setShowBreakDialog(true);
                                    }}
                                    onDeleteBreak={deleteBreak}
                                    onEditSection={handleEditSection}
                                    onDeleteSection={handleDeleteSection}
                                    isParallelView={parallelTracks.length > 1}
                                  />
                                ))}
                              </div>
                            ))}
                          </div>
                        );
                      })()}
                    </div>
                  </>
                ) : (
                  <div className="text-center py-12">
                    <CalendarIcon className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                    <p className="text-gray-500">
                      No conference days configured
                    </p>
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

        <SectionCreationDialog
          isOpen={showSectionDialog}
          onClose={() => {
            setShowSectionDialog(false);
            setEditingSection(null);
          }}
          onSave={handleCreateOrUpdateSection}
          selectedDay={selectedDay}
          editingSection={editingSection}
        />

        {/* Break Management Dialog */}
        <BreakManagementDialog
          isOpen={showBreakDialog}
          onClose={() => setShowBreakDialog(false)}
          section={selectedSection}
          editingBreak={editingBreak}
          onSave={(breakData) => {
            if (editingBreak) {
              handleUpdateBreak(breakData);
            } else if (selectedSection) {
              handleCreateBreak(selectedSection.id, breakData);
            }
          }}
        />
      </div>
    </DndContext>
  );
}


