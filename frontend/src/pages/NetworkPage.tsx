/**
 * NetworkPage.tsx — Canton Network / Global Synchronizer status
 */
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';

interface NetworkStatus {
  network: string;
  status: 'healthy' | 'degraded' | 'offline';
  latency: string;
  lastChecked: string;
  participants: { total: number; healthy: number; degraded: number; offline: number };
}

interface ParticipantStatus {
  participantId: string;
  synchronizerConnected: boolean;
  domainId: string | null;
  version: string;
  status: 'healthy' | 'degraded' | 'offline';
  latencyMs: number | null;
  error: string | null;
  lastChecked: string;
}

interface LedgerHealth {
  available: boolean;
  latencyMs: number | null;
  version: string | null;
  error: string | null;
  lastChecked: string;
}

const NetworkPage: React.FC = () => {
  const { authFetch } = useAuth();

  const [network, setNetwork]       = useState<NetworkStatus | null>(null);
  const [participant, setParticipant] = useState<ParticipantStatus | null>(null);
  const [ledger, setLedger]         = useState<LedgerHealth | null>(null);
  const [provider, setProvider]     = useState<string>('mock');
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAll = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const [netRes, partRes] = await Promise.all([
        authFetch('/api/network/status'),
        authFetch('/api/participant/status'),
      ]);

      if (netRes.ok)  setNetwork(await netRes.json());
      if (partRes.ok) {
        const d = await partRes.json();
        setParticipant(d.participant);
        setLedger(d.ledger);
        setProvider(d.provider ?? 'mock');
      }
    } catch { /* ignore */ }

    if (isRefresh) setRefreshing(false);
    else setLoading(false);
  }, [authFetch]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const statusDot = (s: string) => {
    if (s === 'healthy')  return '🟢';
    if (s === 'degraded') return '🟡';
    return '🔴';
  };

  const Row = ({ label, value }: { label: string; value: React.ReactNode }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0', borderBottom: '0.5px solid var(--color-border-tertiary)' }}>
      <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>{label}</span>
      <span style={{ fontSize: 12, fontWeight: 500, textAlign: 'right', maxWidth: '60%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value}</span>
    </div>
  );

  return (
    <>
      <div className="main-header">
        <div className="main-header-left">
          <span className="main-header-title">Network Info</span>
          <span className="network-badge">Global Synchronizer</span>
        </div>
        <div className="main-header-right">
          <button className="btn btn-ghost btn-sm" onClick={() => fetchAll(true)} disabled={refreshing || loading}>
            {refreshing ? <><span className="spinner" /> Refreshing…</> : (
              <><svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M13.5 2.5A7 7 0 1 0 14.5 9" /><polyline points="14 2 14 6 10 6" />
              </svg> Refresh</>
            )}
          </button>
        </div>
      </div>

      <div className="main-body">
        {loading ? (
          <div className="metrics-bar">
            {[1,2,3].map(i => <div key={i} className="metric-card"><div className="skeleton" style={{ height: 60 }} /></div>)}
          </div>
        ) : (
          <>
            {/* ── Metrics ─────────────────────────────────────────────── */}
            <div className="metrics-bar">
              <div className="metric-card">
                <div className="metric-label">Network Status</div>
                <div className="metric-value" style={{ fontSize: 18 }}>
                  {statusDot(network?.status ?? 'offline')} {network?.status ?? '—'}
                </div>
                <div className="metric-sub">{network?.network ?? '—'}</div>
              </div>
              <div className="metric-card">
                <div className="metric-label">Avg Latency</div>
                <div className="metric-value">{network?.latency ?? '—'}</div>
                <div className="metric-sub">Round-trip to nodes</div>
              </div>
              <div className="metric-card">
                <div className="metric-label">Participants</div>
                <div className="metric-value">{network?.participants.healthy ?? 0}/{network?.participants.total ?? 0}</div>
                <div className="metric-sub">Healthy / Total</div>
              </div>
            </div>

            <div className="panels-grid">
              {/* ── Participant Node ───────────────────────────────────── */}
              <div className="card">
                <div className="card-header">
                  <span className="card-title">Participant Node</span>
                  {participant && (
                    <span className={`status-pill ${participant.status}`}>
                      {participant.status}
                    </span>
                  )}
                </div>
                <div className="card-body">
                  {participant ? (
                    <>
                      <Row label="Participant ID" value={participant.participantId} />
                      <Row label="Version" value={participant.version} />
                      <Row label="Latency" value={participant.latencyMs != null ? `${participant.latencyMs}ms` : '—'} />
                      <Row label="Synchronizer" value={participant.synchronizerConnected ? '✓ Connected' : '✗ Disconnected'} />
                      <Row label="Domain ID" value={participant.domainId ?? '—'} />
                      <Row label="Last checked" value={participant.lastChecked} />
                      {participant.error && (
                        <div className="alert danger" style={{ marginTop: '0.75rem' }}>
                          <div className="alert-title">Error</div>
                          <div style={{ fontSize: 12 }}>{participant.error}</div>
                        </div>
                      )}
                    </>
                  ) : (
                    <div style={{ color: 'var(--color-text-secondary)', fontSize: 12 }}>No data</div>
                  )}
                </div>
              </div>

              {/* ── Ledger API ─────────────────────────────────────────── */}
              <div className="card">
                <div className="card-header">
                  <span className="card-title">JSON Ledger API</span>
                  {ledger && (
                    <span className={`status-pill ${ledger.available ? 'healthy' : 'offline'}`}>
                      {ledger.available ? 'Available' : 'Unavailable'}
                    </span>
                  )}
                </div>
                <div className="card-body">
                  {ledger ? (
                    <>
                      <Row label="Available" value={ledger.available ? '✓ Yes' : '✗ No'} />
                      <Row label="Version" value={ledger.version ?? '—'} />
                      <Row label="Latency" value={ledger.latencyMs != null ? `${ledger.latencyMs}ms` : '—'} />
                      <Row label="Last checked" value={ledger.lastChecked} />
                      {ledger.error && (
                        <div className="alert danger" style={{ marginTop: '0.75rem' }}>
                          <div className="alert-title">Error</div>
                          <div style={{ fontSize: 12 }}>{ledger.error}</div>
                        </div>
                      )}
                    </>
                  ) : (
                    <div style={{ color: 'var(--color-text-secondary)', fontSize: 12 }}>No data</div>
                  )}
                </div>
              </div>
            </div>

            {/* ── Participant breakdown ──────────────────────────────────── */}
            {network && (
              <div>
                <div className="section-label">Participant Breakdown</div>
                <div className="card">
                  <div className="card-body">
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', textAlign: 'center' }}>
                      {[
                        { label: 'Total', value: network.participants.total, color: 'var(--color-text-primary)' },
                        { label: 'Healthy', value: network.participants.healthy, color: 'var(--color-success-text)' },
                        { label: 'Degraded', value: network.participants.degraded, color: '#b45309' },
                        { label: 'Offline', value: network.participants.offline, color: 'var(--color-danger-text)' },
                      ].map(({ label, value, color }) => (
                        <div key={label}>
                          <div style={{ fontSize: 24, fontWeight: 500, color }}>{value}</div>
                          <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginTop: 2 }}>{label}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── Provider info ──────────────────────────────────────────── */}
            <div className={`alert ${provider === 'canton' ? 'success' : 'info'}`}>
              <div className="alert-title">
                Provider: <strong>{provider === 'canton' ? 'Canton Node (Real)' : 'Mock (Simulated)'}</strong>
              </div>
              <div style={{ fontSize: 12, marginTop: 4 }}>
                {provider === 'canton'
                  ? 'Connected to a real Canton Participant Node. Data is live.'
                  : 'Running in mock mode. Set PROVIDER=canton in Railway to connect a real node.'}
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
};

export default NetworkPage;
