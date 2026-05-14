// src/lib/map/index.server.ts
//
// Server-only barrel for the map subsystem.
//
// SvelteKit enforces the boundary: this file is NEVER bundled into the
// browser build. Anything that touches Node.js APIs, $env/dynamic/private,
// process.env, ClickHouse, or SSE streaming controllers lives here.
//
// IMPORT RULES:
//   Server route handlers  →  import from '$lib/map/index.server'  (or '$lib/map/server')
//   Hooks / load functions →  same
//   Svelte components      →  import from '$lib/map' (isomorphic barrel) ONLY
//   DuckDBTileProvider     →  import DuckDBWasmCore directly (browser-only, not exported here)
//
// WHAT IS NOT HERE:
//   - DuckDBWasmCore        (browser-only WASM runtime)
//   - Svelte stores         (in isomorphic barrel)
//   - bootstrapManifestService (pure TS, safe in isomorphic barrel)
//   - Geo utility functions (pure TS, safe in isomorphic barrel)

// ── Compression + JSON response helpers ──────────────────────────────────────
// Uses Node.js `zlib` (brotliCompress / gzip) — never runs in the browser.
export { compressedJsonResponse, json } from './utils/compress.server'

// ── Map service singleton ─────────────────────────────────────────────────────
// Owns ClickHouse connection, SSE broadcasting, polling loops.
// Instantiated once per process by mapServiceHandle in hooks.server.ts.
export {
  MapService,
  createMapService,
  getMapService,
} from './services/MapService.service'

// ── SSE stream manager ────────────────────────────────────────────────────────
// Holds ReadableStreamDefaultController references — server-only.
// Route handler GET /api/map/stream calls sseStreamManager.registerClient().
export {
  SSEStreamManager,
  sseStreamManager,
} from './services/SseStreamer.service'

// ── Config builder ────────────────────────────────────────────────────────────
// Reads $env/dynamic/private — forbidden in browser bundles.
export { buildMapServiceConfig } from './services/Config.server'

// ── Route handler utilities ───────────────────────────────────────────────────
// Pure functions, but used exclusively in +server.ts route handlers
// alongside the compressed response helpers above.
export { parseBounds, saturationToColor } from './utils/apiHelpers'

