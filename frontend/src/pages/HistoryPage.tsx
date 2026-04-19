/**
 * HistoryPage.tsx — Swap transaction history
 */
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';

interface SwapTx {
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

const HistoryPage: React.FC = () => {
  const { authFetch } = useAuth();
  const [txs, setTxs]         = useState<SwapTx[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter]   = useState<'all' | 'pending_approval' | 'completed' | 'failed'>('all');

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authFetch('/api/swap/history');
      if (res.ok) setTxs(await res.json());
    } catch { /* ignore */ }
    setLoading(false);
  }, [authFetch]);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  const filtered = filter === 'all' ? txs : txs.filter((t) => t.status === filter);

  const stats = {
    total:    txs.length,
    completed: txs.filter((t) => t.status === 'completed').length,
    pending:   txs.filter((t) => t.status === 'pending_approval').length,
    failed:    txs.filter((t) => t.status === 'failed').length,
    totalCC:   txs.reduce((s, t) => s + t.fromAmount, 0),
  };

  return (
    <>
      <div className="main-header">
        <div className="main-header-left">
          <span className="main-header-title">History</span>
          <span className="network-badge">Swap Transactions</span>
        </div>
        <div className="main-header-right">
          <button className="btn btn-ghost btn-sm" onClick={fetchHistory} disabled={loading}>
            {loading ? <><span className="spinner" /> Loading…</> : (
              <><svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M13.5 2.5A7 7 0 1 0 14.5 9" /><polyline points="14 2 14 6 10 6" />
              </svg> Refresh</>
            )}
          </button>
        </div>
      </div>

      <div className="main-body">

        {/* ── Stats ─────────────────────────────────────────────────────── */}
        <div className="metrics-bar">
          {[
            { label: 'Total Swaps',   value: stats.total,                    sub: 'All time' },
            { label: 'Completed',     value: stats.completed,                sub: 'Settled on ledger' },
            { label: 'Total CC Sent', value: `${stats.totalCC.toFixed(2)} CC`, sub: 'Across all swaps' },
          ].map((m) => (
            <div key={m.label} className="metric-card">
              <div className="metric-label">{m.label}</div>
              {loading
                ? <div className="skeleton" style={{ height: 28, width: '60%', marginBottom: 4 }} />
                : <div className="metric-value">{m.value}</div>
              }
              <div className="metric-sub">{m.sub}</div>
            </div>
          ))}
        </div>

        {/* ── Filter tabs ───────────────────────────────────────────────── */}
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {(['all', 'pending_approval', 'completed', 'failed'] as const).map((f) => (
            <button
              key={f}
              className={`btn btn-sm ${filter === f ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setFilter(f)}
            >
              {f === 'all' ? `All (${stats.total})`
                : f === 'pending_approval' ? `Pending (${stats.pending})`
                : f === 'completed' ? `Completed (${stats.completed})`
                : `Failed (${stats.failed})`}
            </button>
          ))}
        </div>

        {/* ── Transaction list ──────────────────────────────────────────── */}
        <div className="card">
          {loading ? (
            <div className="card-body" style={{ display: 'flex', gap: 8 }}>
              <span className="spinner" /> Loading transactions…
            </div>
          ) : filtered.length === 0 ? (
            <div className="card-body" style={{ textAlign: 'center', color: 'var(--color-text-secondary)', padding: '3rem 2rem' }}>
              <div style={{ fontSize: 28, marginBottom: '0.5rem' }}>📋</div>
              <div style={{ fontWeight: 500 }}>No transactions found</div>
              <div style={{ fontSize: 12, marginTop: 4 }}>
                {filter === 'all' ? 'Execute a swap to see history here.' : `No ${filter.replace('_', ' ')} transactions.`}
              </div>
            </div>
          ) : (
            filtered.map((tx, i) => (
              <div key={tx.id} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '0.75rem 1rem',
                borderBottom: i < filtered.length - 1 ? '0.5px solid var(--color-border-tertiary)' : 'none',
              }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: 13, fontWeight: 500 }}>
                      {tx.fromAmount} {tx.fromToken}
                    </span>
                    <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>→</span>
                    <span style={{ fontSize: 13, fontWeight: 500 }}>
                      {tx.toAmount.toFixed(4)} {tx.toToken}
                    </span>
                  </div>
                  <span style={{ fontSize: 11, color: 'var(--color-text-secondary)', fontFamily: 'var(--font-mono)' }}>
                    {tx.transactionId.slice(0, 28)}…
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>
                    {new Date(tx.createdAt).toLocaleString()}
                  </span>
                </div>
                <span className={`status-pill ${statusPill(tx.status)}`}>
                  {statusLabel(tx.status)}
                </span>
              </div>
            ))
          )}
        </div>

      </div>
    </>
  );
};

export default HistoryPage;
