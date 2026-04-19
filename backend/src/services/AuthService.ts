/**
 * AuthService.ts
 *
 * Keycloak OAuth2 token management.
 * Caches tokens per participant and auto-refreshes before expiry.
 *
 * Used by Canton providers when AUTH_MODE=oauth2.
 * Returns empty headers in shared-secret mode — no changes needed in callers.
 */

import axios from 'axios';
import { config } from '../config/app.config';

export type Participant = 'app-user' | 'app-provider' | 'super';

interface CachedToken {
  token: string;
  expiresAt: number; // epoch ms
}

interface KeycloakTokenResponse {
  access_token: string;
  expires_in: number;
}

// In-memory cache — one entry per participant
const tokenCache = new Map<Participant, CachedToken>();

function participantKeycloakConfig(participant: Participant) {
  switch (participant) {
    case 'app-user':
      return {
        realm:        config.keycloakAppUserRealm,
        clientId:     config.keycloakAppUserClientId,
        clientSecret: config.keycloakAppUserClientSecret,
      };
    case 'app-provider':
    case 'super':
      return {
        realm:        config.keycloakAppProviderRealm,
        clientId:     config.keycloakAppProviderClientId,
        clientSecret: config.keycloakAppProviderClientSecret,
      };
  }
}

async function fetchFreshToken(participant: Participant): Promise<string> {
  const { realm, clientId, clientSecret } = participantKeycloakConfig(participant);
  const url = `${config.keycloakUrl}/realms/${realm}/protocol/openid-connect/token`;

  const body = new URLSearchParams({
    client_id:     clientId,
    client_secret: clientSecret,
    grant_type:    'client_credentials',
    scope:         'openid',
  });

  const response = await axios.post<KeycloakTokenResponse>(url, body.toString(), {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    timeout: 10_000,
  });

  const { access_token, expires_in } = response.data;

  // Cache with 30s safety margin before actual expiry
  tokenCache.set(participant, {
    token:     access_token,
    expiresAt: Date.now() + (expires_in - 30) * 1000,
  });

  return access_token;
}

export async function getBearerToken(participant: Participant): Promise<string> {
  if (config.authMode !== 'oauth2') return '';

  const cached = tokenCache.get(participant);
  if (cached && cached.expiresAt > Date.now()) return cached.token;

  return fetchFreshToken(participant);
}

export async function authHeaders(
  participant: Participant
): Promise<Record<string, string>> {
  const token = await getBearerToken(participant);
  return token ? { Authorization: `Bearer ${token}` } : {};
}
