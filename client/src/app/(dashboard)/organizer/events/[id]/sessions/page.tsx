// client/src/app/(dashboard)/organizer/events/[id]/sessions/page.tsx
// Page to manage sessions (sections) for a conference:


"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { 
  Calendar, Clock, MapPin, Users, Plus, ArrowLeft, Trash, Edit, 
  ChevronRight, MoreHorizontal, AlertCircle 
} from "lucide-react";
import { createAuthenticatedApi } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { toast } from "sonner";

export default function SessionsManagementPage() {
  const { id } = useParams();
  const router = useRouter();
  const [event, setEvent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState<any[]>([]);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [currentSession, setCurrentSession] = useState<any>(null);
  const [sessionForm, setSessionForm] = useState({
    name: "",
    description: "",
    startTime: "",
    endTime: "",
    room: "",
    capacity: "",
    type: "presentation" // Default type
  });

  // Fetch event details
  useEffect(() => {
    if (!id) return;
    
    const getEventDetails = async () => {
      try {
        const api = await createAuthenticatedApi();
        const response = await api.get(`/events/${id}`);
        setEvent(response.data);
      } catch (error) {
        console.error("Error fetching event:", error);
        toast.error("Failed to load event details");
      }
    };
    
    getEventDetails();
  }, [id]);
  
  // Fetch sessions for this event
  useEffect(() => {
    if (!id) return;
    setLoading(true);
    
    const getSessions = async () => {
      try {
        const api = await createAuthenticatedApi();
        const response = await api.get(`/sections/conference/${id}`);
        setSessions(response.data);
      } catch (error) {
        console.error("Error fetching sessions:", error);
        toast.error("Failed to load sessions");
      } finally {
        setLoading(false);
      }
    };
    
    getSessions();
  }, [id]);
  
  const handleAddSession = async () => {
    try {
      const api = await createAuthenticatedApi();
      await api.post('/sections', {
        ...sessionForm,
        conferenceId: Number(id),
        capacity: sessionForm.capacity ? Number(sessionForm.capacity) : null
      });
      
      // Refresh sessions list
      const response = await api.get(`/sections/conference/${id}`);
      setSessions(response.data);
      
      setShowAddDialog(false);
      resetForm();
      toast.success("Session created successfully");
    } catch (error) {
      console.error("Error creating session:", error);
      toast.error("Failed to create session");
    }
  };
  
  const handleEditSession = async () => {
    if (!currentSession) return;
    
    try {
      const api = await createAuthenticatedApi();
      await api.put(`/sections/${currentSession.id}`, {
        ...sessionForm,
        capacity: sessionForm.capacity ? Number(sessionForm.capacity) : null
      });
      
      // Refresh sessions list
      const response = await api.get(`/sections/conference/${id}`);
      setSessions(response.data);
      
      setShowEditDialog(false);
      setCurrentSession(null);
      resetForm();
      toast.success("Session updated successfully");
    } catch (error) {
      console.error("Error updating session:", error);
      toast.error("Failed to update session");
    }
  };
  
  const handleDeleteSession = async (sessionId: number) => {
    if (!confirm("Are you sure you want to delete this session? This cannot be undone.")) {
      return;
    }
    
    try {
      const api = await createAuthenticatedApi();
      await api.delete(`/sections/${sessionId}`);
      
      // Refresh sessions list
      const response = await api.get(`/sections/conference/${id}`);
      setSessions(response.data);
      
      toast.success("Session deleted successfully");
    } catch (error) {
      console.error("Error deleting session:", error);
      toast.error("Failed to delete session");
    }
  };
  
  const resetForm = () => {
    setSessionForm({
      name: "",
      description: "",
      startTime: "",
      endTime: "",
      room: "",
      capacity: "",
      type: "presentation"
    });
  };
  
  const openEditDialog = (session: any) => {
    setCurrentSession(session);
    setSessionForm({
      name: session.name,
      description: session.description || "",
      startTime: session.startTime ? new Date(session.startTime).toISOString().slice(0, 16) : "",
      endTime: session.endTime ? new Date(session.endTime).toISOString().slice(0, 16) : "",
      room: session.room || "",
      capacity: session.capacity ? String(session.capacity) : "",
      type: session.type || "presentation"
    });
    setShowEditDialog(true);
  };
  
  const formatDateTime = (dateTimeStr: string) => {
    if (!dateTimeStr) return "TBD";
    const date = new Date(dateTimeStr);
    return format(date, "MMM d, yyyy h:mm a");
  };
  
  // Helper function to validate session form
  const isFormValid = () => {
    // Basic validation - name and start and end time are required
    if (!sessionForm.name || !sessionForm.startTime || !sessionForm.endTime) return false;
    
    // Ensure end time is after start time
    if (sessionForm.endTime && 
        new Date(sessionForm.endTime) <= new Date(sessionForm.startTime)) {
      return false;
    }
    
    return true;
  };
  
  if (loading) {
    return (
      <div className="p-8 max-w-6xl mx-auto space-y-6">
        <div className="flex items-center mb-6">
          <Skeleton className="h-8 w-40 mr-2" />
          <Skeleton className="h-8 w-5" />
          <Skeleton className="h-8 w-40 ml-2" />
        </div>
        <Skeleton className="h-12 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
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
          className="p-0 h-8 hover:bg-transparent hover:text-primary cursor-pointer" 
          onClick={() => router.push("/organizer/events")}
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          <span className="text-sm font-medium">Events</span>
        </Button>
        <span className="text-gray-400 mx-2">/</span>
        <Button 
          variant="ghost" 
          className="p-0 h-8 hover:bg-transparent hover:text-primary cursor-pointer" 
          onClick={() => router.push(`/organizer/events/${id}`)}
        >
          <span className="text-sm font-medium truncate max-w-[200px]">
            {event?.name || "Event"}
          </span>
        </Button>
        <span className="text-gray-400 mx-2">/</span>
        <span className="text-sm font-medium">Sessions</span>
      </div>
      
      {/* Header with Create Button */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Sessions</h1>
          <p className="text-gray-500 mt-1">Manage sessions for {event?.name || "this event"}</p>
        </div>
        <Button 
          onClick={() => {
            resetForm();
            setShowAddDialog(true);
          }}
          className="bg-primary-700 text-white hover:bg-primary-800 cursor-pointer"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Session
        </Button>
      </div>
      
      {/* Sessions List */}
      {sessions.length === 0 ? (
        <Card className="border-dashed border-2 bg-gray-50">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="rounded-full bg-primary-50 p-3 mb-4">
              <Calendar className="h-6 w-6 text-primary-700" />
            </div>
            <h3 className="font-semibold text-lg mb-2">No Sessions Yet</h3>
            <p className="text-gray-500 text-center max-w-md mb-6">
              Create your first session to start organizing your event schedule.
            </p>
            <Button 
              onClick={() => {
                resetForm();
                setShowAddDialog(true);
              }}
              className="bg-primary-700 text-white hover:bg-primary-800 cursor-pointer"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Your First Session
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {sessions.map((session) => (
            <motion.div
              key={session.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
            >
              <Card className="h-full hover:shadow-md transition-shadow">
                <CardHeader className="pb-2 flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg font-bold">{session.name}</CardTitle>
                    {session.type && (
                      <Badge 
                        variant="outline" 
                        className="mt-1 capitalize bg-primary-50 text-primary-700 border-primary-200"
                      >
                        {session.type}
                      </Badge>
                    )}
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className=" cursor-pointer">
                        <MoreHorizontal className="h-5 w-5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem 
                       className=" cursor-pointer"
                       onClick={() => openEditDialog(session)}
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        className="text-red-600 cursor-pointer"
                        onClick={() => handleDeleteSession(session.id)}
                      >
                        <Trash className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </CardHeader>
                <CardContent className="pb-2">
                  {session.description && (
                    <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                      {session.description}
                    </p>
                  )}
                  <div className="space-y-2 text-sm">
                    {session.startTime && (
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 mr-2 text-gray-500" />
                        <span>{formatDateTime(session.startTime)}</span>
                      </div>
                    )}
                    {session.endTime && session.startTime !== session.endTime && (
                      <div className="flex items-center">
                        <Clock className="h-4 w-4 mr-2 text-gray-500" />
                        <span>Until {formatDateTime(session.endTime)}</span>
                      </div>
                    )}
                    {session.room && (
                      <div className="flex items-center">
                        <MapPin className="h-4 w-4 mr-2 text-gray-500" />
                        <span>{session.room}</span>
                      </div>
                    )}
                    {session.capacity && (
                      <div className="flex items-center">
                        <Users className="h-4 w-4 mr-2 text-gray-500" />
                        <span>Capacity: {session.capacity}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
                <CardFooter className="pt-2 border-t">
                  <div className="flex justify-between w-full text-sm">
                    <div className="flex items-center">
                      <span>{session._count?.presentations || 0} presentations</span>
                    </div>
                    <Button 
                      variant="link" 
                      className="p-0 h-auto text-primary-700 cursor-pointer"
                      onClick={() => router.push(`/organizer/events/${id}/sessions/${session.id}`)}
                    >
                      <span>Details</span>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </CardFooter>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
      
      {/* Add Session Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="sm:max-w-[525px] bg-white">
          <DialogHeader>
            <DialogTitle>Add New Session</DialogTitle>
            <DialogDescription>
              Create a new session for your event. Fill in the details below.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">
                Session Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                value={sessionForm.name}
                onChange={(e) => setSessionForm({...sessionForm, name: e.target.value})}
                placeholder="e.g. Opening Keynote"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={sessionForm.description}
                onChange={(e) => setSessionForm({...sessionForm, description: e.target.value})}
                placeholder="Brief description of this session"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="startTime">
                    Start Time <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="startTime"
                  type="datetime-local"
                  value={sessionForm.startTime}
                  onChange={(e) => setSessionForm({...sessionForm, startTime: e.target.value})}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="endTime">
                    End Time <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="endTime"
                  type="datetime-local"
                  value={sessionForm.endTime}
                  onChange={(e) => setSessionForm({...sessionForm, endTime: e.target.value})}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="room">Room</Label>
                <Input
                  id="room"
                  value={sessionForm.room}
                  onChange={(e) => setSessionForm({...sessionForm, room: e.target.value})}
                  placeholder="e.g. Main Hall"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="capacity">Capacity</Label>
                <Input
                  id="capacity"
                  type="number"
                  value={sessionForm.capacity}
                  onChange={(e) => setSessionForm({...sessionForm, capacity: e.target.value})}
                  placeholder="e.g. 100"
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="type">Session Type</Label>
              <select
                id="type"
                value={sessionForm.type}
                onChange={(e) => setSessionForm({...sessionForm, type: e.target.value})}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="presentation">Presentation</option>
                <option value="workshop">Workshop</option>
                <option value="panel">Panel Discussion</option>
                <option value="keynote">Keynote</option>
                <option value="networking">Networking</option>
                <option value="break">Break</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setShowAddDialog(false);
                resetForm();
              }}
              className="cursor-pointer"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleAddSession}
              disabled={!isFormValid()}
              className="bg-primary-700 text-white hover:bg-primary-800 cursor-pointer"
            >
              Create Session
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Edit Session Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-[525px] bg-white">
          <DialogHeader>
            <DialogTitle>Edit Session</DialogTitle>
            <DialogDescription>
              Update the details for this session.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-name">
                Session Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="edit-name"
                value={sessionForm.name}
                onChange={(e) => setSessionForm({...sessionForm, name: e.target.value})}
                placeholder="e.g. Opening Keynote"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={sessionForm.description}
                onChange={(e) => setSessionForm({...sessionForm, description: e.target.value})}
                placeholder="Brief description of this session"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-startTime">
                    Start Time <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="edit-startTime"
                  type="datetime-local"
                  value={sessionForm.startTime}
                  onChange={(e) => setSessionForm({...sessionForm, startTime: e.target.value})}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-endTime">
                    End Time <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="edit-endTime"
                  type="datetime-local"
                  value={sessionForm.endTime}
                  onChange={(e) => setSessionForm({...sessionForm, endTime: e.target.value})}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-room">Room</Label>
                <Input
                  id="edit-room"
                  value={sessionForm.room}
                  onChange={(e) => setSessionForm({...sessionForm, room: e.target.value})}
                  placeholder="e.g. Main Hall"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-capacity">Capacity</Label>
                <Input
                  id="edit-capacity"
                  type="number"
                  value={sessionForm.capacity}
                  onChange={(e) => setSessionForm({...sessionForm, capacity: e.target.value})}
                  placeholder="e.g. 100"
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-type">Session Type</Label>
              <select
                id="edit-type"
                value={sessionForm.type}
                onChange={(e) => setSessionForm({...sessionForm, type: e.target.value})}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="presentation">Presentation</option>
                <option value="workshop">Workshop</option>
                <option value="panel">Panel Discussion</option>
                <option value="keynote">Keynote</option>
                <option value="networking">Networking</option>
                <option value="break">Break</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setShowEditDialog(false);
                setCurrentSession(null);
                resetForm();
              }}
              className="cursor-pointer"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleEditSession}
              disabled={!isFormValid()}
              className="bg-primary-700 text-white hover:bg-primary-800 cursor-pointer"
            >
              Update Session
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}