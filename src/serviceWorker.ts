// src/service-worker.ts
/// <reference types="@sveltejs/kit" />
/// <reference no-default-lib="true"/>
/// <reference lib="esnext" />
/// <reference lib="webworker" />

import { openDB } from "idb"

declare const self: ServiceWorkerGlobalScope

const CACHE_NAME = "matatu-duckdb-v1"
const DB_NAME = "matatu-gps-db"
const STORE_OUTBOX = "gps-outbox"

// Only cache heavy DuckDB/parquet datasets — not app assets
const DUCKDB_ASSETS = ["/maps/nairobi_h3.parquet", "/maps/routes.parquet"]

// ── Install — cache parquet files ─────────────────────────────────────────────

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(DUCKDB_ASSETS)),
  )
  self.skipWaiting()
})

// ── Activate — clean old parquet caches ───────────────────────────────────────

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key)),
        ),
      ),
  )
  self.clients.claim()
})

// ── Fetch — only intercept parquet and tile requests ─────────────────────────

self.addEventListener("fetch", (event) => {
  const req = event.request
  if (req.method !== "GET") return

  const url = new URL(req.url)

  // Parquet datasets — cache-first (avoid re-downloading 100MB+ files)
  if (url.pathname.endsWith(".parquet")) {
    event.respondWith(cacheFirst(req))
    return
  }

  // Map tiles — stale-while-revalidate
  if (url.pathname.includes("/tiles/")) {
    event.respondWith(staleWhileRevalidate(req))
    return
  }

  // SSE stream — never intercept, let browser handle natively
  if (url.pathname.includes("/api/gps/stream")) return

  // Everything else — don't intercept, SvelteKit handles it
})

// ── Background sync — flush GPS outbox ───────────────────────────────────────

self.addEventListener("sync", (event: SyncEvent) => {
  if (event.tag === "sync-gps-data") {
    event.waitUntil(flushGpsOutbox())
  }
})

async function flushGpsOutbox(): Promise<void> {
  const db = await openDB(DB_NAME, 1)
  const items = await db.getAll(STORE_OUTBOX)
  if (!items.length) return

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
        throw new Error(`Server rejected: ${res.status}`)
      }
    } catch (err) {
      console.warn("[sw] Sync retry failed:", err)
      return // still offline — stop and retry on next sync event
    }
  }

  notifyClients({ type: "SYNC_COMPLETE" })
}

// ── Cache strategies ──────────────────────────────────────────────────────────

async function cacheFirst(req: Request): Promise<Response> {
  const cache = await caches.open(CACHE_NAME)
  const cached = await cache.match(req)
  if (cached) return cached

  const network = await fetch(req)
  if (network.ok) {
    cache.put(req, network.clone())
    notifyClients({ type: "CACHE_UPDATED", url: req.url })
  }
  return network
}

async function staleWhileRevalidate(req: Request): Promise<Response> {
  const cache = await caches.open(CACHE_NAME)
  const cached = await cache.match(req)

  const networkFetch = fetch(req).then((res) => {
    if (res.ok) cache.put(req, res.clone())
    return res
  })

  return cached ?? networkFetch
}

async function notifyClients(message: Record<string, unknown>): Promise<void> {
  const clients = await self.clients.matchAll({ includeUncontrolled: true })
  for (const client of clients) client.postMessage(message)
}
