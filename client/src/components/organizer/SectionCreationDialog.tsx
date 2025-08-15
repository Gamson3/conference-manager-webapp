import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { FileText, MessageSquare, Users } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// Types that this component needs
interface Section {
  id: number;
  name: string;
  description?: string;
  startTime?: string;
  endTime?: string;
  room?: string;
  capacity?: number;
  type: string;
}

interface SectionCreationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (sectionData: any) => Promise<void>;
  selectedDay: string | null;
  editingSection: Section | null;
}

export function SectionCreationDialog({
  isOpen,
  onClose,
  onSave,
  selectedDay,
  editingSection,
}: SectionCreationDialogProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [sectionForm, setSectionForm] = useState({
    name: "",
    description: "",
    startTime: "09:00",
    endTime: "12:00",
    room: "",
    capacity: 50,
    type: "presentation" as "presentation" | "workshop" | "panel",
  });

  // Reset form when dialog opens or editingSection changes
  useEffect(() => {
    if (isOpen) {
      if (editingSection) {
        // Format times from ISO to HH:MM for editing
        const startTime = editingSection.startTime
          ? new Date(editingSection.startTime).toTimeString().substring(0, 5)
          : "09:00";

        const endTime = editingSection.endTime
          ? new Date(editingSection.endTime).toTimeString().substring(0, 5)
          : "12:00";

        setSectionForm({
          name: editingSection.name,
          description: editingSection.description || "",
          startTime,
          endTime,
          room: editingSection.room || "",
          capacity: editingSection.capacity || 50,
          type: editingSection.type as any,
        });
      } else {
        // Default values for new section
        setSectionForm({
          name: "",
          description: "",
          startTime: "09:00",
          endTime: "12:00",
          room: "",
          capacity: 50,
          type: "presentation",
        });
      }
    }
  }, [isOpen, editingSection]);

  const handleCreateSection = async () => {
    try {
      setIsCreating(true);

      if (!selectedDay) {
        toast.error("Please select a day first");
        return;
      }

      // Combine date and time
      const dayDate = editingSection?.startTime
        ? new Date(editingSection.startTime)
        : new Date(selectedDay as string);
      const [startHour, startMinute] = sectionForm.startTime
        .split(":")
        .map(Number);
      const [endHour, endMinute] = sectionForm.endTime.split(":").map(Number);

      const startDateTime = new Date(dayDate);
      startDateTime.setHours(startHour, startMinute, 0);

      const endDateTime = new Date(dayDate);
      endDateTime.setHours(endHour, endMinute, 0);

      // Validate times
      if (endDateTime <= startDateTime) {
        toast.error("End time must be after start time");
        return;
      }

      // Create section data
      const sectionData = {
        id: editingSection?.id, // Include ID if editing
        name: sectionForm.name,
        description: sectionForm.description,
        startTime: startDateTime.toISOString(),
        endTime: endDateTime.toISOString(),
        room: sectionForm.room,
        capacity: sectionForm.capacity,
        type: sectionForm.type,
      };

      await onSave(sectionData);
      onClose();
    } catch (error) {
      console.error("Error creating section:", error);
      toast.error("Failed to create section");
    } finally {
      setIsCreating(false);
    }
  };

  const isValid =
    sectionForm.name.trim() && sectionForm.startTime && sectionForm.endTime;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md bg-white">
        <DialogHeader>
          <DialogTitle>
            {editingSection ? "Edit Section" : "Create New Section"}
          </DialogTitle>
          <DialogDescription>
            {editingSection
              ? "Modify section details"
              : "Create a new section for presentations"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Section name */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              Section Name <span className="text-red-500">*</span>
            </label>
            <Input
              placeholder="e.g., Morning Technical Talks"
              value={sectionForm.name}
              onChange={(e) =>
                setSectionForm({ ...sectionForm, name: e.target.value })
              }
              required
            />
          </div>

          {/* Section description */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              Description
            </label>
            <Textarea
              placeholder="Describe what sessions this section will cover..."
              value={sectionForm.description}
              onChange={(e) =>
                setSectionForm({ ...sectionForm, description: e.target.value })
              }
              rows={3}
            />
          </div>

          {/* Time fields */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Start Time <span className="text-red-500">*</span>
              </label>
              <Input
                type="time"
                value={sectionForm.startTime}
                onChange={(e) =>
                  setSectionForm({ ...sectionForm, startTime: e.target.value })
                }
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                End Time <span className="text-red-500">*</span>
              </label>
              <Input
                type="time"
                value={sectionForm.endTime}
                onChange={(e) =>
                  setSectionForm({ ...sectionForm, endTime: e.target.value })
                }
                required
              />
            </div>
          </div>

          {/* Room and capacity */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Room/Location
              </label>
              <Input
                placeholder="e.g., Main Hall"
                value={sectionForm.room}
                onChange={(e) =>
                  setSectionForm({ ...sectionForm, room: e.target.value })
                }
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Capacity
              </label>
              <Input
                type="number"
                min="1"
                value={sectionForm.capacity}
                onChange={(e) =>
                  setSectionForm({
                    ...sectionForm,
                    capacity: parseInt(e.target.value) || 0,
                  })
                }
              />
            </div>
          </div>

          {/* Section type */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              Section Type
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                {
                  value: "presentation",
                  label: "Presentations",
                  icon: FileText,
                },
                { value: "workshop", label: "Workshop", icon: Users },
                { value: "panel", label: "Panel", icon: MessageSquare },
              ].map((type) => {
                const Icon = type.icon;
                return (
                  <button
                    key={type.value}
                    type="button"
                    className={cn(
                      "p-3 border rounded-lg text-sm transition-all flex flex-col items-center gap-2",
                      sectionForm.type === type.value
                        ? "border-blue-500 bg-blue-50 text-blue-700"
                        : "border-gray-200 hover:border-gray-300"
                    )}
                    onClick={() =>
                      setSectionForm({
                        ...sectionForm,
                        type: type.value as any,
                      })
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
            onClick={handleCreateSection}
            disabled={!isValid || isCreating}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {isCreating
              ? editingSection
                ? "Updating..."
                : "Creating..."
              : editingSection
              ? "Update Section"
              : "Create Section"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
