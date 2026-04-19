/**
 * onboarding.ts — routes
 *
 * Canton-style sponsor-based party onboarding endpoints.
 * All routes require authentication.
 *
 * POST /api/onboarding/invite   → sponsor issues invitation code
 * POST /api/onboarding/approve  → sponsor approves onboarding request
 * POST /api/onboarding/reject   → sponsor rejects onboarding request
 * GET  /api/onboarding/status   → user checks their onboarding status
 * GET  /api/onboarding/pending  → sponsor lists pending requests
 */

import { Router } from 'express';
import { OnboardingController } from '../controllers/OnboardingController';
import { authenticate } from '../middleware/authenticate';

const controller = new OnboardingController();
const router     = Router();

router.post('/invite',  authenticate, controller.invite);
router.post('/approve', authenticate, controller.approve);
router.post('/reject',  authenticate, controller.reject);
router.get('/status',   authenticate, controller.status);
router.get('/pending',  authenticate, controller.pending);

export default router;
