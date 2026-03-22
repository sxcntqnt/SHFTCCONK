// src/lib/server/redis.ts
//
// Two Redis-protocol clients, one file, named by role:
//
//   streamClient → General Redis (ioredis)
//                  GPS streams    gps:realtime:{orgId}, gps:batch:{orgId}
//                  Vehicle state  vehicle:{orgId}:{vehicleId}
//                  DLQ            gps:dlq:{orgId}
//                  Metadata cache vehicle_meta:{vehicleId}
//
//   geoClient    → Tile38 geospatial server (Redis protocol)
//                  Geofence eval  WITHIN, INTERSECTS, NEARBY
//                  Fleet tracking SET, GET, SEARCH on fleet collection
//                  Proximity      NEARBY fleet POINT lat lng radius
//
// Both are singletons — one connection reused across all server requests.
// Import the pre-built exports directly; do NOT call getStreamClient()
// or getGeoClient() inside request handlers.
//
// USAGE:
//   import { streamClient, geoClient } from '$lib/server/redis'
//
//   // Write GPS update to hot path stream
//   await streamClient.xadd(
//     `gps:realtime:${orgId}`, '*',
//     'vid', vehicleId, 'la', String(lat), 'lo', String(lng),
//   )
//
//   // Update vehicle position in Tile38
//   await geoClient.call('SET', 'fleet', vehicleId, 'POINT', lat, lng)
//
//   // Geofence containment check
//   await geoClient.call('WITHIN', 'fleet', 'GET', 'geofences', fenceId)
//
// ENV REQUIRED:
//   REDIS_URL        redis://localhost:6379   (or rediss:// for TLS)
//   REDIS_PASSWORD   (optional)
//   TILE38_HOST      localhost
//   TILE38_PORT      9851
//   TILE38_PASSWORD  (optional)
//   TILE38_TLS       false | true

import Redis from "ioredis"
import {
  REDIS_URL,
  REDIS_PASSWORD,
  TILE38_HOST,
  TILE38_PORT,
  TILE38_PASSWORD,
  TILE38_TLS,
} from "$env/static/private"

// ── Global type augmentation ──────────────────────────────────────────────────
// Prevents HMR in development from spawning a new connection on every
// module reload. Production module-level vars are stable, but we use
// the same pattern for consistency.

declare global {
  // eslint-disable-next-line no-var
  var _streamClient: Redis | undefined
  // eslint-disable-next-line no-var
  var _geoClient:    Redis | undefined
}

// ── Factories ─────────────────────────────────────────────────────────────────

function createStreamClient(): Redis {
  const client = new Redis(REDIS_URL ?? "redis://localhost:6379", {
    password:             REDIS_PASSWORD || undefined,
    // 3 retries then throw — GPS consumer's in-memory buffer handles failures
    maxRetriesPerRequest: 3,
    enableReadyCheck:     true,
    lazyConnect:          false,
    // Exponential backoff: 500ms → 1s → 1.5s … max 30s
    retryStrategy: (times) => Math.min(times * 500, 30_000),
  })

  client.on("connect",      () => console.info("[stream] Redis connected"))
  client.on("ready",        () => console.info("[stream] Redis ready"))
  client.on("error",        (err) => console.error("[stream] Redis error:", err.message))
  client.on("close",        () => console.warn("[stream] Redis connection closed"))
  client.on("reconnecting", () => console.warn("[stream] Redis reconnecting…"))

  return client
}

function createGeoClient(): Redis {
  const client = new Redis({
    host:     TILE38_HOST     ?? "localhost",
    port:     Number(TILE38_PORT ?? 9851),
    password: TILE38_PASSWORD || undefined,
    tls:      TILE38_TLS === "true" ? {} : undefined,

    // null = unlimited retries — geofence evaluation has no fallback.
    // A finite count would cause silent drops of safety-critical events.
    maxRetriesPerRequest: null,
    enableReadyCheck:     true,
    lazyConnect:          false,
    // Fast reconnect: geofence queries are latency-sensitive
    // 200ms → 400ms → 600ms … max 2s
    retryStrategy: (times) => Math.min(times * 200, 2_000),
  })

  client.on("connect",      () => console.info("[geo] Tile38 connected"))
  client.on("ready",        () => console.info("[geo] Tile38 ready"))
  client.on("error",        (err) => console.error("[geo] Tile38 error:", err.message))
  client.on("close",        () => console.warn("[geo] Tile38 connection closed"))
  client.on("reconnecting", () => console.warn("[geo] Tile38 reconnecting…"))

  return client
}

// ── Singleton accessors ───────────────────────────────────────────────────────

export function getStreamClient(): Redis {
  if (!global._streamClient) global._streamClient = createStreamClient()
  return global._streamClient
}

export function getGeoClient(): Redis {
  if (!global._geoClient) global._geoClient = createGeoClient()
  return global._geoClient
}

// ── Pre-built singletons ──────────────────────────────────────────────────────
// Prefer these over the accessor functions in most code.

/** GPS streams, vehicle state cache, DLQ, metadata cache */
export const streamClient = getStreamClient()

/** Geofences, proximity queries, fleet position tracking (Tile38) */
export const geoClient = getGeoClient()

// ── Health checks ─────────────────────────────────────────────────────────────

/**
 * Ping both clients. Use in /api/health or startup diagnostics.
 *
 * @example
 *   const health = await checkConnectionHealth()
 *   // { streams: true, geo: true }
 */
export async function checkConnectionHealth(): Promise<{
  streams: boolean
  geo:     boolean
}> {
  const [streamsResult, geoResult] = await Promise.allSettled([
    streamClient.ping(),
    geoClient.ping(),
  ])

  return {
    streams: streamsResult.status === "fulfilled" && streamsResult.value === "PONG",
    geo:     geoResult.status     === "fulfilled" && geoResult.value     === "PONG",
  }
}

/**
 * Gracefully disconnect both clients.
 * Call during server shutdown — not during normal request handling.
 *
 * @example
 *   process.on('SIGTERM', async () => {
 *     await disconnectAll()
 *     process.exit(0)
 *   })
 */
export async function disconnectAll(): Promise<void> {
  await Promise.allSettled([
    streamClient.quit(),
    geoClient.quit(),
  ])
  global._streamClient = undefined
  global._geoClient    = undefined
}