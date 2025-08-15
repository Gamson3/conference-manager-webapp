import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ClockIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Presentation } from "@/types/scheduleBuilder";

interface PresentationDetailDialogProps {
  presentation: Presentation | null;
  onClose: () => void;
}

export function PresentationDetailDialog({
  presentation,
  onClose,
}: PresentationDetailDialogProps) {
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
                  backgroundColor: `${
                    presentation.category?.color || "#6B7280"
                  }20`,
                  color: presentation.category?.color || "#6B7280",
                  border: `1px solid ${
                    presentation.category?.color || "#6B7280"
                  }40`,
                }}
              >
                {presentation.category?.name || "Uncategorized"}
              </Badge>
              {presentation.presentationType && (
                <Badge variant="outline" className="px-3 py-1">
                  {presentation.presentationType.name}
                </Badge>
              )}
              <Badge variant="outline" className="px-3 py-1">
                <ClockIcon className="h-3 w-3 mr-1" />
                {presentation.finalDuration || 0} minutes
              </Badge>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-semibold mb-3 text-gray-900">Authors</h4>
              <div className="space-y-2">
                {Array.isArray(presentation.authors) &&
                  presentation.authors.map((author, index) => (
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