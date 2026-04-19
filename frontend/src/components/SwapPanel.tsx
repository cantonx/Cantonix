import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

// 1 CC = 0.10 aUSD (matches existing backend rate)
const RATE = 0.10;
const NETWORK_FEE = 0.75;

const SwapPanel: React.FC = () => {
  const { authFetch, user } = useAuth();
  const [fromAmount, setFromAmount] = useState('');
  const [toAmount, setToAmount] = useState('');
  const [walletAddress, setWalletAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleFromChange = (val: string) => {
    setFromAmount(val);
    const n = parseFloat(val);
    setToAmount(!isNaN(n) && n > 0 ? (n * RATE).toFixed(4) : '');
    setSuccessMsg('');
    setErrorMsg('');
  };

  const handleToChange = (val: string) => {
    setToAmount(val);
    const n = parseFloat(val);
    setFromAmount(!isNaN(n) && n > 0 ? (n / RATE).toFixed(4) : '');
    setSuccessMsg('');
    setErrorMsg('');
  };

  const handleSwap = async () => {
    if (!fromAmount || !walletAddress.trim()) return;

    setLoading(true);
    setSuccessMsg('');
    setErrorMsg('');

    try {
      const response = await authFetch('/api/swap/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromToken: 'CC',
          toToken: 'aUSD',
          fromAmount: parseFloat(fromAmount),
          toAmount: parseFloat(toAmount),
          walletAddress: walletAddress.trim(),
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccessMsg(data.transactionId || 'created');
        setFromAmount('');
        setToAmount('');
        setWalletAddress('');
      } else {
        setErrorMsg(data.error || 'Swap failed. Please try again.');
      }
    } catch {
      setErrorMsg('Network error — could not reach backend');
    }

    setLoading(false);
  };

  const canSwap = !!fromAmount && parseFloat(fromAmount) > 0 && !!walletAddress.trim();

  return (
    <div className="card">
      <div className="card-header">
        <span className="card-title">CC Swap</span>
      </div>
      <div className="card-body">
        {/* You send */}
        <div className="swap-box">
          <div className="swap-box-label">You send</div>
          <div className="swap-amount-row">
            <input
              type="number"
              className="swap-amount-input"
              placeholder="0"
              value={fromAmount}
              onChange={(e) => handleFromChange(e.target.value)}
              min="0"
              disabled={loading}
            />
            <span className="token-badge">CC</span>
          </div>
          <div className="swap-balance">Balance: — CC</div>
        </div>

        {/* Direction */}
        <div className="swap-direction">
          <div className="swap-direction-btn">⇅</div>
        </div>

        {/* You receive */}
        <div className="swap-box">
          <div className="swap-box-label">You receive (est.)</div>
          <div className="swap-amount-row">
            <input
              type="number"
              className="swap-amount-input"
              placeholder="0"
              value={toAmount}
              onChange={(e) => handleToChange(e.target.value)}
              min="0"
              disabled={loading}
            />
            <span className="token-badge">aUSD</span>
          </div>
        </div>

        {/* Wallet address */}
        <div className="form-group" style={{ marginTop: '0.875rem' }}>
          <label className="form-label" htmlFor="wallet-addr">
            Wallet address
          </label>
          <input
            id="wallet-addr"
            type="text"
            className="form-input mono"
            placeholder="Enter your Canton wallet address"
            value={walletAddress || user?.partyId || ''}
            onChange={(e) => setWalletAddress(e.target.value)}
            disabled={loading}
            autoComplete="off"
            spellCheck={false}
          />
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
        </div>

        <button
          className="btn btn-success btn-full"
          style={{ marginTop: '0.875rem' }}
          onClick={handleSwap}
          disabled={loading || !canSwap}
        >
          {loading ? (
            <>
              <span className="spinner" />
              Processing…
            </>
          ) : (
            'Approve & Swap'
          )}
        </button>

        {successMsg && (
          <div className="alert success" style={{ marginTop: '0.75rem' }}>
            <div className="alert-title">Payment request created</div>
            <div style={{ fontSize: 12, marginTop: 4 }}>
              Approve in your Canton Wallet.{' '}
              <a
                href="http://wallet.localhost:4000/"
                target="_blank"
                rel="noopener noreferrer"
              >
                Open Canton Wallet →
              </a>
            </div>
          </div>
        )}

        {errorMsg && (
          <div className="alert danger" style={{ marginTop: '0.75rem' }}>
            {errorMsg}
          </div>
        )}
      </div>
    </div>
  );
};

export default SwapPanel;
