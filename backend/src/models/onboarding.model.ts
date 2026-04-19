/**
 * onboarding.model.ts
 *
 * Models for Canton-style sponsor-based party onboarding.
 *
 * ─── Canton Concept Mapping ───────────────────────────────────────────────
 *
 * INVITATION CODE  → Onboarding Authorization Token
 *   A sponsor (existing participant) issues a one-time code.
 *   The code authorizes a new user to register and request party creation.
 *   Analogous to the "onboarding secret" in Canton Quickstart.
 *
 * SPONSOR          → Existing Participant (Party)
 *   An approved user who can invite others to the network.
 *   Responsible for approving or rejecting onboarding requests.
 *
 * ONBOARDING REQUEST → Party Creation Request
 *   Tracks the full lifecycle from invitation to Canton Party assignment.
 *   When approved, triggers POST /v2/parties on the JSON Ledger API.
 *
 * PARTY ID HINT    → partyIdHint in POST /v2/parties
 *   A suggested identifier for the new party.
 *   Canton uses it as a prefix: "alice::1220<fingerprint>"
 */

export type OnboardingStatus = 'pending' | 'approved' | 'rejected';

// ─── Invitation Code ──────────────────────────────────────────────────────

export interface InvitationCode {
  id: string;
  code: string;
  issuedById: string;
  usedById: string | null;
  usedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
}

export interface CreateInvitationResult {
  code: string;
  expiresAt: string | null;
  issuedBy: string;
}

// ─── Onboarding Request ───────────────────────────────────────────────────

export interface OnboardingRequest {
  id: string;
  userId: string;
  sponsorId: string;
  invitationCodeId: string;
  status: OnboardingStatus;
  partyIdHint: string | null;
  assignedPartyId: string | null;
  reviewNote: string | null;
  reviewedAt: string | null;
  createdAt: string;
}

// ─── API request/response shapes ─────────────────────────────────────────

export interface RequestOnboardingBody {
  /** The invitation code issued by a sponsor */
  invitationCode: string;
  /** Optional party ID hint (lowercase alphanumeric) */
  partyIdHint?: string;
}

export interface ApproveOnboardingBody {
  /** The onboarding request ID to approve */
  requestId: string;
  /** Optional note from the sponsor */
  note?: string;
}

export interface RejectOnboardingBody {
  requestId: string;
  note?: string;
}

export interface OnboardingStatusResponse {
  requestId: string;
  status: OnboardingStatus;
  partyId: string | null;
  sponsorId: string;
  createdAt: string;
  reviewedAt: string | null;
  reviewNote: string | null;
}
