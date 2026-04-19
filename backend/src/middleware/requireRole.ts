/**
 * requireRole.ts
 *
 * RBAC middleware — restricts endpoints to specific roles.
 *
 * Usage:
 *   router.post('/create', authenticate, requireRole(['ADMIN', 'OPERATOR']), controller.create);
 *
 * Canton alignment:
 *   Only authorized Participants (ADMIN/OPERATOR) can onboard new Parties.
 *   Regular users (USER role) have no authority to invite or approve.
 */

import { Request, Response, NextFunction } from 'express';
import type { UserRole } from '../models/user.model';

export function requireRole(roles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    if (!roles.includes(req.user.role as UserRole)) {
      res.status(403).json({
        error: `Access denied. Required role: ${roles.join(' or ')}. Your role: ${req.user.role}`,
      });
      return;
    }

    next();
  };
}
