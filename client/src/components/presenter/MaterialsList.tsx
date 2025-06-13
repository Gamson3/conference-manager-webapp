"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { createAuthenticatedApi } from "@/lib/utils";
import { toast } from "sonner";
import { 
  FileIcon, 
  Download, 
  Trash2, 
  ExternalLink, 
  Loader2,
  AlertCircle,
  FileTextIcon,
  ImageIcon,
  VideoIcon
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface MaterialFile {
  id: number;
  title: string;
  fileType: string;
  fileUrl: string;
  uploadedAt: string;
  isPublic: boolean;
  downloadUrl: string;
  description?: string;
}

interface MaterialsListProps {
  presentationId: string | number;
  refreshTrigger?: number;
  allowDelete?: boolean;
}

export default function MaterialsList({
  presentationId,
  refreshTrigger = 0,
  allowDelete = true
}: MaterialsListProps) {
  const [files, setFiles] = useState<MaterialFile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  
  const loadFiles = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const api = await createAuthenticatedApi();
      const response = await api.get(`/api/presentations/${presentationId}/materials`);
      setFiles(response.data);
    } catch (err: any) {
      console.error('Error loading files:', err);
      setError(err.response?.data?.message || 'Failed to load files');
    } finally {
      setIsLoading(false);
    }
  };
  
  useEffect(() => {
    loadFiles();
  }, [presentationId, refreshTrigger]);
  
  const handleDelete = async (fileId: number) => {
    try {
      setDeletingId(fileId);
      const api = await createAuthenticatedApi();
      await api.delete(`/api/materials/${fileId}`);
      toast.success('File deleted successfully');
      // Reload files after deletion
      loadFiles();
    } catch (err: any) {
      console.error('Error deleting file:', err);
      toast.error(err.response?.data?.message || 'Failed to delete file');
    } finally {
      setDeletingId(null);
    }
  };

  const handleDownload = async (file: MaterialFile) => {
    try {
      // Use the downloadUrl from the API response
      window.open(file.downloadUrl, '_blank');
    } catch (err: any) {
      console.error('Error downloading file:', err);
      toast.error('Failed to download file');
    }
  };
  
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getFileIcon = (fileType: string) => {
    const mimeType = fileType.toLowerCase();
    
    if (mimeType.includes('pdf')) {
      return <FileTextIcon className="h-10 w-10 text-red-500" />;
    } else if (mimeType.includes('image')) {
      return <ImageIcon className="h-10 w-10 text-green-500" />;
    } else if (mimeType.includes('video')) {
      return <VideoIcon className="h-10 w-10 text-purple-500" />;
    } else if (mimeType.includes('word') || mimeType.includes('document')) {
      return <FileTextIcon className="h-10 w-10 text-blue-500" />;
    } else if (mimeType.includes('powerpoint') || mimeType.includes('presentation')) {
      return <FileTextIcon className="h-10 w-10 text-orange-500" />;
    } else {
      return <FileIcon className="h-10 w-10 text-gray-500" />;
    }
  };

  const getFileTypeLabel = (fileType: string) => {
    const mimeType = fileType.toLowerCase();
    
    if (mimeType.includes('pdf')) return 'PDF';
    if (mimeType.includes('word') || mimeType.includes('document')) return 'Word Document';
    if (mimeType.includes('powerpoint') || mimeType.includes('presentation')) return 'PowerPoint';
    if (mimeType.includes('image')) return 'Image';
    if (mimeType.includes('video')) return 'Video';
    if (mimeType.includes('text')) return 'Text';
    
    return 'File';
  };
  
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Materials</CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </CardContent>
      </Card>
    );
  }
  
  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Materials</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <Button 
            className="mt-4" 
            variant="outline" 
            onClick={loadFiles}
          >
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }
  
  if (files.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Materials</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <FileIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No materials have been uploaded yet.</p>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Materials ({files.length})</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {files.map(file => (
            <div 
              key={file.id} 
              className="flex items-center border p-4 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="mr-4">
                {getFileIcon(file.fileType)}
              </div>
              
              <div className="flex-1">
                <h4 className="font-medium">{file.title}</h4>
                
                {file.description && (
                  <p className="text-sm text-gray-600 mt-1">{file.description}</p>
                )}
                
                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-sm text-gray-500">
                  <span>Type: {getFileTypeLabel(file.fileType)}</span>
                  <span>Uploaded: {formatDate(file.uploadedAt)}</span>
                  
                  {file.isPublic && (
                    <div className="flex items-center text-green-600">
                      <ExternalLink className="h-3 w-3 mr-1" />
                      <span>Public</span>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => handleDownload(file)}
                  title="Download file"
                >
                  <Download className="h-4 w-4" />
                </Button>
                
                {allowDelete && (
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="text-red-500 border-red-200 hover:bg-red-50"
                        disabled={deletingId === file.id}
                        title="Delete file"
                      >
                        {deletingId === file.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Delete File</DialogTitle>
                        <DialogDescription>
                          Are you sure you want to delete "{file.title}"? This action cannot be undone.
                        </DialogDescription>
                      </DialogHeader>
                      <DialogFooter>
                        <Button variant="outline">Cancel</Button>
                        <Button
                          onClick={() => handleDelete(file.id)}
                          className="bg-red-600 hover:bg-red-700 text-white"
                        >
                          Delete
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}