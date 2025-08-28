"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Upload, File, FileText, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { fetchAuthSession } from "aws-amplify/auth";
import axios from "axios";
import { MaterialUploader } from "@/components/presenter/MaterialUploader";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface Presentation {
  id: number;
  title: string;
  conferenceId: number;
  conferenceName: string;
}

interface Material {
  id: number;
  title: string;
  fileUrl: string;
  fileType: string;
  uploadedAt: string;
  presentationId: number;
  presentationTitle: string;
}

export default function MaterialsDashboard() {
  const router = useRouter();
  const [presentations, setPresentations] = useState<Presentation[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [selectedPresentation, setSelectedPresentation] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const session = await fetchAuthSession();
        
        if (!session.tokens?.idToken) {
          setError("Authentication error. Please login again.");
          return;
        }
        
        // Fetch presentations
        const presentationsResponse = await axios.get(
          `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/presenter/presentations`, 
          {
            headers: {
              Authorization: `Bearer ${session.tokens.idToken.toString()}`
            }
          }
        );
        
        // Fetch all materials
        const materialsResponse = await axios.get(
          `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/presenter/materials`, 
          {
            headers: {
              Authorization: `Bearer ${session.tokens.idToken.toString()}`
            }
          }
        );
        
        setPresentations(presentationsResponse.data.presentations || []);
        setMaterials(materialsResponse.data.materials || []);
        
      } catch (error) {
        console.error("Error fetching data:", error);
        setError("Failed to load presenter data. Please try again.");
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, []);

  const handleUploadComplete = async () => {
    setIsUploading(true);
    try {
      const session = await fetchAuthSession();
      
      if (!session.tokens?.idToken) {
        return;
      }
      
      // Refresh materials list
      const materialsResponse = await axios.get(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/presenter/materials`, 
        {
          headers: {
            Authorization: `Bearer ${session.tokens.idToken.toString()}`
          }
        }
      );
      
      setMaterials(materialsResponse.data.materials || []);
    } catch (error) {
      console.error("Error refreshing materials:", error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteMaterial = async (id: number) => {
    if (!window.confirm("Are you sure you want to delete this material?")) {
      return;
    }
    
    try {
      const session = await fetchAuthSession();
      
      if (!session.tokens?.idToken) {
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
      
      // Remove the deleted material from the state
      setMaterials(materials.filter(material => material.id !== id));
    } catch (error) {
      console.error("Error deleting material:", error);
      alert("Failed to delete the material. Please try again.");
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

  // Filter materials based on selected presentation
  const filteredMaterials = selectedPresentation 
    ? materials.filter(material => material.presentationId === parseInt(selectedPresentation))
    : materials;

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex justify-center py-10">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Alert variant="destructive" className="mb-6">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <div className="flex justify-center">
          <Button onClick={() => router.push("/presenter/dashboard")}>
            Return to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <Button 
          variant="ghost" 
          className="pl-0 flex items-center gap-2"
          onClick={() => router.push("/presenter/dashboard")}
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Button>
      </div>
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold">Presentation Materials</h1>
          <p className="text-gray-500">Upload and manage materials for your presentations</p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Upload New Material</CardTitle>
              <CardDescription>
                Select a presentation and upload a file
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Select Presentation</label>
                  <Select value={selectedPresentation} onValueChange={setSelectedPresentation}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a presentation" />
                    </SelectTrigger>
                    <SelectContent>
                      {presentations.map((presentation) => (
                        <SelectItem key={presentation.id} value={presentation.id.toString()}>
                          {presentation.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                {selectedPresentation && (
                  <MaterialUploader 
                    presentationId={parseInt(selectedPresentation)}
                    onUploadComplete={handleUploadComplete}
                  />
                )}
              </div>
            </CardContent>
          </Card>
        </div>
        
        <div className="md:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Your Materials</CardTitle>
              <CardDescription>
                All materials you've uploaded for your presentations
              </CardDescription>
              <div className="mt-2">
                <Select value={selectedPresentation} onValueChange={setSelectedPresentation}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by presentation" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Presentations</SelectItem>
                    {presentations.map((presentation) => (
                      <SelectItem key={presentation.id} value={presentation.id.toString()}>
                        {presentation.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              {isUploading ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : filteredMaterials.length === 0 ? (
                <div className="text-center py-6 border border-dashed border-gray-300 rounded-lg">
                  <Upload className="h-10 w-10 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No materials found</h3>
                  <p className="text-gray-500">
                    {selectedPresentation 
                      ? "You haven't uploaded any materials for this presentation yet."
                      : "You haven't uploaded any materials yet."}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredMaterials.map((material) => (
                    <Card key={material.id} className="p-4 flex items-start gap-3">
                      {getFileIcon(material.fileType)}
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium truncate">{material.title}</h4>
                        <p className="text-sm text-gray-500 truncate">
                          For: {material.presentationTitle}
                        </p>
                        <p className="text-xs text-gray-400">
                          Uploaded on {new Date(material.uploadedAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex space-x-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(material.fileUrl, '_blank')}
                        >
                          Download
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeleteMaterial(material.id)}
                        >
                          Delete
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}