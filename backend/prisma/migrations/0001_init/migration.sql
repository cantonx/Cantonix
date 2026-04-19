-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "ValidatorStatus" AS ENUM ('healthy', 'degraded', 'offline');

-- CreateEnum
CREATE TYPE "ValidatorRole" AS ENUM ('validator', 'super_validator');

-- CreateEnum
CREATE TYPE "SwapStatus" AS ENUM ('pending_approval', 'completed', 'failed');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "partyId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "validators" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "ValidatorRole" NOT NULL DEFAULT 'validator',
    "status" "ValidatorStatus" NOT NULL DEFAULT 'offline',
    "version" TEXT NOT NULL DEFAULT 'unknown',
    "uptime" TEXT NOT NULL DEFAULT '0%',
    "latency" TEXT,
    "lastChecked" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "amuletRewards" DOUBLE PRECISION,
    "synchronizerConnected" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "validators_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "swap_transactions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "status" "SwapStatus" NOT NULL DEFAULT 'pending_approval',
    "fromToken" TEXT NOT NULL,
    "toToken" TEXT NOT NULL,
    "fromAmount" DOUBLE PRECISION NOT NULL,
    "toAmount" DOUBLE PRECISION NOT NULL,
    "walletAddress" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "swap_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_partyId_key" ON "users"("partyId");

-- CreateIndex
CREATE INDEX "validators_userId_idx" ON "validators"("userId");

-- CreateIndex
CREATE INDEX "swap_transactions_userId_idx" ON "swap_transactions"("userId");

-- AddForeignKey
ALTER TABLE "validators" ADD CONSTRAINT "validators_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "swap_transactions" ADD CONSTRAINT "swap_transactions_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
