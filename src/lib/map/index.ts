// src/lib/map/index.ts
//
// Public barrel for the map subsystem.
//
// IMPORT RULES:
//   Browser-only modules (DuckDBWasmCore, DuckDBTileProvider) must NOT
//   be exported from here — this barrel is imported by hooks.server.ts
//   which runs in Node.js / Cloudflare Workers.
//
//   Browser-only code stays in:
//     $lib/map/services/DuckDBWasmCore.ts   (imported by DuckDBTileProvider.svelte only)
//     src/service-worker.ts                  (SW scope)

// ── Service singleton helpers ─────────────────────────────────────────────────
export { createMapService, getMapService, MapService } from './services/map.service'

// ── Bootstrap manifest ────────────────────────────────────────────────────────
export {
  bootstrapManifestService,
  BootstrapManifestService,
  zoomToH3Resolution,
  type RequestContext,
  type CityBootstrapManifest,
  type QuadTile,
  type H3Seed,
  type StorageHints,
} from './services/bootstrap-manifest.service'

// ── Types ─────────────────────────────────────────────────────────────────────
export type {
  Coordinates,
  BoundingBox,
  MapState,
  MapLayer,
  MapMarker,
  MapRoute,
  Geofence,
  TrafficNode,
  CorridorAnalytics,
  Vehicle,
  H3Cell,
  H3Metrics,
  GeoJSONFeatureCollection,
  MapServiceConfig,
  VehicleStreamData,
  TrafficStreamData,
  StreamEvent,
  StreamEventType,
  MapQueryFilters,
  DuckDBLayerConfig,
} from './types/MapTypes'

// ── Geo utilities ─────────────────────────────────────────────────────────────
export {
  distanceBetween,
  distanceInKm,
  bearingBetween,
  destinationPoint,
  createBoundingBox,
  isWithinBounds,
  boundsOverlap,
  expandBounds,
  filterMarkersByRadius,
  filterMarkersByBounds,
  sortMarkersByDistance,
  findNearestMarker,
  calculateCentroid,
  formatDistance,
  NAIROBI_CENTER,
  NAIROBI_BOUNDS,
  NAIROBI_H3_RESOLUTION,
  MAJOR_TERMINUS_LOCATIONS,
} from './utils/geo'

// ── Map stores (Svelte — browser only, but safe to reference server-side) ─────
// These are Svelte writable stores. Importing them server-side won't break
// anything (the stores are never subscribed to), but values won't persist.
export {
  mapState,
  layers,
  mapRoutes,
  mapMarkers,
  geofences,
  geofencesGeoJSON,
  routesGeoJSON,
  addMarker,
  removeMarker,
  updateMarker,
  addRoute,
  removeRoute,
  addGeofence,
  removeGeofence,
  updateGeofence,
  setCenter,
  setZoom,
} from './stores/MapStore'

// ── Config builder ────────────────────────────────────────────────────────────
export { buildMapServiceConfig } from './services/config'