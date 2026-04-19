/**
 * network.model.ts
 *
 * Models for Global Synchronizer / network-level status.
 *
 * ─── Canton Terminology ───────────────────────────────────────────────────
 *
 * GLOBAL SYNCHRONIZER
 *   The shared ordering and sequencing layer for the Canton Network.
 *   All participant nodes connect to it. Previously called "domain" in
 *   older Canton documentation — "synchronizer" is the current term.
 *
 * SYNCHRONIZER STATUS
 *   Derived from the aggregate health of connected participant nodes.
 *   A real implementation would also check:
 *     - GET /v0/admin/participant/global-domain-connection-config
 *       (Validator App endpoint that returns synchronizer connection state)
 *     - Scan service availability (GET /v0/scan-proxy/dso-party-id)
 */

export type SynchronizerStatus = 'healthy' | 'degraded' | 'offline';

// Legacy alias — keeps existing API response shape
export type NetworkStatus = SynchronizerStatus;

export interface NetworkStatusResult {
  /**
   * Human-readable network name (e.g. "Canton DevNet").
   * Derived from NETWORK env var.
   */
  network: string;

  /**
   * Aggregate status of the Global Synchronizer connectivity,
   * derived from participant node health.
   */
  status: SynchronizerStatus;

  /** Average round-trip latency across reachable participant nodes */
  latency: string;

  lastChecked: string;

  /** Per-status counts of participant nodes */
  participants: {
    total: number;
    healthy: number;
    degraded: number;
    offline: number;
  };

  /**
   * @deprecated Use `participants` instead.
   * Kept for backwards compatibility with existing frontend.
   */
  validators: {
    total: number;
    healthy: number;
    degraded: number;
    offline: number;
  };
}
