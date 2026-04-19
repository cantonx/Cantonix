/**
 * OnboardingController.ts
 *
 * POST /api/onboarding/approve  → ADMIN/OPERATOR only
 * POST /api/onboarding/reject   → ADMIN/OPERATOR only
 * GET  /api/onboarding/pending  → ADMIN/OPERATOR only
 * GET  /api/onboarding/status   → authenticated user (own status)
 */

import { Request, Response } from 'express';
import {
  approveOnboarding,
  rejectOnboarding,
  getPendingRequests,
  getOnboardingStatus,
  OnboardingError,
} from '../services/OnboardingService';

export class OnboardingController {

  // POST /api/onboarding/approve  [ADMIN/OPERATOR]
  approve = async (req: Request, res: Response): Promise<void> => {
    if (!req.user) { res.status(401).json({ error: 'Not authenticated' }); return; }

    const { requestId, note } = req.body as { requestId?: string; note?: string };
    if (!requestId) { res.status(400).json({ error: 'requestId is required' }); return; }

    try {
      const result = await approveOnboarding(requestId, req.user.sub, note);
      res.json({
        message:   'Onboarding approved. Canton Party created.',
        partyId:   result.partyId,
        requestId,
      });
    } catch (err) {
      this.handleError(err, res);
    }
  };

  // POST /api/onboarding/reject  [ADMIN/OPERATOR]
  reject = async (req: Request, res: Response): Promise<void> => {
    if (!req.user) { res.status(401).json({ error: 'Not authenticated' }); return; }

    const { requestId, note } = req.body as { requestId?: string; note?: string };
    if (!requestId) { res.status(400).json({ error: 'requestId is required' }); return; }

    try {
      await rejectOnboarding(requestId, req.user.sub, note);
      res.json({ message: 'Onboarding request rejected.', requestId });
    } catch (err) {
      this.handleError(err, res);
    }
  };

  // GET /api/onboarding/pending  [ADMIN/OPERATOR]
  pending = async (req: Request, res: Response): Promise<void> => {
    if (!req.user) { res.status(401).json({ error: 'Not authenticated' }); return; }

    try {
      const requests = await getPendingRequests();
      res.json(requests);
    } catch (err) {
      this.handleError(err, res);
    }
  };

  // GET /api/onboarding/status  [any authenticated user]
  status = async (req: Request, res: Response): Promise<void> => {
    if (!req.user) { res.status(401).json({ error: 'Not authenticated' }); return; }

    try {
      const status = await getOnboardingStatus(req.user.sub);
      if (!status) {
        // Bootstrap admin — no request record
        res.json({
          requestId:  null,
          status:     req.user.onboardingStatus,
          partyId:    req.user.partyId,
          reviewNote: null,
          reviewedAt: null,
          createdAt:  null,
        });
        return;
      }
      res.json(status);
    } catch (err) {
      this.handleError(err, res);
    }
  };

  private handleError(err: unknown, res: Response): void {
    if (err instanceof OnboardingError) {
      res.status(err.statusCode).json({ error: err.message });
      return;
    }
    console.error('[OnboardingController]', err);
    res.status(500).json({ error: 'Operation failed' });
  }
}
