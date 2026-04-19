/**
 * SwapService.ts
 *
 * CC swap business logic — user-scoped, persisted to PostgreSQL via Prisma.
 *
 * Every executed swap is recorded in the swap_transactions table.
 * ALL queries filter by userId — strict multi-tenant isolation.
 */

import { SwapStatus as PrismaSwapStatus, SwapTransaction } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { randomUUID } from 'crypto';
import type { ISwapProvider } from '../interfaces/ISwapProvider';
import type { SwapRequest, SwapResult } from '../models/swap.model';
import type { JwtPayload } from '../models/user.model';

export class SwapValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SwapValidationError';
  }
}

export class SwapService {
  constructor(private readonly provider: ISwapProvider) {}

  async execute(request: SwapRequest, user: JwtPayload): Promise<SwapResult> {
    this.validate(request);

    // Use user's partyId as wallet address if not explicitly provided
    const enriched: SwapRequest = {
      ...request,
      walletAddress: request.walletAddress?.trim() || user.partyId,
    };

    // Execute via provider (mock or real Canton wallet)
    const result = await this.provider.executeSwap(enriched);

    // Persist the swap transaction — scoped to this user
    await prisma.swapTransaction.create({
      data: {
        id:            randomUUID(),
        userId:        user.sub,
        transactionId: result.transactionId,
        status:        this.mapStatus(result.status),
        fromToken:     result.fromToken,
        toToken:       result.toToken,
        fromAmount:    result.fromAmount,
        toAmount:      result.toAmount,
        walletAddress: enriched.walletAddress,
      },
    });

    return result;
  }

  /** Return swap history for the authenticated user (newest first) */
  async getHistory(userId: string, limit = 20): Promise<SwapResult[]> {
    const rows = await prisma.swapTransaction.findMany({
      where:   { userId },
      orderBy: { createdAt: 'desc' },
      take:    limit,
    });

    return rows.map((row: SwapTransaction) => ({
      transactionId: row.transactionId,
      status:        row.status as SwapResult['status'],
      fromAmount:    row.fromAmount,
      toAmount:      row.toAmount,
      fromToken:     row.fromToken,
      toToken:       row.toToken,
      walletUrl:     '',
    }));
  }

  private validate(request: SwapRequest): void {
    if (!request.fromToken || !request.toToken) {
      throw new SwapValidationError('fromToken and toToken are required');
    }
    if (typeof request.fromAmount !== 'number' || request.fromAmount <= 0) {
      throw new SwapValidationError('fromAmount must be a positive number');
    }
    if (typeof request.toAmount !== 'number' || request.toAmount <= 0) {
      throw new SwapValidationError('toAmount must be a positive number');
    }
  }

  private mapStatus(status: SwapResult['status']): PrismaSwapStatus {
    const map: Record<SwapResult['status'], PrismaSwapStatus> = {
      pending_approval: PrismaSwapStatus.pending_approval,
      completed:        PrismaSwapStatus.completed,
      failed:           PrismaSwapStatus.failed,
    };
    return map[status] ?? PrismaSwapStatus.pending_approval;
  }
}
