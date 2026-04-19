/**
 * PriceService.ts
 *
 * Real-time CC (Canton Coin) price from CoinGecko public API.
 * No API key required for basic price data.
 *
 * CoinGecko coin ID: canton-network
 * Ref: https://www.coingecko.com/en/coins/canton-network
 */

import axios from 'axios';

const COINGECKO_BASE = 'https://api.coingecko.com/api/v3';
const COIN_ID        = 'canton-network';

// Cache price for 60 seconds to avoid rate limiting
let cache: { price: number; change24h: number; fetchedAt: number } | null = null;
const CACHE_TTL_MS = 60_000;

export interface CCPrice {
  usd: number;
  usd_24h_change: number;
  lastUpdated: string;
  source: 'live' | 'cached' | 'fallback';
}

export async function getCCPrice(): Promise<CCPrice> {
  // Return cached if fresh
  if (cache && Date.now() - cache.fetchedAt < CACHE_TTL_MS) {
    return {
      usd:            cache.price,
      usd_24h_change: cache.change24h,
      lastUpdated:    new Date(cache.fetchedAt).toISOString(),
      source:         'cached',
    };
  }

  try {
    // GET /simple/price?ids=canton-network&vs_currencies=usd&include_24hr_change=true
    const res = await axios.get(`${COINGECKO_BASE}/simple/price`, {
      params: {
        ids:                  COIN_ID,
        vs_currencies:        'usd',
        include_24hr_change:  true,
      },
      timeout: 8_000,
    });

    const data = res.data?.[COIN_ID];
    if (!data?.usd) throw new Error('No price data in response');

    cache = {
      price:     data.usd,
      change24h: data.usd_24h_change ?? 0,
      fetchedAt: Date.now(),
    };

    return {
      usd:            cache.price,
      usd_24h_change: cache.change24h,
      lastUpdated:    new Date(cache.fetchedAt).toISOString(),
      source:         'live',
    };
  } catch {
    // Fallback to last cached value or hardcoded fallback
    if (cache) {
      return {
        usd:            cache.price,
        usd_24h_change: cache.change24h,
        lastUpdated:    new Date(cache.fetchedAt).toISOString(),
        source:         'cached',
      };
    }

    // Last resort fallback — approximate current price
    return {
      usd:            0.145,
      usd_24h_change: 0,
      lastUpdated:    new Date().toISOString(),
      source:         'fallback',
    };
  }
}
