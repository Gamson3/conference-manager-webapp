import prisma from "../lib/prisma";
import { NextFunction, Request, Response } from "express";
import { createRemoteJWKSet, jwtVerify, JWTPayload } from "jose";
import { roleFromGroups } from "../utils/roleMapper";

interface CognitoJwtPayload extends JWTPayload {
    sub: string;
    token_use?: "id" | "access" | "refresh";
    // Legacy custom:role retained but ignored for authorization decisions.
    "custom:role"?: string;
    "cognito:groups"?: string[];
    aud?: string;
    client_id?: string;
}

const isJwtExpiredError = (err: unknown): boolean => {
    if (typeof err !== "object" || err === null) return false;
    const code = (err as Record<string, unknown>)["code"];
    return code === "ERR_JWT_EXPIRED";
};

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
        // Test environment shortcut: allow header-based auth injection for Vitest/Supertest
        // This avoids relying on Cognito JWTs during automated tests.
        if (process.env.NODE_ENV === 'test') {
            const testUserId = req.headers['x-user-id'] as string | undefined;
            const testUserRole = (req.headers['x-user-role'] as string | undefined)?.toLowerCase();
            if (testUserId) {
                const userIdNum = Number(testUserId);
                if (!Number.isNaN(userIdNum)) {
                    const dbUser = await prisma.user.findUnique({ where: { id: userIdNum }, select: { id: true, cognitoId: true, role: true } });
                    if (!dbUser) {
                        res.status(400).json({ message: "User not found in system" });
                        return;
                    }
                    const role = (testUserRole || (dbUser.role as string)).toLowerCase();
                    req.user = { id: dbUser.id, cognitoId: dbUser.cognitoId, role };
                    const hasAccess = allowedRoles.includes(role);
                    if (!hasAccess) {
                        res.status(403).json({ message: "Access Denied. Insufficient permissions." });
                        return;
                    }
                    next();
                    return;
                }
            }
        }

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

        // Resolve Cognito region and pool ID from env, with a guard for common misconfiguration
        const rawRegion = process.env.AWS_REGION;
        const poolIdEnv = process.env.AWS_COGNITO_USER_POOL_ID;
        const clientId = process.env.AWS_COGNITO_USER_POOL_CLIENT_ID;
        let region: string | undefined = rawRegion;
        let userPoolId: string | undefined = poolIdEnv;

        // If user pool ID isn't provided, try to infer it from a mistakenly combined AWS_REGION value like "eu-north-1_xxxxx"
        if (!userPoolId && rawRegion && rawRegion.includes("_")) {
            const [r] = rawRegion.split("_");
            region = r;
            userPoolId = rawRegion; // full string looks like region_poolId
        }

        if (!region || !userPoolId) {
            console.error("Cognito configuration missing. Expected AWS_REGION and AWS_COGNITO_USER_POOL_ID.");
            res.status(500).json({ message: "Server auth configuration error" });
            return;
        }

        const issuer = `https://cognito-idp.${region}.amazonaws.com/${userPoolId}`;
        const jwksUrl = new URL(`${issuer}/.well-known/jwks.json`);

        try {
            // jose caches keys internally for the remote JWKS
            const JWKS = createRemoteJWKSet(jwksUrl);
            const { payload } = await jwtVerify(token, JWKS, {
                issuer,
            });

            const claims = payload as CognitoJwtPayload;

            // Token-wins invariant: authorization is derived exclusively from a VERIFIED Cognito access token (JWT).
            if (claims.token_use !== "access") {
                res.status(401).json({ message: "Unsupported token type" });
                return;
            }

            // Confirm client_id on access tokens if available
            if (clientId && claims.client_id && claims.client_id !== clientId) {
                res.status(401).json({ message: "Invalid token client" });
                return;
            }

            const cognitoId = claims.sub;

            const tokenRole = roleFromGroups(claims["cognito:groups"]);

            const user = await prisma.user.findUnique({
                where: { cognitoId },
                select: { id: true, role: true }
            });

            if (!user) {
                res.status(400).json({ message: "User not found in system" });
                return;
            }

            /**
             * DB ROLE SYNC (Phase 5 — Mirror Policy):
             *
             * The database role is updated to match the token-derived role on every request.
             * This ensures the DB stays consistent for queries/reports/filtering.
             *
             * IMPORTANT: This sync is NON-BLOCKING.
             * - Authorization proceeds using tokenRole regardless of sync outcome.
             * - DB failures are logged but do not deny access.
             * - See: ADR-008 Non-Blocking Sync Rule
             */
            if (user.role !== tokenRole) {
                prisma.user.update({
                    where: { id: user.id },
                    data: { role: tokenRole }
                }).then(() => {
                    console.log(`[DB SYNC] Synced role for user ${user.id}: ${user.role} → ${tokenRole}`);
                }).catch((syncErr: unknown) => {
                    const syncMsg = syncErr instanceof Error ? syncErr.message : String(syncErr);
                    console.error(`[DB SYNC] Failed for user ${user.id}:`, syncMsg);
                });
            }

            req.user = { id: user.id, cognitoId, role: tokenRole };

            const hasAccess = allowedRoles.includes(tokenRole);
            if (!hasAccess) {
                res.status(403).json({ message: "Access Denied. Insufficient permissions." });
                return;
            }

            next();

        } catch (err: unknown) {
            // jose throws for invalid signature, expired/nbf, issuer mismatch, etc.
            const msg = isJwtExpiredError(err) ? "Token expired" : "Invalid token";
            const errMessage = err instanceof Error ? err.message : String(err);
            console.error("JWT verification failed:", errMessage);
            res.status(401).json({ message: msg });
            return;
        }
    };
};