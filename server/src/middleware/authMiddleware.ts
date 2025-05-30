import { PrismaClient } from "@prisma/client";
import { NextFunction, Request, Response } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";

const prisma = new PrismaClient();  // Create Prisma instance

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

export const authMiddleware = (allowedRoles: string[]) => {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        // const token = req.headers.authorization?.split(" ")[1];
        const authHeader = req.headers.authorization;
        
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
          res.status(401).json({ message: "Missing or malformed token" });
          return;
        }

        const token = authHeader.split(" ")[1];
        console.log(token)

        if (!token) {
            res.status(401).json({ message: "No token provided, authorization denied" });
            return;
        }

        try {
            const decoded = jwt.decode(token) as DecodedToken
            const cognitoId = decoded.sub;
            const userRole = (decoded["custom:role"] || "").toLowerCase();
            
            // Get the numeric userId from database using cognitoId
            const user = await prisma.user.findUnique({
                where: { cognitoId },
                select: { id: true, role: true }
            });
            
            if (!user) {
              res.status(400).json({ message: "User not found in system" });
              return;
            }
            // Set the user object with numeric ID
            req.user = {
                id: user.id, // Numeric ID from database
                cognitoId,   // Keep the original UUID from token
                role: userRole
            }

            // Role-based access control
            const hasAccess = allowedRoles.includes(userRole);
            if (!hasAccess) {
                res.status(403).json( { message: "Access Denied. Insufficient permissions." } );
                return;
            }

            next();

        } catch(err) {
            console.error("Failed to decode token:", err);
            res.status(400).json({ message: "Invalid token"})
            return;
        }
     
    };
};