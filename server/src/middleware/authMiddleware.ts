import { NextFunction, Request, Response } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";
import prisma from "../lib/prisma";
import { Role } from "@prisma/client";

interface DecodedToken extends JwtPayload {
    sub: string;
    "custom:role"?: string;
}

// Update the Request interface for multiple roles
declare global {
    namespace Express {
        interface Request {
            user?: {
                id: number
                cognitoId: string; // Added for UUID
                roles: Role[];
            }
        }
    }
}

export const authMiddleware = (allowedRoles: Role[]) => {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        const authHeader = req.headers.authorization;
        
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            res.status(401).json({ message: "Missing or malformed token" });
            return;
        }

        const token = authHeader.split(" ")[1];

        if (!token) {
            res.status(401).json({ message: "No token provided, authorization denied" });
            return;
        }

        try {
            const decoded = jwt.decode(token) as DecodedToken;
            const cognitoId = decoded.sub;
            
            // Get the user from database using cognitoId
            const user = await prisma.user.findUnique({
                where: { cognitoId },
                select: { id: true, roles: true }
            });
            
            if (!user) {
                res.status(400).json({ message: "User not found in system" });
                return;
            }

            // Set the user object with roles array
            req.user = {
                id: user.id, // Numeric ID from database
                cognitoId,   // Keep the original UUID from token
                roles: user.roles  // Now an array from the database
            }

            // Check if user has any of the allowed roles
            const hasAccess = allowedRoles.some(role => 
                user.roles.includes(role as Role)
            );
            
            if (!hasAccess) {
                res.status(403).json({ message: "Access Denied. Insufficient permissions." });
                return;
            }

            next();
        } catch(err) {
            console.error("Failed to decode token:", err);
            res.status(400).json({ message: "Invalid token" });
            return;
        }
    };
};