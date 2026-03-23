// src/lib/features/fleet/gps.client.ts
// Lightweight SSE consumer — connects to the stream,
// calls onUpdate for each position fix, nothing else.

import { browser } from '$app/environment'

export interface GpsUpdate {
  vehicleId: string
  lat:       number
  lng:       number
  speed?:    number
  heading?:  number
  timestamp: string
  orgId:     string
}

const SSE_ENDPOINT = (orgId: string) => `/api/ingest/stream?orgId=${orgId}`

let eventSource: EventSource | null = null

export function connectGpsStream(
  orgId:    string,
  onUpdate: (update: GpsUpdate) => void,
): void {
  if (!browser) return
  if (eventSource) eventSource.close()

  eventSource = new EventSource(SSE_ENDPOINT(orgId))

  eventSource.onopen = () => {
    console.info('[gps] SSE connected')
  }

  eventSource.onmessage = (event) => {
    try {
      const update: GpsUpdate = JSON.parse(event.data)
      onUpdate(update)
    } catch (err) {
      console.warn('[gps] Failed to parse update:', err)
    }
  }

  eventSource.onerror = () => {
    // EventSource reconnects automatically
    console.warn('[gps] SSE error — browser will reconnect')
  }
}

export function disconnectGpsStream(): void {
  if (eventSource) {
    eventSource.close()
    eventSource = null
    console.info('[gps] SSE disconnected')
  }
}

// Convenience wrappers matching the map page's onMount pattern
export function initGpsClient(
  orgId:    string,
  onUpdate: (update: GpsUpdate) => void,
): void {
  connectGpsStream(orgId, onUpdate)
}

export function destroyGpsClient(): void {
  disconnectGpsStream()
}
