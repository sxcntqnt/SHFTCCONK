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
// Connections are LAZY — created on first access, not at import time.
// This prevents build-time crashes when env vars are not yet available.
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
//   UPSTASH_REDIS_REST_URL    redis://localhost:6379   (or rediss:// for TLS)
//   UPSTASH_REDIS_REST_TOKEN  (optional)
//   TILE38_HOST               localhost
//   TILE38_PORT               9851
//   TILE38_PASSWORD           (optional)
//   TILE38_TLS                false | true

import Redis from "ioredis"

// ── Global type augmentation ──────────────────────────────────────────────────
// Prevents HMR in development from spawning a new connection on every
// module reload. Production module-level vars are stable, but we use
// the same pattern for consistency.

declare global {
  // eslint-disable-next-line no-var
  var _streamClient: Redis | undefined
  // eslint-disable-next-line no-var
  var _geoClient: Redis | undefined
}

// ── Factories ─────────────────────────────────────────────────────────────────
// Called lazily — env vars are read inside the function, not at module scope.
// This means the module can be imported during build/SSR analysis without
// crashing even if UPSTASH_REDIS_REST_URL etc. are not set.

function createStreamClient(): Redis {
  // Read env inside the function — not at module load time
  const { UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN } = process.env

  if (!UPSTASH_REDIS_REST_URL) {
    throw new Error("[stream] UPSTASH_REDIS_REST_URL is not defined")
  }

  const client = new Redis(UPSTASH_REDIS_REST_URL, {
    password: UPSTASH_REDIS_REST_TOKEN || undefined,
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
    lazyConnect: false,
    retryStrategy: (times) => Math.min(times * 500, 30_000),
  })

  client.on("connect", () => console.info("[stream] Redis connected"))
  client.on("ready", () => console.info("[stream] Redis ready"))
  client.on("error", (err) =>
    console.error("[stream] Redis error:", err.message),
  )
  client.on("close", () => console.warn("[stream] Redis connection closed"))
  client.on("reconnecting", () => console.warn("[stream] Redis reconnecting…"))

  return client
}

function createGeoClient(): Redis {
  const { TILE38_HOST, TILE38_PORT, TILE38_PASSWORD, TILE38_TLS } = process.env

  if (!TILE38_HOST) {
    throw new Error("[geo] TILE38_HOST is not defined")
  }

  const client = new Redis({
    host: TILE38_HOST,
    port: Number(TILE38_PORT ?? 9851),
    password: TILE38_PASSWORD || undefined,
    tls: TILE38_TLS === "true" ? {} : undefined,
    maxRetriesPerRequest: null,
    enableReadyCheck: true,
    lazyConnect: false,
    retryStrategy: (times) => Math.min(times * 200, 2_000),
  })

  client.on("connect", () => console.info("[geo] Tile38 connected"))
  client.on("ready", () => console.info("[geo] Tile38 ready"))
  client.on("error", (err) => console.error("[geo] Tile38 error:", err.message))
  client.on("close", () => console.warn("[geo] Tile38 connection closed"))
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

// ── Lazy singleton exports ────────────────────────────────────────────────────
// These look like plain object properties but actually create the connection
// on first access via a getter. The module can be imported freely without
// triggering a connection — the connection is deferred until first use.

export const clients = {
  get stream(): Redis {
    return getStreamClient()
  },
  get geo(): Redis {
    return getGeoClient()
  },
}

// Convenience destructurable aliases — still lazy.
// Usage: import { streamClient, geoClient } from '$lib/server/redis'
//
// The Proxy ensures `streamClient.xadd(...)` calls are forwarded to the
// underlying ioredis instance without eagerly constructing it.

export const streamClient = new Proxy({} as Redis, {
  get(_target, prop) {
    return (getStreamClient() as any)[prop]
  },
})

export const geoClient = new Proxy({} as Redis, {
  get(_target, prop) {
    return (getGeoClient() as any)[prop]
  },
})

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
  geo: boolean
}> {
  const [streamsResult, geoResult] = await Promise.allSettled([
    getStreamClient().ping(),
    getGeoClient().ping(),
  ])

  return {
    streams:
      streamsResult.status === "fulfilled" && streamsResult.value === "PONG",
    geo: geoResult.status === "fulfilled" && geoResult.value === "PONG",
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
    global._streamClient?.quit(),
    global._geoClient?.quit(),
  ])
  global._streamClient = undefined
  global._geoClient = undefined
}
