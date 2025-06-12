// client/src/app/(dashboard)/organizer/events/[id]/sessions/page.tsx
// Page to manage sessions (sections) for a conference:
"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  Plus,
  Calendar,
  Clock,
  MapPin,
  Users,
  ArrowRight,
  CheckCircle,
  Edit,
  Trash2,
  Settings,
  Mic,
  Coffee,
  UtensilsCrossed,
  PlayCircle,
  StopCircle
} from "lucide-react";
import { toast } from "sonner";
import { createAuthenticatedApi } from "@/lib/utils";

interface Conference {
  id: number;
  name: string;
  startDate: string;
  endDate: string;
  location: string;
  timezone: string;
}

interface Session {
  id: number;
  name: string;
  room: string;
  capacity: number;
  startTime: string;
  endTime: string;
  conferenceId: number;
  sessionType: 'room' | 'keynote' | 'break' | 'lunch' | 'opening' | 'closing';
  description?: string;
  speakerName?: string;
  isAdjustable: boolean;
  categoryId?: number;
}

const SESSION_TYPES = [
  { value: 'room', label: 'Presentation Room', icon: <Users className="h-4 w-4" />, color: 'bg-blue-50 border-blue-200 text-blue-700' },
  { value: 'keynote', label: 'Keynote Session', icon: <Mic className="h-4 w-4" />, color: 'bg-purple-50 border-purple-200 text-purple-700' },
  { value: 'break', label: 'Coffee Break', icon: <Coffee className="h-4 w-4" />, color: 'bg-orange-50 border-orange-200 text-orange-700' },
  { value: 'lunch', label: 'Lunch Break', icon: <UtensilsCrossed className="h-4 w-4" />, color: 'bg-yellow-50 border-yellow-200 text-yellow-700' },
  { value: 'opening', label: 'Opening Ceremony', icon: <PlayCircle className="h-4 w-4" />, color: 'bg-green-50 border-green-200 text-green-700' },
  { value: 'closing', label: 'Closing Ceremony', icon: <StopCircle className="h-4 w-4" />, color: 'bg-red-50 border-red-200 text-red-700' },
];

export default function SessionsManagementPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const conferenceId = params.id as string;
  const isSetupFlow = searchParams?.get('setup') === 'true';

  const [conference, setConference] = useState<Conference | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<Session | null>(null);
  const [isSavingDraft, setIsSavingDraft] = useState(false);

  // Form state for creating/editing sessions
  const [sessionForm, setSessionForm] = useState({
    name: '',
    room: '',
    capacity: 50,
    startTime: '09:00',
    endTime: '17:00',
    sessionType: 'room' as Session['sessionType'],
    description: '',
    speakerName: '',
    isAdjustable: true,
  });

  useEffect(() => {
    fetchConferenceAndSessions();
  }, [conferenceId]);

  const fetchConferenceAndSessions = async () => {
    try {
      setLoading(true);
      const api = await createAuthenticatedApi();

      // Fetch conference details
      const conferenceRes = await api.get(`/api/conferences/${conferenceId}`);
      setConference(conferenceRes.data);

      // Fetch existing sessions
      try {
        const sessionsRes = await api.get(`/sections/conference/${conferenceId}`);
        setSessions(sessionsRes.data || []);
      } catch (error) {
        // No sessions yet - this is fine for new conferences
        setSessions([]);
      }

    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load conference data');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSession = async () => {
    try {
      const api = await createAuthenticatedApi();
      
      const sessionData = {
        ...sessionForm,
        conferenceId: Number(conferenceId),
        // Convert times to full ISO strings based on conference dates
        startTime: conference ? `${conference.startDate.split('T')[0]}T${sessionForm.startTime}:00` : sessionForm.startTime,
        endTime: conference ? `${conference.startDate.split('T')[0]}T${sessionForm.endTime}:00` : sessionForm.endTime,
      };

      const response = await api.post('/sections', sessionData);
      
      if (response.data) {
        setSessions(prev => [...prev, response.data]);
        setIsCreateDialogOpen(false);
        resetForm();
        toast.success('Session created successfully!');
      }
    } catch (error: any) {
      console.error('Error creating session:', error);
      toast.error(error.response?.data?.message || 'Failed to create session');
    }
  };

  const handleUpdateSession = async () => {
    if (!editingSession) return;

    try {
      const api = await createAuthenticatedApi();
      
      const sessionData = {
        ...sessionForm,
        startTime: conference ? `${conference.startDate.split('T')[0]}T${sessionForm.startTime}:00` : sessionForm.startTime,
        endTime: conference ? `${conference.startDate.split('T')[0]}T${sessionForm.endTime}:00` : sessionForm.endTime,
      };

      const response = await api.put(`/sections/${editingSession.id}`, sessionData);
      
      if (response.data) {
        setSessions(prev => prev.map(s => s.id === editingSession.id ? response.data : s));
        setEditingSession(null);
        resetForm();
        toast.success('Session updated successfully!');
      }
    } catch (error: any) {
      console.error('Error updating session:', error);
      toast.error(error.response?.data?.message || 'Failed to update session');
    }
  };

  const handleDeleteSession = async (sessionId: number) => {
    if (!confirm('Are you sure you want to delete this session?')) return;

    try {
      const api = await createAuthenticatedApi();
      await api.delete(`/sections/${sessionId}`);
      
      setSessions(prev => prev.filter(s => s.id !== sessionId));
      toast.success('Session deleted successfully!');
    } catch (error: any) {
      console.error('Error deleting session:', error);
      toast.error(error.response?.data?.message || 'Failed to delete session');
    }
  };

  const resetForm = () => {
    setSessionForm({
      name: '',
      room: '',
      capacity: 50,
      startTime: '09:00',
      endTime: '17:00',
      sessionType: 'room',
      description: '',
      speakerName: '',
      isAdjustable: true,
    });
  };

  const openEditDialog = (session: Session) => {
    setEditingSession(session);
    setSessionForm({
      name: session.name,
      room: session.room,
      capacity: session.capacity,
      startTime: new Date(session.startTime).toTimeString().slice(0, 5),
      endTime: new Date(session.endTime).toTimeString().slice(0, 5),
      sessionType: session.sessionType,
      description: session.description || '',
      speakerName: session.speakerName || '',
      isAdjustable: session.isAdjustable,
    });
  };

  // Update the proceedToNextStep function to save workflow progress
  const proceedToNextStep = async () => {
    if (sessions.length === 0) {
      toast.error('Please create at least one session before proceeding');
      return;
    }
    
    try {
      setIsSavingDraft(true);
      
      // Save workflow progress
      await saveWorkflowProgress(conferenceId, 3, 'sessions_completed');
      
      toast.success('Sessions configured! Moving to categories setup...');
      router.push(`/organizer/events/${conferenceId}/categories?setup=true&step=3`);
    } catch (error) {
      console.error('Error saving workflow progress:', error);
      toast.error('Failed to save progress');
    } finally {
      setIsSavingDraft(false);
    }
  };

  // Add save draft functionality for sessions step
  const handleSaveDraftAndExit = async () => {
    try {
      setIsSavingDraft(true);
      
      // Save current progress as draft
      await saveWorkflowProgress(conferenceId, 2, 'sessions_in_progress');
      
      toast.success('Progress saved as draft!');
      router.push('/organizer/events');
    } catch (error) {
      console.error('Error saving draft:', error);
      toast.error('Failed to save draft');
    } finally {
      setIsSavingDraft(false);
    }
  };

  // Helper function to save workflow progress
  const saveWorkflowProgress = async (eventId: string, step: number, status: string) => {
    const api = await createAuthenticatedApi();
    
    return await api.put(`/events/${eventId}/workflow`, {
      workflowStep: step,
      workflowStatus: status,
      lastUpdated: new Date().toISOString()
    });
  };

  const getSessionTypeInfo = (type: Session['sessionType']) => {
    return SESSION_TYPES.find(t => t.value === type) || SESSION_TYPES[0];
  };

  if (loading) {
    return (
      <div className="p-6 max-w-6xl mx-auto">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="h-48 bg-gray-200 rounded"></div>
            <div className="h-48 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto min-h-screen bg-gray-50">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            onClick={() => router.push(`/organizer/events/${conferenceId}`)}
            className="p-0 hover:bg-transparent"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Event
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Sessions & Schedule Setup</h1>
            <p className="text-gray-600 mt-1">
              Create rooms, keynotes, breaks, and other sessions for your conference
            </p>
            {isSetupFlow && (
              <Badge variant="outline" className="mt-2 border-blue-300 text-blue-700">
                Step 2 of 5: Sessions & Schedule
              </Badge>
            )}
          </div>
        </div>

        <div className="flex gap-2">
          {isSetupFlow && (
            <Button
              variant="outline"
              onClick={handleSaveDraftAndExit}
              disabled={isSavingDraft}
            >
              {isSavingDraft ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600 mr-2"></div>
                  Saving...
                </div>
              ) : (
                'Save Draft & Exit'
              )}
            </Button>
          )}
          
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Session
              </Button>
            </DialogTrigger>
            <SessionDialog
              title="Create New Session"
              sessionForm={sessionForm}
              setSessionForm={setSessionForm}
              onSubmit={handleCreateSession}
              onCancel={() => {
                setIsCreateDialogOpen(false);
                resetForm();
              }}
            />
          </Dialog>
        </div>
      </div>

      {/* Workflow Progress */}
      {isSetupFlow && (
        <Card className="mb-6 border-blue-200 bg-blue-50">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm">Event Created</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-medium">2</div>
                  <span className="text-sm font-medium">Setting up Sessions</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 rounded-full bg-gray-300 text-gray-600 flex items-center justify-center text-xs">3</div>
                  <span className="text-sm text-gray-500">Categories & Types</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 rounded-full bg-gray-300 text-gray-600 flex items-center justify-center text-xs">4</div>
                  <span className="text-sm text-gray-500">Publish</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 rounded-full bg-gray-300 text-gray-600 flex items-center justify-center text-xs">5</div>
                  <span className="text-sm text-gray-500">Schedule Builder</span>
                </div>
              </div>
              
              <div className="flex gap-2">
                {sessions.length > 0 && (
                  <Button 
                    onClick={proceedToNextStep} 
                    className="bg-green-600 hover:bg-green-700"
                    disabled={isSavingDraft}
                  >
                    {isSavingDraft ? (
                      <div className="flex items-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Saving...
                      </div>
                    ) : (
                      <>
                        Continue to Categories
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Conference Info */}
      {conference && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Calendar className="h-5 w-5 mr-2" />
              {conference.name}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-gray-500" />
                <span>{new Date(conference.startDate).toLocaleDateString()} - {new Date(conference.endDate).toLocaleDateString()}</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-gray-500" />
                <span>{conference.location}</span>
              </div>
              <div className="flex items-center gap-2">
                <Settings className="h-4 w-4 text-gray-500" />
                <span>{conference.timezone}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sessions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sessions.length === 0 ? (
          <div className="col-span-full">
            <Card className="p-12 text-center">
              <Calendar className="h-16 w-16 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Sessions Yet</h3>
              <p className="text-gray-600 mb-6">
                Start by creating presentation rooms, keynote sessions, and breaks for your conference.
              </p>
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create First Session
              </Button>
            </Card>
          </div>
        ) : (
          sessions.map((session) => {
            const typeInfo = getSessionTypeInfo(session.sessionType);
            return (
              <Card key={session.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <Badge className={typeInfo.color}>
                        {typeInfo.icon}
                        <span className="ml-1">{typeInfo.label}</span>
                      </Badge>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditDialog(session)}
                        className="h-8 w-8 p-0"
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteSession(session.id)}
                        className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  <CardTitle className="text-lg">{session.name}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <MapPin className="h-4 w-4" />
                    <span>{session.room}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Users className="h-4 w-4" />
                    <span>{session.capacity} capacity</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Clock className="h-4 w-4" />
                    <span>
                      {new Date(session.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - 
                      {new Date(session.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  {session.speakerName && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Mic className="h-4 w-4" />
                      <span>{session.speakerName}</span>
                    </div>
                  )}
                  {session.description && (
                    <p className="text-sm text-gray-600 mt-2">{session.description}</p>
                  )}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Edit Dialog */}
      {editingSession && (
        <Dialog open={!!editingSession} onOpenChange={() => setEditingSession(null)}>
          <SessionDialog
            title="Edit Session"
            sessionForm={sessionForm}
            setSessionForm={setSessionForm}
            onSubmit={handleUpdateSession}
            onCancel={() => {
              setEditingSession(null);
              resetForm();
            }}
          />
        </Dialog>
      )}

      {/* Bottom Actions */}
      {sessions.length > 0 && !isSetupFlow && (
        <div className="mt-12 flex justify-center">
          <Button
            onClick={() => router.push(`/organizer/events/${conferenceId}/schedule-builder`)}
            className="bg-blue-600 hover:bg-blue-700"
          >
            Open Schedule Builder
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      )}
    </div>
  );
}

// Session Dialog Component
function SessionDialog({
  title,
  sessionForm,
  setSessionForm,
  onSubmit,
  onCancel,
}: {
  title: string;
  sessionForm: any;
  setSessionForm: (form: any) => void;
  onSubmit: () => void;
  onCancel: () => void;
}) {
  const selectedType = SESSION_TYPES.find(t => t.value === sessionForm.sessionType) || SESSION_TYPES[0];

  return (
    <DialogContent className="max-w-md">
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
      </DialogHeader>
      
      <div className="space-y-4">
        <div>
          <Label htmlFor="sessionType">Session Type</Label>
          <select
            id="sessionType"
            value={sessionForm.sessionType}
            onChange={(e) => setSessionForm({ ...sessionForm, sessionType: e.target.value })}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            {SESSION_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <Label htmlFor="name">Session Name</Label>
          <Input
            id="name"
            value={sessionForm.name}
            onChange={(e) => setSessionForm({ ...sessionForm, name: e.target.value })}
            placeholder={`e.g., ${selectedType.label}`}
            className="mt-1"
          />
        </div>

        <div>
          <Label htmlFor="room">Room/Location</Label>
          <Input
            id="room"
            value={sessionForm.room}
            onChange={(e) => setSessionForm({ ...sessionForm, room: e.target.value })}
            placeholder="e.g., Main Auditorium, Room A"
            className="mt-1"
          />
        </div>

        <div>
          <Label htmlFor="capacity">Capacity</Label>
          <Input
            id="capacity"
            type="number"
            min="1"
            value={sessionForm.capacity}
            onChange={(e) => setSessionForm({ ...sessionForm, capacity: parseInt(e.target.value) || 50 })}
            className="mt-1"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="startTime">Start Time</Label>
            <Input
              id="startTime"
              type="time"
              value={sessionForm.startTime}
              onChange={(e) => setSessionForm({ ...sessionForm, startTime: e.target.value })}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="endTime">End Time</Label>
            <Input
              id="endTime"
              type="time"
              value={sessionForm.endTime}
              onChange={(e) => setSessionForm({ ...sessionForm, endTime: e.target.value })}
              className="mt-1"
            />
          </div>
        </div>

        {(sessionForm.sessionType === 'keynote' || sessionForm.sessionType === 'opening' || sessionForm.sessionType === 'closing') && (
          <div>
            <Label htmlFor="speakerName">Speaker Name</Label>
            <Input
              id="speakerName"
              value={sessionForm.speakerName}
              onChange={(e) => setSessionForm({ ...sessionForm, speakerName: e.target.value })}
              placeholder="e.g., Dr. Jane Smith"
              className="mt-1"
            />
          </div>
        )}

        <div>
          <Label htmlFor="description">Description (Optional)</Label>
          <Textarea
            id="description"
            value={sessionForm.description}
            onChange={(e) => setSessionForm({ ...sessionForm, description: e.target.value })}
            placeholder="Additional details about this session..."
            className="mt-1"
            rows={3}
          />
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="isAdjustable"
            checked={sessionForm.isAdjustable}
            onChange={(e) => setSessionForm({ ...sessionForm, isAdjustable: e.target.checked })}
            className="rounded"
          />
          <Label htmlFor="isAdjustable" className="text-sm">
            Allow timing adjustments in schedule builder
          </Label>
        </div>
      </div>

      <div className="flex gap-2 pt-4">
        <Button variant="outline" onClick={onCancel} className="flex-1">
          Cancel
        </Button>
        <Button 
          onClick={onSubmit} 
          className="flex-1"
          disabled={!sessionForm.name || !sessionForm.room}
        >
          {title.includes('Edit') ? 'Update' : 'Create'} Session
        </Button>
      </div>
    </DialogContent>
  );
}
