// src/lib/map/services/bootstrap-manifest.service.ts
//
// BootstrapManifestService — answers the question:
//   "Given this request, which spatial slice of the world
//    should exist in this session?"
//
// REQUESTCONTEXT TYPE NOTE:
//   This file previously exported its own RequestContext interface.
//   It now imports from App.Locals so the type is authoritative in
//   one place (app.d.ts). The fields are identical — this is a
//   pure refactor, no behaviour change.
//
// THREE LAYER SYSTEM:
//   QUADTREE → what Parquet files exist (sharding / CDN layout)
//   H3       → what features belong together (semantic clustering)
//   Z-ORDER  → how data is laid out on disk (query-time hint only)

import type { BoundingBox } from '../types'

// ── Canonical RequestContext — defined once in app.d.ts ──────────────────────
// Imported via the ambient global rather than re-declared here.
// Using `App.RequestContext` directly keeps the type chain consistent
// across hooks.server.ts → locationHandle → mapServiceHandle → this service.
import type { App } from '../../../app'
export type RequestContext = NonNullable<App.Locals['requestContext']>

/* ============================================================
   OUTPUT TYPES — THE THREE LAYERS
============================================================ */

/** LAYER 1: Quadtree tile — what Parquet files exist and where */
export interface QuadTile {
  z: number
  x: number
  y: number
  bounds: BoundingBox
  parquetUrl: string
  estimatedSizeMB: number
}

/** LAYER 2: H3 semantic seed — what features belong together */
export interface H3Seed {
  resolution: number
  cells: string[]
}

/** LAYER 3: Storage hint (Z-order) — read-only performance hint for DuckDB */
export interface StorageHints {
  preferSequentialScan: boolean
  zorderRange: [min: number, max: number] | null
}

/** Full bootstrap manifest consumed by SW + DuckDB WASM + MapLibre */
export interface CityBootstrapManifest {
  cityId: string
  boundingBox: BoundingBox
  h3ResolutionRange: [min: number, max: number]
  tileKeys: QuadTile[]
  h3Seeds: H3Seed
  storageHints: StorageHints
  preloadLayers: string[]
  simplificationLevel: 'low' | 'medium' | 'high'
  estimatedSizeMB: number
}

/* ============================================================
   CITY INDEX
============================================================ */

interface CityDefinition {
  id: string
  displayName: string
  bounds: BoundingBox
  h3Range: [min: number, max: number]
  h3_7_cells: string[]
  parquetBase: string
  layers: string[]
  zorderRange: [number, number] | null
}

const CITY_INDEX: Record<string, CityDefinition> = {
  nairobi: {
    id: 'nairobi',
    displayName: 'Nairobi',
    bounds: {
      southWest: { lat: -1.45, lng: 36.65 },
      northEast: { lat: -1.15, lng: 36.95 },
    },
    h3Range: [7, 10],
    h3_7_cells: [
      '8765b1a47ffffff',
      '8765b1a4fffffff',
      '8765b1ac7ffffff',
      '8765b1acfffffff',
      '8765b1b47ffffff',
      '8765b1b4fffffff',
    ],
    parquetBase: 'https://cdn.yourdomain.com/tiles/ke/nairobi',
    layers: ['roads', 'buildings', 'traffic_nodes', 'corridors', 'h3_density'],
    zorderRange: [1234567, 7654321],
  },
  mombasa: {
    id: 'mombasa',
    displayName: 'Mombasa',
    bounds: {
      southWest: { lat: -4.12, lng: 39.58 },
      northEast: { lat: -3.97, lng: 39.75 },
    },
    h3Range: [7, 9],
    h3_7_cells: [
      '8765231c7ffffff',
      '87652318fffffff',
    ],
    parquetBase: 'https://cdn.yourdomain.com/tiles/ke/mombasa',
    layers: ['roads', 'buildings', 'traffic_nodes'],
    zorderRange: null,
  },
}

const DEFAULT_CITY = CITY_INDEX.nairobi

/* ============================================================
   QUADTILE HELPERS
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

function buildQuadTiles(city: CityDefinition, tileZoom = 10): QuadTile[] {
  const { bounds, parquetBase } = city

  const xMin = lngToTileX(bounds.southWest.lng, tileZoom)
  const xMax = lngToTileX(bounds.northEast.lng, tileZoom)
  const yMin = latToTileY(bounds.northEast.lat, tileZoom)
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
        estimatedSizeMB: 2,
      })
    }
  }

  return tiles
}

/* ============================================================
   LOD + H3 RESOLUTION
============================================================ */

function getLOD(zoom: number): CityBootstrapManifest['simplificationLevel'] {
  if (zoom <= 10) return 'high'
  if (zoom <= 13) return 'medium'
  return 'low'
}

export function zoomToH3Resolution(zoom: number): number {
  if (zoom <= 10) return 7
  if (zoom <= 13) return 8
  if (zoom <= 15) return 9
  return 10
}

/* ============================================================
   CITY SELECTION
============================================================ */

function selectCity(
  ctx: RequestContext,
  viewportCenter?: { lat: number; lng: number },
): CityDefinition {
  // 1. Viewport-first
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

  // 2. CF city header
  if (ctx.city) {
    const key = ctx.city.toLowerCase()
    if (CITY_INDEX[key]) return CITY_INDEX[key]
  }

  // 3. Country default
  if (ctx.country === 'KE') return CITY_INDEX.nairobi

  // 4. Global fallback
  return DEFAULT_CITY
}

/* ============================================================
   SERVICE
============================================================ */

export class BootstrapManifestService {
  build(
    ctx: RequestContext,
    options?: {
      zoom?: number
      viewportCenter?: { lat: number; lng: number }
      tileZoom?: number
    },
  ): CityBootstrapManifest {
    const zoom     = options?.zoom ?? 12
    const tileZoom = options?.tileZoom ?? 10

    const city     = selectCity(ctx, options?.viewportCenter)
    const tileKeys = buildQuadTiles(city, tileZoom)

    const h3Resolution = zoomToH3Resolution(zoom)
    const h3Seeds: H3Seed = {
      resolution: h3Resolution,
      cells: city.h3_7_cells,
    }

    const storageHints: StorageHints = {
      preferSequentialScan: true,
      zorderRange: city.zorderRange,
    }

    const totalSize = tileKeys.reduce((s, t) => s + t.estimatedSizeMB, 0)

    return {
      cityId:              city.id,
      boundingBox:         city.bounds,
      h3ResolutionRange:   city.h3Range,
      tileKeys,
      h3Seeds,
      storageHints,
      preloadLayers:       city.layers,
      simplificationLevel: getLOD(zoom),
      estimatedSizeMB:     totalSize,
    }
  }

  buildFromViewport(
    ctx: RequestContext,
    viewport: BoundingBox,
    zoom: number,
  ): CityBootstrapManifest {
    const center = {
      lat: (viewport.southWest.lat + viewport.northEast.lat) / 2,
      lng: (viewport.southWest.lng + viewport.northEast.lng) / 2,
    }
    return this.build(ctx, { zoom, viewportCenter: center })
  }

  getH3ResolutionForZoom(zoom: number): number {
    return zoomToH3Resolution(zoom)
  }

  getAvailableCities(): string[] {
    return Object.keys(CITY_INDEX)
  }
}

export const bootstrapManifestService = new BootstrapManifestService()