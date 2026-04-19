/**
 * OnboardingController.ts
 *
 * HTTP handlers for Canton-style sponsor-based party onboarding.
 *
 * Routes:
 *   POST /api/onboarding/invite   → sponsor issues invitation code
 *   POST /api/onboarding/request  → user requests onboarding (via signup)
 *   POST /api/onboarding/approve  → sponsor approves → Canton Party created
 *   POST /api/onboarding/reject   → sponsor rejects
 *   GET  /api/onboarding/status   → user checks their onboarding status
 *   GET  /api/onboarding/pending  → sponsor lists pending requests
 */

import { Request, Response } from 'express';
import {
  issueInvitation,
  approveOnboarding,
  rejectOnboarding,
  getOnboardingStatus,
  getPendingRequests,
  OnboardingError,
} from '../services/OnboardingService';

export class OnboardingController {

  // POST /api/onboarding/invite  [auth required — approved users only]
  invite = async (req: Request, res: Response): Promise<void> => {
    if (!req.user) { res.status(401).json({ error: 'Not authenticated' }); return; }

    const { expiresInHours } = req.body as { expiresInHours?: number };

    try {
      const result = await issueInvitation(req.user.sub, expiresInHours);
      res.status(201).json(result);
    } catch (err) {
      this.handleError(err, res);
    }
  };

  // POST /api/onboarding/approve  [auth required — sponsor/admin only]
  approve = async (req: Request, res: Response): Promise<void> => {
    if (!req.user) { res.status(401).json({ error: 'Not authenticated' }); return; }

    const { requestId, note } = req.body as { requestId?: string; note?: string };

    if (!requestId) {
      res.status(400).json({ error: 'requestId is required' });
      return;
    }

    try {
      const result = await approveOnboarding(requestId, req.user.sub, note);
      res.json({
        message: 'Onboarding approved. Canton Party created.',
        partyId: result.partyId,
        requestId,
      });
    } catch (err) {
      this.handleError(err, res);
    }
  };

  // POST /api/onboarding/reject  [auth required — sponsor/admin only]
  reject = async (req: Request, res: Response): Promise<void> => {
    if (!req.user) { res.status(401).json({ error: 'Not authenticated' }); return; }

    const { requestId, note } = req.body as { requestId?: string; note?: string };

    if (!requestId) {
      res.status(400).json({ error: 'requestId is required' });
      return;
    }

    try {
      await rejectOnboarding(requestId, req.user.sub, note);
      res.json({ message: 'Onboarding request rejected.', requestId });
    } catch (err) {
      this.handleError(err, res);
    }
  };

  // GET /api/onboarding/status  [auth required]
  status = async (req: Request, res: Response): Promise<void> => {
    if (!req.user) { res.status(401).json({ error: 'Not authenticated' }); return; }

    try {
      const status = await getOnboardingStatus(req.user.sub);
      if (!status) {
        // Bootstrap user — auto-approved, no request record
        res.json({
          requestId:  null,
          status:     req.user.onboardingStatus,
          partyId:    req.user.partyId,
          sponsorId:  null,
          createdAt:  null,
          reviewedAt: null,
          reviewNote: null,
        });
        return;
      }
      res.json(status);
    } catch (err) {
      this.handleError(err, res);
    }
  };

  // GET /api/onboarding/pending  [auth required — sponsor only]
  pending = async (req: Request, res: Response): Promise<void> => {
    if (!req.user) { res.status(401).json({ error: 'Not authenticated' }); return; }

    try {
      const requests = await getPendingRequests(req.user.sub);
      res.json(requests);
    } catch (err) {
      this.handleError(err, res);
    }
  };

  // ─── Error handler ────────────────────────────────────────────────────

  private handleError(err: unknown, res: Response): void {
    if (err instanceof OnboardingError) {
      res.status(err.statusCode).json({ error: err.message });
      return;
    }
    console.error('[OnboardingController]', err);
    res.status(500).json({ error: 'Onboarding operation failed' });
  }
}
