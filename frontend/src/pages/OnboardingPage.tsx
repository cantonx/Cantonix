/**
 * OnboardingPage.tsx
 *
 * Canton-style operator-controlled onboarding UI.
 *
 * ADMIN/OPERATOR:
 *   - Create invitation codes
 *   - View & approve/reject pending requests
 *
 * USER:
 *   - View own onboarding status only
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';

interface OnboardingStatus {
  requestId: string | null;
  status: 'pending' | 'approved' | 'rejected';
  partyId: string | null;
  reviewNote: string | null;
  reviewedAt: string | null;
  createdAt: string | null;
}

interface PendingRequest {
  id: string;
  userId: string;
  status: string;
  partyIdHint: string | null;
  createdAt: string;
  user: { email: string; role: string };
}

interface InviteResult {
  id: string;
  code: string;
  maxUses: number;
  usedCount: number;
  status: string;
  expiresAt: string | null;
  createdAt: string;
}

const OnboardingPage: React.FC = () => {
  const { user, authFetch } = useAuth();

  const isOperator = user?.role === 'ADMIN' || user?.role === 'OPERATOR';

  const [myStatus, setMyStatus]           = useState<OnboardingStatus | null>(null);
  const [pending, setPending]             = useState<PendingRequest[]>([]);
  const [inviteResult, setInviteResult]   = useState<InviteResult | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [loadingPending, setLoadingPending] = useState(false);
  const [loadingInvite, setLoadingInvite] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError]                 = useState('');
  const [successMsg, setSuccessMsg]       = useState('');

  // ── Fetch own status ────────────────────────────────────────────────────
  const fetchMyStatus = useCallback(async () => {
    setLoadingStatus(true);
    try {
      const res = await authFetch('/api/onboarding/status');
      if (res.ok) setMyStatus(await res.json());
    } catch { /* ignore */ }
    setLoadingStatus(false);
  }, [authFetch]);

  // ── Fetch pending requests (ADMIN/OPERATOR only) ────────────────────────
  const fetchPending = useCallback(async () => {
    if (!isOperator) return;
    setLoadingPending(true);
    try {
      const res = await authFetch('/api/onboarding/pending');
      if (res.ok) setPending(await res.json());
    } catch { /* ignore */ }
    setLoadingPending(false);
  }, [authFetch, isOperator]);

  useEffect(() => {
    fetchMyStatus();
    fetchPending();
  }, [fetchMyStatus, fetchPending]);

  // ── Create invitation code ──────────────────────────────────────────────
  const handleCreateInvite = async () => {
    setLoadingInvite(true);
    setError('');
    setInviteResult(null);
    try {
      const res = await authFetch('/api/invitations/create', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ maxUses: 1, expiresInHours: 48 }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to create invitation');
      setInviteResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
    }
    setLoadingInvite(false);
  };

  // ── Approve ─────────────────────────────────────────────────────────────
  const handleApprove = async (requestId: string) => {
    setActionLoading(requestId);
    setError('');
    setSuccessMsg('');
    try {
      const res = await authFetch('/api/onboarding/approve', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ requestId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Approval failed');
      setSuccessMsg(`Approved! Canton Party: ${data.partyId}`);
      fetchPending();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
    }
    setActionLoading(null);
  };

  // ── Reject ──────────────────────────────────────────────────────────────
  const handleReject = async (requestId: string) => {
    setActionLoading(requestId + '-r');
    setError('');
    try {
      const res = await authFetch('/api/onboarding/reject', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ requestId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Rejection failed');
      setSuccessMsg('Request rejected.');
      fetchPending();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
    }
    setActionLoading(null);
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setSuccessMsg('Copied to clipboard!');
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const statusColor = (s: string) => {
    if (s === 'approved') return 'var(--color-success-text)';
    if (s === 'rejected') return 'var(--color-danger-text)';
    return 'var(--color-text-secondary)';
  };

  return (
    <>
      <div className="main-header">
        <div className="main-header-left">
          <span className="main-header-title">Onboarding</span>
          <span className="network-badge">Canton Party Management</span>
        </div>
        <div className="main-header-right">
          <span style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>
            Role: <strong>{user?.role}</strong>
          </span>
        </div>
      </div>

      <div className="main-body">

        {error && (
          <div className="alert danger"><div className="alert-title">{error}</div></div>
        )}
        {successMsg && (
          <div className="alert success"><div className="alert-title">{successMsg}</div></div>
        )}

        {/* ── My Canton Party Status ───────────────────────────────────── */}
        <div>
          <div className="section-label">My Canton Party</div>
          <div className="card">
            <div className="card-body">
              {loadingStatus ? (
                <div style={{ display: 'flex', gap: 8 }}><span className="spinner" /> Loading…</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>Status</span>
                    <span className={`status-pill ${user?.onboardingStatus}`}>
                      {user?.onboardingStatus}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>Role</span>
                    <span style={{ fontSize: 12, fontWeight: 500 }}>{user?.role}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>Party ID</span>
                    <span style={{
                      fontSize: 11, fontFamily: 'var(--font-mono)',
                      maxWidth: '60%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {user?.partyId ?? '— pending assignment —'}
                    </span>
                  </div>
                  {myStatus?.reviewNote && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>Note</span>
                      <span style={{ fontSize: 12 }}>{myStatus.reviewNote}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── USER: pending message ────────────────────────────────────── */}
        {!isOperator && user?.onboardingStatus === 'pending' && (
          <div className="alert info">
            <div className="alert-title">Awaiting Operator Approval</div>
            <div style={{ fontSize: 12, marginTop: 4 }}>
              An ADMIN or OPERATOR needs to approve your onboarding request before your Canton Party is created.
            </div>
          </div>
        )}

        {/* ── OPERATOR: Create Invitation Code ────────────────────────── */}
        {isOperator && (
          <div>
            <div className="section-label">Create Invitation Code</div>
            <div className="card">
              <div className="card-header">
                <span className="card-title">Issue onboarding authorization</span>
              </div>
              <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <p style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
                  Generate a one-time code. Share it with the person you want to onboard.
                  Expires in 48 hours.
                </p>

                {inviteResult ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <div style={{
                      background: 'var(--color-background-primary)',
                      border: '1px solid var(--color-border-primary)',
                      borderRadius: 'var(--border-radius-md)',
                      padding: '0.75rem 1rem',
                      fontFamily: 'var(--font-mono)',
                      fontSize: 16,
                      fontWeight: 600,
                      letterSpacing: '0.1em',
                      textAlign: 'center',
                      color: 'var(--color-brand)',
                    }}>
                      {inviteResult.code}
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button className="btn btn-primary btn-sm" style={{ flex: 1 }} onClick={() => copyCode(inviteResult.code)}>
                        Copy Code
                      </button>
                      <button className="btn btn-ghost btn-sm" onClick={() => setInviteResult(null)}>
                        New Code
                      </button>
                    </div>
                    {inviteResult.expiresAt && (
                      <p style={{ fontSize: 11, color: 'var(--color-text-secondary)', textAlign: 'center' }}>
                        Expires: {new Date(inviteResult.expiresAt).toLocaleString()}
                      </p>
                    )}
                  </div>
                ) : (
                  <button className="btn btn-primary" onClick={handleCreateInvite} disabled={loadingInvite}>
                    {loadingInvite ? <><span className="spinner" /> Generating…</> : 'Generate Invitation Code'}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── OPERATOR: Pending Requests ───────────────────────────────── */}
        {isOperator && (
          <div>
            <div className="section-label">
              Pending Onboarding Requests
              {pending.length > 0 && (
                <span style={{
                  marginLeft: 8, background: 'var(--color-brand)', color: 'white',
                  borderRadius: 999, padding: '1px 7px', fontSize: 10, fontWeight: 600,
                }}>
                  {pending.length}
                </span>
              )}
            </div>
            <div className="card">
              {loadingPending ? (
                <div className="card-body" style={{ display: 'flex', gap: 8 }}>
                  <span className="spinner" /> Loading…
                </div>
              ) : pending.length === 0 ? (
                <div className="card-body" style={{ textAlign: 'center', color: 'var(--color-text-secondary)', padding: '2rem' }}>
                  No pending requests.
                </div>
              ) : (
                pending.map((req) => (
                  <div key={req.id} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '0.75rem 1rem', borderBottom: '0.5px solid var(--color-border-tertiary)',
                  }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <span style={{ fontSize: 13, fontWeight: 500 }}>{req.user.email}</span>
                      <span style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>
                        {new Date(req.createdAt).toLocaleString()}
                        {req.partyIdHint && ` · hint: ${req.partyIdHint}`}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        className="btn btn-success btn-sm"
                        onClick={() => handleApprove(req.id)}
                        disabled={actionLoading === req.id}
                      >
                        {actionLoading === req.id ? <span className="spinner" /> : 'Approve'}
                      </button>
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => handleReject(req.id)}
                        disabled={actionLoading === req.id + '-r'}
                        style={{ color: 'var(--color-danger-text)' }}
                      >
                        {actionLoading === req.id + '-r' ? <span className="spinner" /> : 'Reject'}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

      </div>
    </>
  );
};

export default OnboardingPage;
