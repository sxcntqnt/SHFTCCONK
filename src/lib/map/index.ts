// src/lib/map/index.ts

// ── Types ─────────────────────────────────────────────────────────────────────
export * from './types/MapTypes';

// ── Services ──────────────────────────────────────────────────────────────────
export { DuckDBService }                          from './services/DuckDB.service';
export { SSEStreamManager, sseStreamManager }     from './services/SseStreamer.service';
export { MapService, createMapService, getMapService } from './services/MapService.service';
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

// ── Utilities ─────────────────────────────────────────────────────────────────
export * from './utils/distance';
export { parseBounds, saturationToColor } from './utils/apiHelpers';  // ← single source
