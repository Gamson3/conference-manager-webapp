import { Paperclip } from "lucide-react";

interface AttachmentProps {
  name: string;
  url: string;
  size?: string;
}

export function AttachmentCard({ name, url, size }: AttachmentProps) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-3 border p-2 rounded-md hover:bg-gray-100 transition"
    >
      <Paperclip className="text-gray-600 flex-shrink-0" />
      <div className="flex flex-col">
        <span className="font-medium text-sm">{name}</span>
        {size && <span className="text-xs text-gray-500">{size}</span>}
      </div>
    </a>
  );
}
