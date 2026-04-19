/**
 * MockValidatorProvider.ts
 *
 * Simulates the three Participant Nodes in a Canton LocalNet topology.
 * Used when PROVIDER=mock (default in development).
 *
 * Topology mirrored:
 *   App User Participant    — role: validator
 *   App Provider Participant — role: validator
 *   Super Validator (SV)    — role: super-validator
 */

import type { IValidatorProvider } from '../../interfaces/IValidatorProvider';
import type { Validator } from '../../models/validator.model';
import type { NetworkStatusResult } from '../../models/network.model';
import { config } from '../../config/app.config';
import {
  simulateStatus,
  simulateVersion,
  simulateUptime,
  simulateLatency,
  simulateRewards,
  networkDelay,
  formatLastChecked,
} from '../../utils/simulation';

const PARTICIPANT_NODES: Array<{ name: string; role: Validator['role'] }> = [
  { name: 'App User Participant',     role: 'validator' },
  { name: 'App Provider Participant', role: 'validator' },
  { name: 'Super Validator (SV)',     role: 'super-validator' },
];

export class MockValidatorProvider implements IValidatorProvider {
  async getValidatorsStatus(): Promise<Validator[]> {
    await networkDelay();

    return PARTICIPANT_NODES.map(({ name, role }) => {
      const status = simulateStatus();
      const checkedAt = new Date();

      return {
        name,
        role,
        status,
        version:              simulateVersion(status),
        uptime:               simulateUptime(status),
        latency:              simulateLatency(status),
        lastChecked:          formatLastChecked(checkedAt),
        amuletRewards:        simulateRewards(status),
        synchronizerConnected: status !== 'offline',
      };
    });
  }

  async getNetworkStatus(): Promise<NetworkStatusResult> {
    const participants = await this.getValidatorsStatus();
    return aggregateNetworkStatus(participants, config.networkName);
  }
}

// ─── Shared aggregation — used by CantonValidatorProvider too ─────────────

export function aggregateNetworkStatus(
  participants: Validator[],
  networkName: string
): NetworkStatusResult {
  const total    = participants.length;
  const healthy  = participants.filter((v) => v.status === 'healthy').length;
  const degraded = participants.filter((v) => v.status === 'degraded').length;
  const offline  = participants.filter((v) => v.status === 'offline').length;

  let status: NetworkStatusResult['status'];
  if (offline === total)               status = 'offline';
  else if (degraded > 0 || offline > 0) status = 'degraded';
  else                                  status = 'healthy';

  const latencyValues = participants
    .map((v) => v.latency)
    .filter((l): l is string => l !== null)
    .map((l) => parseInt(l, 10))
    .filter((n) => !isNaN(n));

  const avgLatency =
    latencyValues.length > 0
      ? Math.round(latencyValues.reduce((a, b) => a + b, 0) / latencyValues.length)
      : null;

  const counts = { total, healthy, degraded, offline };

  return {
    network:      networkName,
    status,
    latency:      avgLatency !== null ? `${avgLatency}ms` : 'N/A',
    lastChecked:  'just now',
    participants: counts,
    validators:   counts, // backwards-compat alias
  };
}
