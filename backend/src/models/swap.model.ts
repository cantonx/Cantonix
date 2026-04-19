/**
 * swap.model.ts
 *
 * Models for Canton Coin (CC / Amulet) swap operations.
 *
 * ─── Canton Terminology ───────────────────────────────────────────────────
 *
 * CANTON COIN (CC) / AMULET
 *   The native token of the Canton Network. On-chain it is represented as
 *   an Amulet Daml contract. User-facing it is called Canton Coin (CC).
 *
 * TRANSFER OFFER (deprecated workflow)
 *   POST /v0/wallet/transfer-offers — legacy two-step CC transfer.
 *   Deprecated in favor of the Canton Network Token Standard DVP workflow.
 *
 * TRANSFER PREAPPROVAL (current workflow)
 *   POST /v0/wallet/transfer-preapproval/send — preferred CC transfer.
 *   Requires a TransferPreapproval Daml contract to exist for the receiver.
 *
 * WALLET BALANCE
 *   GET /v0/wallet/balance — returns effective_unlocked_qty (spendable CC).
 *
 * NOTE: There is no direct CC→aUSD swap endpoint in the Validator API.
 * A "swap" in this context means initiating a CC transfer offer that
 * another party (e.g. a DEX or liquidity provider) accepts in exchange
 * for another asset. The actual settlement happens on-ledger via Daml.
 */

export type SwapStatus = 'pending_approval' | 'completed' | 'failed';

export interface SwapRequest {
  /** Source token — always "CC" (Canton Coin / Amulet) */
  fromToken: string;
  /** Target token — e.g. "aUSD" (application-defined) */
  toToken: string;
  fromAmount: number;
  toAmount: number;
  /** Canton party ID or wallet address of the sender */
  walletAddress: string;
}

export interface SwapResult {
  /**
   * Transaction / tracking ID.
   * For real Canton: this is the updateId from the ledger response,
   * or the tracking_id from a transfer offer.
   */
  transactionId: string;

  /**
   * "pending_approval" — payment request created, user must approve in wallet
   * "completed"        — transfer settled on-ledger
   * "failed"           — transfer rejected or timed out
   */
  status: SwapStatus;

  fromAmount: number;
  toAmount: number;
  fromToken: string;
  toToken: string;

  /** URL of the Canton Wallet UI where the user approves the transfer */
  walletUrl: string;

  /** Present in mock/dev mode to indicate simulated response */
  note?: string;
}
