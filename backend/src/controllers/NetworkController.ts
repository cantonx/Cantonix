/**
 * NetworkController.ts
 * Handles HTTP for aggregate network status. Auth required.
 */

import { Request, Response } from 'express';
import { ValidatorService } from '../services/ValidatorService';

export class NetworkController {
  constructor(private readonly validatorService: ValidatorService) {}

  // GET /api/network/status  [auth required]
  getStatus = async (req: Request, res: Response): Promise<void> => {
    if (!req.user) { res.status(401).json({ error: 'Not authenticated' }); return; }

    try {
      const status = await this.validatorService.getNetworkStatus(req.user);
      res.json(status);
    } catch {
      res.status(500).json({ error: 'Failed to retrieve network status' });
    }
  };
}
