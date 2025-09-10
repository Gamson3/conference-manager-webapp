import { NextFunction, Request, Response } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";
import prisma from "../lib/prisma";
import { Role } from "@prisma/client";

// Allow strings or Role enum
type AllowedRole = Role | string;
const toRoleStr = (r: AllowedRole) => String(r).toLowerCase();
const hasAnyAllowedRole = (userRoles: (Role | string)[] = [], allowed: AllowedRole[] = []) => {
  if (!allowed.length) return true;
  const userSet = new Set(userRoles.map(toRoleStr));
  return allowed.some(r => userSet.has(toRoleStr(r)));
};

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

// Export middleware that accepts string literals or enums
export const authMiddleware = (allowedRoles: AllowedRole[] = []) => {
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

      req.user = {
        id: user.id,
        cognitoId,
        roles: user.roles // Role[] from DB
      };

      // CHANGED: Role gate now supports strings or enums (case-insensitive)
      if (!hasAnyAllowedRole(req.user?.roles || [], allowedRoles)) {
        res.status(403).json({ message: "Access Denied. Insufficient permissions." });
        return;
      }

      next();
    } catch (err) {
      console.error("Failed to decode token:", err);
      res.status(400).json({ message: "Invalid token" });
      return;
    }
  };
};