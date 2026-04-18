import { env } from '$env/dynamic/private';

function required(key: string): string {
  const val = env[key];
  if (!val) throw new Error(`Missing required env var: ${key}`);
  return val;
}

function optional(key: string, fallback: string): string {
  return env[key] ?? fallback;
}

export function buildMapServiceConfig() {
  return {
    upstream: {
      baseUrl:       required('MAP_UPSTREAM_BASE_URL'),
      timeout:       parseInt(optional('MAP_UPSTREAM_TIMEOUT_MS', '5000')),
      retryAttempts: parseInt(optional('MAP_UPSTREAM_RETRY_ATTEMPTS', '3')),
    },
    duckdb: {
      path:     optional('DUCKDB_PATH', ':memory:'),
      readOnly: optional('DUCKDB_READONLY', 'false') === 'true',
    },
  } satisfies import('./types').MapServiceConfig;
}