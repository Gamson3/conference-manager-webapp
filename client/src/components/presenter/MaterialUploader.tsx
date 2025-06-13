"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { createAuthenticatedApi } from "@/lib/utils";
import { toast } from "sonner";
import { Upload, FileIcon, AlertCircle, Loader2 } from "lucide-react";

interface MaterialUploaderProps {
  presentationId: string | number;
  onUploadComplete?: () => void;
  allowedFileTypes?: string;
  maxFileSize?: number;
}

export default function MaterialUploader({
  presentationId,
  onUploadComplete,
  allowedFileTypes = "pdf,doc,docx,ppt,pptx,txt",
  maxFileSize = 50
}: MaterialUploaderProps) {
  const [file, setFile] = useState<File | null>(null);
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const handleFileChange = (selectedFile: File | null) => {
    if (!selectedFile) return;
    
    setFile(selectedFile);
    setError(null);
    
    // Validate file size
    if (maxFileSize && selectedFile.size > maxFileSize * 1024 * 1024) {
      setError(`File size exceeds the maximum allowed size of ${maxFileSize}MB`);
      return;
    }
    
    // Validate file type
    if (allowedFileTypes) {
      const fileExtension = selectedFile.name.split('.').pop()?.toLowerCase();
      const allowedExtensions = allowedFileTypes.split(',').map(ext => ext.trim().toLowerCase());
      
      if (fileExtension && !allowedExtensions.includes(fileExtension)) {
        setError(`Invalid file type. Allowed types: ${allowedFileTypes}`);
        return;
      }
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!file) {
      setError('Please select a file to upload');
      return;
    }
    
    if (error) {
      return; // Don't proceed if there's a validation error
    }
    
    try {
      setIsUploading(true);
      
      const formData = new FormData();
      formData.append('file', file);
      formData.append('description', description);
      formData.append('isPublic', isPublic ? 'true' : 'false');
      
      const api = await createAuthenticatedApi();
      await api.post(`/api/presentations/${presentationId}/materials`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      // Reset form
      setFile(null);
      setDescription('');
      setIsPublic(false);
      setError(null);
      
      toast.success('File uploaded successfully!');
      
      // If callback provided, call it
      if (onUploadComplete) {
        onUploadComplete();
      }
    } catch (error: any) {
      console.error('Error uploading file:', error);
      setError(error.response?.data?.message || 'Failed to upload file');
      toast.error('Failed to upload file');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Upload className="h-5 w-5 mr-2" />
          Upload Material
        </CardTitle>
      </CardHeader>
      
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          {/* File Upload Area */}
          <div
            className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
              dragActive
                ? 'border-blue-500 bg-blue-50'
                : file
                ? 'border-green-500 bg-green-50'
                : 'border-gray-300 hover:border-gray-400'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <Input
              type="file"
              onChange={(e) => handleFileChange(e.target.files?.[0] || null)}
              disabled={isUploading}
              className="hidden"
              id="file-upload"
            />
            
            {file ? (
              <div className="flex items-center justify-center space-x-2">
                <FileIcon className="h-8 w-8 text-green-600" />
                <div>
                  <p className="font-medium">{file.name}</p>
                  <p className="text-sm text-gray-500">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              </div>
            ) : (
              <div>
                <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-lg font-medium mb-2">
                  Drop your file here or{' '}
                  <Label htmlFor="file-upload" className="text-blue-600 cursor-pointer hover:underline">
                    browse
                  </Label>
                </p>
                <p className="text-sm text-gray-500">
                  Supported formats: {allowedFileTypes} • Max size: {maxFileSize}MB
                </p>
              </div>
            )}
          </div>
          
          {/* Description */}
          <div>
            <Label htmlFor="description">Description (optional)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter a description for this file"
              disabled={isUploading}
            />
          </div>
          
          {/* Public checkbox */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="isPublic"
              checked={isPublic}
              onCheckedChange={(checked) => setIsPublic(checked === true)}
              disabled={isUploading}
            />
            <Label htmlFor="isPublic" className="text-sm">
              Make this file publicly available (downloadable without login)
            </Label>
          </div>
          
          {/* Submit button */}
          <Button 
            type="submit" 
            disabled={isUploading || !file || !!error}
            className="w-full"
          >
            {isUploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Upload File
              </>
            )}
          </Button>
        </CardContent>
      </form>
    </Card>
  );
}