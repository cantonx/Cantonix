/**
 * validator.model.ts
 *
 * Domain models aligned with real Canton Network / Splice terminology.
 *
 * ─── Canton Terminology Reference ────────────────────────────────────────
 *
 * PARTICIPANT NODE
 *   A Canton node that hosts Daml parties and submits transactions to the
 *   Global Synchronizer. In the Quickstart topology there are three:
 *     - App User Participant    (ports: 2901 ledger, 2902 admin, 2903 validator-app, 2975 JSON API)
 *     - App Provider Participant (ports: 3901, 3902, 3903, 3975)
 *     - Super Validator (SV)    (ports: 4901, 4902, 4903, 4975)
 *
 * VALIDATOR APP
 *   A Splice application that runs alongside a Participant Node.
 *   It manages the participant, automates CC workflows, and exposes the
 *   Validator REST API (port x903). The /api/validator/readyz endpoint
 *   belongs to the Validator App, not the Canton participant itself.
 *
 * SUPER VALIDATOR (SV) NODE
 *   A special participant that also participates in Global Synchronizer
 *   governance (DSO party). Runs additional services: scan, mediator, sequencer.
 *
 * GLOBAL SYNCHRONIZER
 *   The shared ordering layer (replaces "domain" in older Canton docs).
 *   All participant nodes connect to it to submit and sequence transactions.
 *
 * DSO PARTY
 *   The decentralized governance party, hosted across all SV nodes.
 *   Controls CC tokenomics, CNS, and synchronizer governance.
 *
 * AMULET / CANTON COIN (CC)
 *   The native token. On-chain it is an Amulet contract; user-facing it is CC.
 *
 * PARTY
 *   A Daml identity (e.g. "app_user_quickstart-xxx::1220...").
 *   Hosted on a participant node. Not the same as a user account.
 */

// ─── Participant node health status ──────────────────────────────────────

export type ParticipantStatus = 'healthy' | 'degraded' | 'offline';

/**
 * Represents the health and metadata of a single Participant Node
 * as reported by its Validator App (/api/validator/readyz).
 *
 * NOTE: In Canton, "validator" refers to the Validator App running on a
 * Participant Node — not a generic blockchain validator/miner.
 */
export interface ParticipantNode {
  /** Human-readable name (e.g. "App User Participant") */
  name: string;

  /**
   * Role of this participant in the network.
   * - "validator"       → standard participant running Validator App
   * - "super-validator" → SV node; also participates in DSO governance
   */
  role: 'validator' | 'super-validator';

  /** Health status derived from /api/validator/readyz response */
  status: ParticipantStatus;

  /** Validator App version (e.g. "v0.5.10") */
  version: string;

  /** Uptime percentage reported by the Validator App */
  uptime: string;

  /** Round-trip latency to the /readyz endpoint */
  latency: string | null;

  /** ISO-relative timestamp of last health check */
  lastChecked: string;

  /**
   * CC (Amulet) rewards earned this epoch.
   * Source: Validator App rewards field or GET /v0/wallet/balance.
   * null when node is offline or balance unavailable.
   */
  amuletRewards: number | null;

  /**
   * Canton party ID of the primary party hosted on this participant.
   * Format: "<hint>::<fingerprint>"
   * Populated when PROVIDER=canton and party resolution is enabled.
   */
  partyId?: string;

  /**
   * Whether this participant is connected to the Global Synchronizer.
   * Populated when PROVIDER=canton.
   */
  synchronizerConnected?: boolean;
}

// ─── Legacy alias — keeps existing API response shape unchanged ───────────
// The frontend and external consumers see "Validator" in the JSON response.
// Internally we use ParticipantNode for correctness.
export type Validator = ParticipantNode;
export type ValidatorStatus = ParticipantStatus;

// ─── Endpoint configuration ───────────────────────────────────────────────

export interface ValidatorEndpoint {
  /** Display name */
  name: string;
  /** Role in the Canton Network topology */
  role: 'validator' | 'super-validator';
  /** URL of the Validator App readyz endpoint (port x903) */
  readyzUrl: string;
  /** URL of the Validator App base (port x903, without /readyz) */
  validatorAppUrl: string;
  /** URL of the JSON Ledger API (port x975) */
  jsonApiUrl: string;
  /** Keycloak participant identifier for auth */
  participant: 'app-user' | 'app-provider' | 'super';
}

/**
 * Raw shape returned by GET /api/validator/readyz
 * (Validator App health endpoint — Splice-specific, not Canton core)
 */
export interface ReadyzPayload {
  version?: string;
  uptime?: string;
  /** CC rewards — may be present on some Validator App versions */
  rewards?: string | number;
}

/**
 * Raw shape returned by GET /v0/wallet/balance
 * (Validator App wallet endpoint)
 */
export interface WalletBalancePayload {
  /** Available CC balance as a decimal string */
  effective_unlocked_qty?: string;
  /** Total CC including locked amounts */
  total_holding_fees_rate?: string;
}
