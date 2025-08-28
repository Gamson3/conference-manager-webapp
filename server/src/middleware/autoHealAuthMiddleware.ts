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
 * Optimized middleware that creates users in the database only if needed
 */
export const autoHealAuthMiddleware = () => {
    // Create a cache to avoid redundant database lookups
    const userCache = new Map<string, boolean>();
    
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        const authHeader = req.headers.authorization;
        
        // Skip if no auth header is present
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            console.log("[AUTO-HEAL] No auth header provided");
            return next();
        }

        const token = authHeader.split(" ")[1];
        
        if (!token) {
            console.log("[AUTO-HEAL] Empty token");
            return next();
        }

        try {
            // Decode token to get user info (not verifying - that happens in authMiddleware)
            const decoded = jwt.decode(token) as DecodedToken;
            
            if (!decoded || !decoded.sub) {
                console.log("[AUTO-HEAL] Invalid token structure");
                return next();
            }
            
            const cognitoId = decoded.sub;
            console.log(`[AUTO-HEAL] Processing user ${cognitoId}`);
            
            // Check cache first to avoid database lookup
            if (userCache.has(cognitoId)) {
                console.log(`[AUTO-HEAL] User ${cognitoId} found in cache`);
                return next();
            }
            
            // Check if user exists in database
            const user = await prisma.user.findUnique({
                where: { cognitoId },
                select: { id: true }
            });
            
            // Cache the result regardless
            userCache.set(cognitoId, !!user);
            
            // If user doesn't exist, create them automatically
            if (!user) {
                console.log(`[AUTO-HEAL] User ${cognitoId} not found in database. Creating automatically...`);
                
                // Extract user information from the token
                const email = decoded.email || '';
                const name = decoded.name || decoded["cognito:username"] || email.split('@')[0] || 'New User';
                const roleFromToken = decoded["custom:role"]?.toLowerCase() || 'attendee';
                
                try {
                    // Create the user with minimal required fields for speed
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
                } catch (createError) {
                    console.error('[AUTO-HEAL] Error creating user:', createError);
                }  
            } else {
                console.log(`[AUTO-HEAL] User ${cognitoId} exists with ID ${user.id}`);
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