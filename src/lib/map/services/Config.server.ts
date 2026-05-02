// src/lib/map/services/config.server.ts

import { env } from '$env/dynamic/private'

function required(key: string): string {
  const val = env[key]
  if (!val) throw new Error(`[MapService] Missing required env var: ${key}`)
  return val
}

function optional(key: string, fallback: string): string {
  return env[key] ?? fallback
}

export function buildMapServiceConfig() {
  return {
    upstream: {
      baseUrl:       required('MAP_UPSTREAM_BASE_URL'),
      timeout:       parseInt(optional('MAP_UPSTREAM_TIMEOUT_MS', '5000')),
      retryAttempts: parseInt(optional('MAP_UPSTREAM_RETRY_ATTEMPTS', '3')),
    },

    // ⚠️ Still included for shape consistency, but not used server-side
    duckdb: {
      path:     optional('DUCKDB_PATH', ':memory:'),
      readOnly: optional('DUCKDB_READONLY', 'false') === 'true',
    },

    sse: {
      heartbeatInterval: parseInt(optional('SSE_HEARTBEAT_MS', '25000')),
      reconnectDelay:    parseInt(optional('SSE_RECONNECT_MS', '3000')),
      maxConnections:    parseInt(optional('SSE_MAX_CONNECTIONS', '500')),
    },

    h3: {
      defaultResolution: parseInt(optional('H3_DEFAULT_RESOLUTION', '9')),
    },
  } satisfies import('../types/MapTypes').MapServiceConfig
}