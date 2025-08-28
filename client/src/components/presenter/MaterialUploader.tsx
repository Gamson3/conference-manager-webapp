"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, X, FileText, File, Loader2 } from "lucide-react";
import { fetchAuthSession } from "aws-amplify/auth";
import axios from "axios";
import { toast } from "sonner";

interface MaterialUploaderProps {
  presentationId: number;
  onUploadComplete: () => void;
}

export function MaterialUploader({ presentationId, onUploadComplete }: MaterialUploaderProps) {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      
      // Set a default title based on the filename (without extension)
      const fileName = selectedFile.name.split('.').slice(0, -1).join('.');
      setTitle(fileName || "Presentation Material");
    }
  };

  const resetForm = () => {
    setFile(null);
    setTitle("");
  };

  const handleUpload = async () => {
    if (!file || !title.trim()) {
      toast.error("Please select a file and enter a title before uploading");
      return;
    }

    try {
      setIsUploading(true);
      const session = await fetchAuthSession();
      
      if (!session.tokens?.idToken) {
        toast.error("You must be logged in to upload materials");
        return;
      }
      
      const formData = new FormData();
      formData.append("file", file);
      formData.append("title", title);
      formData.append("presentationId", presentationId.toString());
      
      await axios.post(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/presenter/materials`, 
        formData,
        {
          headers: {
            Authorization: `Bearer ${session.tokens.idToken.toString()}`,
            "Content-Type": "multipart/form-data",
          }
        }
      );
      
      toast.success("Your material has been uploaded successfully");
      
      resetForm();
      onUploadComplete();
      
    } catch (error) {
      console.error("Error uploading material:", error);
      toast.error("There was an error uploading your material. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  const getFileIcon = () => {
    if (!file) return null;
    
    const extension = file.name.split('.').pop()?.toLowerCase();
    
    switch (extension) {
      case 'pdf':
        return <FileText className="h-8 w-8 text-red-500" />;
      case 'doc':
      case 'docx':
        return <FileText className="h-8 w-8 text-blue-500" />;
      case 'ppt':
      case 'pptx':
        return <FileText className="h-8 w-8 text-orange-500" />;
      default:
        return <File className="h-8 w-8 text-gray-500" />;
    }
  };

  return (
    <div className="p-4 border border-dashed border-gray-300 rounded-lg">
      {file ? (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            {getFileIcon()}
            <div className="flex-1">
              <p className="font-medium truncate">{file.name}</p>
              <p className="text-sm text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
            </div>
            <Button 
              variant="ghost" 
              size="icon"
              onClick={resetForm}
              className="h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="material-title">Material Title</Label>
            <Input 
              id="material-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter a title for this material"
            />
          </div>
          
          <div className="flex justify-end gap-2">
            <Button 
              variant="outline" 
              onClick={resetForm}
              disabled={isUploading}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleUpload}
              disabled={isUploading}
              className="flex items-center gap-2"
            >
              {isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  Upload
                </>
              )}
            </Button>
          </div>
        </div>
      ) : (
        <div className="text-center py-6">
          <div className="flex justify-center mb-4">
            <Upload className="h-10 w-10 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium mb-2">Upload Material</h3>
          <p className="text-gray-500 mb-4">
            Drag and drop a file, or click to select
          </p>
          <div className="flex justify-center">
            <Label 
              htmlFor="file-upload" 
              className="bg-primary text-white py-2 px-4 rounded-md cursor-pointer hover:bg-primary-600 transition-colors"
            >
              Select File
            </Label>
            <Input 
              id="file-upload"
              type="file"
              onChange={handleFileChange}
              className="hidden"
              accept=".pdf,.doc,.docx,.ppt,.pptx"
            />
          </div>
          <p className="text-xs text-gray-400 mt-2">
            Supported formats: PDF, Word, PowerPoint
          </p>
        </div>
      )}
    </div>
  );
}