// ======================================================
// MATATU LIVE SERVICE WORKER
// Handles:
// - Map asset caching
// - Offline map datasets
// - Background GPS sync
// - Smart fetch strategies
// ======================================================

import { openDB } from "https://unpkg.com/idb?module";

const CACHE_NAME = "nairobi-transport-v3";

const STATIC_ASSETS = [
  "/",
  "/index.html",
  "/maps/nairobi_h3.parquet"
];

const DB_NAME = "matatu-gps-db";
const STORE_OUTBOX = "gps-outbox";

// ======================================================
// INSTALL
// ======================================================

self.addEventListener("install", (event) => {

  event.waitUntil(

    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(STATIC_ASSETS))

  );

  self.skipWaiting();
});


// ======================================================
// ACTIVATE
// ======================================================

self.addEventListener("activate", (event) => {

  event.waitUntil(

    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    )

  );

  self.clients.claim();
});


// ======================================================
// FETCH ROUTER
// ======================================================

self.addEventListener("fetch", (event) => {

  const req = event.request;

  // Only handle GET requests
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  // ----------------------------------------
  // 1. Heavy datasets (.parquet)
  // Cache-first (avoid huge downloads)
  // ----------------------------------------

  if (url.pathname.endsWith(".parquet")) {

    event.respondWith(cacheFirst(req));
    return;
  }

  // ----------------------------------------
  // 2. Map tiles
  // Stale-while-revalidate
  // ----------------------------------------

  if (url.pathname.includes("/tiles/")) {

    event.respondWith(staleWhileRevalidate(req));
    return;
  }

  // ----------------------------------------
  // 3. API requests
  // Network-first
  // ----------------------------------------

  if (url.pathname.startsWith("/api/")) {

    event.respondWith(networkFirst(req));
    return;
  }

  // ----------------------------------------
  // 4. Default: network-first
  // ----------------------------------------

  event.respondWith(networkFirst(req));
});


// ======================================================
// BACKGROUND SYNC
// ======================================================

self.addEventListener("sync", (event) => {

  if (event.tag === "sync-gps-data") {

    event.waitUntil(flushGpsOutbox());

  }

});


// ======================================================
// FLUSH OUTBOX
// ======================================================

async function flushGpsOutbox() {

  const db = await openDB(DB_NAME, 1);

  const items = await db.getAll(STORE_OUTBOX);

  if (!items.length) return;

  for (const item of items) {

    try {

      const response = await fetch("/api/map/gps-update", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(item)
      });

      if (response.ok) {

        await db.delete(STORE_OUTBOX, item.id);

      } else {

        throw new Error("Server rejected sync");

      }

    } catch (err) {

      console.warn("Sync retry failed:", err);

      // Stop loop if still offline
      return;
    }
  }

  notifyClients({
    type: "SYNC_COMPLETE"
  });
}


// ======================================================
// CACHE STRATEGIES
// ======================================================


// -------------------------------
// Cache First
// -------------------------------

async function cacheFirst(req) {

  const cache = await caches.open(CACHE_NAME);

  const cached = await cache.match(req);

  if (cached) return cached;

  const network = await fetch(req);

  if (network.ok) {

    cache.put(req, network.clone());

    notifyClients({
      type: "CACHE_UPDATED",
      url: req.url
    });

  }

  return network;
}


// -------------------------------
// Network First
// -------------------------------

async function networkFirst(req) {

  const cache = await caches.open(CACHE_NAME);

  try {

    const network = await fetch(req);

    if (network.ok) {

      cache.put(req, network.clone());

    }

    return network;

  } catch (err) {

    const cached = await cache.match(req);

    return cached;
  }
}


// -------------------------------
// Stale While Revalidate
// -------------------------------

async function staleWhileRevalidate(req) {

  const cache = await caches.open(CACHE_NAME);

  const cached = await cache.match(req);

  const networkFetch = fetch(req).then(res => {

    if (res.ok) {

      cache.put(req, res.clone());

      notifyClients({
        type: "CACHE_UPDATED",
        url: req.url
      });

    }

    return res;
  });

  return cached || networkFetch;
}


// ======================================================
// CLIENT MESSAGING
// ======================================================

async function notifyClients(message) {

  const clients = await self.clients.matchAll({
    includeUncontrolled: true
  });

  for (const client of clients) {

    client.postMessage(message);

  }
}