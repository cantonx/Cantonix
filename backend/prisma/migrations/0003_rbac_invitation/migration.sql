-- Migration: RBAC + Operator-controlled invitation system
-- Adds: UserRole enum, InvitationStatus enum
-- Modifies: User (role, remove sponsorId)
-- Modifies: InvitationCode (maxUses, usedCount, status, updatedAt)
-- Modifies: OnboardingRequest (remove sponsorId, add reviewedById)

-- ─── New Enums ────────────────────────────────────────────────────────────

CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'OPERATOR', 'USER');
CREATE TYPE "InvitationStatus" AS ENUM ('active', 'expired', 'revoked');

-- ─── Modify User table ────────────────────────────────────────────────────

ALTER TABLE "users" ADD COLUMN "role" "UserRole" NOT NULL DEFAULT 'USER';

-- Existing approved users become ADMIN (bootstrap)
UPDATE "users" SET "role" = 'ADMIN' WHERE "onboardingStatus" = 'approved';

-- Remove sponsorId (replaced by operator-controlled model)
ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "users_sponsorId_fkey";
ALTER TABLE "users" DROP COLUMN IF EXISTS "sponsorId";

-- ─── Modify InvitationCode table ──────────────────────────────────────────

-- Remove old columns, add new ones
ALTER TABLE "invitation_codes" DROP COLUMN IF EXISTS "usedById";
ALTER TABLE "invitation_codes" DROP COLUMN IF EXISTS "usedAt";
ALTER TABLE "invitation_codes" ADD COLUMN IF NOT EXISTS "maxUses"   INT NOT NULL DEFAULT 1;
ALTER TABLE "invitation_codes" ADD COLUMN IF NOT EXISTS "usedCount" INT NOT NULL DEFAULT 0;
ALTER TABLE "invitation_codes" ADD COLUMN IF NOT EXISTS "status"    "InvitationStatus" NOT NULL DEFAULT 'active';
ALTER TABLE "invitation_codes" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Rename issuedById → createdByUserId
ALTER TABLE "invitation_codes" RENAME COLUMN "issuedById" TO "createdByUserId";

-- Drop old unique index on usedById if exists
DROP INDEX IF EXISTS "invitation_codes_usedById_key";

-- ─── Modify OnboardingRequest table ──────────────────────────────────────

-- Remove sponsorId, add reviewedById
ALTER TABLE "onboarding_requests" DROP COLUMN IF EXISTS "sponsorId";
ALTER TABLE "onboarding_requests" ADD COLUMN IF NOT EXISTS "reviewedById" TEXT;

-- Drop old sponsorId index
DROP INDEX IF EXISTS "onboarding_requests_sponsorId_idx";

-- Add status index
CREATE INDEX IF NOT EXISTS "onboarding_requests_status_idx" ON "onboarding_requests"("status");

-- ─── Fix invitation_codes foreign key ────────────────────────────────────

ALTER TABLE "invitation_codes" DROP CONSTRAINT IF EXISTS "invitation_codes_issuedById_fkey";
ALTER TABLE "invitation_codes"
  ADD CONSTRAINT "invitation_codes_createdByUserId_fkey"
  FOREIGN KEY ("createdByUserId") REFERENCES "users"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
