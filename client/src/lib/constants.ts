  import { 
    LucideIcon, 
    Calendar, 
    Users, 
    File, 
    User, 
    Shield, 
    // Clock, 
    Ticket, 
    MapPin 
  } from "lucide-react";
  
  // Enum for user roles
  export enum UserRole {
    Admin = "Admin",
    Organizer = "Organizer",
    Attendee = "Attendee",
  }
  
  // Enum for conference status
  export enum ConferenceStatus {
    Upcoming = "Upcoming",
    Ongoing = "Ongoing",
    Completed = "Completed",
    Canceled = "Canceled",
  }
  
  // Enum for session types
  export enum SessionType {
    Keynote = "Keynote",
    Workshop = "Workshop",
    PanelDiscussion = "PanelDiscussion",
    Networking = "Networking",
  }
  
  // Icons for session types
  export const SessionIcons: Record<SessionType, LucideIcon> = {
    Keynote: Calendar,
    Workshop: File,
    PanelDiscussion: Users,
    Networking: User,
  };
  
  // Enum for ticket types
  export enum TicketType {
    Free = "Free",
    Regular = "Regular",
    VIP = "VIP",
  }
  
  // Ticket type icons
  export const TicketIcons: Record<TicketType, LucideIcon> = {
    Free: Ticket,
    Regular: Ticket,
    VIP: Shield,
  };
  
  // Enum for conference locations (example locations)
  export enum ConferenceLocation {
    NewYork = "New York",
    SanFrancisco = "San Francisco",
    London = "London",
    Berlin = "Berlin",
  }
  
  // Icons for key sections of the conference app
  export const NavigationIcons: Record<string, LucideIcon> = {
    Schedule: Calendar,
    Speakers: Users,
    Sessions: File,
    Profile: User,
    Tickets: Ticket,
    Location: MapPin,
  };
  
  // Add this constant at the end of the file
  // Common constants 
  export const APP_NAME = "Conference Manager";
  export const NAVBAR_HEIGHT = 50; // in pixels
  
  // Default test users (for development)
  export const testUsers = {
    attendee: {
      username: "John Doe",
      userId: "user-12345",
      role: UserRole.Attendee,
    },
    organizer: {
      username: "Jane Smith",
      userId: "user-67890",
      role: UserRole.Organizer,
    },
    admin: {
      username: "Admin User",
      userId: "user-admin",
      role: UserRole.Admin,
    },
  };
  
  // API Endpoints
  export const API_ENDPOINTS = {
    AUTH_LOGIN: "/api/auth/login",
    AUTH_REGISTER: "/api/auth/register",
    GET_CONFERENCES: "/api/conferences",
    GET_SESSIONS: "/api/sessions",
    GET_SPEAKERS: "/api/speakers",
    GET_TICKETS: "/api/tickets",
  };
  
  // Date formats for consistent usage
  export const DATE_FORMATS = {
    DISPLAY: "MMMM dd, yyyy", // Example: "March 27, 2025"
    API: "yyyy-MM-dd", // Example: "2025-03-27"
  };
  