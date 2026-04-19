/**
 * user.model.ts
 *
 * User identity model aligned with Canton Party semantics.
 *
 * ─── Canton Party mapping ─────────────────────────────────────────────────
 *
 * In Canton, a Party is a cryptographic identity hosted on a Participant Node.
 * Format: "<hint>::<fingerprint>"  e.g. "alice::1220abc..."
 *
 * Onboarding lifecycle:
 *   1. User registers with an invitation code → partyId = null, status = pending
 *   2. Sponsor approves → CantonParticipantProvider.createParty() is called
 *   3. Canton assigns partyId → status = approved
 *
 * Until approved, partyId is null. The JWT still works — partyId in the
 * token will be null and protected endpoints that require a party will
 * check onboardingStatus before proceeding.
 */

export type OnboardingStatus = 'pending' | 'approved' | 'rejected';

export interface User {
  id: string;
  email: string;
  passwordHash: string;

  /**
   * Canton Party ID — null until onboarding is approved.
   * Real format: "alice::1220<fingerprint>"
   * Mock format: "party-<uuid>"
   */
  partyId: string | null;

  /** Canton-style onboarding lifecycle state */
  onboardingStatus: OnboardingStatus;

  /** ID of the sponsor who invited this user */
  sponsorId: string | null;

  createdAt: string;
}

/**
 * Safe public representation — never includes passwordHash.
 */
export interface PublicUser {
  id: string;
  email: string;
  partyId: string | null;
  onboardingStatus: OnboardingStatus;
  sponsorId: string | null;
  createdAt: string;
}

/**
 * Payload embedded in the JWT token.
 * Attached to req.user by the auth middleware.
 */
export interface JwtPayload {
  sub: string;              // user.id
  email: string;
  partyId: string | null;   // null until Canton approves onboarding
  onboardingStatus: OnboardingStatus;
  iat?: number;
  exp?: number;
}
