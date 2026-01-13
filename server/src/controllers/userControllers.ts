import { Request, Response } from "express";
import prisma from '../lib/prisma';
import { Role } from "@prisma/client";
import { getUserCognitoId } from "../utils/authHelper";
import { addUserToGroup, removeUserFromGroup } from "../utils/cognitoAdminClient";

function asNonEmptyTrimmedString(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function isPlaceholderName(existingName: string, existingEmail: string): boolean {
  const name = existingName.trim();
  if (name.length === 0) return true;
  if (name === 'User') return true;
  // Historical bug: name was sometimes set to email/username fallback.
  if (name.toLowerCase() === existingEmail.trim().toLowerCase()) return true;
  return false;
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Internal server error';
}


// GET /users/:id - Get user by ID
export const getUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const user = await prisma.user.findUnique({
      where: { id: Number(id) },
    });
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }else {
      res.json(user);
    }
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// GET /users/me - Get current user profile
export const getCurrentUser = async (req: Request, res: Response) => {
  try {
    const cognitoId = getUserCognitoId(req);  // Use cognitoId instead of id
    
    const user = await prisma.user.findUnique({
      where: { cognitoId },
    });
    
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }
    
    res.json(user);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// PUT /users/me - Update current user profile
export const updateCurrentUser = async (req: Request, res: Response) => {
  try {
    const cognitoId = getUserCognitoId(req);
    const desiredName = asNonEmptyTrimmedString((req.body as Record<string, unknown> | undefined)?.name);
    const desiredEmail = asNonEmptyTrimmedString((req.body as Record<string, unknown> | undefined)?.email);

    if (!desiredName && !desiredEmail) {
      res.status(400).json({ message: "At least one of 'name' or 'email' is required" });
      return;
    }
    
    const user = await prisma.user.update({
      where: { cognitoId },
      data: {
        ...(desiredName ? { name: desiredName } : {}),
        ...(desiredEmail ? { email: desiredEmail } : {}),
      },
    });
    
    res.json(user);
  } catch (error: unknown) {
    res.status(500).json({ message: getErrorMessage(error) });
  }
};

// GET /users - List all users (admin only)
export const getAllUsers = async (req: Request, res: Response) => {
  try {
    const users = await prisma.user.findMany();
    res.json(users);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * POST /users/role - Change user role (admin only)
 *
 * ADR-008 SECURITY CONTRACT:
 * - This endpoint updates Cognito Groups (authority) and mirrors in DB.
 * - Only admins may invoke this.
 * - User must refresh their token to see updated groups.
 */
export const changeUserRole = async (req: Request, res: Response): Promise<void> => {
  try {
    const body = (req.body ?? {}) as Record<string, unknown>;
    const userId = typeof body.userId === 'number' ? body.userId : Number(body.userId);
    const newRole = (typeof body.role === 'string' ? body.role : '') as Role;

    if (!userId || Number.isNaN(userId)) {
      res.status(400).json({ message: 'userId is required' });
      return;
    }
    if (!['user', 'organizer', 'admin'].includes(newRole)) {
      res.status(400).json({ message: 'role must be user, organizer, or admin' });
      return;
    }

    const targetUser = await prisma.user.findUnique({ where: { id: userId } });
    if (!targetUser) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    const oldRole = targetUser.role;

    // Update Cognito groups (authority)
    if (newRole !== oldRole) {
      // Add to new elevated group
      if (newRole === 'organizer' && oldRole === 'user') {
        await addUserToGroup(targetUser.cognitoId, 'organizer');
      } else if (newRole === 'admin') {
        // Admin supersedes organizer; ensure admin group membership
        await addUserToGroup(targetUser.cognitoId, 'admin');
        // Optionally also keep in organizer group; omit removal to grant both capabilities
      } else if (newRole === 'user' && oldRole !== 'user') {
        // Downgrade: remove from elevated groups
        if (oldRole === 'organizer') await removeUserFromGroup(targetUser.cognitoId, 'organizer');
        if (oldRole === 'admin') await removeUserFromGroup(targetUser.cognitoId, 'admin');
      } else if (newRole === 'organizer' && oldRole === 'admin') {
        // Downgrade from admin to organizer
        await removeUserFromGroup(targetUser.cognitoId, 'admin');
        await addUserToGroup(targetUser.cognitoId, 'organizer');
      }
    }

    // Mirror in DB (non-authoritative)
    const updated = await prisma.user.update({
      where: { id: userId },
      data: { role: newRole },
    });

    res.json({ user: updated, requiresTokenRefresh: true });
  } catch (error: unknown) {
    res.status(500).json({ message: getErrorMessage(error) });
  }
};

// POST /users/upgrade-organizer - Self-upgrade user -> organizer (with auth)
export const upgradeToOrganizer = async (req: Request, res: Response) => {
  try {
    const authUser = req.user;
    if (!authUser) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    // Token-wins: if the token already has organizer/admin, the user is already upgraded.
    if (authUser.role === 'organizer' || authUser.role === 'admin') {
      res.status(409).json({ message: "User already has organizer capabilities" });
      return;
    }

    const dbUser = await prisma.user.findUnique({ where: { id: authUser.id } });
    if (!dbUser) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    // Authoritative upgrade: mutate Cognito group first.
    await addUserToGroup(dbUser.cognitoId, 'organizer');

    // Mirror role in DB (non-authoritative)
    const updated = await prisma.user.update({
      where: { id: dbUser.id },
      data: { role: 'organizer' },
    });

    res.json({
      message: 'Successfully upgraded to organizer',
      user: updated,
      requiresTokenRefresh: true,
    });
  } catch (error: unknown) {
    console.error(error);
    res.status(500).json({ message: getErrorMessage(error) });
  }
};

// GET /users/cognito/:cognitoId - Get user by Cognito ID (for auth)
export const getUserByCognitoId = async (req: Request, res: Response) => {
  try {
    const { cognitoId } = req.params;
    const user = await prisma.user.findUnique({
      where: { cognitoId }, // Use Cognito ID for lookup
    });
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }else {
      res.json(user);
    }
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * POST /users - Create user
 *
 * ADR-008 SECURITY CONTRACT:
 * - The `role` field is IGNORED even if supplied in the request body.
 * - All new users start as 'user'. Elevated roles are granted only via Cognito Groups.
 */
export const createUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const body = (req.body ?? {}) as Record<string, unknown>;
    const cognitoId = asNonEmptyTrimmedString(body.cognitoId);
    const name = asNonEmptyTrimmedString(body.name);
    const email = asNonEmptyTrimmedString(body.email);
    const password = typeof body.password === 'string' ? body.password : '';

    if (!cognitoId || !name || !email) {
      res.status(400).json({ message: 'Missing required fields (cognitoId, name, email)' });
      return;
    }

    // ADR-008: role is ALWAYS 'user' — Cognito Groups are the authority.
    const user = await prisma.user.create({
      data: {
        cognitoId,
        name,
        email,
        password,
        role: 'user',
      },
    });
    res.status(201).json(user);
  } catch (error: unknown) {
    res.status(500).json({ message: getErrorMessage(error) });
  }
};


export const updateUser = async (req: Request, res: Response) => {
  try {
    const { cognitoId } = req.params;
    const { name, email, password } = req.body;
    const user = await prisma.user.update({
      where: { cognitoId },
      data: { name, email, password },
    });
    res.json(user);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// DELETE /users/:id - Delete user
export const deleteUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.user.delete({
      where: { id: Number(id) },
    });
    res.json({ message: "User deleted" });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// POST /users/upsert - Ensure a user exists and sync basic fields/role
export const upsertUser = async (req: Request, res: Response) => {
  try {
    const body = (req.body ?? {}) as Record<string, unknown>;
    const cognitoId = asNonEmptyTrimmedString(body.cognitoId);
    const desiredName = asNonEmptyTrimmedString(body.name);
    const desiredEmail = asNonEmptyTrimmedString(body.email);

    if (!cognitoId) {
      res.status(400).json({ message: 'cognitoId is required' });
      return;
    }

    // Only sync name/email. Role changes must go through explicit role endpoints.
    // However, we must be robust to the "user exists by email" case to avoid unique
    // constraint 500s and to reconnect returning users after a DB reset.
    const existingByCognito = await prisma.user.findUnique({ where: { cognitoId } });
    if (existingByCognito) {
      const updated = await prisma.user.update({
        where: { cognitoId },
        data: {
          ...(desiredName && isPlaceholderName(existingByCognito.name, existingByCognito.email)
            ? { name: desiredName }
            : {}),
          ...(desiredEmail ? { email: desiredEmail } : {}),
        },
      });
      res.json(updated);
      return;
    }

    if (desiredEmail) {
      const existingByEmail = await prisma.user.findUnique({ where: { email: desiredEmail } });
      if (existingByEmail) {
        // Re-attach this Cognito identity to the existing DB user.
        // IMPORTANT: Do not downgrade role here.
        const updated = await prisma.user.update({
          where: { id: existingByEmail.id },
          data: {
            cognitoId,
            ...(desiredName && isPlaceholderName(existingByEmail.name, existingByEmail.email)
              ? { name: desiredName }
              : {}),
          },
        });
        res.json(updated);
        return;
      }
    }

    const created = await prisma.user.create({
      data: {
        cognitoId,
        name: desiredName ?? 'User',
        email: desiredEmail ?? `${cognitoId}@example.local`,
        password: '',
        role: 'user',
      },
    });
    res.json(created);
  } catch (error: unknown) {
    res.status(500).json({ message: getErrorMessage(error) });
  }
};