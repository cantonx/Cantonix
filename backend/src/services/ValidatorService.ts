/**
 * ValidatorService.ts
 *
 * Multi-tenant validator monitoring — backed by PostgreSQL via Prisma.
 *
 * Strategy:
 *   1. On first request for a user → seed 3 default Participant Node rows.
 *   2. On every GET /api/validators/status → fetch fresh simulated data
 *      from the provider, persist the updated snapshot to DB, return it.
 *   3. ALL queries filter by userId — strict multi-tenant isolation.
 *
 * Canton alignment:
 *   When PROVIDER=canton, replace provider.getValidatorsStatus() with
 *   real HTTP calls to each node's /api/validator/readyz endpoint.
 *   The DB schema and service interface stay identical.
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
}): Validator {
  return {
    name:                 row.name,
    role:                 prismaRoleToApi(row.role),
    status:               row.status as Validator['status'],
    version:              row.version,
    uptime:               row.uptime,
    latency:              row.latency,
    lastChecked:          row.lastChecked.toISOString(),
    amuletRewards:        row.amuletRewards,
    synchronizerConnected: row.synchronizerConnected,
  };
}

// ─── Service ──────────────────────────────────────────────────────────────

export class ValidatorService {
  constructor(private readonly provider: IValidatorProvider) {}

  /**
   * Return fresh validator statuses for the authenticated user.
   * Seeds 3 default rows on first call. Persists updated snapshot to DB.
   */
  async getAllStatuses(user: JwtPayload): Promise<Validator[]> {
    // Seed default validators if this user has none yet
    const count = await prisma.validator.count({ where: { userId: user.sub } });
    if (count === 0) {
      await this.seedDefaultValidators(user.sub);
    }

    // Fetch fresh simulated (or real) data from the provider
    const fresh = await this.provider.getValidatorsStatus();

    // Persist the snapshot — upsert by (userId, name) to avoid duplicates
    await Promise.all(
      fresh.map(async (v) =>
        prisma.validator.upsert({
          where: {
            // Prisma requires a unique constraint for upsert.
            // We use a compound unique on (userId, name) — see schema @@unique below.
            // For now we find-then-update to avoid schema change mid-migration.
            id: await this.getOrCreateId(user.sub, v.name, v.role),
          },
          update: {
            status:               apiStatusToPrisma(v.status),
            version:              v.version,
            uptime:               v.uptime,
            latency:              v.latency,
            lastChecked:          new Date(),
            amuletRewards:        v.amuletRewards,
            synchronizerConnected: v.synchronizerConnected ?? false,
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
          },
        })
      )
    );

    // Return the freshly persisted rows (ordered consistently)
    const rows = await prisma.validator.findMany({
      where:   { userId: user.sub },
      orderBy: { name: 'asc' },
    });

    return rows.map(dbRowToValidator);
  }

  /**
   * Return aggregate network status derived from the user's validators.
   */
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

  /** Find existing validator row ID, or return a placeholder for upsert create path */
  private async getOrCreateId(
    userId: string,
    name: string,
    role: Validator['role']
  ): Promise<string> {
    const existing = await prisma.validator.findFirst({
      where: { userId, name },
      select: { id: true },
    });
    if (existing) return existing.id;

    // Row doesn't exist yet — create it now and return the new id
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
