// Auth Helper Functions

import { Request, Response } from "express";
import { Role } from "@prisma/client";

// Normalize roles to lowercase strings for comparisons
const roleStr = (r: Role | string) => String(r).toLowerCase();

/**
 * Safely get numeric userId from req.user
 */
export const getUserId = (req: Request): number | null => {
  return req.user?.id || null;
};

/**
 * Safely get Cognito ID from req.user
 */
export const getUserCognitoId = (req: Request): string | null => {
  return req.user?.cognitoId || null;
};

/**
 * Check if the user has a specific role (string or enum), case-insensitive
 */
// CHANGED: accept string | Role and normalize
export const hasRole = (req: Request, role: string | Role): boolean => {
  const roles = (req.user?.roles || []).map(roleStr);
  return roles.includes(roleStr(role));
};

/**
 * Check if the user has any of the specified roles (strings or enums)
 */
// CHANGED: accept mixed array and normalize
export const hasAnyRole = (req: Request, roles: Array<string | Role>): boolean => {
  if (!req.user?.roles?.length) return false;
  const userSet = new Set(req.user.roles.map(roleStr));
  return roles.some(r => userSet.has(roleStr(r)));
};

// Role helpers (keep string literals working)
export const isAdmin = (req: Request): boolean => hasRole(req, "admin");
export const isOrganizer = (req: Request): boolean => hasRole(req, "organizer");
export const isAttendee = (req: Request): boolean => hasRole(req, "attendee");
export const isPresenter = (req: Request): boolean => hasRole(req, "presenter");

/**
 * Guard: throw if unauthenticated
 */
export const requireAuth = (req: Request, res: Response): number | null => {
  const userId = getUserId(req);
  if (!userId) {
    res.status(401).json({ message: "User not authenticated" });
    return null;
  }
  return userId;
};

/**
 * Build a standardized user context object for API responses
 */
export const buildUserContext = (req: Request) => {
  return {
    isAuthenticated: !!req.user,
    userId: req.user?.id || null,
    cognitoId: req.user?.cognitoId || null,
    roles: req.user?.roles || [],
  };
};