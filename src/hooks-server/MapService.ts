/**
 * src/hooks/map-service.ts
 *
 * Initialises the DuckDB + SSE map service exactly once across the lifetime
 * of the process.  Uses a module-level promise so concurrent cold-boot
 * requests all await the same init rather than racing to spin up multiple
 * DuckDB connections.
 *
 * On failure the promise is cleared so the next request retries — avoids a
 * permanently broken singleton after a transient startup error (e.g. DuckDB
 * file locked during a rolling deploy).
 *
 * Placement: AFTER locationHandle (requestContext is ready),
 *            BEFORE posthogProxy + supabaseHandle (no auth dependency).
 */

import { building }                                from '$app/environment'
import type { Handle }                             from '@sveltejs/kit'
import { createMapService, getMapService }         from '$lib/map/index.server'
import { buildMapServiceConfig }                   from '$lib/map/services/Config.server'

// ─── singleton state ──────────────────────────────────────────────────────────

let mapServiceReady       = false
let mapServiceInitPromise: Promise<void> | null = null

// ─── handle ───────────────────────────────────────────────────────────────────

export const mapServiceHandle: Handle = async ({ event, resolve }) => {
  if (!building && !mapServiceReady) {
    if (!mapServiceInitPromise) {
      mapServiceInitPromise = (async () => {
        let service = getMapService()

        if (!service) {
          service = await createMapService(buildMapServiceConfig())
        }

        await service.start()

        mapServiceReady = true
        console.info('[map-service] started successfully')
      })().catch((err) => {
        // Clear the promise so the next request retries
        mapServiceInitPromise = null
        console.error('[map-service] startup failed:', err)
        throw err
      })
    }

    await mapServiceInitPromise
  }

  return resolve(event)
}
