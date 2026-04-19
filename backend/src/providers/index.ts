/**
 * providers/index.ts
 *
 * Provider registry — the ONLY place that knows which concrete
 * implementation is active. Everything else depends on interfaces.
 *
 * To switch from mock to real Canton:
 *   Set PROVIDER=canton in your .env — no code changes needed.
 */

import { config } from '../config/app.config';
import type { IValidatorProvider } from '../interfaces/IValidatorProvider';
import type { ISwapProvider } from '../interfaces/ISwapProvider';
import { MockValidatorProvider } from './mock/MockValidatorProvider';
import { MockSwapProvider } from './mock/MockSwapProvider';
import { CantonValidatorProvider } from './canton/CantonValidatorProvider';
import { CantonSwapProvider } from './canton/CantonSwapProvider';

function buildValidatorProvider(): IValidatorProvider {
  if (config.providerMode === 'canton') {
    return new CantonValidatorProvider();
  }
  return new MockValidatorProvider();
}

function buildSwapProvider(): ISwapProvider {
  if (config.providerMode === 'canton') {
    return new CantonSwapProvider();
  }
  return new MockSwapProvider();
}

// Singletons — created once at startup
export const validatorProvider: IValidatorProvider = buildValidatorProvider();
export const swapProvider: ISwapProvider = buildSwapProvider();
