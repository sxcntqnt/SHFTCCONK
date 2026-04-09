/// <reference types="@sveltejs/kit" />
/// <reference no-default-lib="true"/>
/// <reference lib="esnext" />
/// <reference lib="webworker" />

import { openDB } from "idb"

declare const self: ServiceWorkerGlobalScope

// ───────────────────────────────────────────────────────
// CONFIG
// ───────────────────────────────────────────────────────

const CACHE_NAME = "map-h3-v2"
const DB_NAME = "matatu-gps-db"
const STORE_OUTBOX = "gps-outbox"

const STATIC_ASSETS = [
  "/maps/bootstrap.parquet"
]

// ───────────────────────────────────────────────────────
// INSTALL / ACTIVATE
// ───────────────────────────────────────────────────────

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  )
  self.skipWaiting()
})

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  )
  self.clients.claim()
})

// ───────────────────────────────────────────────────────
// FETCH (H3-native)
// ───────────────────────────────────────────────────────

self.addEventListener("fetch", (event) => {
  const req = event.request
  if (req.method !== "GET") return

  const url = new URL(req.url)

  // 1. MAP (H3-based)
  if (url.pathname.includes("/map") && hasHexParams(url)) {
    const normalized = normalizeHexRequest(req, "map")
    event.respondWith(cacheFirst(normalized))
    return
  }

  // 2. BUILDINGS (H3-based)
  if (url.pathname.includes("/buildings") && hasHexParams(url)) {
    const normalized = normalizeHexRequest(req, "buildings")
    event.respondWith(cacheFirst(normalized))
    return
  }

  // 3. Ignore streams
  if (url.pathname.includes("/api/gps/stream")) return

  // 4. Let app handle everything else
})

// ───────────────────────────────────────────────────────
// MESSAGE HANDLERS
// ───────────────────────────────────────────────────────

self.addEventListener("message", (event) => {
  const data = event.data
  if (!data) return

  switch (data.type) {
    case "PREFETCH_HEXES":
      event.waitUntil(prefetchHexes(data.mapHexes || [], data.buildingHexes || []))
      break

    case "CACHE_CITY":
      event.waitUntil(cacheCity(data.mapHexes || [], data.buildingHexes || []))
      break
  }
})

// ───────────────────────────────────────────────────────
// PREFETCH (UNIFIED H3)
// ───────────────────────────────────────────────────────

async function prefetchHexes(
  mapHexes: string[],
  buildingHexes: string[]
): Promise<void> {
  const cache = await caches.open(CACHE_NAME)

  const requests = [
    ...chunkHexes(mapHexes).map(h => `/map?hexes=${h.join(",")}`),
    ...chunkHexes(buildingHexes).map(h => `/buildings?hexes=${h.join(",")}`)
  ]

  await Promise.all(
    requests.map(async (url) => {
      const req = normalizeHexRequest(new Request(url), url.includes("/map") ? "map" : "buildings")

      if (!(await cache.match(req))) {
        try {
          const res = await fetch(req)
          if (res.ok) await cache.put(req, res.clone())
        } catch {}
      }
    })
  )

  notifyClients({ type: "PREFETCH_COMPLETE" })
}

// ───────────────────────────────────────────────────────
// OFFLINE CACHE (H3-native)
// ───────────────────────────────────────────────────────

async function cacheCity(
  mapHexes: string[],
  buildingHexes: string[]
): Promise<void> {

  const total = mapHexes.length + buildingHexes.length
  let completed = 0

  // map data
  for (const chunk of chunkHexes(mapHexes)) {
    await fetchAndCache(`/map?hexes=${chunk.join(",")}`)
    completed += chunk.length

    notifyClients({
      type: "CACHE_PROGRESS",
      progress: completed / total,
      phase: "map"
    })
  }

  // buildings
  for (const chunk of chunkHexes(buildingHexes)) {
    await fetchAndCache(`/buildings?hexes=${chunk.join(",")}`)
    completed += chunk.length

    notifyClients({
      type: "CACHE_PROGRESS",
      progress: completed / total,
      phase: "buildings"
    })
  }

  notifyClients({ type: "CITY_CACHED" })
}

// ───────────────────────────────────────────────────────
// BACKGROUND SYNC
// ───────────────────────────────────────────────────────

self.addEventListener("sync", (event: SyncEvent) => {
  if (event.tag === "sync-gps-data") {
    event.waitUntil(flushGpsOutbox())
  }
})

async function flushGpsOutbox(): Promise<void> {
  const db = await openDB(DB_NAME, 1)
  const items = await db.getAll(STORE_OUTBOX)

  for (const item of items) {
    try {
      const res = await fetch("/api/map/gps-update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(item),
      })

      if (res.ok) {
        await db.delete(STORE_OUTBOX, item.id)
      } else {
        throw new Error()
      }
    } catch (err) {
      console.warn("[sw] Sync retry failed:", err)
      return
    }
  }

  notifyClients({ type: "SYNC_COMPLETE" })
}

// ───────────────────────────────────────────────────────
// CACHE HELPERS
// ───────────────────────────────────────────────────────

async function cacheFirst(req: Request): Promise<Response> {
  const cache = await caches.open(CACHE_NAME)
  const cached = await cache.match(req)

  if (cached) return cached

  const res = await fetch(req)

  if (res.ok) {
    cache.put(req, res.clone())
    notifyClients({ type: "CACHE_UPDATED", url: req.url })
  }

  return res
}

async function fetchAndCache(url: string) {
  const cache = await caches.open(CACHE_NAME)
  const req = normalizeHexRequest(new Request(url), url.includes("/map") ? "map" : "buildings")

  if (!(await cache.match(req))) {
    try {
      const res = await fetch(req)
      if (res.ok) await cache.put(req, res.clone())
    } catch {}
  }
}

// ───────────────────────────────────────────────────────
// NORMALIZATION (CRITICAL)
// ───────────────────────────────────────────────────────

function normalizeHexRequest(req: Request, type: "map" | "buildings"): Request {
  const url = new URL(req.url)

  let hexes: string[] = []

  if (url.searchParams.has("hex")) {
    hexes = [url.searchParams.get("hex")!]
  }

  if (url.searchParams.has("hexes")) {
    hexes = url.searchParams.get("hexes")!.split(",")
  }

  // 🔥 canonical form
  hexes = hexes.map(h => h.trim()).filter(Boolean).sort()

  const normalized = `/${type}?hexes=${hexes.join(",")}`

  return new Request(normalized)
}

function hasHexParams(url: URL): boolean {
  return url.searchParams.has("hex") || url.searchParams.has("hexes")
}

// chunking prevents huge requests
function chunkHexes(hexes: string[], size = 30): string[][] {
  const chunks: string[][] = []
  for (let i = 0; i < hexes.length; i += size) {
    chunks.push(hexes.slice(i, i + size))
  }
  return chunks
}

// ───────────────────────────────────────────────────────
// CLIENT MESSAGING
// ───────────────────────────────────────────────────────

async function notifyClients(message: Record<string, unknown>) {
  const clients = await self.clients.matchAll({ includeUncontrolled: true })
  for (const client of clients) {
    client.postMessage(message)
  }
}