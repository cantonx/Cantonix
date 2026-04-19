/**
 * AuthController.ts
 * Handles HTTP for Keycloak token acquisition (oauth2 mode only).
 */

import { Request, Response } from 'express';
import { getBearerToken, type Participant } from '../services/AuthService';
import { config } from '../config/app.config';

const VALID_PARTICIPANTS: Participant[] = ['app-user', 'app-provider', 'super'];

export class AuthController {
  // POST /api/auth/token
  getToken = async (req: Request, res: Response): Promise<void> => {
    if (config.authMode !== 'oauth2') {
      res.status(501).json({ error: 'Token endpoint requires AUTH_MODE=oauth2' });
      return;
    }

    const { participant } = req.body as { participant?: string };
    if (!participant || !VALID_PARTICIPANTS.includes(participant as Participant)) {
      res.status(400).json({
        error: `participant must be one of: ${VALID_PARTICIPANTS.join(', ')}`,
      });
      return;
    }

    try {
      const token = await getBearerToken(participant as Participant);
      res.json({ token, participant });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      res.status(502).json({ error: 'Failed to acquire token from Keycloak', detail: message });
    }
  };
}
