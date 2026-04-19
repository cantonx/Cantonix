/**
 * app.config.ts
 *
 * Single source of truth for all environment configuration.
 * Import this instead of reading process.env directly anywhere else.
 *
 * To add a new config value:
 *   1. Add it here with a sensible default
 *   2. Add it to .env and .env.example
 *   3. Use config.yourValue everywhere
 */

export type ProviderMode = 'mock' | 'canton';
export type AuthMode = 'shared-secret' | 'oauth2';
export type NetworkEnv = 'devnet' | 'testnet' | 'mainnet';

const NETWORK_DISPLAY_NAMES: Record<string, string> = {
  devnet: 'Canton DevNet',
  testnet: 'Canton TestNet',
  mainnet: 'Canton MainNet',
};

function env(key: string, fallback: string): string {
  return process.env[key] ?? fallback;
}

const raw = {
  provider:    env('PROVIDER',    'mock'),
  authMode:    env('AUTH_MODE',   'shared-secret'),
  network:     env('NETWORK',     'devnet').toLowerCase(),
  nodeEnv:     env('NODE_ENV',    'development'),
  port:        parseInt(env('PORT', '3001'), 10),

  // Validator readyz endpoints (ports x903)
  appUserValidatorUrl:     env('APP_USER_VALIDATOR_URL',     'http://localhost:2903/api/validator/readyz'),
  appProviderValidatorUrl: env('APP_PROVIDER_VALIDATOR_URL', 'http://localhost:3903/api/validator/readyz'),
  superValidatorUrl:       env('SUPER_VALIDATOR_URL',        'http://localhost:4903/api/validator/readyz'),
  validatorUri:            env('VALIDATOR_URI',              'http://localhost:3903/api/validator'),

  // JSON Ledger API endpoints (ports x975)
  appUserJsonApiUrl:     env('APP_USER_JSON_API_URL',     'http://localhost:2975'),
  appProviderJsonApiUrl: env('APP_PROVIDER_JSON_API_URL', 'http://localhost:3975'),
  superJsonApiUrl:       env('SUPER_JSON_API_URL',        'http://localhost:4975'),

  // Keycloak (OAuth2)
  keycloakUrl:                    env('KEYCLOAK_URL',                    'http://keycloak.localhost:8082'),
  keycloakAppUserRealm:           env('KEYCLOAK_APP_USER_REALM',         'AppUser'),
  keycloakAppProviderRealm:       env('KEYCLOAK_APP_PROVIDER_REALM',     'AppProvider'),
  keycloakAppUserClientId:        env('KEYCLOAK_APP_USER_CLIENT_ID',     'app-user-validator'),
  keycloakAppUserClientSecret:    env('KEYCLOAK_APP_USER_CLIENT_SECRET', ''),
  keycloakAppProviderClientId:    env('KEYCLOAK_APP_PROVIDER_CLIENT_ID', 'app-provider-validator'),
  keycloakAppProviderClientSecret:env('KEYCLOAK_APP_PROVIDER_CLIENT_SECRET', ''),

  // Supporting services
  walletUrl: env('WALLET_URL', 'http://wallet.localhost:2000'),
  scanUrl:   env('SCAN_URL',   'http://scan.localhost:4000'),
  svUiUrl:   env('SV_UI_URL',  'http://sv.localhost:4000'),
  pqsUrl:    env('PQS_URL',    'http://localhost:5432'),

  // JWT (multi-user auth)
  jwtSecret:    env('JWT_SECRET',     'cantonix-dev-secret-change-in-production'),
  jwtExpiresIn: env('JWT_EXPIRES_IN', '7d'),

  // Canton Participant Node — JSON Ledger API (PROVIDER=canton)
  // Set CANTON_API_URL to your Canton node's JSON API base URL
  // e.g. http://localhost:7575  or  https://your-canton-node.example.com
  cantonApiUrl:   env('CANTON_API_URL',   ''),
  cantonApiToken: env('CANTON_API_TOKEN', ''),
};

export const config = {
  ...raw,

  // Derived / validated
  isDev:           raw.nodeEnv === 'development',
  providerMode:    (raw.provider === 'canton' ? 'canton' : 'mock') as ProviderMode,
  authMode:        (raw.authMode === 'oauth2' ? 'oauth2' : 'shared-secret') as AuthMode,
  networkEnv:      raw.network as NetworkEnv,
  networkName:     NETWORK_DISPLAY_NAMES[raw.network] ?? 'Canton Network',

  // Grouped for convenience
  validatorUrls: {
    appUser:     raw.appUserValidatorUrl,
    appProvider: raw.appProviderValidatorUrl,
    super:       raw.superValidatorUrl,
  },

  jsonApiUrls: {
    appUser:     raw.appUserJsonApiUrl,
    appProvider: raw.appProviderJsonApiUrl,
    super:       raw.superJsonApiUrl,
  },

  // Base URLs for Validator App REST API (strip /readyz suffix)
  // Used for: /v0/wallet/*, /v0/admin/*, /v0/scan-proxy/*, /v0/register
  validatorAppUrls: {
    appUser:     raw.appUserValidatorUrl.replace('/readyz', ''),
    appProvider: raw.appProviderValidatorUrl.replace('/readyz', ''),
    super:       raw.superValidatorUrl.replace('/readyz', ''),
  },
} as const;
