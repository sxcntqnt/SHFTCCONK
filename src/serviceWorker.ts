/// <reference types="@sveltejs/kit" />
/// <reference no-default-lib="true"/>
/// <reference lib="esnext" />
/// <reference lib="webworker" />

// src/service-worker.ts
//
// Map service worker — H3-native tile cache + GPS outbox sync.
//
// CACHE STRATEGY:
//   1. Parquet shards      → cache-first (content-addressed, immutable)
//   2. H3 map tiles        → cache-first (keyed by sorted hex set)
//   3. Building tiles      → cache-first (same)
//   4. GPS stream          → never intercepted
//   5. Everything else     → network (let SvelteKit handle it)
//
// MESSAGE PROTOCOL (from main thread → SW):
//   BOOTSTRAP_MANIFEST  — new CityBootstrapManifest; prefetch quadtile parquets
//   PREFETCH_HEXES      — prefetch H3 tile chunks for a viewport
//   CACHE_CITY          — download full city for offline use
//
// BUG FIXED: normalizeHexRequest previously created Request("/map?hexes=...")
// without an origin, which caused the request to resolve to a relative path
// that the SW could not match. Now uses self.location.origin.

import { openDB } from "idb"
import type { CityBootstrapManifest } from "$lib/map/types/MapTypes"

declare const self: ServiceWorkerGlobalScope

// ───────────────────────────────────────────────────────
// CONFIG
// ───────────────────────────────────────────────────────

const CACHE_NAME = "map-h3-v3"           // bump version → evicts old cache
const DB_NAME = "matatu-gps-db"
const STORE_OUTBOX = "gps-outbox"

// Only preload the most critical static asset on install.
// Parquet shards come in via BOOTSTRAP_MANIFEST.
const STATIC_ASSETS: string[] = [
  // "/maps/bootstrap.parquet"  ← removed; covered by manifest now
]

// ───────────────────────────────────────────────────────
// INSTALL / ACTIVATE
// ───────────────────────────────────────────────────────

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) =>
        STATIC_ASSETS.length ? cache.addAll(STATIC_ASSETS) : Promise.resolve(),
      ),
  )
  self.skipWaiting()
})

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)),
        ),
      ),
  )
  self.clients.claim()
})

// ───────────────────────────────────────────────────────
// FETCH
// ───────────────────────────────────────────────────────

self.addEventListener("fetch", (event) => {
  const req = event.request
  if (req.method !== "GET") return

  const url = new URL(req.url)

  // 1. Parquet shards (from CDN or local) — cache-first, immutable
  if (url.pathname.endsWith(".parquet")) {
    event.respondWith(cacheFirst(req))
    return
  }

  // 2. Map tiles (H3-keyed)
  if (url.pathname.includes("/map") && hasHexParams(url)) {
    event.respondWith(cacheFirst(normalizeHexRequest(req, "map")))
    return
  }

  // 3. Building tiles (H3-keyed)
  if (url.pathname.includes("/buildings") && hasHexParams(url)) {
    event.respondWith(cacheFirst(normalizeHexRequest(req, "buildings")))
    return
  }

  // 4. GPS stream — never intercept
  if (url.pathname.includes("/api/gps/stream")) return

  // 5. Everything else — network (SvelteKit handles it)
})

// ───────────────────────────────────────────────────────
// MESSAGE HANDLERS
// ───────────────────────────────────────────────────────

self.addEventListener("message", (event) => {
  const data = event.data
  if (!data?.type) return

  switch (data.type) {
    // NEW: Bootstrap manifest — prefetch all quadtile parquet shards
    case "BOOTSTRAP_MANIFEST":
      event.waitUntil(handleBootstrapManifest(data.manifest))
      break

    // Existing: viewport H3 hex prefetch
    case "PREFETCH_HEXES":
      event.waitUntil(
        prefetchHexes(data.mapHexes || [], data.buildingHexes || []),
      )
      break

    // Existing: full city download for offline use
    case "CACHE_CITY":
      event.waitUntil(
        data.manifest
          ? cacheManifest(data.manifest)
          : cacheCity(data.mapHexes || [], data.buildingHexes || []),
      )
      break
  }
})

// ───────────────────────────────────────────────────────
// BOOTSTRAP MANIFEST HANDLER
//
// Downloads and caches all Parquet shards from the manifest's
// quadtile layer. Priority order: smallest tiles first (inner city).
// ───────────────────────────────────────────────────────

interface QuadTile {
  z: number
  x: number
  y: number
  parquetUrl: string
  estimatedSizeMB: number
}



async function handleBootstrapManifest(
  manifest: CityBootstrapManifest,
): Promise<void> {
  if (!manifest?.tileKeys?.length) return

  const cache = await caches.open(CACHE_NAME)

  // Sort by estimated size ascending — small tiles first for fast initial render
  const sorted = [...manifest.tileKeys].sort(
    (a, b) => a.estimatedSizeMB - b.estimatedSizeMB,
  )

  let completed = 0
  const total = sorted.length

  for (const tile of sorted) {
    try {
      const url = tile.parquetUrl
      if (await cache.match(url)) {
        completed++
        continue // already cached
      }

      const res = await fetch(url)
      if (res.ok) {
        await cache.put(url, res.clone())
        completed++

        notifyClients({
          type: "CACHE_PROGRESS",
          progress: completed / total,
          phase: "parquet",
          cityId: manifest.cityId,
        })
      }
    } catch {
      // Non-fatal — individual tile failure should not abort the batch
    }
  }

  // Also prime the H3 tile cache for the seed cells
  if (manifest.h3Seeds?.cells?.length) {
    await prefetchHexes(manifest.h3Seeds.cells, [])
  }

  notifyClients({
    type: "BOOTSTRAP_READY",
    cityId: manifest.cityId,
  })
}

// ───────────────────────────────────────────────────────
// H3 PREFETCH
// ───────────────────────────────────────────────────────

async function prefetchHexes(
  mapHexes: string[],
  buildingHexes: string[],
): Promise<void> {
  const cache = await caches.open(CACHE_NAME)

  const requests = [
    ...chunkHexes(mapHexes).map((chunk) =>
      normalizeHexRequest(
        new Request(
          `${self.location.origin}/map?hexes=${chunk.join(",")}`,
        ),
        "map",
      ),
    ),
    ...chunkHexes(buildingHexes).map((chunk) =>
      normalizeHexRequest(
        new Request(
          `${self.location.origin}/buildings?hexes=${chunk.join(",")}`,
        ),
        "buildings",
      ),
    ),
  ]

  await Promise.all(
    requests.map(async (req) => {
      if (await cache.match(req)) return // already cached

      try {
        const res = await fetch(req)
        if (res.ok) await cache.put(req, res.clone())
      } catch {
        // Non-fatal
      }
    }),
  )

  notifyClients({ type: "PREFETCH_COMPLETE" })
}

// ───────────────────────────────────────────────────────
// FULL CITY DOWNLOAD (OFFLINE)
// ───────────────────────────────────────────────────────

async function cacheManifest(manifest: CityBootstrapManifest): Promise<void> {
  await handleBootstrapManifest(manifest)
  notifyClients({ type: "CITY_CACHED" })
}

async function cacheCity(
  mapHexes: string[],
  buildingHexes: string[],
): Promise<void> {
  const total = mapHexes.length + buildingHexes.length
  let completed = 0

  for (const chunk of chunkHexes(mapHexes)) {
    await fetchAndCache(
      `${self.location.origin}/map?hexes=${chunk.join(",")}`,
      "map",
    )
    completed += chunk.length
    notifyClients({
      type: "CACHE_PROGRESS",
      progress: completed / total,
      phase: "map",
    })
  }

  for (const chunk of chunkHexes(buildingHexes)) {
    await fetchAndCache(
      `${self.location.origin}/buildings?hexes=${chunk.join(",")}`,
      "buildings",
    )
    completed += chunk.length
    notifyClients({
      type: "CACHE_PROGRESS",
      progress: completed / total,
      phase: "buildings",
    })
  }

  notifyClients({ type: "CITY_CACHED" })
}

// ───────────────────────────────────────────────────────
// BACKGROUND SYNC — GPS OUTBOX
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
        throw new Error(`GPS sync failed: ${res.status}`)
      }
    } catch (err) {
      console.warn("[sw] GPS sync retry failed:", err)
      return // stop — will retry on next sync event
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

async function fetchAndCache(url: string, type: "map" | "buildings"): Promise<void> {
  const cache = await caches.open(CACHE_NAME)
  const req = normalizeHexRequest(new Request(url), type)

  if (await cache.match(req)) return

  try {
    const res = await fetch(req)
    if (res.ok) await cache.put(req, res.clone())
  } catch {
    // Non-fatal
  }
}

// ───────────────────────────────────────────────────────
// NORMALIZATION
//
// BUG FIX: Previously used `new Request(normalized)` where `normalized`
// was a relative path like `/map?hexes=...`. Service workers operate on
// absolute URLs — a relative Request resolves to about:blank or fails
// the cache.match() lookup.
//
// Fix: always use `self.location.origin` to make the URL absolute.
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

  // Canonical form: sorted, trimmed, deduplicated
  hexes = [...new Set(hexes.map((h) => h.trim()).filter(Boolean))].sort()

  // ✅ FIXED: absolute URL using self.location.origin
  const normalized = `${self.location.origin}/${type}?hexes=${hexes.join(",")}`

  return new Request(normalized)
}

function hasHexParams(url: URL): boolean {
  return url.searchParams.has("hex") || url.searchParams.has("hexes")
}

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

async function notifyClients(message: Record<string, unknown>): Promise<void> {
  const clients = await self.clients.matchAll({ includeUncontrolled: true })
  for (const client of clients) {
    client.postMessage(message)
  }
}