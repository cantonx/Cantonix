/**
 * simulation.ts
 *
 * Pure functions for generating realistic mock validator data.
 * Used exclusively by MockValidatorProvider and MockSwapProvider.
 * No imports from services or providers — keeps this layer clean.
 */

import type { ValidatorStatus } from '../models/validator.model';
export { formatLastChecked } from './time';

// ─── Random helpers ───────────────────────────────────────────────────────

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randFloat(min: number, max: number, decimals = 2): number {
  return parseFloat((Math.random() * (max - min) + min).toFixed(decimals));
}

// ─── Status weights: 70% healthy | 20% degraded | 10% offline ────────────

export function simulateStatus(): ValidatorStatus {
  const roll = Math.random();
  if (roll < 0.70) return 'healthy';
  if (roll < 0.90) return 'degraded';
  return 'offline';
}

// ─── Per-status field generators ─────────────────────────────────────────

export function simulateVersion(status: ValidatorStatus): string {
  return status === 'offline' ? 'N/A' : 'v0.5.10';
}

export function simulateUptime(status: ValidatorStatus): string {
  switch (status) {
    case 'healthy':  return `${randFloat(99.0, 100.0, 2)}%`;
    case 'degraded': return `${randFloat(80.0, 97.9, 2)}%`;
    case 'offline':  return '0%';
  }
}

export function simulateLatency(status: ValidatorStatus): string | null {
  switch (status) {
    case 'healthy':  return `${randInt(50, 150)}ms`;
    case 'degraded': return `${randInt(151, 500)}ms`;
    case 'offline':  return null;
  }
}

export function simulateRewards(status: ValidatorStatus): number | null {
  if (status === 'offline') return null;
  return status === 'healthy'
    ? randFloat(0.5, 12.0, 4)
    : randFloat(0.0, 3.0, 4);
}

// ─── Artificial network delay: 200–500ms ─────────────────────────────────

export function networkDelay(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, randInt(200, 500)));
}
