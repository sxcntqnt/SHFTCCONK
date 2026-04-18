// src/lib/map/index.ts
// ============================================
// Map Service - Public API (DuckDB Edition)
// Re-export all public types and classes
// ============================================

// ============================================
// Types
// ============================================
export * from './types/MapTypes';

// ============================================
// Services
// ============================================
// Main DuckDB spatial service
export { DuckDBService } from './services/DuckDB.service';

// SSE Streaming
export { SSEStreamManager, sseStreamManager } from './services/SseStreamer.service';

// Main Map Service (now DuckDB-only)
export { MapService, createMapService, getMapService } from './services/MapService';

// Bootstrap / Manifest system
// Bridge between request layer (locationHandle) and map execution layer
export {
  BootstrapManifestService,
  bootstrapManifestService,
  zoomToH3Resolution,
} from './services/bootstrap-manifest.service';

export type {
  RequestContext,
  CityBootstrapManifest,
  QuadTile,
  H3Seed,
  StorageHints,
} from './services/bootstrap-manifest.service';

// ============================================
// Utilities
// ============================================
export * from './utils/distance';

// ============================================
// Routes
// ============================================

export { compressedJsonResponse, parseBounds, saturationToColor } from './utils/compress';
export { parseBounds, saturationToColor } from './utils/apiHelpers';