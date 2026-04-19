/**
 * api.ts
 * Base URL helper — reads VITE_API_URL in production,
 * falls back to '' (relative) in local dev (Vite proxy handles it).
 */
export const API_BASE = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '');

export function apiUrl(path: string): string {
  return `${API_BASE}${path}`;
}
