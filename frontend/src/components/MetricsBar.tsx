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

interface MetricsBarProps {
  validators: ValidatorStatus[];
  loading: boolean;
}

const MetricsBar: React.FC<MetricsBarProps> = ({ validators, loading }) => {
  const healthyCount = validators.filter((v) => v.status === 'healthy').length;

  const totalRewards = validators.reduce((sum, v) => {
    return v.rewards != null ? sum + v.rewards : sum;
  }, 0);

  const metrics = [
    {
      label: 'CC Balance',
      value: loading ? '—' : '—',
      sub: 'From wallet',
    },
    {
      label: 'Validator Rewards',
      value: loading ? '—' : totalRewards > 0 ? `${totalRewards.toFixed(2)} CC` : '—',
      sub: 'This epoch',
    },
    {
      label: 'Active SVs',
      value: loading ? '—' : String(healthyCount),
      sub: `of ${validators.length} reachable`,
    },
  ];

  return (
    <div className="metrics-bar">
      {metrics.map((m) => (
        <div key={m.label} className="metric-card">
          <div className="metric-label">{m.label}</div>
          {loading ? (
            <div className="skeleton" style={{ height: 28, width: '60%', marginBottom: 4 }} />
          ) : (
            <div className="metric-value">{m.value}</div>
          )}
          <div className="metric-sub">{m.sub}</div>
        </div>
      ))}
    </div>
  );
};

export default MetricsBar;
