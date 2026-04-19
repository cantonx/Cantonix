/**
 * participant.ts — routes
 *
 * Canton Participant Node status endpoints.
 *
 * GET /api/participant/status  → Participant Node + Ledger API health
 */

import { Router } from 'express';
import { ParticipantController } from '../controllers/ParticipantController';
import { authenticate } from '../middleware/authenticate';

const controller = new ParticipantController();
const router     = Router();

router.get('/status', authenticate, controller.getStatus);

export default router;
