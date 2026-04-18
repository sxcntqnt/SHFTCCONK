// src/lib/map/index.ts
// ============================================
// Map Service - Public API
// Re-export all public types and classes
// ============================================

// Types
export * from './types'

// Services
export { PostGISService } from './postgis.service'
export { SSEStreamManager, sseStreamManager } from './sse-streamer.service'
export { MapService, createMapService, getMapService } from './map.service'

// Bootstrap / manifest system
// The BootstrapManifestService is the bridge between the request layer
// (locationHandle → requestContext) and the execution layer
// (DuckDB WASM + Service Worker + MapLibre).
// It does NOT depend on auth. It does NOT depend on SvelteKit.
export {
  BootstrapManifestService,
  bootstrapManifestService,
  zoomToH3Resolution,
} from './services/bootstrap-manifest.service'

export type {
  RequestContext,
  CityBootstrapManifest,
  QuadTile,
  H3Seed,
  StorageHints,
} from './services/bootstrap-manifest.service'

// Utilities
export * from './utils/distance'

// Routes
export { createMapRoutes, createSSERoutes } from './routes'