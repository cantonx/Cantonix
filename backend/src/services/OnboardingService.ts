/**
 * OnboardingService.ts
 *
 * Canton-style sponsor-based party onboarding.
 *
 * ─── Flow ─────────────────────────────────────────────────────────────────
 *
 * 1. Sponsor issues an InvitationCode (POST /api/onboarding/invite)
 * 2. New user registers with the code (POST /api/auth/signup)
 *    → User created with partyId=null, onboardingStatus=pending
 *    → OnboardingRequest created
 * 3. Sponsor approves (POST /api/onboarding/approve)
 *    → CantonParticipantProvider.createParty() called
 *    → User.partyId updated with Canton-assigned ID
 *    → User.onboardingStatus = approved
 * 4. User can now interact with the Canton ledger
 *
 * ─── Canton Alignment ─────────────────────────────────────────────────────
 *
 * InvitationCode  → Onboarding Authorization (Canton Quickstart concept)
 * Sponsor         → Existing Participant (Party)
 * OnboardingRequest → Party Creation Request
 * createParty()   → POST /v2/parties (JSON Ledger API)
 */

import { randomUUID } from 'crypto';
import { prisma } from '../lib/prisma';
import { cantonParticipantProvider } from '../providers/canton/CantonParticipantProvider';
import type {
  CreateInvitationResult,
  OnboardingStatusResponse,
} from '../models/onboarding.model';

// ─── Errors ───────────────────────────────────────────────────────────────

export class OnboardingError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number = 400
  ) {
    super(message);
    this.name = 'OnboardingError';
  }
}

// ─── Invitation management ────────────────────────────────────────────────

/**
 * Issue a new invitation code.
 * Only approved users (existing participants) can invite others.
 */
export async function issueInvitation(
  sponsorId: string,
  expiresInHours?: number
): Promise<CreateInvitationResult> {
  // Verify sponsor is an approved participant
  const sponsor = await prisma.user.findUnique({ where: { id: sponsorId } });
  if (!sponsor) throw new OnboardingError('Sponsor not found', 404);
  if (sponsor.onboardingStatus !== 'approved') {
    throw new OnboardingError('Only approved participants can issue invitations', 403);
  }

  const code = generateInvitationCode();
  const expiresAt = expiresInHours
    ? new Date(Date.now() + expiresInHours * 60 * 60 * 1000)
    : null;

  await prisma.invitationCode.create({
    data: {
      id:         randomUUID(),
      code,
      issuedById: sponsorId,
      expiresAt,
    },
  });

  return {
    code,
    expiresAt:  expiresAt?.toISOString() ?? null,
    issuedBy:   sponsor.email,
  };
}

/**
 * Validate an invitation code and return the sponsor's user ID.
 * Throws OnboardingError if invalid, expired, or already used.
 */
export async function validateInvitationCode(code: string): Promise<{
  invitationId: string;
  sponsorId: string;
}> {
  const invitation = await prisma.invitationCode.findUnique({ where: { code } });

  if (!invitation) {
    throw new OnboardingError('Invalid invitation code', 400);
  }
  if (invitation.usedById) {
    throw new OnboardingError('Invitation code has already been used', 400);
  }
  if (invitation.expiresAt && invitation.expiresAt < new Date()) {
    throw new OnboardingError('Invitation code has expired', 400);
  }

  return {
    invitationId: invitation.id,
    sponsorId:    invitation.issuedById,
  };
}

/**
 * Mark an invitation code as used by a new user.
 */
export async function consumeInvitationCode(
  invitationId: string,
  userId: string
): Promise<void> {
  await prisma.invitationCode.update({
    where: { id: invitationId },
    data:  { usedById: userId, usedAt: new Date() },
  });
}

// ─── Onboarding request management ───────────────────────────────────────

/**
 * Create an onboarding request after a user registers with an invitation code.
 */
export async function createOnboardingRequest(
  userId: string,
  sponsorId: string,
  invitationCodeId: string,
  partyIdHint?: string
): Promise<void> {
  await prisma.onboardingRequest.create({
    data: {
      id:               randomUUID(),
      userId,
      sponsorId,
      invitationCodeId,
      partyIdHint:      partyIdHint ?? null,
      status:           'pending',
    },
  });
}

/**
 * Get the onboarding status for a user.
 */
export async function getOnboardingStatus(
  userId: string
): Promise<OnboardingStatusResponse | null> {
  const request = await prisma.onboardingRequest.findUnique({
    where: { userId },
  });

  if (!request) return null;

  return {
    requestId:   request.id,
    status:      request.status as OnboardingStatusResponse['status'],
    partyId:     request.assignedPartyId,
    sponsorId:   request.sponsorId,
    createdAt:   request.createdAt.toISOString(),
    reviewedAt:  request.reviewedAt?.toISOString() ?? null,
    reviewNote:  request.reviewNote,
  };
}

/**
 * Approve an onboarding request.
 * Only the sponsor or an admin can approve.
 *
 * On approval:
 *   1. Calls CantonParticipantProvider.createParty()
 *   2. Updates User.partyId with the Canton-assigned ID
 *   3. Updates User.onboardingStatus = approved
 *   4. Updates OnboardingRequest.status = approved
 */
export async function approveOnboarding(
  requestId: string,
  approverId: string,
  note?: string
): Promise<{ partyId: string }> {
  const request = await prisma.onboardingRequest.findUnique({
    where: { id: requestId },
    include: { user: true },
  });

  if (!request) throw new OnboardingError('Onboarding request not found', 404);
  if (request.status !== 'pending') {
    throw new OnboardingError(`Request is already ${request.status}`, 400);
  }

  // Only the sponsor or admin can approve
  const approver = await prisma.user.findUnique({ where: { id: approverId } });
  if (!approver) throw new OnboardingError('Approver not found', 404);

  const isSponsor = request.sponsorId === approverId;
  const isAdmin   = approver.onboardingStatus === 'approved'; // any approved user can approve for now

  if (!isSponsor && !isAdmin) {
    throw new OnboardingError('Only the sponsor can approve this request', 403);
  }

  // Create Canton Party (real or mock depending on PROVIDER)
  const partyResult = await cantonParticipantProvider.createParty(
    request.userId,
    request.partyIdHint ?? undefined
  );

  // Update user with assigned party ID
  await prisma.user.update({
    where: { id: request.userId },
    data: {
      partyId:         partyResult.partyId,
      onboardingStatus: 'approved',
    },
  });

  // Update onboarding request
  await prisma.onboardingRequest.update({
    where: { id: requestId },
    data: {
      status:          'approved',
      assignedPartyId: partyResult.partyId,
      reviewNote:      note ?? null,
      reviewedAt:      new Date(),
    },
  });

  return { partyId: partyResult.partyId };
}

/**
 * Reject an onboarding request.
 */
export async function rejectOnboarding(
  requestId: string,
  rejecterId: string,
  note?: string
): Promise<void> {
  const request = await prisma.onboardingRequest.findUnique({
    where: { id: requestId },
  });

  if (!request) throw new OnboardingError('Onboarding request not found', 404);
  if (request.status !== 'pending') {
    throw new OnboardingError(`Request is already ${request.status}`, 400);
  }

  const isSponsor = request.sponsorId === rejecterId;
  const rejecter  = await prisma.user.findUnique({ where: { id: rejecterId } });
  const isAdmin   = rejecter?.onboardingStatus === 'approved';

  if (!isSponsor && !isAdmin) {
    throw new OnboardingError('Only the sponsor can reject this request', 403);
  }

  await prisma.onboardingRequest.update({
    where: { id: requestId },
    data: {
      status:     'rejected',
      reviewNote: note ?? null,
      reviewedAt: new Date(),
    },
  });

  await prisma.user.update({
    where: { id: request.userId },
    data:  { onboardingStatus: 'rejected' },
  });
}

/**
 * List all pending onboarding requests for a sponsor.
 */
export async function getPendingRequests(sponsorId: string) {
  return prisma.onboardingRequest.findMany({
    where:   { sponsorId, status: 'pending' },
    include: { user: { select: { email: true, createdAt: true } } },
    orderBy: { createdAt: 'asc' },
  });
}

// ─── Helpers ──────────────────────────────────────────────────────────────

function generateInvitationCode(): string {
  // Format: CANTON-XXXX-XXXX (uppercase alphanumeric)
  const segment = () =>
    Math.random().toString(36).toUpperCase().slice(2, 6).padEnd(4, '0');
  return `CANTON-${segment()}-${segment()}`;
}
