import { NextFunction, Request, Response } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";
import prisma from "../lib/prisma";
import { Role } from "@prisma/client";

interface DecodedToken extends JwtPayload {
    sub: string;
    email?: string;
    name?: string;
    "custom:role"?: string;
    "cognito:username"?: string;
}

/**
 * Middleware that automatically creates users in the database if they exist in Cognito
 * but not in the database. This provides auto-healing functionality during development
 * or after database resets.
 */
export const autoHealAuthMiddleware = () => {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        const authHeader = req.headers.authorization;
        
        // Skip if no auth header is present
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return next();
        }

        const token = authHeader.split(" ")[1];
        
        if (!token) {
            return next();
        }

        try {
            // Decode token to get user info (not verifying - that happens in authMiddleware)
            const decoded = jwt.decode(token) as DecodedToken;
            
            if (!decoded || !decoded.sub) {
                return next();
            }
            
            const cognitoId = decoded.sub;
            
            // Check if user exists in database
            const user = await prisma.user.findUnique({
                where: { cognitoId },
                select: { id: true }
            });
            
            // If user doesn't exist, create them automatically
            if (!user) {
                console.log(`[AUTO-HEAL] User ${cognitoId} not found in database. Creating automatically...`);
                
                // Extract user information from the token
                const email = decoded.email || '';
                const name = decoded.name || decoded["cognito:username"] || email.split('@')[0] || 'New User';
                const roleFromToken = decoded["custom:role"]?.toLowerCase() || 'attendee';
                
                // Create the user
                const newUser = await prisma.user.create({
                    data: {
                        cognitoId,
                        name,
                        email,
                        password: '', // Empty password for Cognito users
                        roles: [roleFromToken as Role]
                    }
                });
                
                console.log(`[AUTO-HEAL] Created user ${newUser.id} with role: ${roleFromToken}`);
            }
            
            // Continue to next middleware (like authMiddleware)
            next();
        } catch (error) {
            // Log error but don't fail - the authMiddleware will handle proper auth checks
            console.error('[AUTO-HEAL] Error creating user:', error);
            next();
        }
    };
};