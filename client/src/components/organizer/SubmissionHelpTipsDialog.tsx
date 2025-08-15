import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertCircle, CheckSquare, Eye, Filter, HelpCircle, RefreshCw } from "lucide-react";

interface SubmissionHelpTipsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SubmissionHelpTipsDialog({ 
  open, 
  onOpenChange 
}: SubmissionHelpTipsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
  <DialogContent className="max-w-md bg-white border-none">
    <DialogHeader>
      <DialogTitle className="flex items-center gap-2 text-primary">
        <HelpCircle className="h-5 w-5" />
        Quick Tips
      </DialogTitle>
      <DialogDescription>
        Tips for managing submission reviews effectively
      </DialogDescription>
    </DialogHeader>
    
    <div className="bg-blue-50 rounded-lg border border-blue-200 p-5">
      <h3 className="font-medium mb-3 text-blue-800">Quick Tips:</h3>
      
      <div className="grid gap-3">
        <div className="flex gap-2">
          <Eye className="h-4 w-4 text-blue-700 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-blue-800">Click on a submission card to view its details</p>
        </div>
        
        <div className="flex gap-2">
          <CheckSquare className="h-4 w-4 text-blue-700 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-blue-800">Use checkboxes to select multiple submissions for batch actions</p>
        </div>
        
        <div className="flex gap-2">
          <AlertCircle className="h-4 w-4 text-orange-500 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-blue-800">Submissions with this icon are pending for more than 7 days</p>
        </div>
        
        <div className="flex gap-2">
          <Filter className="h-4 w-4 text-blue-700 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-blue-800">Use filters and sort options to find specific submissions</p>
        </div>
        
        <div className="flex gap-2">
          <RefreshCw className="h-4 w-4 text-blue-700 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-blue-800">You can change the status of previously reviewed submissions</p>
        </div>
      </div>
    </div>
    
    <DialogFooter>
      <Button
        variant="outline"
        onClick={() => onOpenChange(false)}
      >
        Got it
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
  );
}