/**
 * OnboardingService.ts
 *
 * Operator-controlled Canton party onboarding.
 *
 * Flow:
 *   1. ADMIN/OPERATOR creates InvitationCode
 *   2. User registers with code → partyId=null, status=pending
 *   3. ADMIN/OPERATOR approves → Canton Party created → status=approved
 *
 * Canton alignment:
 *   Only authorized Participants (ADMIN/OPERATOR) can approve party creation.
 *   Regular users have no authority in this flow.
 */

import { randomUUID } from 'crypto';
import { prisma } from '../lib/prisma';
import { cantonParticipantProvider } from '../providers/canton/CantonParticipantProvider';
import { consumeInvitation } from './InvitationService';

export class OnboardingError extends Error {
  constructor(message: string, public readonly statusCode = 400) {
    super(message);
    this.name = 'OnboardingError';
  }
}

export interface OnboardingStatusResponse {
  requestId: string | null;
  status: 'pending' | 'approved' | 'rejected';
  partyId: string | null;
  reviewNote: string | null;
  reviewedAt: string | null;
  createdAt: string | null;
}

export interface PendingRequestItem {
  id: string;
  userId: string;
  status: string;
  partyIdHint: string | null;
  createdAt: string;
  user: { email: string; role: string };
}

/**
 * Create an onboarding request after signup.
 */
export async function createOnboardingRequest(
  userId: string,
  invitationCodeId: string,
  partyIdHint?: string
): Promise<void> {
  await prisma.onboardingRequest.create({
    data: {
      id:               randomUUID(),
      userId,
      invitationCodeId,
      partyIdHint:      partyIdHint ?? null,
      status:           'pending',
    },
  });

  await consumeInvitation(invitationCodeId);
}

/**
 * Get onboarding status for a user.
 */
export async function getOnboardingStatus(
  userId: string
): Promise<OnboardingStatusResponse | null> {
  const req = await prisma.onboardingRequest.findUnique({ where: { userId } });
  if (!req) return null;

  return {
    requestId:  req.id,
    status:     req.status as OnboardingStatusResponse['status'],
    partyId:    req.assignedPartyId,
    reviewNote: req.reviewNote,
    reviewedAt: req.reviewedAt?.toISOString() ?? null,
    createdAt:  req.createdAt.toISOString(),
  };
}

/**
 * Approve an onboarding request.
 * Only ADMIN or OPERATOR can call this.
 * Triggers Canton Party creation.
 */
export async function approveOnboarding(
  requestId: string,
  reviewerId: string,
  note?: string
): Promise<{ partyId: string }> {
  const req = await prisma.onboardingRequest.findUnique({
    where:   { id: requestId },
    include: { user: true },
  });

  if (!req)                    throw new OnboardingError('Request not found', 404);
  if (req.status !== 'pending') throw new OnboardingError(`Request is already ${req.status}`);

  // Create Canton Party (real or mock)
  const partyResult = await cantonParticipantProvider.createParty(
    req.userId,
    req.partyIdHint ?? undefined
  );

  // Update user
  await prisma.user.update({
    where: { id: req.userId },
    data: {
      partyId:          partyResult.partyId,
      onboardingStatus: 'approved',
    },
  });

  // Update request
  await prisma.onboardingRequest.update({
    where: { id: requestId },
    data: {
      status:          'approved',
      assignedPartyId: partyResult.partyId,
      reviewNote:      note ?? null,
      reviewedById:    reviewerId,
      reviewedAt:      new Date(),
    },
  });

  return { partyId: partyResult.partyId };
}

/**
 * Reject an onboarding request.
 * Only ADMIN or OPERATOR can call this.
 */
export async function rejectOnboarding(
  requestId: string,
  reviewerId: string,
  note?: string
): Promise<void> {
  const req = await prisma.onboardingRequest.findUnique({ where: { id: requestId } });

  if (!req)                    throw new OnboardingError('Request not found', 404);
  if (req.status !== 'pending') throw new OnboardingError(`Request is already ${req.status}`);

  await prisma.onboardingRequest.update({
    where: { id: requestId },
    data: {
      status:       'rejected',
      reviewNote:   note ?? null,
      reviewedById: reviewerId,
      reviewedAt:   new Date(),
    },
  });

  await prisma.user.update({
    where: { id: req.userId },
    data:  { onboardingStatus: 'rejected' },
  });
}

/**
 * List all pending onboarding requests (ADMIN/OPERATOR).
 */
export async function getPendingRequests(): Promise<PendingRequestItem[]> {
  const rows = await prisma.onboardingRequest.findMany({
    where:   { status: 'pending' },
    include: { user: { select: { email: true, role: true } } },
    orderBy: { createdAt: 'asc' },
  });

  return rows.map((r) => ({
    id:          r.id,
    userId:      r.userId,
    status:      r.status,
    partyIdHint: r.partyIdHint,
    createdAt:   r.createdAt.toISOString(),
    user:        { email: r.user.email, role: r.user.role },
  }));
}
