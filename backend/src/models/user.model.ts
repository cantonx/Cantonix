/**
 * user.model.ts
 *
 * User identity model for the multi-tenant auth system.
 *
 * ─── Canton Party mapping ─────────────────────────────────────────────────
 *
 * Each user is assigned a `partyId` at signup that simulates a Canton Party.
 * Format: "party-<uuid>"
 *
 * When real Canton nodes are connected (PROVIDER=canton), this partyId
 * will be replaced with the actual Canton party ID returned by:
 *   POST /v2/parties  (JSON Ledger API, port x975)
 *   → { "partyDetails": { "party": "Alice::1220..." } }
 *
 * The migration path:
 *   1. Now:   partyId = "party-<uuid>"  (local simulation)
 *   2. Later: partyId = "Alice::1220..."  (real Canton party)
 *   3. The user.id → partyId mapping stays the same in both cases.
 */

export interface User {
  id: string;
  email: string;
  passwordHash: string;

  /**
   * Simulated Canton Party ID.
   * Future: replace with real party ID from Canton JSON Ledger API.
   */
  partyId: string;

  createdAt: string; // ISO 8601
}

/**
 * Safe public representation — never includes passwordHash.
 */
export interface PublicUser {
  id: string;
  email: string;
  partyId: string;
  createdAt: string;
}

/**
 * Payload embedded in the JWT token.
 * Attached to req.user by the auth middleware.
 */
export interface JwtPayload {
  sub: string;   // user.id
  email: string;
  partyId: string;
  iat?: number;
  exp?: number;
}
