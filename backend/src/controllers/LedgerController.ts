/**
 * LedgerController.ts
 *
 * Proxies requests to the Canton JSON Ledger API (ports x975).
 * Injects auth headers automatically based on AUTH_MODE.
 *
 * Participants: app-user (2975) | app-provider (3975) | super (4975)
 */

import { Request, Response } from 'express';
import axios, { AxiosError } from 'axios';
import { authHeaders, type Participant } from '../services/AuthService';
import { config } from '../config/app.config';

type ParticipantKey = 'app-user' | 'app-provider' | 'super';

const JSON_API_BASE: Record<ParticipantKey, () => string> = {
  'app-user':     () => config.jsonApiUrls.appUser,
  'app-provider': () => config.jsonApiUrls.appProvider,
  'super':        () => config.jsonApiUrls.super,
};

function resolveParticipant(raw: unknown): ParticipantKey | null {
  if (raw === 'app-user' || raw === 'app-provider' || raw === 'super') return raw;
  return null;
}

async function proxy(
  method: 'GET' | 'POST',
  participant: ParticipantKey,
  path: string,
  body: unknown,
  res: Response,
  contentType = 'application/json',
  timeoutMs = 15_000
): Promise<void> {
  const url = `${JSON_API_BASE[participant]()}${path}`;
  const headers = await authHeaders(participant as Participant);

  try {
    const response = await axios({
      method,
      url,
      data:    method === 'POST' ? body : undefined,
      headers: { 'Content-Type': contentType, ...headers },
      timeout: timeoutMs,
    });
    res.status(response.status).json(response.data);
  } catch (err) {
    const axiosErr = err as AxiosError;
    if (axiosErr.response) {
      res.status(axiosErr.response.status).json(axiosErr.response.data);
    } else {
      res.status(502).json({ error: 'Canton JSON API unreachable', detail: axiosErr.message, url });
    }
  }
}

export class LedgerController {
  // GET /api/ledger/:participant/v2/parties
  listParties = async (req: Request, res: Response): Promise<void> => {
    const p = resolveParticipant(req.params.participant);
    if (!p) { res.status(400).json({ error: 'Invalid participant' }); return; }
    await proxy('GET', p, '/v2/parties', null, res);
  };

  // POST /api/ledger/:participant/v2/parties
  createParty = async (req: Request, res: Response): Promise<void> => {
    const p = resolveParticipant(req.params.participant);
    if (!p) { res.status(400).json({ error: 'Invalid participant' }); return; }
    const { partyIdHint } = req.body as { partyIdHint?: string };
    if (!partyIdHint) { res.status(400).json({ error: 'partyIdHint is required' }); return; }
    await proxy('POST', p, '/v2/parties', { partyIdHint }, res);
  };

  // GET /api/ledger/:participant/v2/users
  listUsers = async (req: Request, res: Response): Promise<void> => {
    const p = resolveParticipant(req.params.participant);
    if (!p) { res.status(400).json({ error: 'Invalid participant' }); return; }
    await proxy('GET', p, '/v2/users', null, res);
  };

  // GET /api/ledger/:participant/v2/users/:userId
  getUser = async (req: Request, res: Response): Promise<void> => {
    const p = resolveParticipant(req.params.participant);
    if (!p) { res.status(400).json({ error: 'Invalid participant' }); return; }
    await proxy('GET', p, `/v2/users/${req.params.userId}`, null, res);
  };

  // POST /api/ledger/:participant/v2/packages  (DAR upload — octet-stream)
  uploadDar = async (req: Request, res: Response): Promise<void> => {
    const p = resolveParticipant(req.params.participant);
    if (!p) { res.status(400).json({ error: 'Invalid participant' }); return; }
    await proxy('POST', p, '/v2/packages', req.body, res, 'application/octet-stream', 30_000);
  };

  // POST /api/ledger/:participant/v2/commands/submit-and-wait
  submitCommand = async (req: Request, res: Response): Promise<void> => {
    const p = resolveParticipant(req.params.participant);
    if (!p) { res.status(400).json({ error: 'Invalid participant' }); return; }
    await proxy('POST', p, '/v2/commands/submit-and-wait', req.body, res);
  };
}
