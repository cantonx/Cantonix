/**
 * authenticate.ts
 *
 * JWT authentication middleware.
 * Verifies the Bearer token and attaches the decoded payload to req.user.
 *
 * Usage:
 *   router.get('/protected', authenticate, controller.handler);
 *
 * After this middleware runs, req.user is guaranteed to be set:
 *   req.user.sub     → user ID
 *   req.user.email   → user email
 *   req.user.partyId → Canton Party ID (simulated or real)
 */

import { Request, Response, NextFunction } from 'express';
import { verifyToken, AuthError } from '../services/UserAuthService';
import type { JwtPayload } from '../models/user.model';

// Extend Express Request to carry the authenticated user
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export function authenticate(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Authorization header missing or malformed' });
    return;
  }

  const token = authHeader.slice(7); // strip "Bearer "

  try {
    req.user = verifyToken(token);
    next();
  } catch (err) {
    if (err instanceof AuthError) {
      res.status(err.statusCode).json({ error: err.message });
    } else {
      res.status(401).json({ error: 'Authentication failed' });
    }
  }
}
