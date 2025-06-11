"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, FileText } from "lucide-react";

interface DeleteSessionDialogProps {
  open: boolean;
  onClose: () => void;
  sessionName: string;
  presentations: { id: number; title: string; }[];
  onConfirm: () => void;
  loading?: boolean;
}

export default function DeleteSessionDialog({
  open,
  onClose,
  sessionName,
  presentations = [],
  onConfirm,
  loading = false
}: DeleteSessionDialogProps) {
  const hasPresentations = presentations.length > 0;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md bg-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            Delete Session
          </DialogTitle>
          <DialogDescription>
            Are you sure you want to delete "{sessionName}"?
          </DialogDescription>
        </DialogHeader>

        {hasPresentations && (
          <Alert variant="destructive">
            <FileText className="h-4 w-4" />
            <AlertDescription>
              <div className="mb-2">
                <strong>Warning:</strong> This session contains {presentations.length} presentation(s):
              </div>
              <ul className="list-disc list-inside space-y-1 text-sm max-h-32 overflow-y-auto">
                {presentations.slice(0, 5).map((p) => (
                  <li key={p.id} className="truncate">{p.title}</li>
                ))}
                {presentations.length > 5 && (
                  <li className="text-gray-600">...and {presentations.length - 5} more</li>
                )}
              </ul>
              <div className="mt-2 text-sm">
                All presentations and their associated data (authors, materials, feedback) will be permanently deleted.
              </div>
            </AlertDescription>
          </Alert>
        )}

        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={onClose} 
            disabled={loading}
            className="text-primary-800 cursor-pointer"
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={loading}
            className="bg-red-700 hover:bg-red-600 shadow cursor-pointer"
          >
            {loading ? "Deleting..." : `Delete Session${hasPresentations ? ` & ${presentations.length} Presentations` : ""}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}