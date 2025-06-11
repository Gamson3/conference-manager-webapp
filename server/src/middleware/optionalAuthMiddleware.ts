//Optional authentication middleware to support where we should have guests 

import prisma from '../lib/prisma';
import { NextFunction, Request, Response } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";


interface DecodedToken extends JwtPayload {
    sub: string;
    "custom:role"?: string;
}

declare global {
    namespace Express {
        interface Request {
            user?: {
                id: number
                cognitoId: string; // Added for UUID
                role: string;
            }
        }
    }
}

export const optionalAuthMiddleware = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    // If no auth header, continue as guest
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('[OPTIONAL AUTH] No token provided - continuing as guest');
      // no req.user - so as to avoid been undefined
      next();
      return;
    }

    const token = authHeader.substring(7);
    
    try {
      // Try to verify and decode the token
      const decoded = jwt.decode(token) as DecodedToken;
      
      if (!decoded || !decoded.sub) {
        console.log('[OPTIONAL AUTH] Invalid token structure, continuing as guest');
        next();
        return;
      }

      const cognitoId = decoded.sub;
      
      // Get the numeric userId from database using cognitoId
      const user = await prisma.user.findUnique({
        where: { cognitoId },
        select: { id: true, role: true }
      });
      
      if (user) {
        // Set the user object with numeric ID (same as regular authMiddleware)
        req.user = {
          id: user.id,
          cognitoId,
          role: decoded["custom:role"]?.toLowerCase() || user.role
        };
        console.log('[OPTIONAL AUTH] Token validated successfully for user:', user.id);
      } else {
        console.log('[OPTIONAL AUTH] Token valid but user not found in database');
      }
    } catch (jwtError: any) {
      console.log('[OPTIONAL AUTH] Invalid token, continuing as guest:', jwtError.message);
      // Don't fail - just continue without user
    }

    next();
  } catch (error: any) {
    console.log('[OPTIONAL AUTH] Error in optional auth middleware:', error.message);
    // Don't fail - continue as guest
    next();
  }
};
