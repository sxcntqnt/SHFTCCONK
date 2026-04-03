// ======================================================
// MATATU LIVE GPS CLIENT
// Handles:
// - Service Worker lifecycle
// - WebSocket GPS stream
// - IndexedDB offline storage
// - Background sync queue
// ======================================================

import { openDB } from "https://unpkg.com/idb?module";

const WS_ENDPOINT = "wss://api.matatu.live/gps";
const API_ENDPOINT = "/api/map/gps-update";

const DB_NAME = "matatu-gps-db";
const DB_VERSION = 1;

const STORE_LOCATIONS = "locations"; // current vehicle positions
const STORE_OUTBOX = "gps-outbox"; // offline sync queue

// ======================================================
// IndexedDB Initialization
// ======================================================

const dbPromise = openDB(DB_NAME, DB_VERSION, {
upgrade(db) {

    if (!db.objectStoreNames.contains(STORE_LOCATIONS)) {
      db.createObjectStore(STORE_LOCATIONS, {
        keyPath: "vehicleId"
      });
    }

    if (!db.objectStoreNames.contains(STORE_OUTBOX)) {
      db.createObjectStore(STORE_OUTBOX, {
        keyPath: "id",
        autoIncrement: true
      });
    }

}
});

// ======================================================
// Service Worker Registration
// ======================================================

async function registerServiceWorker() {

if (!("serviceWorker" in navigator)) return;

try {

    const reg = await navigator.serviceWorker.register("/sw.js");

    console.log("Service Worker ready:", reg.scope);

    navigator.serviceWorker.addEventListener("message", (event) => {

      if (event.data?.type === "CACHE_UPDATED") {
        console.log("New map data available. Refresh recommended.");
      }

      if (event.data?.type === "SYNC_COMPLETE") {
        console.log("Offline GPS queue synced.");
      }

    });

} catch (err) {
console.error("Service Worker registration failed:", err);
}
}

// ======================================================
// WebSocket GPS Stream
// ======================================================

let socket;

function connectSocket() {

socket = new WebSocket(WS_ENDPOINT);

socket.onopen = () => {
console.log("GPS WebSocket connected");
};

socket.onmessage = async (event) => {

    const data = JSON.parse(event.data);

    // --------------------------------
    // Update map UI
    // --------------------------------

    if (typeof updateVehicle === "function") {
      updateVehicle(data);
    }

    // --------------------------------
    // Persist vehicle location
    // --------------------------------

    try {

      const db = await dbPromise;
      await db.put(STORE_LOCATIONS, data);

    } catch (err) {
      console.warn("Failed to store location:", err);
    }

    // --------------------------------
    // Attempt upstream sync
    // --------------------------------

    await sendGPSUpdate(data);

};

socket.onerror = (err) => {
console.error("WebSocket error:", err);
};

socket.onclose = () => {

    console.warn("WebSocket disconnected. Reconnecting...");

    setTimeout(connectSocket, 3000);

};
}

// ======================================================
// Send GPS Update (Online / Offline Queue)
// ======================================================

async function sendGPSUpdate(data) {

try {

    const response = await fetch(API_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });

    if (!response.ok) throw new Error("Server error");

} catch (err) {

    console.warn("Offline detected. Queuing GPS update.");

    const db = await dbPromise;

    await db.add(STORE_OUTBOX, data);

    try {

      const reg = await navigator.serviceWorker.ready;

      if ("sync" in reg) {
        await reg.sync.register("sync-gps-data");
      }

    } catch (syncErr) {
      console.warn("Background sync unavailable:", syncErr);
    }

}
}

// ======================================================
// Restore Cached Vehicles (Offline Map Load)
// ======================================================

async function restoreVehiclesFromCache() {

try {

    const db = await dbPromise;

    const vehicles = await db.getAll(STORE_LOCATIONS);

    vehicles.forEach(vehicle => {

      if (typeof updateVehicle === "function") {
        updateVehicle(vehicle);
      }

    });

} catch (err) {
console.warn("Failed to restore cached vehicles:", err);
}
}

// ======================================================
// App Bootstrap
// ======================================================

window.addEventListener("load", async () => {

await registerServiceWorker();

await restoreVehiclesFromCache();

connectSocket();

});

GPS Device
│
▼
WebSocket Stream
│
▼
app.js
├─ Update Map UI
├─ Cache vehicle location (IndexedDB)
└─ Try API POST
│
▼
If Offline
│
▼
gps-outbox queue
│
▼
Service Worker
Background Sync
│
▼
Server API

function connectStream(orgId: string) {
const source = new EventSource(`/api/gps/stream?orgId=${orgId}`)

source.onmessage = async (event) => {
const data = JSON.parse(event.data)
updateVehicle(data)
await cacheLocation(data)
await sendGPSUpdate(data) // your outbox logic
}

source.onerror = () => {
// EventSource reconnects automatically — no setTimeout needed
console.warn('SSE disconnected, browser will reconnect...')
}
}

// ❌ CDN import won't work in your bundled SvelteKit app
import { openDB } from "https://unpkg.com/idb?module"

// ✅ Use the package you already have installed
import { openDB } from "idb"
