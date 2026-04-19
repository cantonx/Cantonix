import React from 'react';

interface ValidatorStatus {
  name: string;
  status: 'healthy' | 'degraded' | 'offline';
  version: string;
  uptime: string;
  latency: string | null;
  lastChecked: string;
  rewards?: number | null;
}

interface ValidatorCardProps {
  validator: ValidatorStatus;
  loading?: boolean;
}

const statusLabel: Record<string, string> = {
  healthy: 'Online',
  degraded: 'Degraded',
  offline: 'Offline',
};

const ValidatorCard: React.FC<ValidatorCardProps> = ({ validator, loading }) => {
  const { name, status, version, uptime, latency, lastChecked, rewards } = validator;

  const rows = [
    { key: 'Version', value: version || '—' },
    { key: 'Uptime', value: uptime || '—' },
    { key: 'Latency', value: latency ?? '—' },
    { key: 'Last checked', value: lastChecked || '—' },
    ...(rewards != null ? [{ key: 'Rewards', value: `${rewards.toFixed(4)} CC` }] : []),
  ];

  return (
    <div className={`validator-card ${status}`}>
      <div className="validator-card-header">
        <span className="validator-card-name">{name}</span>
        <span className={`status-pill ${status}`}>
          {loading ? 'Checking…' : statusLabel[status] ?? 'Unknown'}
        </span>
      </div>
      <div className="validator-card-rows">
        {rows.map((row) => (
          <div key={row.key} className="validator-row">
            <span className="validator-row-key">{row.key}</span>
            <span className="validator-row-value">{row.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ValidatorCard;
