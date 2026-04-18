// src/lib/map/services/bootstrap-manifest.service.ts
//
// BootstrapManifestService — answers the question:
//   "Given this request, which spatial slice of the world
//    should exist in this session?"
//
// ARCHITECTURE POSITION:
//   - Lives inside map-service (not SvelteKit routes, not auth)
//   - Consumes RequestContext from hooks (geo seed)
//   - Produces CityBootstrapManifest for DuckDB WASM + Service Worker
//   - Is the bridge between the request layer and the execution layer
//
// THREE LAYER SYSTEM:
//   QUADTREE → what Parquet files exist (distribution / sharding)
//   H3       → what features belong together (semantic clustering)
//   Z-ORDER  → how data is laid out on disk (performance, read-only concern)
//
//   This service produces manifests for the first two.
//   Z-order is a storage concern — it is honored at query time, not here.
//
// CURRENT SCOPE: Kenya / Nairobi dataset only.
//   Expand CITY_INDEX when dataset grows.

import type { BoundingBox } from "../types"

/* ============================================================
   REQUEST CONTEXT (mirrors app.d.ts — no import needed)
   The map-service should not depend on SvelteKit types.
============================================================ */

export interface RequestContext {
  country: string | null
  city: string | null
  ip: string | null
  regionKey: string
  approxCenter: { lat: number; lng: number }
  h3SeedResolution: number
}

/* ============================================================
   OUTPUT TYPES — THE THREE LAYERS
============================================================ */

/**
 * LAYER 1: Quadtree tile descriptor
 * Defines what Parquet files exist and where to fetch them.
 * Quadtree decides WHAT EXISTS — no semantics, no clustering.
 */
export interface QuadTile {
  z: number
  x: number
  y: number
  /** Bounding box this tile covers */
  bounds: BoundingBox
  /** URL to the Parquet shard for this tile */
  parquetUrl: string
  /** Estimated size in MB — used for prefetch prioritization */
  estimatedSizeMB: number
}

/**
 * LAYER 2: H3 semantic seed
 * Defines what features belong together inside a region.
 * H3 decides WHAT THINGS MEAN — no file layout, no URLs.
 */
export interface H3Seed {
  resolution: number
  /** H3 cell indices covering the target viewport */
  cells: string[]
}

/**
 * LAYER 3: Storage hint (Z-order)
 * Read-only performance hint — passed to DuckDB at query time.
 * This layer does NOT decide what data exists.
 */
export interface StorageHints {
  preferSequentialScan: boolean
  /** Morton-encoded range for the target region */
  zorderRange: [min: number, max: number] | null
}

/**
 * The full bootstrap manifest.
 * Consumed by: Service Worker (prefetch), DuckDB WASM (attach),
 * MapLibre protocol handler (tile generation).
 */
export interface CityBootstrapManifest {
  /** Stable city identifier — usable as cache key */
  cityId: string
  /** The bounding box this manifest covers */
  boundingBox: BoundingBox
  /** H3 resolution range [min, max] the client will need */
  h3ResolutionRange: [min: number, max: number]
  /** Ordered list of Parquet tiles to preload (priority order) */
  tileKeys: QuadTile[]
  /** H3 semantic seed for the initial viewport */
  h3Seeds: H3Seed
  /** Storage optimization hints for DuckDB queries */
  storageHints: StorageHints
  /** Layers to preload (e.g. roads, buildings, nodes) */
  preloadLayers: string[]
  /** LOD strategy based on zoom level */
  simplificationLevel: "low" | "medium" | "high"
  /** Total estimated download size in MB */
  estimatedSizeMB: number
}

/* ============================================================
   CITY INDEX
   Static registry of known cities in the Kenya dataset.
   Expand as new cities are added to the Parquet dataset.
============================================================ */

interface CityDefinition {
  id: string
  displayName: string
  bounds: BoundingBox
  /** H3 resolution range appropriate for this city's density */
  h3Range: [min: number, max: number]
  /** Pre-known H3 cells at resolution 7 covering this city */
  h3_7_cells: string[]
  /** CDN base URL for this city's Parquet shards */
  parquetBase: string
  /** Layers available for this city */
  layers: string[]
  /** Morton z-order range for this city's region */
  zorderRange: [number, number] | null
}

const CITY_INDEX: Record<string, CityDefinition> = {
  nairobi: {
    id: "nairobi",
    displayName: "Nairobi",
    bounds: {
      southWest: { lat: -1.45, lng: 36.65 },
      northEast: { lat: -1.15, lng: 36.95 },
    },
    h3Range: [7, 10],
    // These are the H3 resolution-7 cells covering Nairobi metro.
    // Generated via: h3_polygon_to_cells(nairobi_polygon, 7)
    // Replace with real values from your ingestion pipeline.
    h3_7_cells: [
      "8765b1a47ffffff",
      "8765b1a4fffffff",
      "8765b1ac7ffffff",
      "8765b1acfffffff",
      "8765b1b47ffffff",
      "8765b1b4fffffff",
    ],
    parquetBase: "https://cdn.yourdomain.com/tiles/ke/nairobi",
    layers: ["roads", "buildings", "traffic_nodes", "corridors", "h3_density"],
    zorderRange: [1234567, 7654321], // Replace with real Morton range
  },
  mombasa: {
    id: "mombasa",
    displayName: "Mombasa",
    bounds: {
      southWest: { lat: -4.12, lng: 39.58 },
      northEast: { lat: -3.97, lng: 39.75 },
    },
    h3Range: [7, 9],
    h3_7_cells: [
      "8765231c7ffffff",
      "87652318fffffff",
    ],
    parquetBase: "https://cdn.yourdomain.com/tiles/ke/mombasa",
    layers: ["roads", "buildings", "traffic_nodes"],
    zorderRange: null, // Not yet indexed
  },
}

// Fallback when city cannot be determined
const DEFAULT_CITY = CITY_INDEX.nairobi

/* ============================================================
   QUADTILE HELPERS
   
   Converts a city bounding box into a list of XYZ quad tiles.
   Uses zoom level 10 for city-level preloading (≈600m per tile).
   The service worker downloads these in priority order.
============================================================ */

function lngToTileX(lng: number, zoom: number): number {
  return Math.floor(((lng + 180) / 360) * Math.pow(2, zoom))
}

function latToTileY(lat: number, zoom: number): number {
  const radLat = (lat * Math.PI) / 180
  return Math.floor(
    ((1 - Math.log(Math.tan(radLat) + 1 / Math.cos(radLat)) / Math.PI) / 2) *
      Math.pow(2, zoom),
  )
}

function tileXToLng(x: number, zoom: number): number {
  return (x / Math.pow(2, zoom)) * 360 - 180
}

function tileYToLat(y: number, zoom: number): number {
  const n = Math.PI - (2 * Math.PI * y) / Math.pow(2, zoom)
  return (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)))
}

function buildQuadTiles(city: CityDefinition, tileZoom: number = 10): QuadTile[] {
  const { bounds, parquetBase } = city

  const xMin = lngToTileX(bounds.southWest.lng, tileZoom)
  const xMax = lngToTileX(bounds.northEast.lng, tileZoom)
  const yMin = latToTileY(bounds.northEast.lat, tileZoom) // note: Y is inverted
  const yMax = latToTileY(bounds.southWest.lat, tileZoom)

  const tiles: QuadTile[] = []

  for (let x = xMin; x <= xMax; x++) {
    for (let y = yMin; y <= yMax; y++) {
      tiles.push({
        z: tileZoom,
        x,
        y,
        bounds: {
          southWest: { lat: tileYToLat(y + 1, tileZoom), lng: tileXToLng(x, tileZoom) },
          northEast: { lat: tileYToLat(y, tileZoom),     lng: tileXToLng(x + 1, tileZoom) },
        },
        parquetUrl: `${parquetBase}/z${tileZoom}/${x}/${y}.parquet`,
        // Rough estimate: ~2MB per tile at zoom 10 for Nairobi density
        estimatedSizeMB: 2,
      })
    }
  }

  return tiles
}

/* ============================================================
   LOD STRATEGY
   Maps zoom level → simplification level.
   Used by DuckDB queries to decide geometry precision.
============================================================ */

function getLOD(zoom: number): CityBootstrapManifest["simplificationLevel"] {
  if (zoom <= 10) return "high"   // zoomed out — simplify aggressively
  if (zoom <= 13) return "medium" // city view — moderate simplification
  return "low"                    // street view — full detail
}

/* ============================================================
   ZOOM → H3 RESOLUTION MAPPING
   
   | Zoom  | H3 Res | Approx cell size |
   |-------|--------|------------------|
   | 8–10  |   7    | ~5 km²           |
   | 11–13 |   8    | ~0.7 km²         |
   | 14–15 |   9    | ~0.1 km²         |
   | 16+   |  10    | ~0.015 km²       |
============================================================ */

export function zoomToH3Resolution(zoom: number): number {
  if (zoom <= 10) return 7
  if (zoom <= 13) return 8
  if (zoom <= 15) return 9
  return 10
}

/* ============================================================
   CITY SELECTION LOGIC
   
   Priority:
   1. Viewport intersection (when client sends bounds)
   2. City name from requestContext (CF header)
   3. Country code → default city for that country
   4. Global fallback → Nairobi (primary dataset)
============================================================ */

function selectCity(
  requestContext: RequestContext,
  viewportCenter?: { lat: number; lng: number },
): CityDefinition {
  // 1. Viewport-first: find which city contains the center point
  if (viewportCenter) {
    for (const city of Object.values(CITY_INDEX)) {
      const { bounds } = city
      if (
        viewportCenter.lat >= bounds.southWest.lat &&
        viewportCenter.lat <= bounds.northEast.lat &&
        viewportCenter.lng >= bounds.southWest.lng &&
        viewportCenter.lng <= bounds.northEast.lng
      ) {
        return city
      }
    }
  }

  // 2. City name from CF header
  if (requestContext.city) {
    const cityKey = requestContext.city.toLowerCase()
    if (CITY_INDEX[cityKey]) return CITY_INDEX[cityKey]
  }

  // 3. Country default (KE → Nairobi)
  if (requestContext.country === "KE") return CITY_INDEX.nairobi

  // 4. Final fallback
  return DEFAULT_CITY
}

/* ============================================================
   BOOTSTRAP MANIFEST SERVICE
============================================================ */

export class BootstrapManifestService {
  /**
   * Build a CityBootstrapManifest from a RequestContext.
   *
   * Called by:
   * - Service worker (on initial map load)
   * - SW prefetch (on city hover intent)
   * - DuckDB WASM init (to know which Parquet shards to attach)
   *
   * NOT called by:
   * - Auth pipeline
   * - UserState / ActiveContext resolution
   * - Any SvelteKit route handler directly
   *   (routes call mapService.getBootstrapManifest() instead)
   */
  build(
    requestContext: RequestContext,
    options?: {
      /** Current map zoom — refines H3 resolution and LOD */
      zoom?: number
      /** Viewport center from client — overrides CF city inference */
      viewportCenter?: { lat: number; lng: number }
      /** Tile zoom level for Parquet shard decomposition */
      tileZoom?: number
    },
  ): CityBootstrapManifest {
    const zoom       = options?.zoom ?? 12
    const tileZoom   = options?.tileZoom ?? 10

    // Select the right city dataset
    const city = selectCity(requestContext, options?.viewportCenter)

    // Build the three layers independently
    const tileKeys = buildQuadTiles(city, tileZoom)

    const h3Resolution = zoomToH3Resolution(zoom)
    const h3Seeds: H3Seed = {
      resolution: h3Resolution,
      // At the seed stage, use the pre-computed h3_7_cells as the base.
      // The client refines this when the viewport is known.
      cells: city.h3_7_cells,
    }

    const storageHints: StorageHints = {
      preferSequentialScan: true,
      zorderRange: city.zorderRange,
    }

    const totalSize = tileKeys.reduce((sum, t) => sum + t.estimatedSizeMB, 0)

    return {
      cityId:            city.id,
      boundingBox:       city.bounds,
      h3ResolutionRange: city.h3Range,
      tileKeys,
      h3Seeds,
      storageHints,
      preloadLayers:     city.layers,
      simplificationLevel: getLOD(zoom),
      estimatedSizeMB:   totalSize,
    }
  }

  /**
   * Build a manifest from a known viewport bounding box.
   * Used when the client already has a map position (pan/zoom events).
   */
  buildFromViewport(
    requestContext: RequestContext,
    viewport: BoundingBox,
    zoom: number,
  ): CityBootstrapManifest {
    const center = {
      lat: (viewport.southWest.lat + viewport.northEast.lat) / 2,
      lng: (viewport.southWest.lng + viewport.northEast.lng) / 2,
    }
    return this.build(requestContext, { zoom, viewportCenter: center })
  }

  /**
   * Return the H3 resolution appropriate for a given zoom level.
   * Exposed so the client can call this without constructing a full manifest.
   */
  getH3ResolutionForZoom(zoom: number): number {
    return zoomToH3Resolution(zoom)
  }

  /**
   * List all city IDs known to this service.
   * Used by the service worker to decide which shards to warm.
   */
  getAvailableCities(): string[] {
    return Object.keys(CITY_INDEX)
  }
}

/* ============================================================
   SINGLETON
   
   Used via mapService.bootstrap (see map.service.ts integration).
   Can also be imported directly in the service worker context
   where MapService is not available.
============================================================ */

export const bootstrapManifestService = new BootstrapManifestService()