import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import {
  DownloadIcon,
  FileTextIcon,
  SearchIcon,
  BookOpenIcon,
  VideoIcon,
  FileIcon,
  ExternalLinkIcon,
  CheckCircleIcon,
} from 'lucide-react';
import { createAuthenticatedApi } from '@/lib/utils';
import { toast } from 'sonner';

interface Material {
  id: number;
  title: string;
  description: string;
  fileUrl: string;
  fileType: 'pdf' | 'video' | 'presentation' | 'other';
  conferenceId: number;
  conferenceName: string;
  uploadDate: string;
  isNew: boolean;
  viewed: boolean;
}

const ConferenceMaterials = () => {
  const router = useRouter();
  const [materials, setMaterials] = useState<Material[]>([]);
  const [filteredMaterials, setFilteredMaterials] = useState<Material[]>([]);
  const [conferences, setConferences] = useState<{id: number, name: string}[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('all');

  useEffect(() => {
    const fetchMaterials = async () => {
      try {
        setLoading(true);
        const api = await createAuthenticatedApi();
        
        const response = await api.get('/attendee/materials');
        setMaterials(response.data);
        setFilteredMaterials(response.data);
        
        // Extract unique conferences
        const uniqueConferences = Array.from(
          new Set(response.data.map((material: Material) => material.conferenceId))
        ).map((conferenceId) => {
          const material = response.data.find((m: Material) => m.conferenceId === conferenceId);
          return {
            id: Number(conferenceId),
            name: material.conferenceName,
          };
        });
        
        setConferences(uniqueConferences);
      } catch (error: any) {
        console.error('Error fetching materials:', error);
        toast.error('Failed to load conference materials');
      } finally {
        setLoading(false);
      }
    };

    fetchMaterials();
  }, []);

  useEffect(() => {
    // Filter materials based on search term and active tab
    let filtered = materials;
    
    if (searchTerm) {
      filtered = filtered.filter((material) => 
        material.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        material.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        material.conferenceName.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    if (activeTab !== 'all') {
      if (activeTab === 'unread') {
        filtered = filtered.filter((material) => !material.viewed);
      } else {
        // Filter by conference ID
        filtered = filtered.filter((material) => 
          material.conferenceId.toString() === activeTab
        );
      }
    }
    
    setFilteredMaterials(filtered);
  }, [searchTerm, activeTab, materials]);

  const markAsViewed = async (materialId: number) => {
    try {
      const api = await createAuthenticatedApi();
      await api.post(`/attendee/materials/${materialId}/viewed`);
      
      // Update local state
      setMaterials(materials.map(material => 
        material.id === materialId 
          ? { ...material, viewed: true, isNew: false } 
          : material
      ));
      
      toast.success('Material marked as viewed');
    } catch (error) {
      console.error('Error marking material as viewed:', error);
      toast.error('Failed to update material status');
    }
  };

  const downloadMaterial = async (material: Material) => {
    try {
      window.open(material.fileUrl, '_blank');
      
      // If not already viewed, mark as viewed
      if (!material.viewed) {
        await markAsViewed(material.id);
      }
    } catch (error) {
      console.error('Error downloading material:', error);
      toast.error('Failed to download material');
    }
  };

  const getFileIcon = (fileType: string) => {
    switch (fileType) {
      case 'pdf':
        return <FileTextIcon className="h-5 w-5" />;
      case 'video':
        return <VideoIcon className="h-5 w-5" />;
      case 'presentation':
        return <FileIcon className="h-5 w-5" />;
      default:
        return <FileIcon className="h-5 w-5" />;
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center mb-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-64" />
        </div>
        
        <div className="flex gap-2 mb-4">
          <Skeleton className="h-10 w-20" />
          <Skeleton className="h-10 w-20" />
          <Skeleton className="h-10 w-20" />
        </div>
        
        {[1, 2, 3].map((i) => (
          <Card key={i} className="mb-4">
            <CardHeader className="pb-2">
              <Skeleton className="h-6 w-2/3" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-3/4" />
            </CardContent>
            <CardFooter>
              <Skeleton className="h-10 w-28" />
            </CardFooter>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h2 className="text-2xl font-bold">Conference Materials</h2>
        
        <div className="w-full sm:w-auto flex-1 sm:max-w-xs relative">
          <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            className="pl-10"
            placeholder="Search materials..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4 flex-wrap h-auto">
          <TabsTrigger value="all" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            All Materials
          </TabsTrigger>
          <TabsTrigger value="unread" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            Unread
            {materials.filter(m => !m.viewed).length > 0 && (
              <Badge className="ml-2 bg-red-500" variant="secondary">
                {materials.filter(m => !m.viewed).length}
              </Badge>
            )}
          </TabsTrigger>
          {conferences.map((conference) => (
            <TabsTrigger 
              key={conference.id} 
              value={conference.id.toString()}
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              {conference.name}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={activeTab} className="mt-0">
          {filteredMaterials.length > 0 ? (
            <div className="space-y-4">
              {filteredMaterials.map((material) => (
                <Card key={material.id} className={`border ${material.isNew ? 'border-primary' : 'border-gray-200'}`}>
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="text-lg font-semibold">{material.title}</h3>
                          {material.isNew && <Badge className="bg-green-500">New</Badge>}
                          {material.viewed && (
                            <div className="flex items-center text-green-600 text-xs">
                              <CheckCircleIcon className="h-3 w-3 mr-1" />
                              Viewed
                            </div>
                          )}
                        </div>
                        <p className="text-sm text-gray-500">{material.conferenceName}</p>
                      </div>
                      <Badge variant="outline" className="flex items-center gap-1 capitalize">
                        {getFileIcon(material.fileType)}
                        {material.fileType}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-600 text-sm">
                      {material.description}
                    </p>
                    <p className="text-xs text-gray-400 mt-2">
                      Added on {new Date(material.uploadDate).toLocaleDateString()}
                    </p>
                  </CardContent>
                  <CardFooter className="flex justify-between">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => material.viewed ? null : markAsViewed(material.id)}
                      disabled={material.viewed}
                    >
                      {material.viewed ? 'Already Viewed' : 'Mark as Viewed'}
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => downloadMaterial(material)}
                      className="flex items-center gap-2"
                    >
                      {material.fileType === 'video' ? (
                        <>
                          <ExternalLinkIcon className="h-4 w-4" />
                          Watch
                        </>
                      ) : (
                        <>
                          <DownloadIcon className="h-4 w-4" />
                          Download
                        </>
                      )}
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <BookOpenIcon className="h-12 w-12 text-gray-300 mb-4" />
              <h3 className="text-lg font-medium mb-2">No Materials Found</h3>
              <p className="text-gray-500 max-w-md">
                {searchTerm
                  ? "No materials match your search criteria. Try a different search term."
                  : "There are no materials available for this selection yet."}
              </p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ConferenceMaterials;