"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Plus, Calendar, Clock, MapPin, Users, CheckCircle, ArrowRight, Edit, Trash2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { createAuthenticatedApi } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import CreateEventWorkflow from "@/components/workflow/CreateEventWorkflow";

interface Event {
  id: number;
  name: string;
  startDate: string;
  endDate: string;
  timezone: string;
  location: string;
}

interface Session {
  id: number;
  name: string;
  description: string;
  startTime: string;
  endTime: string;
  room: string;
  capacity: number;
  sessionType: string;
  conferenceId: number;
}

interface SessionForm {
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  room: string;
  capacity: number;
  type: 'morning' | 'afternoon' | 'workshop' | 'keynote' | 'panel' | 'break' | 'lunch';
}

export default function SetupSessionsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const eventId = searchParams?.get('eventId');
  
  const [event, setEvent] = useState<Event | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingSession, setEditingSession] = useState<Session | null>(null);
  const [deletingSession, setDeletingSession] = useState<Session | null>(null);
  
  const [sessionForm, setSessionForm] = useState<SessionForm>({
    name: '',
    description: '',
    startDate: '',
    endDate: '',
    startTime: '09:00',
    endTime: '17:00',
    room: '',
    capacity: 50,
    type: 'morning'
  });

  useEffect(() => {
    if (!eventId) {
      toast.error('No event ID found');
      router.push('/organizer/create-event');
      return;
    }
    
    fetchEventData();
  }, [eventId]);

  const fetchEventData = async () => {
    if (!eventId) return;
    
    try {
      setLoading(true);
      const api = await createAuthenticatedApi();
      
      const eventResponse = await api.get(`/events/${eventId}`);
      const eventData = eventResponse.data;
      
      setEvent(eventData);
      
      // Pre-fill form with event dates
      setSessionForm(prev => ({
        ...prev,
        startDate: eventData.startDate ? eventData.startDate.split('T')[0] : '',
        endDate: eventData.endDate ? eventData.endDate.split('T')[0] : ''
      }));
      
      try {
        const sessionsResponse = await api.get(`/sections/conference/${eventId}`);
        setSessions(sessionsResponse.data || []);
      } catch (error) {
        setSessions([]);
      }
      
    } catch (error) {
      console.error('Error fetching event data:', error);
      toast.error('Failed to load event information');
    } finally {
      setLoading(false);
    }
  };

  // Get conference date constraints
  const getDateConstraints = () => {
    if (!event) return { min: '', max: '' };
    
    return {
      min: event.startDate.split('T')[0],
      max: event.endDate.split('T')[0]
    };
  };

  const validateSessionDates = (startDate: string, endDate: string, startTime: string, endTime: string) => {
    if (!event) return { valid: false, error: 'Event data not loaded' };

    const sessionStart = new Date(`${startDate}T${startTime}`);
    const sessionEnd = new Date(`${endDate}T${endTime}`);
    const conferenceStart = new Date(event.startDate);
    const conferenceEnd = new Date(event.endDate);

    if (sessionStart < conferenceStart) {
      return { valid: false, error: 'Session cannot start before conference begins' };
    }

    if (sessionEnd > conferenceEnd) {
      return { valid: false, error: 'Session cannot end after conference ends' };
    }

    if (sessionStart >= sessionEnd) {
      return { valid: false, error: 'Session end time must be after start time' };
    }

    return { valid: true, error: '' };
  };

  const resetForm = () => {
    setSessionForm({
      name: '',
      description: '',
      startDate: event?.startDate ? event.startDate.split('T')[0] : '',
      endDate: event?.endDate ? event.endDate.split('T')[0] : '',
      startTime: '09:00',
      endTime: '17:00',
      room: '',
      capacity: 50,
      type: 'morning'
    });
    setEditingSession(null);
  };

  const openCreateForm = () => {
    resetForm();
    setShowForm(true);
  };

  const openEditForm = (session: Session) => {
    const startDate = new Date(session.startTime);
    const endDate = new Date(session.endTime);
    
    setSessionForm({
      name: session.name,
      description: session.description || '',
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
      startTime: startDate.toTimeString().slice(0, 5),
      endTime: endDate.toTimeString().slice(0, 5),
      room: session.room || '',
      capacity: session.capacity,
      type: session.sessionType as any
    });
    
    setEditingSession(session);
    setShowForm(true);
  };

  const handleCreateOrUpdateSession = async () => {
    if (!sessionForm.name.trim()) {
      toast.error('Session name is required');
      return;
    }

    if (!eventId) {
      toast.error('Event ID missing');
      return;
    }

    // Validate dates
    const validation = validateSessionDates(
      sessionForm.startDate,
      sessionForm.endDate,
      sessionForm.startTime,
      sessionForm.endTime
    );

    if (!validation.valid) {
      toast.error(validation.error);
      return;
    }

    try {
      setIsCreating(true);
      const api = await createAuthenticatedApi();
      
      const startDateTime = new Date(`${sessionForm.startDate}T${sessionForm.startTime}`);
      const endDateTime = new Date(`${sessionForm.endDate}T${sessionForm.endTime}`);
      
      const sessionData = {
        name: sessionForm.name,
        description: sessionForm.description,
        startTime: startDateTime.toISOString(),
        endTime: endDateTime.toISOString(),
        room: sessionForm.room,
        capacity: sessionForm.capacity,
        sessionType: sessionForm.type,
        conferenceId: Number(eventId)
      };

      if (editingSession) {
        // Update existing session
        const response = await api.put(`/sections/${editingSession.id}`, sessionData);
        
        if (response.data) {
          toast.success('Session updated successfully!');
          setSessions(prev => prev.map(s => s.id === editingSession.id ? response.data : s));
        }
      } else {
        // Create new session
        const response = await api.post('/sections', sessionData);
        
        if (response.data) {
          toast.success('Session created successfully!');
          setSessions(prev => [...prev, response.data]);
          
          // Update workflow when first session is created
          if (sessions.length === 0) {
            try {
              await api.put(`/events/${eventId}/workflow`, {
                workflowStep: 2,
                workflowStatus: 'in_progress'
              });
            } catch (error) {
              console.error('Error updating workflow:', error);
            }
          }
        }
      }
      
      resetForm();
      setShowForm(false);
    } catch (error) {
      console.error('Error saving session:', error);
      toast.error(`Failed to ${editingSession ? 'update' : 'create'} session`);
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteSession = async (session: Session) => {
    try {
      const api = await createAuthenticatedApi();
      await api.delete(`/sections/${session.id}`);
      
      setSessions(prev => prev.filter(s => s.id !== session.id));
      toast.success('Session deleted successfully!');
      setDeletingSession(null);
    } catch (error) {
      console.error('Error deleting session:', error);
      toast.error('Failed to delete session');
    }
  };

  const handleContinueToNextStep = async () => {
    if (!eventId) return;
    
    try {
      setSaving(true);
      const api = await createAuthenticatedApi();
      
      // Update workflow when moving to next step
      await api.put(`/events/${eventId}/workflow`, {
        workflowStep: 3,
        workflowStatus: 'in_progress'
      });

      toast.success('Moving to categories setup...');
      router.push(`/organizer/create-event/categories?eventId=${eventId}`);
    } catch (error) {
      console.error('Error updating workflow:', error);
      router.push(`/organizer/create-event/categories?eventId=${eventId}`);
    } finally {
      setSaving(false);
    }
  };

  const handleGoBack = () => {
    router.push(`/organizer/create-event?eventId=${eventId}`);
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString(),
      time: date.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit', 
        hour12: true 
      })
    };
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto py-8 px-4">
        <div className="animate-pulse space-y-6">
          <div className="h-32 bg-gray-200 rounded"></div>
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!event && !loading) {
    return (
      <div className="max-w-4xl mx-auto py-8 px-4 text-center">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-red-800 mb-2">Event Not Found</h2>
          <p className="text-red-600 mb-4">
            Could not load event information. Please try again.
          </p>
          <div className="flex gap-3 justify-center">
            <Button onClick={() => router.push('/organizer/create-event')} variant="outline">
              Start Over
            </Button>
            <Button onClick={fetchEventData}>
              Retry
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const dateConstraints = getDateConstraints();

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      {/* Workflow Component */}
      <CreateEventWorkflow 
        currentStep={2} 
        eventId={eventId || undefined}
        showCancelButton={true}
      />

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <Button 
            variant="ghost" 
            onClick={handleGoBack}
            className="p-0 h-8 hover:bg-transparent"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Event Details
          </Button>
        </div>
        
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Setup Sessions</h1>
            <p className="text-gray-600 mt-2">
              Create sessions to organize your conference content and presentations.
            </p>
          </div>
          <Badge variant="outline" className="text-sm">
            Step 2 of 5
          </Badge>
        </div>
      </div>

      {/* Event Info */}
      {event && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">{event.name}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-6 text-sm text-gray-600">
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                {new Date(event.startDate).toLocaleDateString()} - {new Date(event.endDate).toLocaleDateString()}
              </div>
              {event.location && (
                <div className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  {event.location}
                </div>
              )}
            </div>
            <div className="mt-2 text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded px-2 py-1 inline-block">
              📅 Sessions can only be scheduled within these conference dates
            </div>
          </CardContent>
        </Card>
      )}

      {/* Existing Sessions */}
      {sessions.length > 0 && (
        <Card className="mb-6 border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-800">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Created Sessions ({sessions.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {sessions.map((session) => {
                const startDateTime = formatDateTime(session.startTime);
                const endDateTime = formatDateTime(session.endTime);
                
                return (
                  <div key={session.id} className="p-4 border rounded-lg bg-white border-green-200">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">{session.name}</div>
                        <div className="text-sm text-gray-600 mt-1">
                          <div className="flex items-center gap-4 flex-wrap">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {startDateTime.date} {startDateTime.time} - {endDateTime.time}
                            </span>
                            {session.room && (
                              <span className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {session.room}
                              </span>
                            )}
                            <span className="flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              {session.capacity} people
                            </span>
                            <Badge variant="outline" className="text-xs">
                              {session.sessionType}
                            </Badge>
                          </div>
                        </div>
                        {session.description && (
                          <div className="text-sm text-gray-500 mt-2">{session.description}</div>
                        )}
                      </div>
                      
                      <div className="flex gap-2 ml-4">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditForm(session)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeletingSession(session)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Create Session Form */}
      {!showForm ? (
        <Card className="border-dashed border-2 hover:border-blue-300 transition-colors">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="rounded-full bg-blue-50 p-3 mb-4">
              <Plus className="h-6 w-6 text-blue-600" />
            </div>
            <h3 className="font-semibold text-lg mb-2">
              {sessions.length === 0 ? 'Create Your First Session' : 'Add Another Session'}
            </h3>
            <p className="text-gray-500 text-center max-w-md mb-6">
              Sessions help organize your conference into manageable blocks of presentations, workshops, or other activities.
            </p>
            <Button onClick={openCreateForm} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="h-4 w-4 mr-2" />
              Create Session
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Dialog open={showForm} onOpenChange={setShowForm}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-white">
            <DialogHeader>
              <DialogTitle>
                {editingSession ? 'Edit Session' : 'Create New Session'}
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4 p-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Session Name *</Label>
                  <Input
                    id="name"
                    value={sessionForm.name}
                    onChange={(e) => setSessionForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g., Morning Presentations"
                  />
                </div>
                
                <div>
                  <Label htmlFor="type">Session Type</Label>
                  <Select value={sessionForm.type} onValueChange={(value) => setSessionForm(prev => ({ ...prev, type: value as any }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white border border-gray-200 shadow-lg">
                      <SelectItem value="morning">Morning Session</SelectItem>
                      <SelectItem value="afternoon">Afternoon Session</SelectItem>
                      <SelectItem value="workshop">Workshop</SelectItem>
                      <SelectItem value="keynote">Keynote Session</SelectItem>
                      <SelectItem value="panel">Panel Discussion</SelectItem>
                      <SelectItem value="break">Break</SelectItem>
                      <SelectItem value="lunch">Lunch Break</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={sessionForm.description}
                  onChange={(e) => setSessionForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe what this session will cover..."
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="startDate">Start Date *</Label>
                  <Input
                    id="startDate"
                    type="date"
                    min={dateConstraints.min}
                    max={dateConstraints.max}
                    value={sessionForm.startDate}
                    onChange={(e) => setSessionForm(prev => ({ ...prev, startDate: e.target.value }))}
                  />
                </div>
                
                <div>
                  <Label htmlFor="endDate">End Date *</Label>
                  <Input
                    id="endDate"
                    type="date"
                    min={dateConstraints.min}
                    max={dateConstraints.max}
                    value={sessionForm.endDate}
                    onChange={(e) => setSessionForm(prev => ({ ...prev, endDate: e.target.value }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="startTime">Start Time *</Label>
                  <Input
                    id="startTime"
                    type="time"
                    value={sessionForm.startTime}
                    onChange={(e) => setSessionForm(prev => ({ ...prev, startTime: e.target.value }))}
                  />
                </div>
                
                <div>
                  <Label htmlFor="endTime">End Time *</Label>
                  <Input
                    id="endTime"
                    type="time"
                    value={sessionForm.endTime}
                    onChange={(e) => setSessionForm(prev => ({ ...prev, endTime: e.target.value }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="room">Room/Location</Label>
                  <Input
                    id="room"
                    value={sessionForm.room}
                    onChange={(e) => setSessionForm(prev => ({ ...prev, room: e.target.value }))}
                    placeholder="e.g., Main Hall, Room A"
                  />
                </div>
                
                <div>
                  <Label htmlFor="capacity">Capacity *</Label>
                  <Input
                    id="capacity"
                    type="number"
                    min="1"
                    value={sessionForm.capacity}
                    onChange={(e) => setSessionForm(prev => ({ ...prev, capacity: parseInt(e.target.value) || 0 }))}
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t">
                <Button onClick={handleCreateOrUpdateSession} disabled={isCreating} className="flex-1">
                  {isCreating ? (editingSession ? 'Updating...' : 'Creating...') : (editingSession ? 'Update Session' : 'Create Session')}
                </Button>
                <Button variant="outline" onClick={() => { setShowForm(false); resetForm(); }} className="flex-1">
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deletingSession} onOpenChange={() => setDeletingSession(null)}>
        <DialogContent className="max-w-md bg-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-500" />
              Delete Session
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{deletingSession?.name}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          
          <DialogFooter className="flex gap-3">
            <Button 
              variant="outline" 
              onClick={() => setDeletingSession(null)}
            >
              Cancel
            </Button>
            <Button 
              variant="destructive"
              onClick={() => deletingSession && handleDeleteSession(deletingSession)}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete Session
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Navigation */}
      <div className="flex justify-between mt-8">
        <Button variant="outline" onClick={handleGoBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        
        <div className="flex flex-col items-end gap-2">
          {sessions.length === 0 && (
            <div className="text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded px-3 py-1 mb-2">
              💡 Create at least one session to continue
            </div>
          )}
          
          <Button 
            onClick={handleContinueToNextStep} 
            disabled={saving || sessions.length === 0}
            className={sessions.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}
          >
            {saving ? 'Saving...' : 'Continue to Categories'}
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  );
}