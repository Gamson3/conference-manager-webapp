import { LucideIcon } from "lucide-react";
import { MotionProps as OriginalMotionProps } from "framer-motion";
import {
  User,
  Conference,
  Section,
  Presentation,
  AuthorAssignment,
  Attendance,
  Favorite,
  ImpersonationLog,
  // Add new model imports
  Ticket,
  TicketPurchase,
  ConferenceFeedback,
  PresentationFeedback,
  ConferenceMaterial,
  PresentationMaterial,
  Notification,
  SessionAttendance
} from "./prismaTypes"; // this file will be generated after running prisma:generate

declare module "framer-motion" {
  interface MotionProps extends OriginalMotionProps {
    className?: string;
  }
}

declare global {
  enum Role {
    attendee = "attendee",
    organizer = "organizer",
    admin = "admin",
  }

  enum PresentationStatus {
    draft = "draft",
    submitted = "submitted",
    scheduled = "scheduled",
    locked = "locked",
  }

  enum SubmissionType {
    internal = "internal",
    external = "external",
  }

  interface AuthUser {
    cognitoInfo: {
      userId: string;
      username: string;
      signInDetails?: any; // Optional - structure of Cognito metadata
    };
    userInfo: User;
    userRole: Role;
  }

  interface SidebarLinkProps {
    href: string;
    icon: LucideIcon;
    label: string;
  }

  interface AuthenticatedUser {
    userInfo: User;
    role: Role;
    token: string;
  }

  interface PresentationCardProps {
    presentation: Presentation;
    isFavorite?: boolean;
    onFavoriteToggle?: () => void;
  }

  interface ConferenceOverviewProps {
    conference: Conference;
    user: User;
    isRegistered: boolean;
  }

  interface AuthorAssignmentFormProps {
    presentationId: number;
    authors: AuthorAssignment[];
    onAssign: (email: string) => void;
  }

  interface SubmissionFormProps {
    presentation?: Presentation;
    onSubmit: (data: Partial<Presentation>) => void;
  }

  interface Notification {
    id: string;
    message: string;
    type: "success" | "error" | "info";
    timestamp: Date;
  }

  interface Appsidebarprops {
    userType: "organizer" | "attendee";
  }

  interface SettingsFormProps {
    initialData: SettingsFormData;
    onSubmit: (data: SettingsFormData) => Promise<void>;
    userType: "organizer" | "attendee";
  }

  interface Presentation {
    id: number;
    title: string;
    abstract: string;
    keywords?: string[];
    duration: number;
    categoryId: number;
    presentationTypeId: number;
    submissionType: 'internal' | 'external';
    reviewStatus: 'pending' | 'approved' | 'rejected' | 'revision_required';
    submittedAt?: string;
    reviewedAt?: string;
    assignedAt?: string;
    sectionId?: number; // ✅ Add this back for direct access
    createdAt: string;
    updatedAt: string;
    
    // Relations
    category?: Category;
    presentationType?: PresentationType;
    section?: Section; // ✅ Keep this for populated relations
    authors?: PresentationAuthor[];
    timeSlot?: TimeSlot;
    materials?: PresentationMaterial[];
    feedback?: PresentationFeedback[];
  }

}

export {};
