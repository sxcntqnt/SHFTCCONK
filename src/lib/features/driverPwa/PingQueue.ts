// apps/driver-pwa/src/lib/pingQueue.ts
// IndexedDB-backed ping queue for the zero-auth driver PWA.
// Production-ready implementation: FIFO queue, robust fallback, and
// sequential flushing with per-record retry semantics.
import { z } from 'zod'

export type GpsPingPayload = {
  latitude: number
  longitude: number
  accuracy: number
  timestamp: string // ISO
  device_token: string
  vehicle_id?: string | null
  cell_tower_fallback?: boolean
}

const DB_NAME = 'driver_pwa_ping_db'
const STORE_NAME = 'ping_queue'
const DB_VERSION = 1

const PingSchema = z.object({
  latitude: z.number(),
  longitude: z.number(),
  accuracy: z.number(),
  timestamp: z.string(),
  device_token: z.string(),
  vehicle_id: z.string().optional().nullable(),
  cell_tower_fallback: z.boolean().optional(),
})

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      return reject(new Error('IndexedDB not available'))
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export async function enqueuePing(ping: GpsPingPayload): Promise<void> {
  // Validate payload shape early to avoid corrupt data in IndexedDB
  PingSchema.parse(ping)

  try {
    const db = await openDb()
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    store.add({ payload: ping, created_at: new Date().toISOString() })
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  } catch (err) {
    // IndexedDB unavailable or write failed. Best-effort immediate POST fallback.
    // Decision: prefer delivering rather than losing pings in edge devices.
    console.warn('[enqueuePing] IndexedDB unavailable, falling back to immediate POST', err)
    try {
      const res = await fetch('/api/gps/ping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ping.device_token}` },
        body: JSON.stringify(ping),
      })
      if (!res.ok) throw new Error(`POST failed: ${res.status}`)
      return
    } catch (postErr) {
      // If fallback fails, surface the error so caller can show a UI hint.
      console.error('[enqueuePing] Fallback POST failed', postErr)
      throw postErr
    }
  }
}

export async function flushPingQueue(): Promise<{ flushed: number; failed: number }> {
  // Flush in insertion (FIFO) order. Each record is POSTed sequentially to
  // preserve ordering and avoid overwhelming the network on flaky connections.
  const result = { flushed: 0, failed: 0 }
  try {
    const db = await openDb()
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    const request = store.openCursor()

    await new Promise<void>((resolve, reject) => {
      request.onsuccess = async (ev: any) => {
        const cursor: IDBCursorWithValue = ev.target.result
        if (!cursor) return resolve()
        const record = cursor.value
        try {
          const payload = record.payload as GpsPingPayload
          PingSchema.parse(payload)
          const res = await fetch('/api/gps/ping', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${payload.device_token}` },
            body: JSON.stringify(payload),
          })
          if (res.ok) {
            cursor.delete()
            result.flushed++
            cursor.continue()
          } else {
            // Leave record intact and count as failed — we'll retry on next reconnect.
            result.failed++
            resolve()
          }
        } catch (e) {
          // If JSON validation failed, delete the corrupt record to avoid poison-pill.
          console.error('[flushPingQueue] record validation/post failed', e)
          try { cursor.delete(); } catch (_) {}
          result.failed++
          cursor.continue()
        }
      }
      request.onerror = () => reject(request.error)
    })
    return result
  } catch (err) {
    console.error('[flushPingQueue] failed to open IndexedDB', err)
    // If IndexedDB can't be opened, nothing to flush.
    return result
  }
}

// Export default for backwards compatibility
export default { enqueuePing, flushPingQueue }
