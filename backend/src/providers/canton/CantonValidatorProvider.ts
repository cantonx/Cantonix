/**
 * CantonValidatorProvider.ts
 *
 * Real Canton Network integration.
 * Activate by setting PROVIDER=canton in .env.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * CANTON ARCHITECTURE REFERENCE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Each node in the LocalNet topology consists of:
 *
 *   ┌─────────────────────────────────────────────────────────┐
 *   │  Participant Node (Canton core)                         │
 *   │    - Ledger API (gRPC)     port x901                    │
 *   │    - Admin API             port x902                    │
 *   │                                                         │
 *   │  Validator App (Splice)                                 │
 *   │    - REST API / readyz     port x903                    │
 *   │                                                         │
 *   │  JSON Ledger API (HTTP wrapper over gRPC Ledger API)    │
 *   │    - /v2/parties, /v2/commands, etc.  port x975         │
 *   └─────────────────────────────────────────────────────────┘
 *
 * The three nodes:
 *   App User Participant    x = 2  (2901, 2902, 2903, 2975)
 *   App Provider Participant x = 3  (3901, 3902, 3903, 3975)
 *   Super Validator (SV)    x = 4  (4901, 4902, 4903, 4975)
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * INTEGRATION POINTS (marked below with ── INTEGRATION POINT N ──)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * 1. Validator App readyz
 *    GET /api/validator/readyz  (port x903)
 *    No auth required in shared-secret mode.
 *    Returns: { version, uptime, rewards }
 *
 * 2. Wallet balance (CC / Amulet holdings)
 *    GET /v0/wallet/balance  (port x903, Validator App)
 *    Auth: Bearer token (JWT) required.
 *    Returns: { effective_unlocked_qty, ... }
 *
 * 3. Synchronizer connection status
 *    GET /v0/admin/participant/global-domain-connection-config  (port x903)
 *    Auth: Bearer token (validator operator) required.
 *    Returns synchronizer connection configuration.
 *
 * 4. Party resolution
 *    GET /v2/parties  (port x975, JSON Ledger API)
 *    Auth: Bearer token required.
 *    Returns list of parties hosted on this participant.
 *
 * 5. DSO party check (synchronizer liveness)
 *    GET /v0/scan-proxy/dso-party-id  (port x903, Scan Proxy)
 *    Returns the DSO party ID — confirms synchronizer governance is live.
 */

import axios, { AxiosError } from 'axios';
import type { IValidatorProvider } from '../../interfaces/IValidatorProvider';
import type {
  Validator,
  ValidatorEndpoint,
  ReadyzPayload,
  WalletBalancePayload,
} from '../../models/validator.model';
import type { NetworkStatusResult } from '../../models/network.model';
import { config } from '../../config/app.config';
import { authHeaders } from '../../services/AuthService';
import { formatLastChecked } from '../../utils/time';
import { aggregateNetworkStatus } from '../mock/MockValidatorProvider';

// ─── Participant node registry ────────────────────────────────────────────

function buildEndpoints(): ValidatorEndpoint[] {
  return [
    {
      name:            'App User Participant',
      role:            'validator',
      readyzUrl:       config.validatorUrls.appUser,
      validatorAppUrl: config.validatorUrls.appUser.replace('/readyz', ''),
      jsonApiUrl:      config.jsonApiUrls.appUser,
      participant:     'app-user',
    },
    {
      name:            'App Provider Participant',
      role:            'validator',
      readyzUrl:       config.validatorUrls.appProvider,
      validatorAppUrl: config.validatorUrls.appProvider.replace('/readyz', ''),
      jsonApiUrl:      config.jsonApiUrls.appProvider,
      participant:     'app-provider',
    },
    {
      name:            'Super Validator (SV)',
      role:            'super-validator',
      readyzUrl:       config.validatorUrls.super,
      validatorAppUrl: config.validatorUrls.super.replace('/readyz', ''),
      jsonApiUrl:      config.jsonApiUrls.super,
      participant:     'super',
    },
  ];
}

export class CantonValidatorProvider implements IValidatorProvider {
  async getValidatorsStatus(): Promise<Validator[]> {
    const endpoints = buildEndpoints();
    return Promise.all(endpoints.map((ep) => this.probeParticipant(ep)));
  }

  async getNetworkStatus(): Promise<NetworkStatusResult> {
    const participants = await this.getValidatorsStatus();
    return aggregateNetworkStatus(participants, config.networkName);
  }

  // ─── Probe a single Participant Node ─────────────────────────────────────

  private async probeParticipant(endpoint: ValidatorEndpoint): Promise<Validator> {
    const checkedAt = new Date();
    const startTime = Date.now();

    try {
      // ── INTEGRATION POINT 1: Auth header injection ────────────────────────
      // Returns {} in shared-secret mode.
      // Returns { Authorization: "Bearer <token>" } in oauth2 mode.
      const headers = await authHeaders(endpoint.participant);

      // ── INTEGRATION POINT 2: Validator App readyz ─────────────────────────
      // GET /api/validator/readyz  (Splice Validator App, port x903)
      // This is NOT the Canton Participant health — it's the Validator App health.
      // An empty 200 response means healthy. Some versions return JSON.
      const response = await axios.get<ReadyzPayload>(endpoint.readyzUrl, {
        headers,
        timeout: 5_000,
      });

      const latencyMs = Date.now() - startTime;
      const data = response.data ?? {};

      // ── INTEGRATION POINT 3: CC balance / rewards ─────────────────────────
      // Option A (current): use rewards field from readyz if present
      // Option B (preferred): call GET /v0/wallet/balance on the Validator App
      //   const balance = await this.fetchWalletBalance(endpoint, headers);
      // Option C: query PQS (Postgres) for Amulet contracts directly
      const rawRewards = data.rewards;
      const amuletRewards = rawRewards != null
        ? parseFloat(String(rawRewards))
        : null;

      // ── INTEGRATION POINT 4: Synchronizer connection check ────────────────
      // GET /v0/admin/participant/global-domain-connection-config
      // Returns the synchronizer connection config. If this call succeeds,
      // the participant is connected to the Global Synchronizer.
      // const syncConnected = await this.checkSynchronizerConnection(endpoint, headers);

      return {
        name:                 endpoint.name,
        role:                 endpoint.role,
        status:               'healthy',
        version:              data.version ?? 'unknown',
        uptime:               data.uptime ?? '100%',
        latency:              `${latencyMs}ms`,
        lastChecked:          formatLastChecked(checkedAt),
        amuletRewards:        isNaN(amuletRewards as number) ? null : amuletRewards,
        synchronizerConnected: true, // replace with real check above
      };
    } catch (err: unknown) {
      return this.buildOfflineRecord(endpoint, checkedAt, err);
    }
  }

  // ── INTEGRATION POINT 5: Wallet balance fetch ──────────────────────────
  // Uncomment and call from probeParticipant when ready.
  //
  // private async fetchWalletBalance(
  //   endpoint: ValidatorEndpoint,
  //   headers: Record<string, string>
  // ): Promise<number | null> {
  //   try {
  //     // GET /v0/wallet/balance  (Validator App, port x903)
  //     // Auth: JWT token where subject = the user whose wallet to query
  //     const res = await axios.get<WalletBalancePayload>(
  //       `${endpoint.validatorAppUrl}/v0/wallet/balance`,
  //       { headers, timeout: 5_000 }
  //     );
  //     const qty = res.data?.effective_unlocked_qty;
  //     return qty != null ? parseFloat(qty) : null;
  //   } catch {
  //     return null;
  //   }
  // }

  // ── INTEGRATION POINT 6: Synchronizer connection check ─────────────────
  // Uncomment and call from probeParticipant when ready.
  //
  // private async checkSynchronizerConnection(
  //   endpoint: ValidatorEndpoint,
  //   headers: Record<string, string>
  // ): Promise<boolean> {
  //   try {
  //     // GET /v0/admin/participant/global-domain-connection-config
  //     // (Validator App management endpoint, port x903)
  //     await axios.get(
  //       `${endpoint.validatorAppUrl}/v0/admin/participant/global-domain-connection-config`,
  //       { headers, timeout: 5_000 }
  //     );
  //     return true;
  //   } catch {
  //     return false;
  //   }
  // }

  // ── INTEGRATION POINT 7: DSO party / scan liveness ─────────────────────
  // Uncomment to verify Global Synchronizer governance is live.
  //
  // private async fetchDsoPartyId(
  //   endpoint: ValidatorEndpoint,
  //   headers: Record<string, string>
  // ): Promise<string | null> {
  //   try {
  //     // GET /v0/scan-proxy/dso-party-id  (Scan Proxy, port x903)
  //     // Returns the DSO party ID — confirms synchronizer governance is live.
  //     const res = await axios.get<{ dso_party_id: string }>(
  //       `${endpoint.validatorAppUrl}/v0/scan-proxy/dso-party-id`,
  //       { headers, timeout: 5_000 }
  //     );
  //     return res.data?.dso_party_id ?? null;
  //   } catch {
  //     return null;
  //   }
  // }

  // ─── Error classification ─────────────────────────────────────────────────

  private buildOfflineRecord(
    endpoint: ValidatorEndpoint,
    checkedAt: Date,
    err: unknown
  ): Validator {
    const axiosErr = err as AxiosError;
    const isTimeout   = axiosErr.code === 'ECONNABORTED';
    const isAuthError  = axiosErr.response?.status === 401 || axiosErr.response?.status === 403;
    const isServerErr  = (axiosErr.response?.status ?? 0) >= 500;

    // Timeout = node is slow but reachable → degraded
    // Auth error = node is up but token is wrong → degraded (not offline)
    // Connection refused / 5xx = node is down → offline
    const status = (isTimeout || isAuthError) ? 'degraded' : 'offline';

    return {
      name:                 endpoint.name,
      role:                 endpoint.role,
      status,
      version:              'N/A',
      uptime:               status === 'degraded' ? 'unknown' : '0%',
      latency:              isTimeout ? '>5000ms' : null,
      lastChecked:          formatLastChecked(checkedAt),
      amuletRewards:        null,
      synchronizerConnected: false,
    };
  }
}
