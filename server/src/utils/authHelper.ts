// Auth Helper Functions

import { Request } from "express";
import { Role } from "@prisma/client";

/**
 * Get the authenticated user ID from the request
 */
export const getUserId = (req: Request): number | null => {
  return req.user?.id || null;
};

/**
 * Get the authenticated user's Cognito ID from the request
 */
export const getUserCognitoId = (req: Request): string | null => {
  return req.user?.cognitoId || null;
};

/**
 * Check if the user has a specific role
 */
export const hasRole = (req: Request, role: string): boolean => {
  return req.user?.roles?.includes(role as Role) || false;
};

/**
 * Check if the user is an admin
 */
export const isAdmin = (req: Request): boolean => {
  return hasRole(req, "admin");
};

/**
 * Check if the user is an organizer
 */
export const isOrganizer = (req: Request): boolean => {
  return hasRole(req, "organizer");
};

/**
 * Check if the user is an attendee
 */
export const isAttendee = (req: Request): boolean => {
  return hasRole(req, "attendee");
};

/**
 * Check if the user is a presenter
 */
export const isPresenter = (req: Request): boolean => {
  return hasRole(req, "presenter");
};

/**
 * Check if the user has any of the specified roles
 */
export const hasAnyRole = (req: Request, roles: string[]): boolean => {
  if (!req.user?.roles) return false;
  return roles.some(role => req.user!.roles.includes(role as Role));
};