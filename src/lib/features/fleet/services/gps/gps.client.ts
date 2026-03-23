// src/lib/features/fleet/gps.client.ts
//
// GPS client — runs in the browser only.
// Connects to the SSE stream, caches positions in IndexedDB,
// queues offline updates, and feeds the fleet store.
//
// USAGE (in tracking +page.svelte onMount):
//   import { initGpsClient, destroyGpsClient } from '$lib/features/fleet/gps.client'
//
//   onMount(() => {
//     initGpsClient(orgId, (update) => fleetStore.updateVehicle(update))
//     return () => destroyGpsClient()
//   })

import { openDB, type IDBPDatabase } from 'idb'
import { browser } from '$app/environment'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface GpsUpdate {
  vehicleId:   string
  lat:         number
  lng:         number
  speed?:      number
  heading?:    number
  accuracy?:   number
  timestamp:   string
  orgId:       string
  metadata?:   Record<string, unknown>
}

export interface OutboxItem extends GpsUpdate {
  id?: number  // autoincrement key
}

// ── Constants ─────────────────────────────────────────────────────────────────

const DB_NAME         = 'matatu-gps-db'
const DB_VERSION      = 1
const STORE_LOCATIONS = 'locations'  // current vehicle positions
const STORE_OUTBOX    = 'gps-outbox' // offline sync queue

const API_ENDPOINT    = '/api/map/gps-update'
const SSE_ENDPOINT    = (orgId: string) => `/api/gps/stream?orgId=${orgId}`

// ── Module state ──────────────────────────────────────────────────────────────

let eventSource: EventSource | null = null
let db:          IDBPDatabase | null = null

// ── DB init ───────────────────────────────────────────────────────────────────

async function getDb(): Promise<IDBPDatabase> {
  if (db) return db

  db = await openDB(DB_NAME, DB_VERSION, {
    upgrade(database) {
      if (!database.objectStoreNames.contains(STORE_LOCATIONS)) {
        database.createObjectStore(STORE_LOCATIONS, { keyPath: 'vehicleId' })
      }
      if (!database.objectStoreNames.contains(STORE_OUTBOX)) {
        database.createObjectStore(STORE_OUTBOX, {
          keyPath:       'id',
          autoIncrement: true,
        })
      }
    },
  })

  return db
}

// ── Cache helpers ─────────────────────────────────────────────────────────────

async function cacheLocation(update: GpsUpdate): Promise<void> {
  try {
    const database = await getDb()
    await database.put(STORE_LOCATIONS, update)
  } catch (err) {
    console.warn('[gps] Failed to cache location:', err)
  }
}

export async function getCachedLocations(): Promise<GpsUpdate[]> {
  try {
    const database = await getDb()
    return await database.getAll(STORE_LOCATIONS)
  } catch {
    return []
  }
}

// ── Outbox ────────────────────────────────────────────────────────────────────

async function queueForSync(update: GpsUpdate): Promise<void> {
  try {
    const database = await getDb()
    await database.add(STORE_OUTBOX, update)

    // Request background sync if available
    const reg = await navigator.serviceWorker?.ready
    if (reg && 'sync' in reg) {
      await (reg as any).sync.register('sync-gps-data')
    }
  } catch (err) {
    console.warn('[gps] Failed to queue for sync:', err)
  }
}

async function sendUpdate(update: GpsUpdate): Promise<void> {
  try {
    const res = await fetch(API_ENDPOINT, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(update),
    })
    if (!res.ok) throw new Error(`Server error: ${res.status}`)
  } catch {
    console.warn('[gps] Offline — queuing update')
    await queueForSync(update)
  }
}

// ── SSE connection ────────────────────────────────────────────────────────────

/**
 * Connect to the GPS SSE stream for an org.
 * Calls onUpdate for each incoming position fix.
 * EventSource reconnects automatically on disconnect.
 */
export function connectGpsStream(
  orgId:    string,
  onUpdate: (update: GpsUpdate) => void,
): void {
  if (!browser) return
  if (eventSource) eventSource.close()

  eventSource = new EventSource(SSE_ENDPOINT(orgId))

  eventSource.onopen = () => {
    console.info('[gps] SSE stream connected')
  }

  eventSource.onmessage = async (event) => {
    try {
      const update: GpsUpdate = JSON.parse(event.data)

      // 1. Push to fleet store (map UI)
      onUpdate(update)

      // 2. Persist to IndexedDB
      await cacheLocation(update)

      // 3. Forward to server (or queue if offline)
      await sendUpdate(update)
    } catch (err) {
      console.warn('[gps] Failed to process update:', err)
    }
  }

  eventSource.onerror = () => {
    // EventSource reconnects automatically — no manual retry needed
    console.warn('[gps] SSE error — browser will reconnect')
  }
}

export function disconnectGpsStream(): void {
  if (eventSource) {
    eventSource.close()
    eventSource = null
    console.info('[gps] SSE stream disconnected')
  }
}

// ── Restore from cache (offline map load) ─────────────────────────────────────

/**
 * Restore last-known vehicle positions from IndexedDB.
 * Call on page mount before the SSE stream connects
 * so the map isn't blank while waiting for first SSE event.
 */
export async function restoreFromCache(
  onUpdate: (update: GpsUpdate) => void,
): Promise<void> {
  const vehicles = await getCachedLocations()
  vehicles.forEach(onUpdate)
  console.info(`[gps] Restored ${vehicles.length} cached positions`)
}

// ── Full init / destroy (convenience wrappers) ────────────────────────────────

/**
 * Full GPS client bootstrap:
 *   1. Restore cached positions immediately (instant map load)
 *   2. Connect SSE stream for live updates
 *
 * @example
 *   onMount(() => {
 *     initGpsClient(orgId, (update) => fleetStore.updateVehicle(update))
 *     return () => destroyGpsClient()
 *   })
 */
export async function initGpsClient(
  orgId:    string,
  onUpdate: (update: GpsUpdate) => void,
): Promise<void> {
  await restoreFromCache(onUpdate)
  connectGpsStream(orgId, onUpdate)
}

export function destroyGpsClient(): void {
  disconnectGpsStream()
}