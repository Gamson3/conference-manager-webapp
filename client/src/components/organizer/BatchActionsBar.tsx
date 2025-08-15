import React from "react";
import { Button } from "@/components/ui/button";
import { CheckIcon, XIcon, RefreshCwIcon, Trash } from "lucide-react";

interface BatchActionsBarProps {
  selectedCount: number;
  onBatchApprove: () => void;
  onBatchReject: () => void;
  onBatchRevisionRequest: () => void;
  onClearSelection: () => void;
}

export function BatchActionsBar({
  selectedCount,
  onBatchApprove,
  onBatchReject,
  onBatchRevisionRequest,
  onClearSelection
}: BatchActionsBarProps) {
  if (selectedCount === 0) return null;
  
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg p-4 z-50">
      <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="font-medium">{selectedCount} submissions selected</span>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onClearSelection}
            className="text-gray-500"
          >
            Clear selection
          </Button>
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          <Button 
            onClick={onBatchApprove}
            className="bg-green-600 hover:bg-green-700"
          >
            <CheckIcon className="h-4 w-4 mr-2" />
            Approve Selected
          </Button>
          <Button 
            onClick={onBatchReject}
            className="bg-red-600 hover:bg-red-700"
          >
            <XIcon className="h-4 w-4 mr-2" />
            Reject Selected
          </Button>
          <Button 
            onClick={onBatchRevisionRequest}
            className="bg-amber-600 hover:bg-amber-700"
          >
            <RefreshCwIcon className="h-4 w-4 mr-2" />
            Request Revision
          </Button>
        </div>
      </div>
    </div>
  );
}