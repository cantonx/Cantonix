import React, { useState } from 'react';

interface SwapResult {
  transactionId?: string;
  status: 'success' | 'error';
  message: string;
}

const Swap: React.FC = () => {
  const [fromAmount, setFromAmount] = useState('');
  const [toAmount, setToAmount] = useState('');
  const [fromToken] = useState('CC');
  const [toToken] = useState('USD');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SwapResult | null>(null);
  const [walletAddress, setWalletAddress] = useState('');

  // Simple mock rate: 1 CC = 0.10 USD
  const RATE = 0.10;

  const handleFromAmountChange = (value: string) => {
    setFromAmount(value);
    const num = parseFloat(value);
    if (!isNaN(num) && num > 0) {
      setToAmount((num * RATE).toFixed(4));
    } else {
      setToAmount('');
    }
    setResult(null);
  };

  const handleToAmountChange = (value: string) => {
    setToAmount(value);
    const num = parseFloat(value);
    if (!isNaN(num) && num > 0) {
      setFromAmount((num / RATE).toFixed(4));
    } else {
      setFromAmount('');
    }
    setResult(null);
  };

  const handleSwap = async () => {
    if (!fromAmount || !walletAddress.trim()) return;

    setLoading(true);
    setResult(null);

    try {
      const response = await fetch('/api/swap/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromToken,
          toToken,
          fromAmount: parseFloat(fromAmount),
          toAmount: parseFloat(toAmount),
          walletAddress,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setResult({
          transactionId: data.transactionId,
          status: 'success',
          message: `Swap successful! ${fromAmount} ${fromToken} → ${toAmount} ${toToken}`,
        });
        setFromAmount('');
        setToAmount('');
      } else {
        setResult({
          status: 'error',
          message: data.error || 'Swap failed. Please try again.',
        });
      }
    } catch {
      setResult({
        status: 'error',
        message: 'Network error. Please check your connection.',
      });
    }

    setLoading(false);
  };

  const isValid =
    fromAmount !== '' &&
    parseFloat(fromAmount) > 0 &&
    walletAddress.trim() !== '';

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 py-6 sm:px-0">
        <h1 className="text-3xl font-bold text-gray-900">CC Swap Interface</h1>
        <p className="mt-2 text-gray-600">
          Swap Canton Coin (CC) via the Canton Wallet integration.
        </p>

        <div className="mt-8 max-w-md">
          <div className="bg-white shadow rounded-lg p-6 space-y-6">

            {/* Rate Info */}
            <div className="bg-indigo-50 rounded-md px-4 py-3 text-sm text-indigo-700">
              Current rate: <span className="font-semibold">1 CC = {RATE} USD</span>
            </div>

            {/* From */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                From
              </label>
              <div className="flex rounded-md shadow-sm">
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={fromAmount}
                  onChange={(e) => handleFromAmountChange(e.target.value)}
                  placeholder="0.00"
                  className="flex-1 block w-full rounded-l-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
                <span className="inline-flex items-center px-3 rounded-r-md border border-l-0 border-gray-300 bg-gray-50 text-gray-600 text-sm font-medium">
                  {fromToken}
                </span>
              </div>
            </div>

            {/* Swap Arrow */}
            <div className="flex justify-center">
              <div className="bg-gray-100 rounded-full p-2">
                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4M17 8v12m0 0l4-4m-4 4l-4-4" />
                </svg>
              </div>
            </div>

            {/* To */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                To
              </label>
              <div className="flex rounded-md shadow-sm">
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={toAmount}
                  onChange={(e) => handleToAmountChange(e.target.value)}
                  placeholder="0.00"
                  className="flex-1 block w-full rounded-l-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
                <span className="inline-flex items-center px-3 rounded-r-md border border-l-0 border-gray-300 bg-gray-50 text-gray-600 text-sm font-medium">
                  {toToken}
                </span>
              </div>
            </div>

            {/* Wallet Address */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Wallet Address
              </label>
              <input
                type="text"
                value={walletAddress}
                onChange={(e) => {
                  setWalletAddress(e.target.value);
                  setResult(null);
                }}
                placeholder="Enter your Canton wallet address"
                className="block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
            </div>

            {/* Submit */}
            <button
              onClick={handleSwap}
              disabled={!isValid || loading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded-md transition-colors"
            >
              {loading ? 'Processing...' : `Swap ${fromToken} → ${toToken}`}
            </button>

            {/* Result */}
            {result && (
              <div
                className={`rounded-md p-4 text-sm ${
                  result.status === 'success'
                    ? 'bg-green-50 text-green-800'
                    : 'bg-red-50 text-red-800'
                }`}
              >
                <p className="font-medium">{result.message}</p>
                {result.transactionId && (
                  <p className="mt-1 text-xs text-green-600">
                    Transaction ID: <code className="font-mono">{result.transactionId}</code>
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Info Card */}
          <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-yellow-800">
            <p className="font-medium">Note</p>
            <p className="mt-1">
              This interface connects to the Canton Wallet via the backend proxy.
              Ensure your validator is running and the wallet address is registered on the network.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Swap;
