"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ExternalLinkIcon } from "lucide-react";

interface Attachment {
  name: string;
  url: string;
}

export function MaterialsSection({ attachments }: { attachments: Attachment[] }) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  if (!attachments || attachments.length === 0) {
    return <p className="text-sm text-muted-foreground">No supporting materials submitted</p>;
  }

  return (
    <>
      <Card className="p-4 space-y-3">
        <h3 className="font-semibold">Attachments</h3>
        <ul className="space-y-2">
          {attachments.map((file, i) => (
            <li
              key={i}
              className="flex items-center justify-between bg-gray-50 p-2 rounded"
            >
              <button
                className="text-blue-600 hover:underline text-left"
                onClick={() => setPreviewUrl(file.url)}
              >
                {file.name}
              </button>
              <a
                href={file.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-gray-800"
                title="Open in new tab"
              >
                <ExternalLinkIcon className="h-4 w-4" />
              </a>
            </li>
          ))}
        </ul>
      </Card>

      {/* Preview Modal */}
      <Dialog open={!!previewUrl} onOpenChange={() => setPreviewUrl(null)}>
        <DialogContent className="max-w-4xl h-[80vh]">
          <DialogHeader>
            <DialogTitle>Preview</DialogTitle>
          </DialogHeader>
          {previewUrl && (
            <iframe
              src={previewUrl}
              className="w-full h-full border-none"
              title="Attachment Preview"
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
