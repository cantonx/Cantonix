import React, { useState, useEffect, useCallback } from 'react';
import MetricsBar from '../components/MetricsBar';
import ValidatorCard from '../components/ValidatorCard';
import OnboardingForm from '../components/OnboardingForm';
import SwapPanel from '../components/SwapPanel';
import { useAuth } from '../context/AuthContext';

export interface ValidatorStatus {
  name: string;
  status: 'healthy' | 'degraded' | 'offline';
  version: string;
  uptime: string;
  latency: string | null;
  lastChecked: string;
  rewards?: number | null;
}

const Dashboard: React.FC = () => {
  const { authFetch, user } = useAuth();
  const [validators, setValidators] = useState<ValidatorStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [secondsAgo, setSecondsAgo] = useState<number | null>(null);

  const fetchValidatorStatus = useCallback(async (isManual = false) => {
    if (isManual) setChecking(true);
    else setLoading(true);

    try {
      const response = await authFetch('/api/validators/status');
      if (response.ok) {
        const data = await response.json();
        setValidators(data);
        setLastChecked(new Date());
      }
    } catch (error) {
      console.error('Failed to fetch validator status', error);
    }

    if (isManual) setChecking(false);
    else setLoading(false);
  }, []);

  useEffect(() => {
    fetchValidatorStatus();
  }, [fetchValidatorStatus]);

  // "X seconds ago" ticker
  useEffect(() => {
    if (!lastChecked) return;
    const interval = setInterval(() => {
      setSecondsAgo(Math.floor((Date.now() - lastChecked.getTime()) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [lastChecked]);

  const network = (import.meta.env.VITE_NETWORK || 'DevNet').toUpperCase();

  return (
    <>
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="main-header">
        <div className="main-header-left">
          <span className="main-header-title">Dashboard</span>
          <span className="network-badge">{network}</span>
          {user && (
            <span style={{ fontSize: 11, color: 'var(--color-text-secondary)', fontFamily: 'var(--font-mono)' }}>
              {user.partyId.slice(0, 18)}…
            </span>
          )}
        </div>
        <div className="main-header-right">
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => fetchValidatorStatus(true)}
            disabled={checking || loading}
          >
            {checking ? (
              <>
                <span className="spinner" />
                Checking…
              </>
            ) : (
              <>
                <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M13.5 2.5A7 7 0 1 0 14.5 9" />
                  <polyline points="14 2 14 6 10 6" />
                </svg>
                Health Check
              </>
            )}
          </button>
          {secondsAgo !== null && (
            <span className="last-checked">
              Last checked: {secondsAgo}s ago
            </span>
          )}
        </div>
      </div>

      {/* ── Body ───────────────────────────────────────────────────────── */}
      <div className="main-body">
        {/* Metrics */}
        <MetricsBar validators={validators} loading={loading} />

        {/* Validator cards */}
        <div>
          <div className="section-label">Validator Nodes</div>
          {loading ? (
            <div className="validator-grid">
              {[1, 2, 3].map((i) => (
                <div key={i} className="validator-card unknown">
                  <div className="validator-card-header">
                    <div className="skeleton" style={{ height: 14, width: '55%' }} />
                    <div className="skeleton" style={{ height: 20, width: 60, borderRadius: 999 }} />
                  </div>
                  <div className="validator-card-rows">
                    {[1, 2].map((j) => (
                      <div key={j} className="validator-row">
                        <div className="skeleton" style={{ height: 12, width: '30%' }} />
                        <div className="skeleton" style={{ height: 12, width: '40%' }} />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : validators.length === 0 ? (
            <div className="card">
              <div className="card-body" style={{ textAlign: 'center', color: 'var(--color-text-secondary)', padding: '2rem' }}>
                No validators found. Check your backend configuration.
              </div>
            </div>
          ) : (
            <div className="validator-grid">
              {validators.map((v) => (
                <ValidatorCard key={v.name} validator={v} loading={checking} />
              ))}
            </div>
          )}
        </div>

        {/* Onboarding + Swap */}
        <div>
          <div className="section-label">Actions</div>
          <div className="panels-grid">
            <OnboardingForm />
            <SwapPanel />
          </div>
        </div>
      </div>
    </>
  );
};

export default Dashboard;
