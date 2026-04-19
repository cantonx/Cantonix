/**
 * ValidatorController.ts
 *
 * HTTP handler for participant node status and user onboarding.
 * All endpoints require authentication — data is scoped to req.user.
 */

import { Request, Response } from 'express';
import axios, { AxiosError } from 'axios';
import { ValidatorService } from '../services/ValidatorService';
import { authHeaders } from '../services/AuthService';
import { config } from '../config/app.config';

export class ValidatorController {
  constructor(private readonly validatorService: ValidatorService) {}

  // GET /api/validators/status  [auth required]
  getStatus = async (req: Request, res: Response): Promise<void> => {
    if (!req.user) { res.status(401).json({ error: 'Not authenticated' }); return; }

    try {
      const validators = await this.validatorService.getAllStatuses(req.user);
      res.json(validators);
    } catch {
      res.status(500).json({ error: 'Failed to retrieve participant node status' });
    }
  };

  // POST /api/validators/onboard  [auth required]
  onboard = async (req: Request, res: Response): Promise<void> => {
    if (!req.user) { res.status(401).json({ error: 'Not authenticated' }); return; }

    const { secret, partyHint } = req.body as {
      secret?: string;
      partyHint?: string;
    };

    if (!secret || typeof secret !== 'string' || !secret.trim()) {
      res.status(400).json({ error: 'Secret is required' });
      return;
    }
    if (secret.trim().length < 8) {
      res.status(400).json({ error: 'Secret must be at least 8 characters' });
      return;
    }

    try {
      const headers = await authHeaders('app-provider');

      // POST /v0/admin/users  (Splice Validator App, port x903)
      // The secret from the SV Web UI is used as the user ID in Quickstart mode.
      const response = await axios.post(
        `${config.validatorUri}/v0/admin/users`,
        {
          id:            secret.trim(),
          ...(partyHint ? { party_id_hint: partyHint.trim() } : {}),
        },
        { headers, timeout: 10_000 }
      );

      res.json({
        ...response.data,
        registeredBy: req.user.email,
        partyId:      req.user.partyId,
      });
    } catch (err) {
      if (config.isDev) {
        res.json({
          partyId:      req.user.partyId,
          registeredBy: req.user.email,
          note:         'Simulated onboarding (Canton Validator App not reachable)',
        });
        return;
      }

      const axiosErr = err as AxiosError<{ error?: string }>;
      const status  = axiosErr.response?.status ?? 502;
      const message = axiosErr.response?.data?.error
        ?? axiosErr.message
        ?? 'Failed to onboard user on Validator App';
      res.status(status).json({ error: message });
    }
  };
}
