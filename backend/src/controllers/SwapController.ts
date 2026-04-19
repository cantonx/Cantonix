/**
 * SwapController.ts
 * Handles HTTP for CC swap operations. Auth required.
 */

import { Request, Response } from 'express';
import { SwapService, SwapValidationError } from '../services/SwapService';
import type { SwapRequest } from '../models/swap.model';

export class SwapController {
  constructor(private readonly swapService: SwapService) {}

  // GET /api/swap/history  [auth required]
  history = async (req: Request, res: Response): Promise<void> => {
    if (!req.user) { res.status(401).json({ error: 'Not authenticated' }); return; }
    try {
      const history = await this.swapService.getHistory(req.user.sub);
      res.json(history);
    } catch {
      res.status(500).json({ error: 'Failed to retrieve swap history' });
    }
  };

  // POST /api/swap/execute  [auth required]
  execute = async (req: Request, res: Response): Promise<void> => {
    if (!req.user) { res.status(401).json({ error: 'Not authenticated' }); return; }

    try {
      const result = await this.swapService.execute(req.body as SwapRequest, req.user);
      res.json(result);
    } catch (err) {
      if (err instanceof SwapValidationError) {
        res.status(400).json({ error: err.message });
        return;
      }
      res.status(502).json({ error: 'Swap execution failed' });
    }
  };
}
