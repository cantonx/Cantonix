/**
 * prisma.ts
 *
 * Single PrismaClient instance for the entire process.
 *
 * Prisma 7 requires an explicit database adapter — the built-in query engine
 * was removed. We use @prisma/adapter-pg (the official PostgreSQL adapter).
 *
 * Connection URL is read from DATABASE_URL env var (set in .env).
 */

import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

declare global {
  // Prevent multiple instances during hot-reload (nodemon / ts-node)
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

function createPrismaClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      'DATABASE_URL is not set. Add it to your .env file.\n' +
      'Example: DATABASE_URL="postgresql://postgres:postgres@localhost:5432/cantonix"'
    );
  }

  const adapter = new PrismaPg({
    connectionString,
    // Supabase & most cloud PostgreSQL providers require SSL
    ssl: connectionString.includes('supabase.co') || process.env.NODE_ENV === 'production'
      ? { rejectUnauthorized: false }
      : undefined,
  });

  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });
}

export const prisma: PrismaClient =
  global.__prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  global.__prisma = prisma;
}
