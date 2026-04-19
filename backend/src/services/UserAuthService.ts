/**
 * UserAuthService.ts
 *
 * User signup, login, and JWT issuance — backed by PostgreSQL via Prisma.
 *
 * ─── Canton Party mapping ─────────────────────────────────────────────────
 * On signup, partyId = "party-<uuid>" (simulated Canton Party).
 * Future: replace generatePartyId() with POST /v2/parties on JSON Ledger API.
 */

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';
import { config } from '../config/app.config';
import { prisma } from '../lib/prisma';
import type { PublicUser, JwtPayload } from '../models/user.model';

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

function generatePartyId(): string {
  return `party-${randomUUID()}`;
}

function toPublicUser(user: {
  id: string;
  email: string;
  partyId: string;
  createdAt: Date;
}): PublicUser {
  return {
    id:        user.id,
    email:     user.email,
    partyId:   user.partyId,
    createdAt: user.createdAt.toISOString(),
  };
}

function signToken(user: { id: string; email: string; partyId: string }): string {
  const payload: JwtPayload = {
    sub:     user.id,
    email:   user.email,
    partyId: user.partyId,
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

export async function signup(email: string, password: string): Promise<SignupResult> {
  validateEmail(email);
  validatePassword(password);

  const normalised = email.toLowerCase().trim();

  const existing = await prisma.user.findUnique({ where: { email: normalised } });
  if (existing) throw new AuthError('Email already registered', 409);

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

  const user = await prisma.user.create({
    data: {
      id:           randomUUID(),
      email:        normalised,
      passwordHash,
      partyId:      generatePartyId(),
    },
  });

  return { user: toPublicUser(user), token: signToken(user) };
}

export async function login(email: string, password: string): Promise<LoginResult> {
  validateEmail(email);
  if (!password) throw new AuthError('Password is required');

  const normalised = email.toLowerCase().trim();
  const user = await prisma.user.findUnique({ where: { email: normalised } });

  if (!user) {
    // Constant-time — don't reveal whether email exists
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
