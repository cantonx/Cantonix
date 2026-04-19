/**
 * SwapPage.tsx — Full CC Swap page using design system
 */
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';

const RATE = 0.10;
const NETWORK_FEE = 0.75;

interface SwapHistoryItem {
  id: string;
  transactionId: string;
  status: 'pending_approval' | 'completed' | 'failed';
  fromToken: string;
  toToken: string;
  fromAmount: number;
  toAmount: number;
  walletAddress: string;
  createdAt: string;
}

const statusPill = (s: string) => {
  if (s === 'completed')        return 'healthy';
  if (s === 'pending_approval') return 'degraded';
  return 'offline';
};

const statusLabel = (s: string) => {
  if (s === 'completed')        return 'Completed';
  if (s === 'pending_approval') return 'Pending';
  return 'Failed';
};

const SwapPage: React.FC = () => {
  const { authFetch, user } = useAuth();

  const [fromAmount, setFromAmount] = useState('');
  const [toAmount, setToAmount]     = useState('');
  const [walletAddress, setWalletAddress] = useState('');
  const [loading, setLoading]       = useState(false);
  const [successTxId, setSuccessTxId] = useState('');
  const [errorMsg, setErrorMsg]     = useState('');

  const [history, setHistory]       = useState<SwapHistoryItem[]>([]);
  const [histLoading, setHistLoading] = useState(true);

  const fetchHistory = useCallback(async () => {
    setHistLoading(true);
    try {
      const res = await authFetch('/api/swap/history');
      if (res.ok) setHistory(await res.json());
    } catch { /* ignore */ }
    setHistLoading(false);
  }, [authFetch]);

  useEffect(() => {
    fetchHistory();
    // Pre-fill wallet address from partyId
    if (user?.partyId) setWalletAddress(user.partyId);
  }, [fetchHistory, user?.partyId]);

  const handleFromChange = (val: string) => {
    setFromAmount(val);
    const n = parseFloat(val);
    setToAmount(!isNaN(n) && n > 0 ? (n * RATE).toFixed(4) : '');
    setSuccessTxId(''); setErrorMsg('');
  };

  const handleToChange = (val: string) => {
    setToAmount(val);
    const n = parseFloat(val);
    setFromAmount(!isNaN(n) && n > 0 ? (n / RATE).toFixed(4) : '');
    setSuccessTxId(''); setErrorMsg('');
  };

  const handleSwap = async () => {
    if (!fromAmount || !walletAddress.trim()) return;
    setLoading(true); setSuccessTxId(''); setErrorMsg('');

    try {
      const res = await authFetch('/api/swap/execute', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromToken: 'CC', toToken: 'aUSD',
          fromAmount: parseFloat(fromAmount),
          toAmount:   parseFloat(toAmount),
          walletAddress: walletAddress.trim(),
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setSuccessTxId(data.transactionId);
        setFromAmount(''); setToAmount('');
        fetchHistory();
      } else {
        setErrorMsg(data.error ?? 'Swap failed');
      }
    } catch {
      setErrorMsg('Network error — could not reach backend');
    }
    setLoading(false);
  };

  const canSwap = !!fromAmount && parseFloat(fromAmount) > 0 && !!walletAddress.trim();

  return (
    <>
      <div className="main-header">
        <div className="main-header-left">
          <span className="main-header-title">CC Swap</span>
          <span className="network-badge">Canton Coin</span>
        </div>
      </div>

      <div className="main-body">
        <div className="panels-grid" style={{ alignItems: 'start' }}>

          {/* ── Swap form ─────────────────────────────────────────────── */}
          <div className="card">
            <div className="card-header">
              <span className="card-title">Swap CC → aUSD</span>
            </div>
            <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>

              {/* You send */}
              <div className="swap-box">
                <div className="swap-box-label">You send</div>
                <div className="swap-amount-row">
                  <input type="number" className="swap-amount-input" placeholder="0"
                    value={fromAmount} onChange={(e) => handleFromChange(e.target.value)}
                    min="0" disabled={loading} />
                  <span className="token-badge">CC</span>
                </div>
                <div className="swap-balance">Canton Coin (Amulet)</div>
              </div>

              <div className="swap-direction">
                <div className="swap-direction-btn">⇅</div>
              </div>

              {/* You receive */}
              <div className="swap-box">
                <div className="swap-box-label">You receive (est.)</div>
                <div className="swap-amount-row">
                  <input type="number" className="swap-amount-input" placeholder="0"
                    value={toAmount} onChange={(e) => handleToChange(e.target.value)}
                    min="0" disabled={loading} />
                  <span className="token-badge">aUSD</span>
                </div>
              </div>

              {/* Wallet address */}
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Canton Party ID / Wallet address</label>
                <input type="text" className="form-input mono"
                  placeholder="party-xxx::1220..."
                  value={walletAddress}
                  onChange={(e) => setWalletAddress(e.target.value)}
                  disabled={loading} autoComplete="off" spellCheck={false} />
              </div>

              {/* Rate info */}
              <div className="swap-rate-rows">
                <div className="swap-rate-row">
                  <span className="swap-rate-key">Rate</span>
                  <span className="swap-rate-value">1 CC = {RATE} aUSD</span>
                </div>
                <div className="swap-rate-row">
                  <span className="swap-rate-key">Network fee</span>
                  <span className="swap-rate-value">~{NETWORK_FEE} CC</span>
                </div>
                {fromAmount && parseFloat(fromAmount) > 0 && (
                  <div className="swap-rate-row">
                    <span className="swap-rate-key">You pay total</span>
                    <span className="swap-rate-value">
                      {(parseFloat(fromAmount) + NETWORK_FEE).toFixed(4)} CC
                    </span>
                  </div>
                )}
              </div>

              <button className="btn btn-success btn-full" onClick={handleSwap}
                disabled={loading || !canSwap}>
                {loading ? <><span className="spinner" /> Processing…</> : 'Approve & Swap'}
              </button>

              {successTxId && (
                <div className="alert success">
                  <div className="alert-title">Payment request created</div>
                  <div style={{ fontSize: 11, marginTop: 4, fontFamily: 'var(--font-mono)', wordBreak: 'break-all' }}>
                    TX: {successTxId}
                  </div>
                  <div style={{ fontSize: 12, marginTop: 4 }}>
                    Approve in your Canton Wallet to complete the swap.
                  </div>
                </div>
              )}
              {errorMsg && (
                <div className="alert danger">{errorMsg}</div>
              )}
            </div>
          </div>

          {/* ── Info panel ────────────────────────────────────────────── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div className="card">
              <div className="card-header"><span className="card-title">About CC Swap</span></div>
              <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {[
                  ['Token', 'Canton Coin (CC / Amulet)'],
                  ['Target', 'aUSD (application USD)'],
                  ['Settlement', 'Canton Ledger (Daml DVP)'],
                  ['Mode', 'Transfer Offer → Approval'],
                ].map(([k, v]) => (
                  <div key={k} style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>{k}</span>
                    <span style={{ fontSize: 12, fontWeight: 500 }}>{v}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="alert info">
              <div className="alert-title">Mock Mode Active</div>
              <div style={{ fontSize: 12, marginTop: 4 }}>
                Swaps are simulated. Connect a Canton node to enable real on-ledger settlement.
              </div>
            </div>
          </div>
        </div>

        {/* ── Recent swaps ──────────────────────────────────────────────── */}
        <div>
          <div className="section-label">Recent Swaps</div>
          <div className="card">
            {histLoading ? (
              <div className="card-body" style={{ display: 'flex', gap: 8 }}>
                <span className="spinner" /> Loading…
              </div>
            ) : history.length === 0 ? (
              <div className="card-body" style={{ textAlign: 'center', color: 'var(--color-text-secondary)', padding: '2rem' }}>
                No swap history yet.
              </div>
            ) : (
              history.slice(0, 10).map((tx) => (
                <div key={tx.id} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '0.625rem 1rem', borderBottom: '0.5px solid var(--color-border-tertiary)',
                }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <span style={{ fontSize: 13, fontWeight: 500 }}>
                      {tx.fromAmount} {tx.fromToken} → {tx.toAmount.toFixed(4)} {tx.toToken}
                    </span>
                    <span style={{ fontSize: 11, color: 'var(--color-text-secondary)', fontFamily: 'var(--font-mono)' }}>
                      {tx.transactionId.slice(0, 20)}…
                    </span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
                    <span className={`status-pill ${statusPill(tx.status)}`}>
                      {statusLabel(tx.status)}
                    </span>
                    <span style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>
                      {new Date(tx.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default SwapPage;
