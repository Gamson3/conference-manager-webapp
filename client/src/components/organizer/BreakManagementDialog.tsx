import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Coffee, Utensils, Users, Clock, PauseCircle } from "lucide-react";
import { cn } from "@/lib/utils";

// Types that this component needs
interface BreakSlot {
  id: number;
  title: string;
  startTime: string;
  endTime: string;
  duration: number;
  type: "COFFEE_BREAK" | "LUNCH_BREAK" | "NETWORKING_BREAK" | "REST_BREAK";
  sectionId: number;
}

interface Section {
  id: number;
  name: string;
  room?: string;
  capacity?: number;
  type: string;
  startTime?: string;
  endTime?: string;
  presentations: any[];
  breaks: BreakSlot[];
}

// Updated props interface - no longer needs breakForm or setBreakForm
interface BreakManagementDialogProps {
  isOpen: boolean;
  onClose: () => void;
  section: Section | null;
  editingBreak: BreakSlot | null;
  onSave: (breakData: {
    title: string;
    duration: number;
    breakType: "COFFEE_BREAK" | "LUNCH_BREAK" | "NETWORKING_BREAK" | "REST_BREAK";
    startTime: string;
  }) => void;
}

export function BreakManagementDialog({
  isOpen,
  onClose,
  section,
  editingBreak,
  onSave,
}: BreakManagementDialogProps) {
  // Local state for the form
  const [breakForm, setBreakForm] = useState<{
    title: string;
    duration: number;
    breakType: "COFFEE_BREAK" | "LUNCH_BREAK" | "NETWORKING_BREAK" | "REST_BREAK";
    startTime: string;
  }>({
    title: "",
    duration: 15,
    breakType: "COFFEE_BREAK",
    startTime: "",
  });

  const breakTypes = [
    { value: "COFFEE_BREAK", label: "Coffee Break", icon: Coffee },
    { value: "LUNCH_BREAK", label: "Lunch Break", icon: Utensils },
    {
      value: "NETWORKING_BREAK",
      label: "Networking Break",
      icon: Users as any,
    },
    { value: "REST_BREAK", label: "Rest Break", icon: Clock },
  ];

  // Reset form and initialize values when dialog opens or editingBreak changes
  useEffect(() => {
    if (isOpen) {
      if (editingBreak) {
        // Initialize form with editing break data
        setBreakForm({
          title: editingBreak.title,
          duration: editingBreak.duration,
          breakType: editingBreak.type,
          startTime: new Date(editingBreak.startTime).toTimeString().substring(0, 5)
        });
      } else {
        // Default values for new break
        setBreakForm({
          title: "",
          duration: 15, 
          breakType: "COFFEE_BREAK",
          startTime: calculateDefaultStartTime(section)
        });
      }
    }
  }, [isOpen, editingBreak, section]);

  // Calculate default start time based on section state
  const calculateDefaultStartTime = (section: Section | null): string => {
    if (!section) return "09:00"; // Default time if no section
    
    let defaultTime;
    
    // If there are existing time slots, use the end time of the last one
    if (section.presentations?.length > 0 || section.breaks?.length > 0) {
      const allTimeItems = [
        ...(section.presentations || []).map((p) => ({
          startTime: p.scheduledTime || section.startTime || "",
          endTime: p.scheduledTime
            ? new Date(
                new Date(p.scheduledTime).getTime() +
                  (p.finalDuration || 20) * 60000
              ).toISOString()
            : "",
        })),
        ...(section.breaks || []),
      ];

      if (allTimeItems.length > 0) {
        // Find the latest end time
        const sortedItems = [...allTimeItems].sort(
          (a, b) =>
            new Date(b.endTime).getTime() - new Date(a.endTime).getTime()
        );
        if (sortedItems[0]?.endTime) {
          const latestEndTime = new Date(sortedItems[0].endTime);
          return latestEndTime.toTimeString().substring(0, 5);
        }
      }
    }

    // If no suitable end time found, use section start time or current time
    const timeToUse = section.startTime
      ? new Date(section.startTime)
      : new Date();
    return timeToUse.toTimeString().substring(0, 5);
  };

  // Validation for the form
  const isFormValid = breakForm.title.trim() && breakForm.startTime;
  
  // Handle save button click
  const handleSave = () => {
    onSave(breakForm);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md bg-white">
        <DialogHeader>
          <DialogTitle>
            {editingBreak ? "Edit Break" : "Create Break"}
          </DialogTitle>
          <DialogDescription>
            {section && `Add a break to ${section.name}`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              Break Title <span className="text-red-500">*</span>
            </label>
            <Input
              placeholder="e.g., Morning Coffee Break"
              value={breakForm.title}
              onChange={(e) =>
                setBreakForm({ ...breakForm, title: e.target.value })
              }
              required
            />
          </div>

          {/* Break duration */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              Duration (minutes) <span className="text-red-500">*</span>
            </label>
            <Input
              type="number"
              min="5"
              max="120"
              step="5"
              value={breakForm.duration}
              onChange={(e) =>
                setBreakForm({
                  ...breakForm,
                  duration: parseInt(e.target.value) || 15,
                })
              }
              required
            />
          </div>

          {/* Break start time - now mandatory */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              Start Time <span className="text-red-500">*</span>
            </label>
            <Input
              type="time"
              value={breakForm.startTime}
              onChange={(e) =>
                setBreakForm({ ...breakForm, startTime: e.target.value })
              }
              required
              className={
                !breakForm.startTime
                  ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                  : ""
              }
            />
            <p className="text-xs text-gray-500 mt-1">
              Select the time when this break should start
            </p>
            {!breakForm.startTime && (
              <p className="text-xs text-red-500 mt-1">
                Start time is required
              </p>
            )}
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              Break Type <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              {breakTypes.map((type) => {
                const Icon = type.icon;
                return (
                  <button
                    key={type.value}
                    type="button"
                    className={cn(
                      "p-3 border rounded-lg text-sm transition-all flex items-center gap-2",
                      breakForm.breakType === type.value
                        ? "border-blue-500 bg-blue-50 text-blue-700"
                        : "border-gray-200 hover:border-gray-300"
                    )}
                    onClick={() =>
                      setBreakForm({ ...breakForm, breakType: type.value as "COFFEE_BREAK" | "LUNCH_BREAK" | "NETWORKING_BREAK" | "REST_BREAK" })
                    }
                  >
                    <Icon className="h-4 w-4" />
                    {type.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="default"
            onClick={handleSave}
            disabled={!isFormValid}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {editingBreak ? "Update Break" : "Create Break"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
