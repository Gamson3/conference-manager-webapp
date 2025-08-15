import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { createAuthenticatedApi } from "@/lib/utils";
import { toast } from "sonner";

interface ReassignmentItem {
  id: number;
  name: string;
  _count?: {
    presentations?: number;
    sections?: number;
  };
}

interface ReassignmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemToDelete: ReassignmentItem | null;
  itemType: "category" | "presentationType";
  otherItems: ReassignmentItem[];
  onDeleteComplete: () => void;
}

export function ReassignmentDialog({
  open,
  onOpenChange,
  itemToDelete,
  itemType,
  otherItems,
  onDeleteComplete,
}: ReassignmentDialogProps) {
  const [reassignTarget, setReassignTarget] = useState<number>(0);
  const [isReassigning, setIsReassigning] = useState(false);

  const handleConfirmReassignAndDelete = async () => {
    if (!itemToDelete || reassignTarget === 0) return;
    
    try {
      setIsReassigning(true);
      const api = await createAuthenticatedApi();
      
      // Make the API call to reassign presentations
      if (itemType === "category") {
        await api.post(`/api/categories/${itemToDelete.id}/reassign`, {
          targetCategoryId: reassignTarget
        }).catch(async (error) => {
          console.error("Error during reassignment:", error);
          toast.error("Failed to reassign items. Please try again.");
          return;
        });
        
        // Delete the category after reassignment
        await api.delete(`/api/categories/${itemToDelete.id}`);
      } else {
        // For presentation types
        await api.post(`/api/presentation-types/${itemToDelete.id}/reassign`, {
          targetPresentationTypeId: reassignTarget
        }).catch(async (error) => {
          console.error("Error during reassignment:", error);
          toast.error("Failed to reassign items. Please try again.");
          return;
        });
        
        // Delete the presentation type after reassignment
        await api.delete(`/api/presentation-types/${itemToDelete.id}`);
      }
      
      // Update parent component
      onDeleteComplete();
      onOpenChange(false);
      
      toast.success(`${itemType === "category" ? "Category" : "Presentation type"} deleted and presentations reassigned successfully`);
    } catch (error: any) {
      console.error("Error during reassignment and deletion:", error);
      toast.error(error.response?.data?.message || "Failed to complete operation");
    } finally {
      setIsReassigning(false);
      setReassignTarget(0); // Reset selection
    }
  };

  // Reset the target when dialog opens with new item
  React.useEffect(() => {
    if (open) {
      setReassignTarget(0);
    }
  }, [open, itemToDelete]);

  const itemLabel = itemType === "category" ? "Category" : "Presentation type";
  const countLabel = "presentations";
  const itemCount = itemToDelete?._count?.presentations || 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-white">
        <DialogHeader>
          <DialogTitle>Reassign Presentations Before Deleting</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            This {itemLabel.toLowerCase()} has {itemCount} {countLabel} assigned to it. 
            Please select another {itemLabel.toLowerCase()} to move these {countLabel} to before deleting.
          </p>
          
          <div>
            <Label htmlFor="target-item">Move {countLabel} to:</Label>
            <select
              id="target-item"
              className="w-full p-2 border border-gray-300 rounded mt-1"
              value={reassignTarget}
              onChange={(e) => setReassignTarget(Number(e.target.value))}
            >
              <option value={0} disabled>Select a {itemLabel.toLowerCase()}...</option>
              {otherItems
                .filter(item => item.id !== itemToDelete?.id)
                .map(item => (
                  <option key={item.id} value={item.id}>{item.name}</option>
                ))
              }
            </select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirmReassignAndDelete}
            disabled={isReassigning || reassignTarget === 0}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            {isReassigning ? "Processing..." : "Reassign & Delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}