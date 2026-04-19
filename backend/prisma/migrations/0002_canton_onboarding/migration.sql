-- Migration: Canton-style onboarding system
-- Adds: OnboardingStatus enum, InvitationCode table, OnboardingRequest table
-- Modifies: User (partyId nullable, onboardingStatus, sponsorId)
-- Modifies: Validator (participantId, domainId, synchronizerStatus)

-- ─── New Enums ────────────────────────────────────────────────────────────

CREATE TYPE "OnboardingStatus" AS ENUM ('pending', 'approved', 'rejected');

-- ─── Modify User table ────────────────────────────────────────────────────

-- Make partyId nullable (null until Canton assigns it)
ALTER TABLE "users" ALTER COLUMN "partyId" DROP NOT NULL;

-- Add onboarding status (default pending for existing users → set to approved below)
ALTER TABLE "users" ADD COLUMN "onboardingStatus" "OnboardingStatus" NOT NULL DEFAULT 'pending';

-- Add sponsorId (null for bootstrap/first user)
ALTER TABLE "users" ADD COLUMN "sponsorId" TEXT;

-- Existing users are already "approved" (they have partyIds)
UPDATE "users" SET "onboardingStatus" = 'approved' WHERE "partyId" IS NOT NULL;

-- ─── InvitationCode table ─────────────────────────────────────────────────

CREATE TABLE "invitation_codes" (
    "id"          TEXT NOT NULL,
    "code"        TEXT NOT NULL,
    "issuedById"  TEXT NOT NULL,
    "usedById"    TEXT,
    "usedAt"      TIMESTAMP(3),
    "expiresAt"   TIMESTAMP(3),
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invitation_codes_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "invitation_codes_code_key"     ON "invitation_codes"("code");
CREATE UNIQUE INDEX "invitation_codes_usedById_key" ON "invitation_codes"("usedById");
CREATE INDEX        "invitation_codes_issuedById_idx" ON "invitation_codes"("issuedById");

-- ─── OnboardingRequest table ──────────────────────────────────────────────

CREATE TABLE "onboarding_requests" (
    "id"               TEXT NOT NULL,
    "userId"           TEXT NOT NULL,
    "sponsorId"        TEXT NOT NULL,
    "invitationCodeId" TEXT NOT NULL,
    "status"           "OnboardingStatus" NOT NULL DEFAULT 'pending',
    "partyIdHint"      TEXT,
    "assignedPartyId"  TEXT,
    "reviewNote"       TEXT,
    "reviewedAt"       TIMESTAMP(3),
    "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "onboarding_requests_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "onboarding_requests_userId_key" ON "onboarding_requests"("userId");
CREATE INDEX        "onboarding_requests_sponsorId_idx" ON "onboarding_requests"("sponsorId");

-- ─── Modify Validator table ───────────────────────────────────────────────

ALTER TABLE "validators" ADD COLUMN "participantId"      TEXT;
ALTER TABLE "validators" ADD COLUMN "domainId"           TEXT;
ALTER TABLE "validators" ADD COLUMN "synchronizerStatus" TEXT;

-- ─── Foreign Keys ─────────────────────────────────────────────────────────

ALTER TABLE "users"
    ADD CONSTRAINT "users_sponsorId_fkey"
    FOREIGN KEY ("sponsorId") REFERENCES "users"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "invitation_codes"
    ADD CONSTRAINT "invitation_codes_issuedById_fkey"
    FOREIGN KEY ("issuedById") REFERENCES "users"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "onboarding_requests"
    ADD CONSTRAINT "onboarding_requests_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
