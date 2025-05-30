"use client";

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { 
  Card, 
  CardContent, 
  CardFooter, 
  CardHeader, 
  CardTitle, 
  CardDescription 
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { 
  CheckIcon, 
  MessageSquareIcon,
  AlertCircleIcon,
  Star as StarIcon
} from 'lucide-react';
import { toast } from 'sonner';
import { createAuthenticatedApi } from '@/lib/utils';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface Session {
  id: number;
  title: string;
  date: string;
  time: string;
  conferenceId: number;
  conferenceName: string;
}

export default function FeedbackForm() {
  const router = useRouter();
  const params = useParams();
  const conferenceId = params?.conferenceId as string;
  
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  
  const [selectedSession, setSelectedSession] = useState<string>("");
  const [rating, setRating] = useState<number>(0);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [comments, setComments] = useState<string>("");
  const [improvements, setImprovements] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchSessions = async () => {
      try {
        setIsLoading(true);
        const api = await createAuthenticatedApi();
        
        if (conferenceId) {
          // Fetch sessions for a specific conference
          const response = await api.get(`/attendee/conference/${conferenceId}/sessions`);
          setSessions(response.data);
        } else {
          // Fetch all attended sessions that need feedback
          const response = await api.get('/attendee/attended-sessions');
          setSessions(response.data);
        }
      } catch (error: any) {
        console.error('Error fetching sessions:', error);
        setError(error.response?.data?.message || 'Failed to load sessions');
        toast.error("Couldn't load sessions for feedback");
      } finally {
        setIsLoading(false);
      }
    };

    fetchSessions();
  }, [conferenceId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form
    if (!selectedSession) {
      toast.error("Please select a session");
      return;
    }
    
    if (rating === 0) {
      toast.error("Please provide a rating");
      return;
    }
    
    try {
      setIsSubmitting(true);
      const api = await createAuthenticatedApi();
      
      await api.post('/attendee/submit-feedback', {
        sessionId: parseInt(selectedSession),
        rating,
        comments,
        improvements
      });
      
      setSubmitted(true);
      toast.success("Thank you for your feedback!");
      
      // Reset form
      setSelectedSession("");
      setRating(0);
      setHoverRating(0);
      setComments("");
      setImprovements("");
      
    } catch (error: any) {
      console.error('Error submitting feedback:', error);
      toast.error(error.response?.data?.message || "Failed to submit feedback");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64 mb-6" />
        
        <Card>
          <CardHeader>
            <Skeleton className="h-7 w-48 mb-2" />
            <Skeleton className="h-4 w-full" />
          </CardHeader>
          
          <CardContent>
            <Skeleton className="h-10 w-full mb-4" />
            <Skeleton className="h-8 w-full mb-4" />
            <Skeleton className="h-32 w-full mb-4" />
            <Skeleton className="h-32 w-full" />
          </CardContent>
          
          <CardFooter>
            <Skeleton className="h-10 w-32 ml-auto" />
          </CardFooter>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-10">
        <AlertCircleIcon className="h-10 w-10 text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-red-600 mb-4">
          {error}
        </h2>
        <Button onClick={() => router.refresh()}>
          Try Again
        </Button>
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <div className="text-center py-12 px-6 bg-gray-50 rounded-lg">
        <MessageSquareIcon className="h-10 w-10 mx-auto text-gray-400 mb-4" />
        <h2 className="text-xl font-semibold mb-2">
          No sessions available for feedback
        </h2>
        <p className="text-gray-500 mb-6 max-w-md mx-auto">
          {conferenceId 
            ? "There are no sessions available for feedback in this conference." 
            : "You haven't attended any sessions that require feedback, or you've already provided feedback for all attended sessions."}
        </p>
        <Button 
          onClick={() => router.push('/attendee/dashboard')}
        >
          Back to Dashboard
        </Button>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <h1 className="text-2xl font-semibold mb-6">
        Session Feedback
      </h1>
      
      {submitted && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6 flex items-start">
          <CheckIcon className="h-5 w-5 text-green-500 mt-0.5 mr-3 flex-shrink-0" />
          <div>
            <p className="font-medium text-green-800">
              Feedback submitted successfully!
            </p>
            <p className="text-sm text-green-700">
              Thank you for your feedback. It helps improve future sessions.
            </p>
          </div>
        </div>
      )}
      
      <Card>
        <CardHeader>
          <CardTitle>Provide Your Feedback</CardTitle>
          <CardDescription>
            Your feedback helps speakers improve and organizers plan better content for future events.
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label htmlFor="session" className="text-sm font-medium block">
                Select Session
              </label>
              <Select 
                value={selectedSession} 
                onValueChange={setSelectedSession}
              >
                <SelectTrigger id="session">
                  <SelectValue placeholder="Choose a session" />
                </SelectTrigger>
                <SelectContent>
                  {sessions.map(session => (
                    <SelectItem key={session.id} value={session.id.toString()}>
                      {session.title} ({session.conferenceName ? `${session.conferenceName}, ` : ''}{new Date(session.date).toLocaleDateString()})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <p className="text-sm font-medium">
                How would you rate this session?
              </p>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    className="p-1 focus:outline-none"
                  >
                    <StarIcon 
                      className={cn(
                        "h-8 w-8", 
                        (rating >= star || hoverRating >= star) 
                          ? "fill-yellow-400 text-yellow-400" 
                          : "text-gray-300"
                      )} 
                    />
                  </button>
                ))}
              </div>
              <p className="text-sm text-gray-500">
                {rating === 1 ? 'Poor' : 
                  rating === 2 ? 'Fair' : 
                  rating === 3 ? 'Good' : 
                  rating === 4 ? 'Very Good' : 
                  rating === 5 ? 'Excellent' : 'Select a rating'}
              </p>
            </div>
            
            <Separator />
            
            <div className="space-y-2">
              <label htmlFor="comments" className="text-sm font-medium block">
                What did you like about this session?
              </label>
              <Textarea
                id="comments"
                placeholder="Share what you enjoyed about the content, presentation, etc."
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                rows={3}
                className="min-h-[120px]"
              />
            </div>
            
            <div className="space-y-2">
              <label htmlFor="improvements" className="text-sm font-medium block">
                What could be improved?
              </label>
              <Textarea
                id="improvements"
                placeholder="Suggest any improvements for future sessions"
                value={improvements}
                onChange={(e) => setImprovements(e.target.value)}
                rows={3}
                className="min-h-[120px]"
              />
            </div>
          </form>
        </CardContent>
        
        <CardFooter className="flex justify-between">
          {conferenceId && (
            <Button 
              variant="outline"
              onClick={() => router.push(`/attendee/conferences/${conferenceId}`)}
            >
              Back to Conference
            </Button>
          )}
          
          <Button 
            onClick={handleSubmit}
            disabled={isSubmitting}
            className={cn(!conferenceId && "ml-auto")}
          >
            {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
          </Button>
        </CardFooter>
      </Card>
    </motion.div>
  );
}