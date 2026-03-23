// src/routes/(auth)/api/map/tiles/+server.ts
//
// On-demand parquet tile generation.
// Called by the map page when the user's location is known.
//
// FLOW:
//   1. Client sends user lat/lng + zoom level
//   2. Server computes H3 bounding viewport
//   3. Queries map-service for buildings/features within bounds
//   4. Serialises to parquet via DuckDB (Node bindings)
//   5. Streams parquet bytes directly to client
//   6. Service worker caches the response — no re-download on next visit
//
// CACHE STRATEGY:
//   Server-side: Redis tracks whether a tile has been generated for an H3 cell.
//   Client-side: Service worker caches the response by URL (cache-first).
//   Cache key: h3r4:{h3_cell_r4}:{orgId}
//   The H3 cell bucketing means users within the same ~100km hexagon
//   hit the same cache entry.
//
// ENV:
//   MAP_SERVICE_URL=http://localhost:8080  (dev)
//   MAP_SERVICE_URL=http://map-service.service.consul (prod via Consul)

import { error }              from '@sveltejs/kit'
import type { RequestHandler } from './$types'
import { getStreamClient }    from '$lib/server/redis'
import { MAP_SERVICE_URL }    from '$env/static/private'
import * as duckdb            from '@duckdb/node-bindings'

const CACHE_RES   = 4     // H3 resolution for cache bucketing (~100km hexagon)
const CACHE_TTL_S = 3600  // 1 hour
const VIEWPORT_KM = 15    // km radius to fetch around user
const H3_DATA_RES = 7     // resolution for actual data tiles

export const GET: RequestHandler = async ({ url, locals }) => {
  const { session } = await locals.safeGetSession()
  if (!session) error(401, 'Unauthorised')

  // ── Parse params ────────────────────────────────────────────────────────────
  const lat   = parseFloat(url.searchParams.get('lat')   ?? '')
  const lng   = parseFloat(url.searchParams.get('lng')   ?? '')
  const orgId = url.searchParams.get('orgId') ?? ''

  if (isNaN(lat) || isNaN(lng)) error(400, 'lat and lng are required')
  if (!orgId)                   error(400, 'orgId is required')
  if (lat < -90  || lat > 90)   error(400, 'Invalid latitude')
  if (lng < -180 || lng > 180)  error(400, 'Invalid longitude')

  // ── H3 cache key ────────────────────────────────────────────────────────────
  const { latLngToCell } = await import('h3-js')
  const cacheCell = latLngToCell(lat, lng, CACHE_RES)
  const cacheKey  = `h3r4:${cacheCell}:${orgId}`
  const tmpPath   = `/tmp/tiles_${cacheCell}_${orgId}.parquet`

  // ── Redis cache check ───────────────────────────────────────────────────────
  // If tile was already generated and tmp file still exists — stream it directly
  const redis  = getStreamClient()
  const cached = await redis.get(cacheKey)

  if (cached === 'ready') {
    const { readFile } = await import('fs/promises')
    try {
      const buffer = await readFile(tmpPath)
      return parquetResponse(buffer)
    } catch {
      // Tmp file gone (server restart) — fall through and regenerate
      await redis.del(cacheKey)
    }
  }

  // ── Compute bounding box ────────────────────────────────────────────────────
  const bounds = computeBounds(lat, lng, VIEWPORT_KM)

  // ── Query map-service ───────────────────────────────────────────────────────
  // map-service owns the 100GB building/H3 dataset.
  // Consul resolves MAP_SERVICE_URL in prod — static address in dev.
  let features: unknown[]

  try {
    const res = await fetch(
      `${MAP_SERVICE_URL}/features?` +
      new URLSearchParams({
        min_lat: String(bounds.minLat),
        max_lat: String(bounds.maxLat),
        min_lng: String(bounds.minLng),
        max_lng: String(bounds.maxLng),
        h3_res:  String(H3_DATA_RES),
      }),
      {
        headers: {
          'Accept':    'application/json',
          'X-Service': 'sveltekit-web',
        },
        signal: AbortSignal.timeout(10_000),
      }
    )

    if (!res.ok) {
      console.error('[map/tiles] map-service error:', res.status)
      error(502, 'Map service unavailable')
    }

    features = await res.json()
  } catch (err) {
    console.error('[map/tiles] map-service unreachable:', err)
    error(502, 'Map service unreachable')
  }

  if (!features?.length) {
    // No features in viewport — 204 so service worker doesn't cache a broken tile
    return new Response(null, { status: 204 })
  }

  // ── Generate parquet via DuckDB ─────────────────────────────────────────────
  // Write features to a tmp JSON file first — safer than inline string escaping
  const { writeFile, readFile, unlink } = await import('fs/promises')
  const jsonPath = `${tmpPath}.json`

  try {
    await writeFile(jsonPath, JSON.stringify(features))

    const db   = await duckdb.Database.create(':memory:')
    const conn = await db.connect()

    await conn.run(`INSTALL json; LOAD json; INSTALL parquet; LOAD parquet;`)
    await conn.run(`
      CREATE TABLE features AS SELECT * FROM read_json_auto('${jsonPath}')
    `)
    await conn.run(`
      COPY features TO '${tmpPath}' (FORMAT PARQUET, COMPRESSION SNAPPY)
    `)

    await conn.close()
    await db.close()
    await unlink(jsonPath).catch(() => {})

  } catch (err) {
    console.error('[map/tiles] DuckDB generation failed:', err)
    await unlink(jsonPath).catch(() => {})
    error(500, 'Failed to generate parquet tile')
  }

  // ── Mark ready in Redis ─────────────────────────────────────────────────────
  await redis.set(cacheKey, 'ready', 'EX', CACHE_TTL_S)

  // ── Stream to client ────────────────────────────────────────────────────────
  // Service worker caches this — subsequent visits never hit this route
  const buffer = await readFile(tmpPath)
  return parquetResponse(buffer)
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function parquetResponse(buffer: Buffer): Response {
  return new Response(buffer, {
    headers: {
      'Content-Type':        'application/octet-stream',
      'Content-Length':      String(buffer.byteLength),
      'Cache-Control':       `public, max-age=${CACHE_TTL_S}`,
      'Content-Disposition': 'inline; filename="tile.parquet"',
    },
  })
}

function computeBounds(lat: number, lng: number, radiusKm: number) {
  const latDelta = radiusKm / 111
  const lngDelta = radiusKm / (111 * Math.cos(lat * Math.PI / 180))
  return {
    minLat: lat - latDelta,
    maxLat: lat + latDelta,
    minLng: lng - lngDelta,
    maxLng: lng + lngDelta,
  }
}