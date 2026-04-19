/**
 * InvitationService.ts
 *
 * Operator-controlled invitation code management.
 *
 * Canton alignment:
 *   Only ADMIN or OPERATOR can create invitation codes.
 *   Users CANNOT invite other users — this is a permissioned system.
 *   Codes are one-time (or limited-use) onboarding authorizations.
 */

import { randomUUID } from 'crypto';
import { prisma } from '../lib/prisma';

export class InvitationError extends Error {
  constructor(message: string, public readonly statusCode = 400) {
    super(message);
    this.name = 'InvitationError';
  }
}

export interface CreateInvitationOptions {
  maxUses?: number;
  expiresInHours?: number;
}

export interface InvitationResult {
  id: string;
  code: string;
  maxUses: number;
  usedCount: number;
  status: string;
  expiresAt: string | null;
  createdAt: string;
}

/**
 * Create a new invitation code.
 * Only ADMIN or OPERATOR can call this.
 */
export async function createInvitation(
  operatorId: string,
  options: CreateInvitationOptions = {}
): Promise<InvitationResult> {
  const { maxUses = 1, expiresInHours } = options;

  const expiresAt = expiresInHours
    ? new Date(Date.now() + expiresInHours * 3600 * 1000)
    : null;

  const code = generateCode();

  const inv = await prisma.invitationCode.create({
    data: {
      id:              randomUUID(),
      code,
      createdByUserId: operatorId,
      maxUses,
      expiresAt,
    },
  });

  return toResult(inv);
}

/**
 * List all invitation codes (ADMIN only).
 */
export async function listInvitations(): Promise<InvitationResult[]> {
  // Auto-expire codes that have passed their expiry date
  await prisma.invitationCode.updateMany({
    where: {
      status:    'active',
      expiresAt: { lt: new Date() },
    },
    data: { status: 'expired' },
  });

  const codes = await prisma.invitationCode.findMany({
    orderBy: { createdAt: 'desc' },
  });

  return codes.map(toResult);
}

/**
 * Revoke an invitation code (ADMIN/OPERATOR).
 */
export async function revokeInvitation(id: string): Promise<void> {
  const inv = await prisma.invitationCode.findUnique({ where: { id } });
  if (!inv) throw new InvitationError('Invitation not found', 404);
  if (inv.status !== 'active') throw new InvitationError('Invitation is not active');

  await prisma.invitationCode.update({
    where: { id },
    data:  { status: 'revoked' },
  });
}

/**
 * Validate an invitation code at signup.
 * Returns the invitation ID if valid, throws otherwise.
 */
export async function validateInvitationCode(code: string): Promise<string> {
  // Auto-expire first
  await prisma.invitationCode.updateMany({
    where: { status: 'active', expiresAt: { lt: new Date() } },
    data:  { status: 'expired' },
  });

  const inv = await prisma.invitationCode.findUnique({ where: { code } });

  if (!inv)                          throw new InvitationError('Invalid invitation code');
  if (inv.status === 'revoked')      throw new InvitationError('Invitation code has been revoked');
  if (inv.status === 'expired')      throw new InvitationError('Invitation code has expired');
  if (inv.usedCount >= inv.maxUses)  throw new InvitationError('Invitation code has reached its usage limit');

  return inv.id;
}

/**
 * Increment usedCount after successful signup.
 * Marks as expired if maxUses reached.
 */
export async function consumeInvitation(invitationId: string): Promise<void> {
  const inv = await prisma.invitationCode.findUnique({ where: { id: invitationId } });
  if (!inv) return;

  const newCount = inv.usedCount + 1;
  await prisma.invitationCode.update({
    where: { id: invitationId },
    data: {
      usedCount: newCount,
      status:    newCount >= inv.maxUses ? 'expired' : 'active',
    },
  });
}

// ─── Helpers ──────────────────────────────────────────────────────────────

function generateCode(): string {
  const seg = () => Math.random().toString(36).toUpperCase().slice(2, 6).padEnd(4, '0');
  return `CANTON-${seg()}-${seg()}`;
}

function toResult(inv: {
  id: string; code: string; maxUses: number; usedCount: number;
  status: string; expiresAt: Date | null; createdAt: Date;
}): InvitationResult {
  return {
    id:         inv.id,
    code:       inv.code,
    maxUses:    inv.maxUses,
    usedCount:  inv.usedCount,
    status:     inv.status,
    expiresAt:  inv.expiresAt?.toISOString() ?? null,
    createdAt:  inv.createdAt.toISOString(),
  };
}
