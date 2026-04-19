/**
 * UserAuthService.ts
 *
 * User signup, login, JWT — Canton RBAC aligned.
 *
 * Signup rules:
 *   - Invitation code ALWAYS required (no open signup)
 *   - Exception: if zero users exist → first user becomes ADMIN (bootstrap)
 *   - New users always get role=USER, status=pending, partyId=null
 */

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';
import { config } from '../config/app.config';
import { prisma } from '../lib/prisma';
import type { PublicUser, JwtPayload, UserRole } from '../models/user.model';
import { validateInvitationCode, InvitationError } from './InvitationService';
import { createOnboardingRequest } from './OnboardingService';
import { cantonParticipantProvider } from '../providers/canton/CantonParticipantProvider';

export class AuthError extends Error {
  constructor(message: string, public readonly statusCode = 400) {
    super(message);
    this.name = 'AuthError';
  }
}

const BCRYPT_ROUNDS = 10;

function toPublicUser(u: {
  id: string; email: string; role: string;
  partyId: string | null; onboardingStatus: string; createdAt: Date;
}): PublicUser {
  return {
    id:               u.id,
    email:            u.email,
    role:             u.role as UserRole,
    partyId:          u.partyId,
    onboardingStatus: u.onboardingStatus as PublicUser['onboardingStatus'],
    createdAt:        u.createdAt.toISOString(),
  };
}

function signToken(u: {
  id: string; email: string; role: string;
  partyId: string | null; onboardingStatus: string;
}): string {
  const payload: JwtPayload = {
    sub:              u.id,
    email:            u.email,
    role:             u.role as UserRole,
    partyId:          u.partyId,
    onboardingStatus: u.onboardingStatus as JwtPayload['onboardingStatus'],
  };
  return jwt.sign(payload, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn as jwt.SignOptions['expiresIn'],
  });
}

function validateEmail(email: string): void {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new AuthError('Invalid email address');
}

function validatePassword(password: string): void {
  if (!password || password.length < 8) throw new AuthError('Password must be at least 8 characters');
}

export interface SignupResult { user: PublicUser; token: string; message: string }
export interface LoginResult  { user: PublicUser; token: string }

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

  // ── Bootstrap: first user becomes ADMIN, auto-approved ───────────────
  const userCount = await prisma.user.count();
  if (userCount === 0) {
    const partyResult = await cantonParticipantProvider.createParty(userId, partyIdHint);
    const user = await prisma.user.create({
      data: {
        id:               userId,
        email:            normalised,
        passwordHash,
        role:             'ADMIN',
        partyId:          partyResult.partyId,
        onboardingStatus: 'approved',
      },
    });
    return {
      user:    toPublicUser(user),
      token:   signToken(user),
      message: 'Admin account created. You have full access.',
    };
  }

  // ── All other signups require invitation code ─────────────────────────
  if (!invitationCode) {
    throw new AuthError('An invitation code is required to register', 403);
  }

  let invitationId: string;
  try {
    invitationId = await validateInvitationCode(invitationCode);
  } catch (err) {
    if (err instanceof InvitationError) throw new AuthError(err.message, err.statusCode);
    throw err;
  }

  const user = await prisma.user.create({
    data: {
      id:               userId,
      email:            normalised,
      passwordHash,
      role:             'USER',
      partyId:          null,
      onboardingStatus: 'pending',
    },
  });

  await createOnboardingRequest(userId, invitationId, partyIdHint);

  return {
    user:    toPublicUser(user),
    token:   signToken(user),
    message: 'Registration successful. Awaiting operator approval to activate your Canton Party.',
  };
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
