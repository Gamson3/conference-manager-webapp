"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FileText, File, Download, Trash2, Loader2 } from "lucide-react";
import { fetchAuthSession } from "aws-amplify/auth";
import axios from "axios";
import { toast } from "sonner";

interface Material {
  id: number;
  title: string;
  fileUrl: string;
  fileType: string;
  uploadedAt: string;
}

interface MaterialsListProps {
  materials: Material[];
  onDelete: () => void;
}

export function MaterialsList({ materials, onDelete }: MaterialsListProps) {
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const handleDelete = async (id: number) => {
    if (!window.confirm("Are you sure you want to delete this material?")) {
      return;
    }
    
    try {
      setDeletingId(id);
      const session = await fetchAuthSession();
      
      if (!session.tokens?.idToken) {
        toast.error("You must be logged in to delete materials");
        return;
      }
      
      await axios.delete(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/presenter/materials/${id}`, 
        {
          headers: {
            Authorization: `Bearer ${session.tokens.idToken.toString()}`
          }
        }
      );
      
      toast.success("Material deleted successfully");
      
      onDelete();
      
    } catch (error) {
      console.error("Error deleting material:", error);
      toast.error("There was an error deleting the material. Please try again.");
    } finally {
      setDeletingId(null);
    }
  };

  const getFileIcon = (fileType: string) => {
    const type = fileType.toLowerCase();
    
    if (type.includes('pdf')) {
      return <FileText className="h-8 w-8 text-red-500" />;
    } else if (type.includes('word') || type.includes('doc')) {
      return <FileText className="h-8 w-8 text-blue-500" />;
    } else if (type.includes('powerpoint') || type.includes('ppt')) {
      return <FileText className="h-8 w-8 text-orange-500" />;
    } else {
      return <File className="h-8 w-8 text-gray-500" />;
    }
  };

  if (materials.length === 0) {
    return (
      <div className="text-center py-6 border border-dashed border-gray-300 rounded-lg">
        <p className="text-gray-500">No materials have been uploaded yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">Uploaded Materials</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {materials.map((material) => (
          <Card key={material.id} className="p-4 flex items-start gap-3">
            {getFileIcon(material.fileType)}
            <div className="flex-1 min-w-0">
              <h4 className="font-medium truncate">{material.title}</h4>
              <p className="text-sm text-gray-500 truncate">
                Uploaded on {new Date(material.uploadedAt).toLocaleDateString()}
              </p>
            </div>
            <div className="flex space-x-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => window.open(material.fileUrl, '_blank')}
                title="Download"
              >
                <Download className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleDelete(material.id)}
                disabled={deletingId === material.id}
                title="Delete"
              >
                {deletingId === material.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}