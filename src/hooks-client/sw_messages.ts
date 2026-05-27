/**
 * src/hooks-client/sw-messages.ts
 *
 * Typed event emitter that bridges messages from the service worker to the
 * rest of the client application.
 *
 * Exports:
 *   SWMessage      — discriminated union of all known SW message types
 *   onSWMessage()  — subscribe; returns an unsubscribe function
 *
 * The listener is registered once at module evaluation time.  Safe to import
 * from multiple places — all share the same listener and Set.
 */

import { browser } from '$app/environment'

// ─── types ────────────────────────────────────────────────────────────────────

export type SWMessage =
  | { type: 'PREFETCH_COMPLETE' }
  | { type: 'CACHE_UPDATED';   url: string }
  | { type: 'CACHE_PROGRESS';  progress: number; phase: string }
  | { type: 'CITY_CACHED' }
  | { type: 'SYNC_COMPLETE' }
  | { type: 'BOOTSTRAP_READY'; cityId: string }

type SWMessageHandler = (msg: SWMessage) => void

// ─── singleton listener set ───────────────────────────────────────────────────

const swListeners = new Set<SWMessageHandler>()

if (browser && 'serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('message', (event) => {
    const msg = event.data as SWMessage
    swListeners.forEach((fn) => fn(msg))
  })
}

// ─── public API ───────────────────────────────────────────────────────────────

/**
 * Subscribe to messages from the service worker.
 * Returns an unsubscribe function — call it in onDestroy / useEffect cleanup.
 *
 * @example
 *   const off = onSWMessage((msg) => {
 *     if (msg.type === 'BOOTSTRAP_READY') showMap()
 *   })
 *   onDestroy(off)
 */
export function onSWMessage(handler: SWMessageHandler): () => void {
  swListeners.add(handler)
  return () => swListeners.delete(handler)
}
