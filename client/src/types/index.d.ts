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

}

export {};
