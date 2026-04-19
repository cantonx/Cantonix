/**
 * UserAuthService.ts
 *
 * User signup, login, and JWT issuance — backed by PostgreSQL via Prisma.
 *
 * ─── Canton Onboarding Integration ───────────────────────────────────────
 *
 * Signup flow (Canton-aligned):
 *   1. Validate invitation code → get sponsorId
 *   2. Create user with partyId=null, onboardingStatus=pending
 *   3. Consume invitation code
 *   4. Create OnboardingRequest for sponsor approval
 *   5. Return JWT (user can login but partyId is null until approved)
 *
 * Bootstrap mode (first user / no invitation required):
 *   If no users exist in the DB, the first signup is auto-approved
 *   with a mock partyId. This allows initial setup without a sponsor.
 */

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';
import { config } from '../config/app.config';
import { prisma } from '../lib/prisma';
import type { PublicUser, JwtPayload } from '../models/user.model';
import {
  validateInvitationCode,
  consumeInvitationCode,
  createOnboardingRequest,
  OnboardingError,
} from './OnboardingService';
import { cantonParticipantProvider } from '../providers/canton/CantonParticipantProvider';

// ─── Errors ───────────────────────────────────────────────────────────────

export class AuthError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number = 400
  ) {
    super(message);
    this.name = 'AuthError';
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────

const BCRYPT_ROUNDS = 10;

function toPublicUser(user: {
  id: string;
  email: string;
  partyId: string | null;
  onboardingStatus: string;
  sponsorId: string | null;
  createdAt: Date;
}): PublicUser {
  return {
    id:               user.id,
    email:            user.email,
    partyId:          user.partyId,
    onboardingStatus: user.onboardingStatus as PublicUser['onboardingStatus'],
    sponsorId:        user.sponsorId,
    createdAt:        user.createdAt.toISOString(),
  };
}

function signToken(user: {
  id: string;
  email: string;
  partyId: string | null;
  onboardingStatus: string;
}): string {
  const payload: JwtPayload = {
    sub:              user.id,
    email:            user.email,
    partyId:          user.partyId,
    onboardingStatus: user.onboardingStatus as JwtPayload['onboardingStatus'],
  };
  return jwt.sign(payload, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn as jwt.SignOptions['expiresIn'],
  });
}

// ─── Validation ───────────────────────────────────────────────────────────

function validateEmail(email: string): void {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new AuthError('Invalid email address');
  }
}

function validatePassword(password: string): void {
  if (!password || password.length < 8) {
    throw new AuthError('Password must be at least 8 characters');
  }
}

// ─── Public API ───────────────────────────────────────────────────────────

export interface SignupResult { user: PublicUser; token: string }
export interface LoginResult  { user: PublicUser; token: string }

/**
 * Register a new user.
 *
 * If invitationCode is provided:
 *   → Canton-style onboarding: user starts as pending, needs sponsor approval
 *
 * If no invitationCode and no users exist (bootstrap):
 *   → First user is auto-approved with a mock partyId
 *
 * If no invitationCode and users already exist:
 *   → Rejected (invitation required)
 */
export async function signup(
  email: string,
  password: string,
  invitationCode?: string,
  partyIdHint?: string
): Promise<SignupResult> {
  validateEmail(email);
  validatePassword(password);

  const normalised = email.toLowerCase().trim();

  const existing = await prisma.user.findUnique({ where: { email: normalised } });
  if (existing) throw new AuthError('Email already registered', 409);

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  const userId = randomUUID();

  // ── Bootstrap mode: first user gets auto-approved ────────────────────
  const userCount = await prisma.user.count();
  if (userCount === 0) {
    const partyResult = await cantonParticipantProvider.createParty(userId, partyIdHint);
    const user = await prisma.user.create({
      data: {
        id:               userId,
        email:            normalised,
        passwordHash,
        partyId:          partyResult.partyId,
        onboardingStatus: 'approved',
        sponsorId:        null,
      },
    });
    return { user: toPublicUser(user), token: signToken(user) };
  }

  // ── Invitation required for all subsequent users ──────────────────────
  if (!invitationCode) {
    throw new AuthError('An invitation code is required to register', 403);
  }

  let invitationId: string;
  let sponsorId: string;

  try {
    const result = await validateInvitationCode(invitationCode);
    invitationId = result.invitationId;
    sponsorId    = result.sponsorId;
  } catch (err) {
    if (err instanceof OnboardingError) {
      throw new AuthError(err.message, err.statusCode);
    }
    throw err;
  }

  // Create user with pending status — partyId assigned after sponsor approval
  const user = await prisma.user.create({
    data: {
      id:               userId,
      email:            normalised,
      passwordHash,
      partyId:          null,
      onboardingStatus: 'pending',
      sponsorId,
    },
  });

  // Consume the invitation code
  await consumeInvitationCode(invitationId, userId);

  // Create onboarding request for sponsor to review
  await createOnboardingRequest(userId, sponsorId, invitationId, partyIdHint);

  return { user: toPublicUser(user), token: signToken(user) };
}

export async function login(email: string, password: string): Promise<LoginResult> {
  validateEmail(email);
  if (!password) throw new AuthError('Password is required');

  const normalised = email.toLowerCase().trim();
  const user = await prisma.user.findUnique({ where: { email: normalised } });

  if (!user) {
    await bcrypt.hash('dummy', BCRYPT_ROUNDS);
    throw new AuthError('Invalid email or password', 401);
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) throw new AuthError('Invalid email or password', 401);

  return { user: toPublicUser(user), token: signToken(user) };
}

export function verifyToken(token: string): JwtPayload {
  try {
    return jwt.verify(token, config.jwtSecret) as JwtPayload;
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) throw new AuthError('Token expired', 401);
    throw new AuthError('Invalid token', 401);
  }
}

export async function getUserById(id: string): Promise<PublicUser | null> {
  const user = await prisma.user.findUnique({ where: { id } });
  return user ? toPublicUser(user) : null;
}

/**
 * Refresh the JWT token with the latest user data from DB.
 * Call this after onboarding approval to get updated partyId.
 */
export async function refreshToken(userId: string): Promise<string | null> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return null;
  return signToken(user);
}
