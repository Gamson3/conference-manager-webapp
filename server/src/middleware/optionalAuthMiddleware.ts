//Optional authentication middleware to support where we should have guests

import prisma from '../lib/prisma';
import { NextFunction, Request, Response } from "express";
import { createRemoteJWKSet, jwtVerify, JWTPayload } from "jose";
import { roleFromGroups } from "../utils/roleMapper";

/**
 * ADR-008 Phase 6: Optional Auth Hardening
 *
 * This middleware MUST verify tokens cryptographically (via JWKS), NOT just decode them.
 * A decode-only approach would allow attackers to forge cognito:groups claims.
 * If verification fails, the request continues as a guest (no req.user).
 */

interface CognitoJwtPayload extends JWTPayload {
  sub: string;
  token_use?: "id" | "access" | "refresh";
  "cognito:groups"?: string[];
  client_id?: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number
        cognitoId: string;
        role: string;
      }
    }
  }
}

export const optionalAuthMiddleware = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Test environment shortcut: allow header-based auth injection for Vitest/Supertest
    if (process.env.NODE_ENV === 'test') {
      const testUserId = req.headers['x-user-id'] as string | undefined;
      const testUserRole = (req.headers['x-user-role'] as string | undefined)?.toLowerCase();
      if (testUserId) {
        const userIdNum = Number(testUserId);
        if (!Number.isNaN(userIdNum)) {
          const dbUser = await prisma.user.findUnique({ where: { id: userIdNum }, select: { id: true, cognitoId: true, role: true } });
          if (dbUser) {
            const role = (testUserRole || (dbUser.role as string)).toLowerCase();
            req.user = { id: dbUser.id, cognitoId: dbUser.cognitoId, role };
            next();
            return;
          }
        }
      }
    }

    const authHeader = req.headers.authorization;

    // If no auth header, continue as guest
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('[OPTIONAL AUTH] No token provided - continuing as guest');
      next();
      return;
    }

    const token = authHeader.substring(7);

    // Resolve Cognito configuration
    const rawRegion = process.env.AWS_REGION;
    const poolIdEnv = process.env.AWS_COGNITO_USER_POOL_ID;
    const clientId = process.env.AWS_COGNITO_USER_POOL_CLIENT_ID;
    let region: string | undefined = rawRegion;
    let userPoolId: string | undefined = poolIdEnv;

    if (!userPoolId && rawRegion && rawRegion.includes("_")) {
      const [r] = rawRegion.split("_");
      region = r;
      userPoolId = rawRegion;
    }

    if (!region || !userPoolId) {
      console.error('[OPTIONAL AUTH] Cognito config missing - continuing as guest');
      next();
      return;
    }

    const issuer = `https://cognito-idp.${region}.amazonaws.com/${userPoolId}`;
    const jwksUrl = new URL(`${issuer}/.well-known/jwks.json`);

    try {
      const JWKS = createRemoteJWKSet(jwksUrl);
      const { payload } = await jwtVerify(token, JWKS, { issuer });
      const claims = payload as CognitoJwtPayload;

      // Only accept access tokens for authorization (ADR-008)
      if (claims.token_use !== 'access') {
        console.log('[OPTIONAL AUTH] Non-access token provided - continuing as guest');
        next();
        return;
      }

      // Validate client_id if configured
      if (clientId && claims.client_id && claims.client_id !== clientId) {
        console.log('[OPTIONAL AUTH] Token client mismatch - continuing as guest');
        next();
        return;
      }

      const cognitoId = claims.sub;
      const tokenRole = roleFromGroups(claims["cognito:groups"]);

      const user = await prisma.user.findUnique({
        where: { cognitoId },
        select: { id: true, role: true }
      });

      if (user) {
        // Non-blocking DB sync (ADR-008 Phase 5)
        if (user.role !== tokenRole) {
          prisma.user.update({
            where: { id: user.id },
            data: { role: tokenRole }
          }).then(() => {
            console.log(`[OPTIONAL AUTH DB SYNC] user ${user.id}: ${user.role} → ${tokenRole}`);
          }).catch((err: unknown) => {
            const msg = err instanceof Error ? err.message : String(err);
            console.error(`[OPTIONAL AUTH DB SYNC] failed for user ${user.id}:`, msg);
          });
        }

        req.user = { id: user.id, cognitoId, role: tokenRole };
        console.log('[OPTIONAL AUTH] Token verified for user:', user.id);
      } else {
        console.log('[OPTIONAL AUTH] Token valid but user not in DB - continuing as guest');
      }
    } catch (jwtError: unknown) {
      const message = jwtError instanceof Error ? jwtError.message : 'Verification failed';
      console.log('[OPTIONAL AUTH] Token verification failed, continuing as guest:', message);
    }

    next();
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal error';
    console.log('[OPTIONAL AUTH] Unexpected error, continuing as guest:', message);
    next();
  }
};
