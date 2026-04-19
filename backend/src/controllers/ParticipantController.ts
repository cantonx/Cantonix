/**
 * ParticipantController.ts
 *
 * HTTP handlers for Canton Participant Node status.
 *
 * Routes:
 *   GET /api/participant/status  → Participant Node health + Ledger API health
 */

import { Request, Response } from 'express';
import { cantonParticipantProvider } from '../providers/canton/CantonParticipantProvider';

export class ParticipantController {

  // GET /api/participant/status  [auth required]
  getStatus = async (req: Request, res: Response): Promise<void> => {
    if (!req.user) { res.status(401).json({ error: 'Not authenticated' }); return; }

    try {
      const [participantStatus, ledgerHealth] = await Promise.all([
        cantonParticipantProvider.getParticipantStatus(),
        cantonParticipantProvider.getLedgerHealth(),
      ]);

      res.json({
        participant: participantStatus,
        ledger:      ledgerHealth,
      });
    } catch (err) {
      console.error('[ParticipantController]', err);
      res.status(500).json({ error: 'Failed to retrieve participant status' });
    }
  };
}
