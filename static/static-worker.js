/* 
  Combined & Enhanced Service Worker (sw.js)
  - Best of both originals:
    • Rich static pre-caching (HTML + heavy Parquet) from v1
    • Background GPS sync + IDB outbox from v2
    • Unified cache name + clean strategies
  - NEW: Buildings layer caching by client’s own H3 hex
    • Any request containing "/buildings" in path OR ?hex=... param
    • Uses Cache-First at the exact hex the client requests
    • Reasonable resolution is handled client-side (fewer unique hexes = fewer fetches)
    • Once a hex’s buildings are fetched, they are served instantly forever (until cache is cleared)
*/
import { openDB } from 'https://unpkg.com/idb?module';

const CACHE_NAME = "nairobi-transport-v2";
const STATIC_ASSETS = [
  "/",
  "/index.html",
  "/maps/nairobi_h3.parquet"   // core map data – never re-download
];

// ====================== LIFECYCLE ======================
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// ====================== FETCH ======================
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // 1. Heavy static Parquet map data → Cache First
  if (url.pathname.endsWith(".parquet")) {
    event.respondWith(cacheFirst(event.request));
    return;
  }

  // 2. Buildings layer (by client’s own hex) → Cache First
  //    Prevents re-fetching the same hex multiple times
  //    Works whether you use /buildings?hex=8a2... or /api/buildings/8a2...
  if (url.pathname.includes("/buildings") || url.searchParams.has("hex")) {
    event.respondWith(cacheFirst(event.request));
    return;
  }

  // 3. Map tiles → Stale-While-Revalidate (fast UI, background update)
  if (url.pathname.includes("/tiles/")) {
    event.respondWith(staleWhileRevalidate(event.request));
    return;
  }

  // 4. Everything else (API calls, etc.) → Network First
  event.respondWith(networkFirst(event.request));
});

// ====================== BACKGROUND SYNC (GPS) ======================
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-gps-data') {
    event.waitUntil(flushGpsOutbox());
  }
});

async function flushGpsOutbox() {
  const db = await openDB("matatu-gps-db", 1);
  const outbox = await db.getAll("gps-outbox");

  for (const item of outbox) {
    try {
      const response = await fetch('/api/map/gps-update', {
        method: 'POST',
        body: JSON.stringify(item),
        headers: { 'Content-Type': 'application/json' }
      });
      if (response.ok) {
        await db.delete("gps-outbox", item.id);
      }
    } catch (err) {
      console.error("Sync retry failed:", err);
      break; // network still down → stop
    }
  }
}

// ====================== STRATEGIES ======================
async function cacheFirst(req) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(req);

  if (cached) return cached;

  // Not in cache → fetch and store (only successful responses)
  return fetch(req).then(res => {
    if (res.ok) {
      cache.put(req, res.clone());
    }
    return res;
  });
}

async function networkFirst(req) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const fresh = await fetch(req);
    if (fresh.ok) {
      cache.put(req, fresh.clone());
    }
    return fresh;
  } catch (e) {
    // Offline → fall back to cache
    return cache.match(req);
  }
}

async function staleWhileRevalidate(req) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(req);

  // Background update
  const networkFetch = fetch(req).then(res => {
    if (res.ok) {
      cache.put(req, res.clone());
    }
    return res;
  });

  // Return cached immediately if we have it, otherwise wait for network
  return cached || networkFetch;
}
