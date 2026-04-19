/**
 * InvitationController.ts
 *
 * POST /api/invitations/create  → ADMIN/OPERATOR only
 * GET  /api/invitations         → ADMIN only
 * POST /api/invitations/revoke  → ADMIN/OPERATOR only
 */

import { Request, Response } from 'express';
import {
  createInvitation,
  listInvitations,
  revokeInvitation,
  InvitationError,
} from '../services/InvitationService';

export class InvitationController {

  // POST /api/invitations/create
  create = async (req: Request, res: Response): Promise<void> => {
    if (!req.user) { res.status(401).json({ error: 'Not authenticated' }); return; }

    const { maxUses = 1, expiresInHours = 48 } = req.body as {
      maxUses?: number;
      expiresInHours?: number;
    };

    try {
      const result = await createInvitation(req.user.sub, { maxUses, expiresInHours });
      res.status(201).json(result);
    } catch (err) {
      this.handleError(err, res);
    }
  };

  // GET /api/invitations
  list = async (req: Request, res: Response): Promise<void> => {
    if (!req.user) { res.status(401).json({ error: 'Not authenticated' }); return; }

    try {
      const results = await listInvitations();
      res.json(results);
    } catch (err) {
      this.handleError(err, res);
    }
  };

  // POST /api/invitations/revoke
  revoke = async (req: Request, res: Response): Promise<void> => {
    if (!req.user) { res.status(401).json({ error: 'Not authenticated' }); return; }

    const { id } = req.body as { id?: string };
    if (!id) { res.status(400).json({ error: 'id is required' }); return; }

    try {
      await revokeInvitation(id);
      res.json({ message: 'Invitation revoked.' });
    } catch (err) {
      this.handleError(err, res);
    }
  };

  private handleError(err: unknown, res: Response): void {
    if (err instanceof InvitationError) {
      res.status(err.statusCode).json({ error: err.message });
      return;
    }
    console.error('[InvitationController]', err);
    res.status(500).json({ error: 'Operation failed' });
  }
}
