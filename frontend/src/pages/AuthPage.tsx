import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import logo from '../assets/logo.png';

type Mode = 'login' | 'signup';

const AuthPage: React.FC = () => {
  const { login, signup } = useAuth();

  const [mode, setMode]               = useState<Mode>('login');
  const [email, setEmail]             = useState('');
  const [password, setPassword]       = useState('');
  const [invitationCode, setInvitationCode] = useState('');
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState('');
  const [successMsg, setSuccessMsg]   = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setLoading(true);

    try {
      if (mode === 'login') {
        await login(email, password);
      } else {
        const result = await signup(email, password, invitationCode || undefined);
        if (result?.message) setSuccessMsg(result.message);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (m: Mode) => {
    setMode(m);
    setError('');
    setSuccessMsg('');
    setInvitationCode('');
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        {/* Logo */}
        <div className="auth-logo">
          <img src={logo} alt="Cantonix" className="auth-logo-img" />
          <div className="auth-logo-sub">Validator Hub</div>
        </div>

        {/* Tab switcher */}
        <div className="auth-tabs">
          <button
            className={`auth-tab ${mode === 'login' ? 'active' : ''}`}
            onClick={() => switchMode('login')}
            type="button"
          >
            Sign in
          </button>
          <button
            className={`auth-tab ${mode === 'signup' ? 'active' : ''}`}
            onClick={() => switchMode('signup')}
            type="button"
          >
            Create account
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label className="form-label" htmlFor="auth-email">Email</label>
            <input
              id="auth-email"
              type="email"
              className="form-input"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="auth-password">Password</label>
            <input
              id="auth-password"
              type="password"
              className="form-input"
              placeholder={mode === 'signup' ? 'Min. 8 characters' : '••••••••'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              disabled={loading}
              minLength={mode === 'signup' ? 8 : undefined}
            />
          </div>

          {/* Invitation code — only shown on signup */}
          {mode === 'signup' && (
            <div className="form-group">
              <label className="form-label" htmlFor="auth-invite">
                Invitation Code
                <span style={{ color: 'var(--color-text-secondary)', fontWeight: 400, marginLeft: 4 }}>
                  (required)
                </span>
              </label>
              <input
                id="auth-invite"
                type="text"
                className="form-input"
                placeholder="CANTON-XXXX-XXXX"
                value={invitationCode}
                onChange={(e) => setInvitationCode(e.target.value.toUpperCase())}
                autoComplete="off"
                disabled={loading}
                style={{ fontFamily: 'var(--font-mono)', letterSpacing: '0.05em' }}
              />
              <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginTop: 4 }}>
                Ask an existing participant for an invitation code.
              </div>
            </div>
          )}

          {error && (
            <div className="alert danger" style={{ marginTop: 0, marginBottom: '0.75rem' }}>
              {error}
            </div>
          )}

          {successMsg && (
            <div className="alert info" style={{ marginTop: 0, marginBottom: '0.75rem' }}>
              {successMsg}
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary btn-full"
            disabled={loading || !email || !password}
          >
            {loading ? (
              <><span className="spinner" />{mode === 'login' ? 'Signing in…' : 'Creating account…'}</>
            ) : (
              mode === 'login' ? 'Sign in' : 'Create account'
            )}
          </button>
        </form>

        {/* Footer hint */}
        <p className="auth-footer-hint">
          {mode === 'login' ? (
            <>No account? <button className="auth-link" onClick={() => switchMode('signup')}>Create one</button></>
          ) : (
            <>Already have an account? <button className="auth-link" onClick={() => switchMode('login')}>Sign in</button></>
          )}
        </p>
      </div>
    </div>
  );
};

export default AuthPage;
