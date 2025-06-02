"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { 
  Plus, ArrowLeft, Edit, Trash, GripVertical, Users, FileText,
  Clock, MapPin, Search, Filter, MoreHorizontal
} from "lucide-react";
import { createAuthenticatedApi } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import PresentationDialog from "@/components/presentation/PresentationDialog";

interface Presentation {
  id: number;
  title: string;
  abstract: string;
  keywords: string[];
  duration: number;
  order: number;
  status: 'draft' | 'submitted' | 'approved' | 'rejected';
  authors: Author[];
  materials: Material[];
  createdAt: string;
}

interface Author {
  id: number;
  name: string;
  email: string;
  affiliation: string;
  isPresenter: boolean;
}

interface Material {
  id: number;
  name: string;
  type: string;
}

// Sortable Presentation Item Component
function SortablePresentationItem({
  presentation,
  onEdit,
  onDelete
}: {
  presentation: Presentation;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: presentation.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`${isDragging ? 'shadow-lg z-50' : ''}`}
    >
      <Card className="hover:shadow-sm transition-shadow">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div
              {...attributes}
              {...listeners}
              className="mt-2 text-gray-400 hover:text-gray-600 cursor-grab active:cursor-grabbing"
            >
              <GripVertical className="h-5 w-5" />
            </div>
            
            <div className="flex-1">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="text-lg font-semibold mb-1">
                    {presentation.title}
                  </h3>
                  <Badge 
                    variant={presentation.status === 'approved' ? 'default' : 'outline'}
                    className="capitalize"
                  >
                    {presentation.status}
                  </Badge>
                </div>
                
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onEdit}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onDelete}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              <p className="text-gray-600 mb-3 line-clamp-2">
                {presentation.abstract}
              </p>
              
              <div className="flex flex-wrap gap-4 text-sm text-gray-500 mb-3">
                <div className="flex items-center">
                  <Clock className="h-4 w-4 mr-1" />
                  {presentation.duration} minutes
                </div>
                <div className="flex items-center">
                  <Users className="h-4 w-4 mr-1" />
                  {presentation.authors.length} author(s)
                </div>
                <div className="flex items-center">
                  <FileText className="h-4 w-4 mr-1" />
                  {presentation.materials.length} material(s)
                </div>
              </div>
              
              {presentation.keywords.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {presentation.keywords.map((keyword, i) => (
                    <Badge key={i} variant="outline" className="text-xs">
                      {keyword}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default function PresentationsManagementPage() {
  const { id, sessionId } = useParams();
  const router = useRouter();
  
  const [presentations, setPresentations] = useState<Presentation[]>([]);
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [showPresentationDialog, setShowPresentationDialog] = useState(false);
  const [editingPresentation, setEditingPresentation] = useState<Presentation | null>(null);

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    fetchData();
  }, [id, sessionId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const api = await createAuthenticatedApi();
      
      // Get session details
      const sessionResponse = await api.get(`/sections/${sessionId}`);
      setSession(sessionResponse.data);
      
      // Get presentations
      const presentationsResponse = await api.get(`/sections/${sessionId}/presentations`);
      setPresentations(presentationsResponse.data);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to load presentations");
    } finally {
      setLoading(false);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      const oldIndex = presentations.findIndex(item => item.id === active.id);
      const newIndex = presentations.findIndex(item => item.id === over?.id);

      const newPresentations = arrayMove(presentations, oldIndex, newIndex);
      
      // Update order numbers
      const updatedItems = newPresentations.map((item, index) => ({
        ...item,
        order: index + 1
      }));

      setPresentations(updatedItems);

      try {
        const api = await createAuthenticatedApi();
        await api.post(`/sections/${sessionId}/presentations/reorder`, {
          presentations: updatedItems.map(p => ({ id: p.id, order: p.order }))
        });
        toast.success("Presentation order updated");
      } catch (error) {
        console.error("Error updating order:", error);
        toast.error("Failed to update presentation order");
        // Revert on error
        fetchData();
      }
    }
  };

  const handleDeletePresentation = async (presentationId: number) => {
    if (!confirm("Are you sure you want to delete this presentation?")) return;

    try {
      const api = await createAuthenticatedApi();
      await api.delete(`/api/presentations/${presentationId}`);
      setPresentations(prev => prev.filter(p => p.id !== presentationId));
      toast.success("Presentation deleted successfully");
    } catch (error) {
      console.error("Error deleting presentation:", error);
      toast.error("Failed to delete presentation");
    }
  };

  const filteredPresentations = presentations.filter(presentation => {
    const matchesSearch = presentation.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         presentation.abstract.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         presentation.authors.some(author => 
                           author.name.toLowerCase().includes(searchTerm.toLowerCase())
                         );
    const matchesFilter = filterStatus === "all" || presentation.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  if (loading) {
    return (
      <div className="p-8 max-w-6xl mx-auto">
        <div className="animate-pulse space-y-6">
          <div className="h-8 w-64 bg-gray-200 rounded" />
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-32 bg-gray-200 rounded" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center mb-6">
        <Button 
          variant="ghost" 
          className="p-0 h-8 hover:bg-transparent hover:text-primary" 
          onClick={() => router.push(`/organizer/events/${id}/sessions/${sessionId}`)}
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          <span className="text-sm font-medium">Back to Session</span>
        </Button>
      </div>

      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Presentations</h1>
          <p className="text-gray-500 mt-1">
            Manage presentations for "{session?.name}"
          </p>
        </div>
        <Button 
          onClick={() => setShowPresentationDialog(true)}
          className="bg-primary-700 text-white hover:bg-primary-800"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Presentation
        </Button>
      </div>

      {/* Search and Filter */}
      <div className="flex gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search presentations..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-3 py-2 border rounded-md"
        >
          <option value="all">All Status</option>
          <option value="draft">Draft</option>
          <option value="submitted">Submitted</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      {/* Presentations List */}
      {filteredPresentations.length === 0 ? (
        <Card className="border-dashed border-2 bg-gray-50">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Presentations Yet</h3>
            <p className="text-gray-500 text-center mb-6">
              Add your first presentation to start building your session content.
            </p>
            <Button 
              onClick={() => setShowPresentationDialog(true)}
              className="bg-primary-700 text-white hover:bg-primary-800"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Presentation
            </Button>
          </CardContent>
        </Card>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={filteredPresentations.map(p => p.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-4">
              {filteredPresentations.map((presentation) => (
                <SortablePresentationItem
                  key={presentation.id}
                  presentation={presentation}
                  onEdit={() => {
                    setEditingPresentation(presentation);
                    setShowPresentationDialog(true);
                  }}
                  onDelete={() => handleDeletePresentation(presentation.id)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {/* Presentation Dialog */}
      <PresentationDialog
        open={showPresentationDialog}
        onClose={() => {
          setShowPresentationDialog(false);
          setEditingPresentation(null);
        }}
        sessionId={sessionId as string}
        presentation={editingPresentation}
        onSuccess={fetchData}
      />
    </div>
  );
}