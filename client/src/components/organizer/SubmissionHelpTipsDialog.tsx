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

export function SubmissionHelpTipsDialog({ open, onOpenChange }: SubmissionHelpTipsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-card border border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-primary-500">
            <HelpCircle className="h-5 w-5" />
            Quick Tips
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Tips for managing submission reviews effectively
          </DialogDescription>
        </DialogHeader>

        <div className="bg-muted rounded-lg border border-border p-5">
          <h3 className="font-medium mb-3 text-foreground">Quick Tips:</h3>

          <div className="grid gap-3">
            <div className="flex gap-2">
              <Eye className="h-4 w-4 text-accent mt-0.5 flex-shrink-0" />
              <p className="text-sm text-foreground">
                Click on a submission card to view its details
              </p>
            </div>

            <div className="flex gap-2">
              <CheckSquare className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
              <p className="text-sm text-foreground">
                Use checkboxes to select multiple submissions for batch actions
              </p>
            </div>

            <div className="flex gap-2">
              <AlertCircle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
              <p className="text-sm text-foreground">
                Submissions with this icon are pending for more than 7 days
              </p>
            </div>

            <div className="flex gap-2">
              <Filter className="h-4 w-4 text-accent mt-0.5 flex-shrink-0" />
              <p className="text-sm text-foreground">
                Use filters and sort options to find specific submissions
              </p>
            </div>

            <div className="flex gap-2">
              <RefreshCw className="h-4 w-4 text-accent mt-0.5 flex-shrink-0" />
              <p className="text-sm text-foreground">
                You can change the status of previously reviewed submissions
              </p>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Got it
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
