"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CalendarIcon,
  MapPinIcon,
  UserIcon,
  UsersIcon,
  CheckIcon,
} from "lucide-react";
import { createAuthenticatedApi } from "@/lib/utils";
import { toast } from "sonner";

interface Conference {
  id: number;
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  location: string;
  venue?: string;
  topics?: string[];
  organizer: string;
  attendeeCount: number;
  capacity?: number;
  websiteUrl?: string;
  isRegistered?: boolean; // Add this to track registration status
}

interface ConferenceCardProps {
  conf: Conference;
  showRegisterButton?: boolean;
  userContext?: {
    isAuthenticated: boolean;
    userRole: string;
  } | null;
  onRegistrationChange?: (conferenceId: number, isRegistered: boolean) => void; // Callback for parent updates
}

export default function ConferenceCard({ 
  conf, 
  showRegisterButton = true, 
  userContext,
  onRegistrationChange 
}: ConferenceCardProps) {
  const router = useRouter();
  const [registering, setRegistering] = useState(false);
  const [isRegistered, setIsRegistered] = useState(conf.isRegistered || false);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  // Check authentication status on mount
  useEffect(() => {
    const checkAuthStatus = async () => {
      if (userContext) {
        setIsAuthenticated(userContext.isAuthenticated);
      } else {
        // Fallback: Try to create authenticated API to check auth status
        try {
          await createAuthenticatedApi();
          setIsAuthenticated(true);
        } catch {
          setIsAuthenticated(false);
        }
      }
    };

    checkAuthStatus();
  }, [userContext]);

  const handleRegister = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click

    // Check if already registered
    if (isRegistered) {
      toast.info(`You're already registered for this conference: ${conf.name}`);
      return;
    }

    // Handle guest users - don't check auth upfront, let them click
    try {
      setRegistering(true);
      
      // Try to create authenticated API - this will fail for guests
      const api = await createAuthenticatedApi();
      
      await api.post("/api/attendee/register-conference", { 
        conferenceId: conf.id 
      });
      
      // Update UI immediately (optimistic update)
      setIsRegistered(true);
      
      // Notify parent component of registration change
      onRegistrationChange?.(conf.id, true);
      
      toast.success(`Successfully registered for "${conf.name}"!`);
      
    } catch (error: any) {
      console.error("Error registering for conference:", error);
      
      // REVERT optimistic update on any error
      setIsRegistered(false);

      // Handle different error types
      if (error.message === 'No authentication token available' || error.response?.status === 401) {
        // User is not authenticated
        toast.error("Please sign in to register for conferences", {
          description: "You'll be redirected to the login page",
          action: {
            label: "Sign In",
            onClick: () => router.push("/signin")
          }
        });
        
        // Redirect after a short delay
        setTimeout(() => {
          router.push("/signin");
        }, 2000);
        
      } else if (error.response?.status === 400) {
        // Handle 400 errors specifically
        const errorMessage = error.response?.data?.message;
        
        if (errorMessage?.includes("Already registered")) {
          // User is already registered
          setIsRegistered(true);
          toast.info(`You're already registered for this conference: ${conf.name}`);
        } else {
          // Other 400 errors (like user not authenticated in backend)
          toast.error("Please sign in to register for conferences");
          setTimeout(() => {
            router.push("/signin");
          }, 2000);
        }
      } else {
        toast.error(
          error.response?.data?.message || "Registration failed. Please try again."
        );
      }
    } finally {
      setRegistering(false);
    }
  };

  const handleViewDetails = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click
    router.push(`/attendee/conferences/${conf.id}`);
  };

  const renderRegisterButton = () => {
    if (!showRegisterButton) return null;

    // If user authentication status is still loading
    if (isAuthenticated === null) {
      return (
        <Button disabled variant="outline">
          Loading...
        </Button>
      );
    }

    // If user is already registered
    if (isRegistered) {
      return (
        <Button 
          onClick={handleRegister}
          variant="outline" 
          // disabled
          className="bg-green-100 border-green-300 text-green-700 hover:bg-green-100 hover:text-green-700"
        >
          <CheckIcon className="h-4 w-4" />
          Registered
        </Button>
      );
    }

    // For both authenticated and guest users - same button style
    return (
      <Button 
        onClick={handleRegister} 
        variant="outline"
        disabled={registering}
        className="text-white border-white bg-primary-700 hover:bg-primary-700 hover:text-white"
        >
        {registering ? "Registering..." : "Register"}
      </Button>
                    
    );
  };

  return (
    <Card
      className="h-full hover:shadow-lg transition-shadow cursor-pointer"
      onClick={handleViewDetails}
    >
      <CardHeader>
        <div className="flex justify-between items-start">
          <CardTitle className="text-lg flex-1">{conf.name}</CardTitle>
          {isRegistered && (
            <Badge variant="secondary" className="bg-green-100 text-green-800 ml-2">
              <CheckIcon className="h-3 w-3 mr-1" />
              Registered
            </Badge>
          )}
        </div>
        <div className="flex items-center text-gray-500 text-sm">
          <CalendarIcon className="h-4 w-4 mr-2" />
          <span>
            {new Date(conf.startDate).toLocaleDateString()} -{" "}
            {new Date(conf.endDate).toLocaleDateString()}
          </span>
        </div>
        <div className="flex items-center text-gray-500 text-sm">
          <MapPinIcon className="h-4 w-4 mr-2" />
          <span>{conf.location}</span>
        </div>
      </CardHeader>

      <CardContent className="flex-1">
        <p className="text-gray-600 text-sm mb-4 line-clamp-3">
          {conf.description}
        </p>

        <div className="flex items-center text-gray-500 text-sm mb-4">
          <UserIcon className="h-4 w-4 mr-2" />
          <span>Organized by {conf.organizer}</span>
        </div>

        <div className="flex items-center text-gray-500 text-sm mb-4">
          <UsersIcon className="h-4 w-4 mr-2" />
          <span>{conf.attendeeCount} registered</span>
          {conf.capacity && <span> / {conf.capacity} capacity</span>}
        </div>

        <div className="flex flex-wrap gap-1">
          {conf.topics?.slice(0, 3).map((topic, i) => (
            <Badge key={i} variant="outline" className="text-xs">
              {topic}
            </Badge>
          ))}
          {conf.topics && conf.topics.length > 3 && (
            <Badge variant="outline" className="text-xs">
              +{conf.topics.length - 3} more
            </Badge>
          )}
        </div>
      </CardContent>

      <CardFooter className="px-6 py-4 bg-gray-50 flex justify-between gap-2">
        <Button variant="outline" onClick={handleViewDetails}>
          View Details
        </Button>
        {renderRegisterButton()}
      </CardFooter>
    </Card>
  );
}