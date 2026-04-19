/**
 * invitations.ts — routes
 *
 * POST /api/invitations/create  → ADMIN/OPERATOR only
 * GET  /api/invitations         → ADMIN only
 * POST /api/invitations/revoke  → ADMIN/OPERATOR only
 */

import { Router } from 'express';
import { InvitationController } from '../controllers/InvitationController';
import { authenticate } from '../middleware/authenticate';
import { requireRole } from '../middleware/requireRole';

const controller = new InvitationController();
const router     = Router();

router.post('/create', authenticate, requireRole(['ADMIN', 'OPERATOR']), controller.create);
router.get('/',        authenticate, requireRole(['ADMIN']),              controller.list);
router.post('/revoke', authenticate, requireRole(['ADMIN', 'OPERATOR']), controller.revoke);

export default router;
