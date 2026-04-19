/**
 * CantonParticipantProvider.ts
 *
 * Canton Participant Node integration — Party creation and node health.
 * Activate by setting PROVIDER=canton in .env.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * CANTON ARCHITECTURE REFERENCE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Party Creation (JSON Ledger API — port x975):
 *   POST /v2/parties
 *   Body: { "partyIdHint": "alice", "displayName": "Alice" }
 *   Response: { "partyDetails": { "party": "alice::1220...", ... } }
 *   Ref: https://docs.digitalasset.com/json-api/3.4/index.html
 *
 * Participant Node Health (Validator App — port x903):
 *   GET /api/validator/readyz
 *   Returns: { version, uptime, rewards }
 *
 * Synchronizer Connection (Validator App — port x903):
 *   GET /v0/admin/participant/global-domain-connection-config
 *   Returns synchronizer connection configuration.
 *
 * Ledger Health (JSON Ledger API — port x975):
 *   GET /v2/version
 *   Returns: { version, ... }
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * MOCK vs REAL
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * When PROVIDER=mock:
 *   createParty() → returns a simulated "party-<uuid>" immediately
 *   getParticipantStatus() → returns simulated health data
 *   getLedgerHealth() → returns simulated latency
 *
 * When PROVIDER=canton:
 *   createParty() → calls POST /v2/parties on the JSON Ledger API
 *   getParticipantStatus() → calls GET /api/validator/readyz
 *   getLedgerHealth() → calls GET /v2/version
 */

import axios, { AxiosError } from 'axios';
import { randomUUID } from 'crypto';
import { config } from '../../config/app.config';
import { authHeaders } from '../../services/AuthService';
import { formatLastChecked } from '../../utils/time';

// ─── Types ────────────────────────────────────────────────────────────────

export interface PartyCreationResult {
  /** Assigned Canton Party ID — format: "<hint>::<fingerprint>" */
  partyId: string;
  /** Display name registered on the participant */
  displayName: string;
  /** The participant node that hosts this party */
  participantId: string;
  /** Whether this was a real Canton assignment or a mock */
  isMock: boolean;
}

export interface ParticipantStatusResult {
  /** Participant node identifier */
  participantId: string;
  /** Connectivity to the Global Synchronizer */
  synchronizerConnected: boolean;
  /** Synchronizer domain ID (if connected) */
  domainId: string | null;
  /** Validator App version */
  version: string;
  /** Node health status */
  status: 'healthy' | 'degraded' | 'offline';
  /** Round-trip latency to the readyz endpoint */
  latencyMs: number | null;
  lastChecked: string;
}

export interface LedgerHealthResult {
  /** JSON Ledger API availability */
  available: boolean;
  /** Round-trip latency to the JSON Ledger API */
  latencyMs: number | null;
  /** Ledger API version */
  version: string | null;
  lastChecked: string;
}

// ─── Provider ─────────────────────────────────────────────────────────────

export class CantonParticipantProvider {

  /**
   * Create a Canton Party for a newly approved user.
   *
   * Real Canton (PROVIDER=canton):
   *   POST /v2/parties  (JSON Ledger API, port x975)
   *   Body: { partyIdHint: string, displayName: string }
   *   Response: { partyDetails: { party: "alice::1220...", ... } }
   *
   * Mock (PROVIDER=mock):
   *   Returns a simulated party-<uuid> immediately.
   *
   * @param userId    - Internal user ID (used as display name fallback)
   * @param partyHint - Suggested party identifier (lowercase alphanumeric)
   */
  async createParty(
    userId: string,
    partyHint?: string
  ): Promise<PartyCreationResult> {
    const hint = (partyHint ?? `user-${userId.slice(0, 8)}`).toLowerCase().replace(/[^a-z0-9-]/g, '-');

    if (config.providerMode === 'mock') {
      return this.mockCreateParty(userId, hint);
    }

    return this.realCreateParty(userId, hint);
  }

  /**
   * Check the health of the primary Participant Node.
   *
   * Real Canton (PROVIDER=canton):
   *   GET /api/validator/readyz  (Validator App, port x903)
   *
   * Mock (PROVIDER=mock):
   *   Returns simulated healthy status.
   */
  async getParticipantStatus(): Promise<ParticipantStatusResult> {
    if (config.providerMode === 'mock') {
      return this.mockParticipantStatus();
    }

    return this.realParticipantStatus();
  }

  /**
   * Check the health of the JSON Ledger API.
   *
   * Real Canton (PROVIDER=canton):
   *   GET /v2/version  (JSON Ledger API, port x975)
   *
   * Mock (PROVIDER=mock):
   *   Returns simulated available status.
   */
  async getLedgerHealth(): Promise<LedgerHealthResult> {
    if (config.providerMode === 'mock') {
      return this.mockLedgerHealth();
    }

    return this.realLedgerHealth();
  }

  // ─── Real Canton implementations ─────────────────────────────────────────

  private async realCreateParty(
    userId: string,
    hint: string
  ): Promise<PartyCreationResult> {
    // ── INTEGRATION POINT: POST /v2/parties ──────────────────────────────
    // JSON Ledger API — port x975 (App Provider participant)
    // Ref: https://docs.digitalasset.com/json-api/3.4/index.html#tag/Parties/operation/createParty
    //
    // The operator (app-provider) creates the party on behalf of the new user.
    // In production, use the participant that will host this user's party.
    const headers = await authHeaders('app-provider');
    const url = `${config.jsonApiUrls.appProvider}/v2/parties`;

    const response = await axios.post(
      url,
      {
        partyIdHint: hint,
        displayName: `Cantonix User ${hint}`,
      },
      {
        headers: { 'Content-Type': 'application/json', ...headers },
        timeout: 15_000,
      }
    );

    // Response shape: { partyDetails: { party: "alice::1220...", displayName, isLocal, ... } }
    const partyDetails = response.data?.partyDetails ?? response.data;
    const partyId = partyDetails?.party ?? partyDetails?.partyId;

    if (!partyId) {
      throw new Error('Canton did not return a party ID in the response');
    }

    return {
      partyId,
      displayName:   partyDetails.displayName ?? hint,
      participantId: partyDetails.participantId ?? 'app-provider',
      isMock:        false,
    };
  }

  private async realParticipantStatus(): Promise<ParticipantStatusResult> {
    const checkedAt = new Date();
    const startTime = Date.now();

    try {
      const headers = await authHeaders('app-provider');

      // ── INTEGRATION POINT: GET /api/validator/readyz ──────────────────
      // Validator App health endpoint (port x903)
      const response = await axios.get(
        config.validatorUrls.appProvider,
        { headers, timeout: 5_000 }
      );

      const latencyMs = Date.now() - startTime;
      const data = response.data ?? {};

      // ── INTEGRATION POINT: GET /v0/admin/participant/global-domain-connection-config
      // Check synchronizer connectivity (optional — uncomment when ready)
      // const syncConnected = await this.checkSynchronizerConnection(headers);

      return {
        participantId:        'app-provider',
        synchronizerConnected: true, // replace with real check above
        domainId:             data.domainId ?? null,
        version:              data.version ?? 'unknown',
        status:               'healthy',
        latencyMs,
        lastChecked:          formatLastChecked(checkedAt),
      };
    } catch (err) {
      const axiosErr = err as AxiosError;
      const isTimeout = axiosErr.code === 'ECONNABORTED';
      return {
        participantId:        'app-provider',
        synchronizerConnected: false,
        domainId:             null,
        version:              'N/A',
        status:               isTimeout ? 'degraded' : 'offline',
        latencyMs:            isTimeout ? 5000 : null,
        lastChecked:          formatLastChecked(checkedAt),
      };
    }
  }

  private async realLedgerHealth(): Promise<LedgerHealthResult> {
    const checkedAt = new Date();
    const startTime = Date.now();

    try {
      const headers = await authHeaders('app-provider');

      // ── INTEGRATION POINT: GET /v2/version ───────────────────────────
      // JSON Ledger API version endpoint (port x975)
      const response = await axios.get(
        `${config.jsonApiUrls.appProvider}/v2/version`,
        { headers, timeout: 5_000 }
      );

      return {
        available:   true,
        latencyMs:   Date.now() - startTime,
        version:     response.data?.version ?? null,
        lastChecked: formatLastChecked(checkedAt),
      };
    } catch {
      return {
        available:   false,
        latencyMs:   null,
        version:     null,
        lastChecked: formatLastChecked(checkedAt),
      };
    }
  }

  // ── INTEGRATION POINT: Synchronizer connection check ─────────────────
  // Uncomment when ready to check real synchronizer connectivity.
  //
  // private async checkSynchronizerConnection(
  //   headers: Record<string, string>
  // ): Promise<boolean> {
  //   try {
  //     // GET /v0/admin/participant/global-domain-connection-config
  //     // (Validator App management endpoint, port x903)
  //     await axios.get(
  //       `${config.validatorAppUrls.appProvider}/v0/admin/participant/global-domain-connection-config`,
  //       { headers, timeout: 5_000 }
  //     );
  //     return true;
  //   } catch {
  //     return false;
  //   }
  // }

  // ─── Mock implementations ─────────────────────────────────────────────

  private mockCreateParty(userId: string, hint: string): PartyCreationResult {
    // Simulate Canton party ID format: "<hint>::<fingerprint>"
    const fingerprint = `1220${randomUUID().replace(/-/g, '').slice(0, 40)}`;
    return {
      partyId:       `${hint}::${fingerprint}`,
      displayName:   `Cantonix User ${hint}`,
      participantId: 'app-provider-mock',
      isMock:        true,
    };
  }

  private mockParticipantStatus(): ParticipantStatusResult {
    return {
      participantId:        'app-provider-mock',
      synchronizerConnected: true,
      domainId:             'global-domain-mock',
      version:              'v0.5.10-mock',
      status:               'healthy',
      latencyMs:            42,
      lastChecked:          formatLastChecked(new Date()),
    };
  }

  private mockLedgerHealth(): LedgerHealthResult {
    return {
      available:   true,
      latencyMs:   38,
      version:     'v2.0-mock',
      lastChecked: formatLastChecked(new Date()),
    };
  }
}

// Singleton
export const cantonParticipantProvider = new CantonParticipantProvider();
