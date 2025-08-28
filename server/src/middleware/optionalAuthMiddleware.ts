//Optional authentication middleware to support where we should have guests 

import prisma from '../lib/prisma';
import { NextFunction, Request, Response } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";
import { Role } from "@prisma/client";


interface DecodedToken extends JwtPayload {
    sub: string;
    "custom:role"?: string;
}

declare global {
    namespace Express {
        interface Request {
            user?: {
                id: number;
                cognitoId: string;
                roles: Role[]; // Changed from role to roles
            }
        }
    }
}

export const optionalAuthMiddleware = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    console.log('[OPTIONAL AUTH] Processing request');
    const authHeader = req.headers.authorization;
    
    // If no auth header, continue as guest
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('[OPTIONAL AUTH] No token provided - continuing as guest');
      next();
      return;
    }

    const token = authHeader.substring(7);
    console.log('[OPTIONAL AUTH] Token found, decoding...');
    
    try {
      // Try to verify and decode the token
      const decoded = jwt.decode(token) as DecodedToken;
      
      if (!decoded || !decoded.sub) {
        console.log('[OPTIONAL AUTH] Invalid token structure, continuing as guest');
        next();
        return;
      }

      const cognitoId = decoded.sub;
      console.log(`[OPTIONAL AUTH] Valid token for cognitoId: ${cognitoId}`);
      
      // Get the numeric userId from database using cognitoId
      const user = await prisma.user.findUnique({
        where: { cognitoId },
        select: { id: true, roles: true }
      });
      
      if (user) {
        // Set the user object with numeric ID
        req.user = {
          id: user.id,
          cognitoId,
          roles: user.roles
        };
        console.log(`[OPTIONAL AUTH] Token validated for user: ${user.id}, roles: ${user.roles.join(',')}`);
      } else {
        console.log('[OPTIONAL AUTH] Token valid but user not found in database - will be created by ensure endpoint');
      }
    } catch (jwtError: any) {
      console.log('[OPTIONAL AUTH] Invalid token, continuing as guest:', jwtError.message);
    }

    next();
  } catch (error: any) {
    console.log('[OPTIONAL AUTH] Error:', error.message);
    next();
  }
};
