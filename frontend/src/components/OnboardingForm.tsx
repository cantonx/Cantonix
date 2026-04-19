import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

type Step = 1 | 2 | 3;

const OnboardingForm: React.FC = () => {
  const { authFetch } = useAuth();
  const [step, setStep] = useState<Step>(1);
  const [secret, setSecret] = useState('');
  const [partyHint, setPartyHint] = useState('');
  const [loading, setLoading] = useState(false);
  const [successPartyId, setSuccessPartyId] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async () => {
    if (!secret.trim()) return;

    setLoading(true);
    setErrorMsg('');
    setStep(2);

    try {
      const response = await authFetch('/api/validators/onboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secret: secret.trim(), partyHint: partyHint.trim() || undefined }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccessPartyId(data.partyId || data.party_id || 'Registered');
        setStep(3);
        setSecret('');
        setPartyHint('');
      } else {
        setErrorMsg(data.error || 'Failed to onboard validator');
        setStep(1);
      }
    } catch {
      setErrorMsg('Network error — could not reach backend');
      setStep(1);
    }

    setLoading(false);
  };

  const handleReset = () => {
    setStep(1);
    setSuccessPartyId('');
    setErrorMsg('');
  };

  const steps: { label: string; num: Step }[] = [
    { label: 'Enter secret', num: 1 },
    { label: 'Approve', num: 2 },
    { label: 'Confirmed', num: 3 },
  ];

  return (
    <div className="card">
      <div className="card-header">
        <span className="card-title">Validator Onboarding</span>
      </div>
      <div className="card-body">
        {/* Step indicator */}
        <div className="step-indicator">
          {steps.map((s, i) => {
            const isActive = step === s.num;
            const isCompleted = step > s.num;
            const isLast = i === steps.length - 1;

            return (
              <React.Fragment key={s.num}>
                <div className="step-item">
                  <div
                    className={`step-circle ${isCompleted ? 'completed' : isActive ? 'active' : ''}`}
                  >
                    {isCompleted ? '✓' : s.num}
                  </div>
                  <span
                    className={`step-label ${isCompleted ? 'completed' : isActive ? 'active' : ''}`}
                  >
                    {s.label}
                  </span>
                </div>
                {!isLast && (
                  <div className={`step-line ${isCompleted ? 'completed' : ''}`} />
                )}
              </React.Fragment>
            );
          })}
        </div>

        {step === 3 ? (
          <>
            <div className="alert success">
              <div className="alert-title">Validator registered successfully</div>
              <div style={{ fontSize: 12, marginTop: 4, wordBreak: 'break-all' }}>
                Party ID: <strong>{successPartyId}</strong>
              </div>
            </div>
            <button
              className="btn btn-ghost btn-sm"
              style={{ marginTop: '0.75rem' }}
              onClick={handleReset}
            >
              Register another
            </button>
          </>
        ) : (
          <>
            <div className="form-group">
              <label className="form-label" htmlFor="onboard-secret">
                Onboarding secret from SV Web UI
              </label>
              <input
                id="onboard-secret"
                type="text"
                className="form-input mono"
                placeholder="Enter secret…"
                value={secret}
                onChange={(e) => setSecret(e.target.value)}
                disabled={loading}
                autoComplete="off"
                spellCheck={false}
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="party-hint">
                Party hint{' '}
                <span style={{ fontWeight: 400, opacity: 0.7 }}>(optional)</span>
              </label>
              <input
                id="party-hint"
                type="text"
                className="form-input"
                placeholder="e.g. my-validator-node"
                value={partyHint}
                onChange={(e) => setPartyHint(e.target.value)}
                disabled={loading}
              />
            </div>

            <button
              className="btn btn-primary btn-full"
              onClick={handleSubmit}
              disabled={loading || !secret.trim()}
            >
              {loading ? (
                <>
                  <span className="spinner" />
                  Registering…
                </>
              ) : (
                'Approve & Register'
              )}
            </button>

            {errorMsg && (
              <div className="alert danger" style={{ marginTop: '0.75rem' }}>
                {errorMsg}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default OnboardingForm;
