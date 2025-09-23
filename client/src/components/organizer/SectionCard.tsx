import React, { useMemo } from "react";
import { useDroppable } from "@dnd-kit/core";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ClockIcon,
  Coffee,
  Edit,
  MapPinIcon,
  MoreHorizontal,
  PauseCircle,
  Plus,
  Trash2,
  Users,
  UsersIcon,
  Utensils,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { ScheduledPresentationCard } from "./ScheduledPresentationCard";
import { Section, Presentation, BreakSlot } from "@/types/scheduleBuilder";




interface SectionCardProps {
  section: Section;
  onPresentationView: (presentation: Presentation) => void;
  onPresentationUnschedule: (presentationId: number) => void;
  onCreateBreak: (section: Section) => void;
  onEditBreak: (breakSlot: BreakSlot, section: Section) => void;
  onDeleteBreak: (breakId: number) => void;
  onEditSection: (section: Section) => void;
  onDeleteSection: (sectionId: number) => void;
  isParallelView?: boolean;
}

export function SectionCard({
  section,
  onPresentationView,
  onPresentationUnschedule,
  onCreateBreak,
  onEditBreak,
  onDeleteBreak,
  onEditSection,
  onDeleteSection,
  isParallelView = false,
}: SectionCardProps) {
  const { isOver, setNodeRef } = useDroppable({
    id: `section-${section.id}`,
  });

  // Combine presentations and breaks into timeline
  const timelineItems = useMemo(() => {
    const items: Array<{
      type: "presentation" | "break";
      item: any;
      startTime: string;
    }> = [];

    // Add presentations
    if (section.presentations) {
      section.presentations.forEach((presentation) => {
        items.push({
          type: "presentation",
          item: presentation,
          startTime: presentation.scheduledTime || "09:00",
        });
      });
    }

    // Add breaks
    if (section.breaks) {
      section.breaks.forEach((breakSlot) => {
        items.push({
          type: "break",
          item: breakSlot,
          startTime: breakSlot.startTime,
        });
      });
    }

    // Sort by time
    return items.sort((a, b) => a.startTime.localeCompare(b.startTime));
  }, [section.presentations, section.breaks]);

  const getBreakIcon = (breakType: string) => {
    switch (breakType) {
      case "COFFEE_BREAK":
        return <Coffee className="h-4 w-4" />;
      case "LUNCH_BREAK":
        return <Utensils className="h-4 w-4" />;
      case "NETWORKING_BREAK":
        return <Users className="h-4 w-4" />;
      default:
        return <PauseCircle className="h-4 w-4" />;
    }
  };

  const getBreakColor = (breakType: string) => {
    switch (breakType) {
      case "COFFEE_BREAK":
        return "bg-amber-100 border-amber-300 text-amber-800";
      case "LUNCH_BREAK":
        return "bg-orange-100 border-orange-300 text-orange-800";
      case "NETWORKING_BREAK":
        return "bg-blue-100 border-blue-300 text-blue-800";
      default:
        return "bg-gray-100 border-gray-300 text-gray-800";
    }
  };

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "border rounded-lg bg-white transition-all min-h-[200px] overflow-hidden",
        isOver ? "border-blue-400 bg-blue-50 shadow-md" : "border-gray-200"
      )}
    >
      <div className="p-4 overflow-x-auto">
        {/* Section Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center flex-1 min-w-0">
              <h3 className="font-semibold text-lg truncate mr-2">
                {section.name}
              </h3>
              <Badge
                variant="outline"
                className="text-xs px-2 py-1 whitespace-nowrap"
              >
                {section.presentations?.length || 0} pres.
              </Badge>
            </div>

            {/* Three-dot menu dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="p-1 rounded-md hover:bg-gray-100">
                  <MoreHorizontal className="h-5 w-5 text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-48 bg-white border border-gray-200 shadow-md rounded-md p-1"
              >
                <DropdownMenuItem
                  onClick={() => onEditSection(section)}
                  className="flex cursor-pointer items-center rounded-sm px-2 py-2 text-sm hover:bg-gray-300 focus:bg-gray-300"
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Section
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onCreateBreak(section)}
                  className="flex cursor-pointer items-center rounded-sm px-2 py-2 text-sm hover:bg-gray-300 focus:bg-gray-300"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Break
                </DropdownMenuItem>
                <DropdownMenuSeparator className="mx-1 my-1 h-px bg-gray-200" />
                <DropdownMenuItem
                  onClick={() => onDeleteSection(section.id)}
                  className="flex cursor-pointer items-center rounded-sm px-2 py-2 text-sm text-red-600 hover:bg-red-700 focus:bg-red-700 focus:text-white"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Section
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
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
                {new Date(section.startTime).toLocaleTimeString("en-US", {
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: false,
                })}{" "}
                -{" "}
                {new Date(section.endTime).toLocaleTimeString("en-US", {
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: false,
                })}
              </span>
            )}
          </div>
        </div>

        {/* Timeline View */}
        <div className="space-y-3">
          {/* Drop Zone for new presentations */}
          <div
            className={cn(
              "min-h-[80px] border-2 border-dashed rounded-lg p-3 transition-all",
              isOver ? "border-blue-400 bg-blue-50" : "border-gray-200"
            )}
          >
            {isOver && (
              <div className="text-center text-blue-600 text-sm">
                Drop presentation here
              </div>
            )}
          </div>

          {/* Timeline Items */}
          {timelineItems.length > 0 ? (
            <div className="space-y-2">
              {timelineItems.map((item, index) => (
                <div
                  key={`${item.type}-${item.item.id}-${index}`}
                  className="overflow-hidden"
                >
                  {item.type === "presentation" ? (
                    <ScheduledPresentationCard
                      presentation={item.item}
                      onView={() => onPresentationView(item.item)}
                      onUnschedule={() => onPresentationUnschedule(item.item.id)}
                      isCompact={isParallelView}
                    />
                  ) : (
                    <div
                      className={cn(
                        "border rounded-lg p-3 transition-all",
                        getBreakColor(item.item.type)
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {getBreakIcon(item.item.type)}
                          <div>
                            <h5 className="font-medium text-sm">
                              {item.item.title}
                            </h5>
                            <p className="text-xs opacity-75">
                              {item.item.duration} minutes •
                              {new Date(item.item.startTime).toLocaleTimeString(
                                "en-US",
                                {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                  hour12: false,
                                }
                              )}{" "}
                              -
                              {new Date(item.item.endTime).toLocaleTimeString(
                                "en-US",
                                {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                  hour12: false,
                                }
                              )}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs px-2 py-1 h-auto"
                            onClick={() => onEditBreak(item.item, section)}
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs px-2 py-1 h-auto text-red-600 hover:text-red-700"
                            onClick={() => onDeleteBreak(item.item.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-gray-400 py-8">
              No presentations or breaks scheduled
            </div>
          )}
        </div>
      </div>
    </div>
  );
}