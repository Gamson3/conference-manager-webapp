/**
 * Organizer Impersonation Controller
 * 
 * Allows conference organizers to impersonate participants/authors
 * within their own conferences for administrative purposes.
 */

import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { sendError } from '../utils/httpError';
import { logImpersonation } from '../lib/auditLogger';
import { getUserId, isAdmin } from '../utils/authHelper';

/**
 * POST /api/organizer/conferences/:conferenceId/impersonate/:userId
 * 
 * Start impersonation session for a user within a conference.
 * Only organizers of the conference (or admins) can impersonate.
 * Target user must be a participant or have submissions in the conference.
 */
export const impersonateAuthor = async (req: Request, res: Response): Promise<void> => {
  try {
    const organizerId = getUserId(req);
    const conferenceId = Number(req.params.conferenceId);
    const targetUserId = Number(req.params.userId);
    
    if (!organizerId) {
      sendError(res, 401, 'UNAUTHENTICATED', 'Not authenticated');
      return;
    }

    if (isNaN(conferenceId) || isNaN(targetUserId)) {
      sendError(res, 400, 'INVALID_ARGUMENT', 'Invalid conference or user ID');
      return;
    }

    // Cannot impersonate yourself
    if (organizerId === targetUserId) {
      sendError(res, 400, 'INVALID_ARGUMENT', 'Cannot impersonate yourself');
      return;
    }
    
    // Verify organizer owns this conference
    const conference = await prisma.conference.findUnique({
      where: { id: conferenceId },
      select: { id: true, createdById: true, name: true }
    });
    
    if (!conference) {
      sendError(res, 404, 'NOT_FOUND', 'Conference not found');
      return;
    }
    
    if (conference.createdById !== organizerId && !isAdmin(req)) {
      sendError(res, 403, 'FORBIDDEN', 'You can only impersonate users in conferences you organize');
      return;
    }
    
    // Verify target user exists
    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, name: true, email: true, role: true }
    });
    
    if (!targetUser) {
      sendError(res, 404, 'NOT_FOUND', 'User not found');
      return;
    }

    // Cannot impersonate admins (security measure)
    if (targetUser.role === 'admin') {
      sendError(res, 403, 'FORBIDDEN', 'Cannot impersonate admin users');
      return;
    }
    
    // Verify target user has a participation in this conference (author/presenter/attendee)
    const participation = await prisma.conferenceParticipant.findFirst({
      where: { 
        userId: targetUserId, 
        conferenceId 
      }
    });
    
    // Also check if they have submissions to this conference
    const hasSubmissions = await prisma.submission.count({
      where: { 
        authorId: targetUserId, 
        conferenceId 
      }
    });
    
    if (!participation && hasSubmissions === 0) {
      sendError(res, 403, 'FORBIDDEN', 'User is not a participant or author in this conference');
      return;
    }
    
    // Log the impersonation
    await logImpersonation(organizerId, targetUserId, req);
    
    // Return impersonation context (frontend stores this to show "acting as" banner)
    res.json({
      message: 'Impersonation started',
      impersonatedUser: {
        id: targetUser.id,
        name: targetUser.name,
        email: targetUser.email
      },
      conference: {
        id: conference.id,
        name: conference.name
      },
      impersonatedBy: organizerId
    });
  } catch (error) {
    console.error('Error in impersonateAuthor:', error);
    sendError(res, 500, 'INTERNAL', 'Failed to start impersonation');
  }
};

/**
 * POST /api/organizer/conferences/:conferenceId/impersonate/end
 * 
 * End the current impersonation session.
 * This is called when the organizer wants to stop acting as another user.
 */
export const endImpersonation = async (req: Request, res: Response): Promise<void> => {
  try {
    const organizerId = getUserId(req);
    
    if (!organizerId) {
      sendError(res, 401, 'UNAUTHENTICATED', 'Not authenticated');
      return;
    }
    
    // Frontend handles session cleanup
    // Backend just acknowledges the end of impersonation
    res.json({
      message: 'Impersonation ended',
      organizerId
    });
  } catch (error) {
    console.error('Error in endImpersonation:', error);
    sendError(res, 500, 'INTERNAL', 'Failed to end impersonation');
  }
};
