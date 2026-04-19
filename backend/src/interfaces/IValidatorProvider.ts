/**
 * IValidatorProvider.ts
 *
 * Contract for participant node health data sources.
 *
 * ─── Canton alignment note ────────────────────────────────────────────────
 *
 * In Canton terminology, what this interface monitors is:
 *
 *   Participant Node health  → via GET /api/validator/readyz (Validator App)
 *   Global Synchronizer status → derived from participant connectivity
 *
 * The term "validator" in method names refers to the Validator App running
 * on each Participant Node — not a generic blockchain validator.
 *
 * Implementations:
 *   MockValidatorProvider   → simulated data (PROVIDER=mock)
 *   CantonValidatorProvider → real Validator App HTTP calls (PROVIDER=canton)
 */

import type { Validator } from '../models/validator.model';
import type { NetworkStatusResult } from '../models/network.model';

export interface IValidatorProvider {
  /**
   * Return health status of all registered Participant Nodes.
   *
   * Data source (real Canton):
   *   GET /api/validator/readyz  on each node's Validator App (port x903)
   *
   * Must always resolve — never reject.
   * Unreachable nodes are returned with status "offline".
   */
  getValidatorsStatus(): Promise<Validator[]>;

  /**
   * Return aggregate Global Synchronizer connectivity status,
   * derived from individual participant node health.
   *
   * Data source (real Canton):
   *   Aggregated from getValidatorsStatus() results.
   *   Future: also check GET /v0/admin/participant/global-domain-connection-config
   *   and GET /v0/scan-proxy/dso-party-id for synchronizer liveness.
   */
  getNetworkStatus(): Promise<NetworkStatusResult>;
}
