/**
 * Authentication Types
 */

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonObject | JsonValue[];
export interface JsonObject {
  [key: string]: JsonValue | undefined;
}

export interface OnboardingPreferences extends JsonObject {
  completed?: boolean;
  completedAt?: string;
}

export interface UserPreferences extends JsonObject {
  onboarding?: OnboardingPreferences;
}

export interface User {
  id: number;
  cognitoId: string;
  name: string;
  email: string;
  role: 'user' | 'organizer' | 'admin';
  bio?: string;
  profileImage?: string;
  phoneNumber?: string;
  address?: string;
  organization?: string;
  jobTitle?: string;
  socialLinks?: Record<string, string>;
  interests?: string[];
  preferences?: UserPreferences;
  createdAt: string;
  updatedAt: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  idToken?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  name: string;
  email: string;
  password: string;
  organization?: string;
}

export interface AuthResponse {
  user: User;
  tokens: AuthTokens;
  message?: string;
}

export interface ForgotPasswordData {
  email: string;
}

export interface ResetPasswordData {
  email: string;
  code: string;
  newPassword: string;
}

export interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  isAuthenticated: boolean;
  isOrganizer: boolean;
  isAttendee: boolean; // deprecated: maps to base 'user' role
  isUser: boolean;
  isAdmin: boolean;
  upgradeToOrganizer?: () => Promise<void>;
}
