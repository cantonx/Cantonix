/**
 * onboarding.ts — routes
 *
 * POST /api/onboarding/approve  → ADMIN/OPERATOR only
 * POST /api/onboarding/reject   → ADMIN/OPERATOR only
 * GET  /api/onboarding/pending  → ADMIN/OPERATOR only
 * GET  /api/onboarding/status   → any authenticated user (own status)
 */

import { Router } from 'express';
import { OnboardingController } from '../controllers/OnboardingController';
import { authenticate } from '../middleware/authenticate';
import { requireRole } from '../middleware/requireRole';

const controller = new OnboardingController();
const router     = Router();

router.post('/approve', authenticate, requireRole(['ADMIN', 'OPERATOR']), controller.approve);
router.post('/reject',  authenticate, requireRole(['ADMIN', 'OPERATOR']), controller.reject);
router.get('/pending',  authenticate, requireRole(['ADMIN', 'OPERATOR']), controller.pending);
router.get('/status',   authenticate,                                      controller.status);

export default router;
