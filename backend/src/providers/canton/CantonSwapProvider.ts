/**
 * CantonSwapProvider.ts
 *
 * Canton Coin (CC / Amulet) transfer initiation via the Validator App.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * CANTON TRANSFER WORKFLOWS
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * There are two CC transfer workflows in Splice:
 *
 * 1. TRANSFER OFFER (deprecated)
 *    POST /v0/wallet/transfer-offers
 *    Two-step: sender creates offer → receiver accepts.
 *    Deprecated in favor of the Canton Network Token Standard.
 *
 * 2. TRANSFER PREAPPROVAL (current, preferred)
 *    POST /v0/wallet/transfer-preapproval/send
 *    Requires a TransferPreapproval Daml contract for the receiver.
 *    One-step from sender's perspective once preapproval exists.
 *
 * This provider uses the Transfer Offer workflow as it requires no
 * pre-existing Daml contracts. Switch to transfer-preapproval for
 * production use once the receiver has set up a preapproval.
 *
 * ─── What "swap" means in Canton context ─────────────────────────────────
 *
 * There is no native CC→aUSD swap endpoint in the Validator API.
 * A "swap" here means:
 *   1. Sender initiates a CC transfer offer to a liquidity provider party
 *   2. The LP accepts and sends back the target asset (aUSD or other)
 *   3. Settlement happens on-ledger via Daml DVP (Delivery vs Payment)
 *
 * The walletUrl returned points to the Canton Wallet UI where the user
 * can approve the pending transfer offer.
 */

import axios, { AxiosError } from 'axios';
import { randomUUID } from 'crypto';
import type { ISwapProvider } from '../../interfaces/ISwapProvider';
import type { SwapRequest, SwapResult } from '../../models/swap.model';
import { config } from '../../config/app.config';
import { authHeaders } from '../../services/AuthService';

export class CantonSwapProvider implements ISwapProvider {
  async executeSwap(request: SwapRequest): Promise<SwapResult> {
    // ── INTEGRATION POINT 1: Auth ─────────────────────────────────────────
    // The JWT subject must be the sender's user ID (not the operator).
    // In oauth2 mode, use a user-scoped token, not the admin client-credentials token.
    const headers = await authHeaders('app-provider');

    // ── INTEGRATION POINT 2: Transfer offer initiation ───────────────────
    // POST /v0/wallet/transfer-offers  (Validator App, port x903)
    //
    // NOTE: This is the deprecated workflow. For production, use:
    //   POST /v0/wallet/transfer-preapproval/send
    //
    // Body shape (transfer offer):
    // {
    //   "receiver_party_id": "<party-id-of-receiver>",
    //   "amount": "100.0",          ← string, not number
    //   "description": "...",
    //   "expires_at": "2025-..."    ← ISO 8601
    // }
    //
    // The receiver_party_id must be a Canton party ID, not a wallet address.
    // Resolve it via GET /v2/parties on the JSON Ledger API first.
    const response = await axios.post(
      `${config.validatorUri}/v0/wallet/transfer-offers`,
      {
        receiver_party_id: request.walletAddress.trim(), // TODO: resolve to party ID
        amount:            String(request.fromAmount),   // Canton requires string
        description:       `Cantonix: ${request.fromAmount} ${request.fromToken} → ${request.toAmount} ${request.toToken}`,
        expires_at:        new Date(Date.now() + 15 * 60 * 1000).toISOString(), // 15 min
      },
      {
        headers: { 'Content-Type': 'application/json', ...headers },
        timeout: 15_000,
      }
    );

    // ── INTEGRATION POINT 3: Response normalization ───────────────────────
    // Transfer offer response contains a tracking_id, not a transactionId.
    // Use POST /v0/wallet/transfer-offers/{tracking_id}/status to poll.
    return {
      transactionId: response.data?.tracking_id ?? randomUUID(),
      status:        'pending_approval',
      fromAmount:    request.fromAmount,
      toAmount:      request.toAmount,
      fromToken:     request.fromToken,
      toToken:       request.toToken,
      walletUrl:     config.walletUrl,
    };
  }
}
