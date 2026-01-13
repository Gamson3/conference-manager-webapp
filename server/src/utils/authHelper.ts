// Auth Helper Functions

import { Request } from "express";

/**
 * Get the user's numeric database ID from the request.
 * @param req Express request object
 * @returns The user's numeric database ID
 */
export const getUserId = (req: Request): number | undefined => {
  return req.user?.id;
};

/**
 * Get the user's Cognito ID (UUID) from the request.
 * @param req Express request object
 * @returns The user's Cognito ID string
 */
export const getUserCognitoId = (req: Request): string | undefined => {
  return req.user?.cognitoId;
};

/**
 * Get the user's role from the request.
 * @param req Express request object
 * @returns The user's role
 */
export const getUserRole = (req: Request): string | undefined => {
  return req.user?.role;
};

/**
 * Check if the user is an admin.
 * @param req Express request object
 * @returns True if the user is an admin
 */
export const isAdmin = (req: Request): boolean => {
  return req.user?.role === "admin";
};