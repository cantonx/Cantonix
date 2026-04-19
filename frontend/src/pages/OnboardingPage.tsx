/**
 * OnboardingPage.tsx
 *
 * Canton-style sponsor-based party onboarding UI.
 *
 * Sections:
 *   1. My Status       — current user's onboarding status + partyId
 *   2. Invite          — issue invitation code (approved users only)
 *   3. Pending Requests — list + approve/reject (sponsor only)
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';

// ─── Types ────────────────────────────────────────────────────────────────

interface OnboardingStatus {
  requestId: string | null;
  status: 'pending' | 'approved' | 'rejected';
  partyId: string | null;
  sponsorId: string | null;
  createdAt: string | null;
  reviewedAt: string | null;
  reviewNote: string | null;
}

interface PendingRequest {
  id: string;
  userId: string;
  sponsorId: string;
  status: string;
  partyIdHint: string | null;
  createdAt: string;
  user: { email: string; createdAt: string };
}

interface InviteResult {
  code: string;
  expiresAt: string | null;
  issuedBy: string;
}

// ─── Component ────────────────────────────────────────────────────────────

const OnboardingPage: React.FC = () => {
  const { user, authFetch } = useAuth();

  const [myStatus, setMyStatus]         = useState<OnboardingStatus | null>(null);
  const [pending, setPending]           = useState<PendingRequest[]>([]);
  const [inviteResult, setInviteResult] = useState<InviteResult | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [loadingPending, setLoadingPending] = useState(false);
  const [loadingInvite, setLoadingInvite]   = useState(false);
  const [actionLoading, setActionLoading]   = useState<string | null>(null);
  const [error, setError]               = useState('');
  const [successMsg, setSuccessMsg]     = useState('');

  const isApproved = user?.onboardingStatus === 'approved';

  // ── Fetch my onboarding status ──────────────────────────────────────────
  const fetchMyStatus = useCallback(async () => {
    setLoadingStatus(true);
    try {
      const res = await authFetch('/api/onboarding/status');
      if (res.ok) setMyStatus(await res.json());
    } catch { /* ignore */ }
    setLoadingStatus(false);
  }, [authFetch]);

  // ── Fetch pending requests (sponsor) ───────────────────────────────────
  const fetchPending = useCallback(async () => {
    if (!isApproved) return;
    setLoadingPending(true);
    try {
      const res = await authFetch('/api/onboarding/pending');
      if (res.ok) setPending(await res.json());
    } catch { /* ignore */ }
    setLoadingPending(false);
  }, [authFetch, isApproved]);

  useEffect(() => {
    fetchMyStatus();
    fetchPending();
  }, [fetchMyStatus, fetchPending]);

  // ── Issue invitation ────────────────────────────────────────────────────
  const handleInvite = async () => {
    setLoadingInvite(true);
    setError('');
    setInviteResult(null);
    try {
      const res = await authFetch('/api/onboarding/invite', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ expiresInHours: 48 }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to generate invitation');
      setInviteResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
    }
    setLoadingInvite(false);
  };

  // ── Approve / Reject ────────────────────────────────────────────────────
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
      setSuccessMsg(`Approved! Canton Party assigned: ${data.partyId}`);
      fetchPending();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
    }
    setActionLoading(null);
  };

  const handleReject = async (requestId: string) => {
    setActionLoading(requestId + '-reject');
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

  // ── Copy to clipboard ───────────────────────────────────────────────────
  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setSuccessMsg('Invitation code copied to clipboard!');
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <>
      <div className="main-header">
        <div className="main-header-left">
          <span className="main-header-title">Onboarding</span>
          <span className="network-badge">Canton Party Management</span>
        </div>
      </div>

      <div className="main-body">

        {error && (
          <div className="alert danger"><div className="alert-title">{error}</div></div>
        )}
        {successMsg && (
          <div className="alert success"><div className="alert-title">{successMsg}</div></div>
        )}

        {/* ── Section 1: My Status ─────────────────────────────────────── */}
        <div>
          <div className="section-label">My Canton Party Status</div>
          <div className="card">
            <div className="card-body">
              {loadingStatus ? (
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span className="spinner" /> Loading…
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>Status</span>
                    <span className={`status-pill ${user?.onboardingStatus ?? 'unknown'}`}>
                      {user?.onboardingStatus ?? 'unknown'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>Canton Party ID</span>
                    <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--color-text-primary)', maxWidth: '60%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {user?.partyId ?? '— pending assignment —'}
                    </span>
                  </div>
                  {myStatus?.reviewNote && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>Note</span>
                      <span style={{ fontSize: 12 }}>{myStatus.reviewNote}</span>
                    </div>
                  )}
                  {myStatus?.reviewedAt && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>Reviewed</span>
                      <span style={{ fontSize: 12 }}>{new Date(myStatus.reviewedAt).toLocaleString()}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Section 2: Issue Invitation (approved users only) ─────────── */}
        {isApproved && (
          <div>
            <div className="section-label">Issue Invitation Code</div>
            <div className="card">
              <div className="card-header">
                <span className="card-title">Invite a new participant</span>
              </div>
              <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <p style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
                  Generate a one-time invitation code. Share it with the person you want to onboard.
                  The code expires in 48 hours.
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
                      <button
                        className="btn btn-primary btn-sm"
                        style={{ flex: 1 }}
                        onClick={() => copyCode(inviteResult.code)}
                      >
                        Copy Code
                      </button>
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => setInviteResult(null)}
                      >
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
                  <button
                    className="btn btn-primary"
                    onClick={handleInvite}
                    disabled={loadingInvite}
                  >
                    {loadingInvite ? <><span className="spinner" /> Generating…</> : 'Generate Invitation Code'}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── Section 3: Pending Requests (sponsor) ────────────────────── */}
        {isApproved && (
          <div>
            <div className="section-label">
              Pending Onboarding Requests
              {pending.length > 0 && (
                <span style={{
                  marginLeft: 8,
                  background: 'var(--color-brand)',
                  color: 'white',
                  borderRadius: 999,
                  padding: '1px 7px',
                  fontSize: 10,
                  fontWeight: 600,
                }}>
                  {pending.length}
                </span>
              )}
            </div>
            <div className="card">
              {loadingPending ? (
                <div className="card-body" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span className="spinner" /> Loading…
                </div>
              ) : pending.length === 0 ? (
                <div className="card-body" style={{ textAlign: 'center', color: 'var(--color-text-secondary)', padding: '2rem' }}>
                  No pending requests.
                </div>
              ) : (
                pending.map((req) => (
                  <div key={req.id} style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.75rem 1rem',
                    borderBottom: '0.5px solid var(--color-border-tertiary)',
                  }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <span style={{ fontSize: 13, fontWeight: 500 }}>{req.user.email}</span>
                      <span style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>
                        Requested: {new Date(req.createdAt).toLocaleString()}
                        {req.partyIdHint && ` · Hint: ${req.partyIdHint}`}
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
                        disabled={actionLoading === req.id + '-reject'}
                        style={{ color: 'var(--color-danger-text)' }}
                      >
                        {actionLoading === req.id + '-reject' ? <span className="spinner" /> : 'Reject'}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ── Not approved yet ─────────────────────────────────────────── */}
        {!isApproved && !loadingStatus && (
          <div className="card">
            <div className="card-body" style={{ textAlign: 'center', color: 'var(--color-text-secondary)', padding: '2rem' }}>
              <div style={{ fontSize: 24, marginBottom: '0.5rem' }}>⏳</div>
              <div style={{ fontWeight: 500, marginBottom: '0.25rem' }}>Waiting for sponsor approval</div>
              <div style={{ fontSize: 12 }}>
                Your sponsor needs to approve your onboarding request before you can invite others.
              </div>
            </div>
          </div>
        )}

      </div>
    </>
  );
};

export default OnboardingPage;
