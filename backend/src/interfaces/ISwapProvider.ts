/**
 * ISwapProvider.ts
 *
 * The contract every swap data source must fulfill.
 */

import type { SwapRequest, SwapResult } from '../models/swap.model';

export interface ISwapProvider {
  /**
   * Initiate a token swap.
   * Returns a SwapResult with status "pending_approval" when the Canton
   * wallet needs user confirmation, or "completed" for instant swaps.
   */
  executeSwap(request: SwapRequest): Promise<SwapResult>;
}
