/**
 * MockSwapProvider.ts
 *
 * Simulates a successful Canton wallet swap.
 * Used when PROVIDER=mock (default in development).
 */

import { randomUUID } from 'crypto';
import type { ISwapProvider } from '../../interfaces/ISwapProvider';
import type { SwapRequest, SwapResult } from '../../models/swap.model';
import { config } from '../../config/app.config';
import { networkDelay } from '../../utils/simulation';

export class MockSwapProvider implements ISwapProvider {
  async executeSwap(request: SwapRequest): Promise<SwapResult> {
    await networkDelay(); // simulate wallet round-trip

    return {
      transactionId: randomUUID(),
      status:        'pending_approval',
      fromAmount:    request.fromAmount,
      toAmount:      request.toAmount,
      fromToken:     request.fromToken,
      toToken:       request.toToken,
      walletUrl:     config.walletUrl,
      note:          'Simulated — Canton wallet not reachable in mock mode',
    };
  }
}
