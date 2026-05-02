// src/lib/map/services/config.client.ts

import { PUBLIC_MAP_UPSTREAM_BASE_URL } from '$env/static/public'

function optionalNumber(value: string | undefined, fallback: number): number {
  const parsed = parseInt(value ?? '')
  return isNaN(parsed) ? fallback : parsed
}

export function buildMapServiceConfig() {
  return {
    upstream: {
      // ⚠️ Must be PUBLIC_ prefixed in your .env
      baseUrl: PUBLIC_MAP_UPSTREAM_BASE_URL,

      // Browser-safe defaults (no private env access)
      timeout: 5000,
      retryAttempts: 3,
    },

    // ✅ Actually relevant on client (DuckDB WASM etc.)
    duckdb: {
      path: ':memory:',
      readOnly: false,
    },

    sse: {
      heartbeatInterval: 25000,
      reconnectDelay: 3000,
      maxConnections: 500,
    },

    h3: {
      defaultResolution: 9,
    },
  } satisfies import('../types/MapTypes').MapServiceConfig
}