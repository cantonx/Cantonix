/**
 * CantonParticipantProvider.ts
 *
 * Real Canton Participant Node integration via JSON Ledger API.
 * Activate by setting PROVIDER=canton in .env.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * CANTON JSON LEDGER API REFERENCE
 * Ref: https://docs.digitalasset.com/json-api/3.4/index.html
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Base URL: CANTON_API_URL (e.g. http://localhost:7575)
 * Auth:     Authorization: Bearer <CANTON_API_TOKEN>
 *
 * Endpoints used:
 *   POST /v2/parties              → Create a new Canton Party
 *   GET  /v2/parties              → List parties (health ping)
 *   GET  /v2/version              → Ledger API version + health
 *
 * Future endpoints (stubs prepared):
 *   POST /v2/commands/submit-and-wait  → Submit Daml command
 *   POST /v2/query                     → Query active contracts
 *   GET  /v2/transactions              → Fetch transaction stream
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * PROVIDER SWITCHING
 * ═══════════════════════════════════════════════════════════════════════════
 *   PROVIDER=mock   → all methods return simulated data instantly
 *   PROVIDER=canton → all methods call real Canton JSON Ledger API
 */

import axios, { AxiosError, AxiosInstance } from 'axios';
import { randomUUID } from 'crypto';
import { config } from '../../config/app.config';
import { formatLastChecked } from '../../utils/time';

// ─── Result types ─────────────────────────────────────────────────────────

export interface PartyCreationResult {
  /** Canton Party ID — format: "<hint>::<fingerprint>" */
  partyId: string;
  displayName: string;
  participantId: string;
  isMock: boolean;
}

export interface ParticipantStatusResult {
  participantId: string;
  synchronizerConnected: boolean;
  domainId: string | null;
  version: string;
  status: 'healthy' | 'degraded' | 'offline';
  latencyMs: number | null;
  error: string | null;
  lastChecked: string;
}

export interface LedgerHealthResult {
  available: boolean;
  latencyMs: number | null;
  version: string | null;
  error: string | null;
  lastChecked: string;
}

// ─── Canton JSON API response shapes ─────────────────────────────────────

interface CantonPartyDetails {
  party: string;
  displayName?: string;
  isLocal?: boolean;
  participantId?: string;
}

interface CantonCreatePartyResponse {
  partyDetails?: CantonPartyDetails;
  // Some versions return directly
  party?: string;
  displayName?: string;
}

interface CantonVersionResponse {
  version?: string;
  ledgerId?: string;
}

// ─── Provider ─────────────────────────────────────────────────────────────

export class CantonParticipantProvider {
  private readonly http: AxiosInstance;

  constructor() {
    // Build axios instance with Canton API base URL and auth token
    this.http = axios.create({
      baseURL: config.cantonApiUrl || config.jsonApiUrls.appProvider,
      timeout: 15_000,
      headers: {
        'Content-Type': 'application/json',
        ...(config.cantonApiToken
          ? { Authorization: `Bearer ${config.cantonApiToken}` }
          : {}),
      },
    });
  }

  // ─── Public API ──────────────────────────────────────────────────────────

  /**
   * Create a Canton Party for a newly approved user.
   *
   * Canton JSON Ledger API:
   *   POST /v2/parties
   *   Body: { "identifierHint": string, "displayName": string }
   *   Response: { "partyDetails": { "party": "hint::1220...", ... } }
   *
   * Ref: https://docs.digitalasset.com/json-api/3.4/index.html#tag/Parties/operation/allocateParty
   */
  async createParty(
    userId: string,
    partyHint?: string
  ): Promise<PartyCreationResult> {
    const hint = this.sanitizeHint(partyHint ?? `user-${userId.slice(0, 8)}`);

    if (config.providerMode === 'mock') {
      return this.mockCreateParty(hint);
    }

    return this.realCreateParty(hint);
  }

  /**
   * Check Participant Node health.
   *
   * Uses GET /v2/parties as a lightweight ping.
   * Falls back to GET /v2/version for version info.
   */
  async getParticipantStatus(): Promise<ParticipantStatusResult> {
    if (config.providerMode === 'mock') {
      return this.mockParticipantStatus();
    }

    return this.realParticipantStatus();
  }

  /**
   * Check JSON Ledger API health.
   *
   * Canton JSON Ledger API:
   *   GET /v2/version
   *   Response: { "version": "2.x.x", "ledgerId": "..." }
   */
  async getLedgerHealth(): Promise<LedgerHealthResult> {
    if (config.providerMode === 'mock') {
      return this.mockLedgerHealth();
    }

    return this.realLedgerHealth();
  }

  // ─── Part 10: Future extension stubs ─────────────────────────────────────

  /**
   * Submit a Daml command and wait for completion.
   *
   * Canton JSON Ledger API:
   *   POST /v2/commands/submit-and-wait
   *   Ref: https://docs.digitalasset.com/json-api/3.4/index.html#tag/Commands
   *
   * @stub — implement when Daml contracts are ready
   */
  async submitCommand(_payload: Record<string, unknown>): Promise<unknown> {
    if (config.providerMode === 'mock') {
      return { status: 'mock', commandId: randomUUID() };
    }

    // ── FUTURE INTEGRATION POINT ──────────────────────────────────────────
    // const response = await this.http.post('/v2/commands/submit-and-wait', payload);
    // return response.data;
    throw new Error('submitCommand: not yet implemented for canton mode');
  }

  /**
   * Query active Daml contracts.
   *
   * Canton JSON Ledger API:
   *   POST /v2/query
   *   Body: { "templateIds": ["Module:Template"], "query": {} }
   *   Ref: https://docs.digitalasset.com/json-api/3.4/index.html#tag/Query
   *
   * @stub — implement when Daml contracts are ready
   */
  async queryContracts(_templateIds: string[], _query?: Record<string, unknown>): Promise<unknown[]> {
    if (config.providerMode === 'mock') {
      return [];
    }

    // ── FUTURE INTEGRATION POINT ──────────────────────────────────────────
    // const response = await this.http.post('/v2/query', {
    //   templateIds,
    //   query: query ?? {},
    // });
    // return response.data?.activeContracts ?? [];
    throw new Error('queryContracts: not yet implemented for canton mode');
  }

  /**
   * Fetch transaction history.
   *
   * Canton JSON Ledger API:
   *   GET /v2/transactions
   *   Ref: https://docs.digitalasset.com/json-api/3.4/index.html#tag/Transactions
   *
   * @stub — implement when transaction history is needed
   */
  async fetchTransactions(_partyId: string, _limit = 20): Promise<unknown[]> {
    if (config.providerMode === 'mock') {
      return [];
    }

    // ── FUTURE INTEGRATION POINT ──────────────────────────────────────────
    // const response = await this.http.get('/v2/transactions', {
    //   params: { parties: partyId, limit },
    // });
    // return response.data?.transactions ?? [];
    throw new Error('fetchTransactions: not yet implemented for canton mode');
  }

  // ─── Real Canton implementations ─────────────────────────────────────────

  private async realCreateParty(hint: string): Promise<PartyCreationResult> {
    // POST /v2/parties
    // Ref: https://docs.digitalasset.com/json-api/3.4/index.html#tag/Parties/operation/allocateParty
    const response = await this.http.post<CantonCreatePartyResponse>('/v2/parties', {
      identifierHint: hint,
      displayName:    hint,
    });

    // Normalize response — different Canton versions use different shapes
    const data = response.data;
    const details = data.partyDetails;
    const partyId = details?.party ?? data.party;

    if (!partyId) {
      throw new Error(
        `Canton did not return a party ID. Response: ${JSON.stringify(data)}`
      );
    }

    return {
      partyId,
      displayName:   details?.displayName ?? data.displayName ?? hint,
      participantId: details?.participantId ?? 'canton-participant',
      isMock:        false,
    };
  }

  private async realParticipantStatus(): Promise<ParticipantStatusResult> {
    const checkedAt = new Date();
    const startTime = Date.now();

    try {
      // Use GET /v2/parties as a lightweight connectivity ping
      // This confirms the API is reachable and auth is valid
      await this.http.get('/v2/parties', { timeout: 5_000 });

      const latencyMs = Date.now() - startTime;

      // Also fetch version for additional info
      let version = 'unknown';
      try {
        const versionRes = await this.http.get<CantonVersionResponse>('/v2/version', { timeout: 3_000 });
        version = versionRes.data?.version ?? 'unknown';
      } catch { /* version is optional */ }

      return {
        participantId:        config.cantonApiUrl || 'canton-participant',
        synchronizerConnected: true,
        domainId:             null, // populated via Admin API in future
        version,
        status:               latencyMs < 2000 ? 'healthy' : 'degraded',
        latencyMs,
        error:                null,
        lastChecked:          formatLastChecked(checkedAt),
      };
    } catch (err) {
      return this.buildOfflineStatus(checkedAt, err);
    }
  }

  private async realLedgerHealth(): Promise<LedgerHealthResult> {
    const checkedAt = new Date();
    const startTime = Date.now();

    try {
      // GET /v2/version
      const response = await this.http.get<CantonVersionResponse>('/v2/version', {
        timeout: 5_000,
      });

      return {
        available:   true,
        latencyMs:   Date.now() - startTime,
        version:     response.data?.version ?? null,
        error:       null,
        lastChecked: formatLastChecked(checkedAt),
      };
    } catch (err) {
      const message = this.extractErrorMessage(err);
      return {
        available:   false,
        latencyMs:   null,
        version:     null,
        error:       message,
        lastChecked: formatLastChecked(checkedAt),
      };
    }
  }

  // ─── Error helpers ────────────────────────────────────────────────────────

  private buildOfflineStatus(
    checkedAt: Date,
    err: unknown
  ): ParticipantStatusResult {
    const axiosErr = err as AxiosError;
    const isTimeout  = axiosErr.code === 'ECONNABORTED' || axiosErr.code === 'ETIMEDOUT';
    const isAuth     = axiosErr.response?.status === 401 || axiosErr.response?.status === 403;
    const isNotFound = axiosErr.response?.status === 404;

    let status: ParticipantStatusResult['status'] = 'offline';
    if (isTimeout || isAuth) status = 'degraded';

    const message = isAuth
      ? 'Authentication failed — check CANTON_API_TOKEN'
      : isNotFound
      ? 'Endpoint not found — check CANTON_API_URL'
      : isTimeout
      ? 'Connection timed out'
      : this.extractErrorMessage(err);

    return {
      participantId:        config.cantonApiUrl || 'canton-participant',
      synchronizerConnected: false,
      domainId:             null,
      version:              'N/A',
      status,
      latencyMs:            isTimeout ? 5000 : null,
      error:                message,
      lastChecked:          formatLastChecked(checkedAt),
    };
  }

  private extractErrorMessage(err: unknown): string {
    const axiosErr = err as AxiosError<{ error?: string; message?: string }>;
    if (axiosErr.response?.data?.error)   return axiosErr.response.data.error;
    if (axiosErr.response?.data?.message) return axiosErr.response.data.message;
    if (axiosErr.message)                 return axiosErr.message;
    return 'Unknown error';
  }

  // ─── Mock implementations ─────────────────────────────────────────────────

  private mockCreateParty(hint: string): PartyCreationResult {
    const fingerprint = `1220${randomUUID().replace(/-/g, '').slice(0, 40)}`;
    return {
      partyId:       `${hint}::${fingerprint}`,
      displayName:   hint,
      participantId: 'mock-participant',
      isMock:        true,
    };
  }

  private mockParticipantStatus(): ParticipantStatusResult {
    return {
      participantId:        'mock-participant',
      synchronizerConnected: true,
      domainId:             'global-domain-mock',
      version:              'v0.5.10-mock',
      status:               'healthy',
      latencyMs:            42,
      error:                null,
      lastChecked:          formatLastChecked(new Date()),
    };
  }

  private mockLedgerHealth(): LedgerHealthResult {
    return {
      available:   true,
      latencyMs:   38,
      version:     'v2.0-mock',
      error:       null,
      lastChecked: formatLastChecked(new Date()),
    };
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  private sanitizeHint(hint: string): string {
    return hint.toLowerCase().replace(/[^a-z0-9-]/g, '-').slice(0, 64);
  }
}

// Singleton
export const cantonParticipantProvider = new CantonParticipantProvider();
