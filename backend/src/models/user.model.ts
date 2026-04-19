/**
 * user.model.ts — Canton-aligned RBAC user model
 *
 * Roles:
 *   ADMIN    → full access, can create invitations, approve onboarding
 *   OPERATOR → can create invitations, approve onboarding
 *   USER     → cannot invite, cannot approve — standard participant
 *
 * Onboarding lifecycle:
 *   1. Operator creates InvitationCode
 *   2. User registers with code → partyId=null, status=pending
 *   3. Admin/Operator approves → Canton Party created → status=approved
 */

export type UserRole = 'ADMIN' | 'OPERATOR' | 'USER';
export type OnboardingStatus = 'pending' | 'approved' | 'rejected';

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  partyId: string | null;
  onboardingStatus: OnboardingStatus;
  createdAt: string;
}

export interface PublicUser {
  id: string;
  email: string;
  role: UserRole;
  partyId: string | null;
  onboardingStatus: OnboardingStatus;
  createdAt: string;
}

export interface JwtPayload {
  sub: string;
  email: string;
  role: UserRole;
  partyId: string | null;
  onboardingStatus: OnboardingStatus;
  iat?: number;
  exp?: number;
}
