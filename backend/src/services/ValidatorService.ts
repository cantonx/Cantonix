/**
 * ValidatorService.ts
 *
 * Multi-tenant Participant Node monitoring — backed by PostgreSQL via Prisma.
 *
 * ─── Canton Alignment ─────────────────────────────────────────────────────
 *
 * "Validator" in this service refers to the Validator App running on a
 * Canton Participant Node — not a generic blockchain validator.
 *
 * Each row in the `validators` table represents a snapshot of one
 * Participant Node's health, scoped to a specific user (multi-tenant).
 *
 * New fields (v4.0):
 *   participantId      → Canton Participant Node ID (from Admin API)
 *   domainId           → Global Synchronizer domain ID
 *   synchronizerStatus → Derived connectivity status string
 *
 * Provider abstraction:
 *   PROVIDER=mock   → MockValidatorProvider (simulated data)
 *   PROVIDER=canton → CantonValidatorProvider (real HTTP calls)
 */

import { ValidatorStatus as PrismaStatus, ValidatorRole } from '@prisma/client';
import { prisma } from '../lib/prisma';
import type { IValidatorProvider } from '../interfaces/IValidatorProvider';
import type { Validator } from '../models/validator.model';
import type { NetworkStatusResult } from '../models/network.model';
import type { JwtPayload } from '../models/user.model';
import { aggregateNetworkStatus } from '../providers/mock/MockValidatorProvider';
import { config } from '../config/app.config';

// ─── Default Participant Node definitions ─────────────────────────────────

const DEFAULT_NODES: Array<{ name: string; role: ValidatorRole }> = [
  { name: 'App User Participant',     role: ValidatorRole.validator },
  { name: 'App Provider Participant', role: ValidatorRole.validator },
  { name: 'Super Validator (SV)',     role: ValidatorRole.super_validator },
];

// ─── Mapping helpers ──────────────────────────────────────────────────────

function prismaRoleToApi(role: ValidatorRole): Validator['role'] {
  return role === ValidatorRole.super_validator ? 'super-validator' : 'validator';
}

function apiStatusToPrisma(status: Validator['status']): PrismaStatus {
  return status as PrismaStatus;
}

/**
 * Derive a human-readable synchronizer status string from node health.
 * Real Canton: replace with actual synchronizer connection config check.
 */
function deriveSynchronizerStatus(
  status: Validator['status'],
  synchronizerConnected: boolean
): string {
  if (!synchronizerConnected) return 'disconnected';
  if (status === 'healthy')   return 'connected';
  if (status === 'degraded')  return 'degraded';
  return 'disconnected';
}

function dbRowToValidator(row: {
  name: string;
  role: ValidatorRole;
  status: PrismaStatus;
  version: string;
  uptime: string;
  latency: string | null;
  lastChecked: Date;
  amuletRewards: number | null;
  synchronizerConnected: boolean;
  participantId: string | null;
  domainId: string | null;
  synchronizerStatus: string | null;
}): Validator {
  return {
    name:                  row.name,
    role:                  prismaRoleToApi(row.role),
    status:                row.status as Validator['status'],
    version:               row.version,
    uptime:                row.uptime,
    latency:               row.latency,
    lastChecked:           row.lastChecked.toISOString(),
    amuletRewards:         row.amuletRewards,
    synchronizerConnected: row.synchronizerConnected,
    // New Canton-aligned fields
    participantId:         row.participantId ?? undefined,
    domainId:              row.domainId ?? undefined,
    synchronizerStatus:    row.synchronizerStatus ?? undefined,
  };
}

// ─── Service ──────────────────────────────────────────────────────────────

export class ValidatorService {
  constructor(private readonly provider: IValidatorProvider) {}

  /**
   * Return fresh Participant Node statuses for the authenticated user.
   * Seeds 3 default rows on first call. Persists updated snapshot to DB.
   */
  async getAllStatuses(user: JwtPayload): Promise<Validator[]> {
    const count = await prisma.validator.count({ where: { userId: user.sub } });
    if (count === 0) {
      await this.seedDefaultValidators(user.sub);
    }

    // Fetch fresh data from provider (mock or real Canton)
    const fresh = await this.provider.getValidatorsStatus();

    // Persist snapshot — upsert by row ID
    await Promise.all(
      fresh.map(async (v) => {
        const id = await this.getOrCreateId(user.sub, v.name, v.role);
        const syncStatus = deriveSynchronizerStatus(v.status, v.synchronizerConnected ?? false);

        return prisma.validator.upsert({
          where: { id },
          update: {
            status:               apiStatusToPrisma(v.status),
            version:              v.version,
            uptime:               v.uptime,
            latency:              v.latency,
            lastChecked:          new Date(),
            amuletRewards:        v.amuletRewards,
            synchronizerConnected: v.synchronizerConnected ?? false,
            // Canton-aligned fields
            participantId:        v.participantId ?? null,
            domainId:             v.domainId ?? null,
            synchronizerStatus:   syncStatus,
          },
          create: {
            userId:               user.sub,
            name:                 v.name,
            role:                 v.role === 'super-validator'
                                    ? ValidatorRole.super_validator
                                    : ValidatorRole.validator,
            status:               apiStatusToPrisma(v.status),
            version:              v.version,
            uptime:               v.uptime,
            latency:              v.latency,
            lastChecked:          new Date(),
            amuletRewards:        v.amuletRewards,
            synchronizerConnected: v.synchronizerConnected ?? false,
            participantId:        v.participantId ?? null,
            domainId:             v.domainId ?? null,
            synchronizerStatus:   syncStatus,
          },
        });
      })
    );

    const rows = await prisma.validator.findMany({
      where:   { userId: user.sub },
      orderBy: { name: 'asc' },
    });

    return rows.map(dbRowToValidator);
  }

  async getNetworkStatus(user: JwtPayload): Promise<NetworkStatusResult> {
    const validators = await this.getAllStatuses(user);
    return aggregateNetworkStatus(validators, config.networkName);
  }

  // ─── Private helpers ────────────────────────────────────────────────────

  private async seedDefaultValidators(userId: string): Promise<void> {
    await prisma.validator.createMany({
      data: DEFAULT_NODES.map((node) => ({
        userId,
        name:   node.name,
        role:   node.role,
        status: PrismaStatus.offline,
      })),
      skipDuplicates: true,
    });
  }

  private async getOrCreateId(
    userId: string,
    name: string,
    role: Validator['role']
  ): Promise<string> {
    const existing = await prisma.validator.findFirst({
      where:  { userId, name },
      select: { id: true },
    });
    if (existing) return existing.id;

    const created = await prisma.validator.create({
      data: {
        userId,
        name,
        role: role === 'super-validator'
          ? ValidatorRole.super_validator
          : ValidatorRole.validator,
        status: PrismaStatus.offline,
      },
      select: { id: true },
    });
    return created.id;
  }
}
