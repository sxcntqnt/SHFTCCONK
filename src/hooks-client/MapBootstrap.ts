/**
 * src/hooks-client/map-bootstrap.ts
 *
 * Map data bootstrap bridge.
 *
 * Reads requestContext from layout data, builds a CityBootstrapManifest, and
 * primes the service worker so Parquet shards are warm before the user hits
 * the map.
 *
 * PIPELINE:
 *   layout data (requestContext)
 *     → BootstrapManifestService.build()
 *     → CityBootstrapManifest
 *     → postMessage(SW, BOOTSTRAP_MANIFEST)
 *     → SW downloads + caches Parquet shards
 *     → SW notifies clients when ready (see sw-messages.ts)
 *
 * WHAT THIS IS NOT:
 *   - Not auth.  requestContext is a request-optimisation hint from CF headers.
 *   - Not a data layer.  That lives in map-service (server-side).
 *   - Not React.  All exports are plain async functions.
 *
 * Exports:
 *   initMapBootstrap()           — call once from +layout.ts
 *   prefetchHexesForViewport()   — call on map moveend
 *   downloadCityForOffline()     — call on explicit user action
 */

import { browser }                    from '$app/environment'
import { bootstrapManifestService }   from '$lib/map'
import type { RequestContext, CityBootstrapManifest } from '$lib/map'

// ─── Nairobi fallback ─────────────────────────────────────────────────────────

/** Used when requestContext is null (SSR timeout, cold miss, etc.) */
const NAIROBI_FALLBACK: RequestContext = {
  country:          'KE',
  city:             'Nairobi',
  ip:               null,
  regionKey:        'KE:Nairobi',
  approxCenter:     { lat: -1.2921, lng: 36.8219 },
  h3SeedResolution: 7,
}

// ─── bootstrap singleton ──────────────────────────────────────────────────────

/** Module-level promise — subsequent calls return the cached result */
let bootstrapPromise: Promise<CityBootstrapManifest | null> | null = null

/**
 * Bootstrap the map data pipeline from the server-resolved requestContext.
 * Safe to call multiple times — subsequent calls return the cached promise.
 *
 * @param requestContext  From data.requestContext in +layout.ts
 * @param zoom            Initial zoom level (default: 12 for city view)
 */
export async function initMapBootstrap(
  requestContext: RequestContext | null,
  zoom = 12,
): Promise<CityBootstrapManifest | null> {
  if (!browser)        return null
  if (bootstrapPromise) return bootstrapPromise

  bootstrapPromise = _doBootstrap(requestContext ?? NAIROBI_FALLBACK, zoom)
  return bootstrapPromise
}

async function _doBootstrap(
  ctx: RequestContext,
  zoom: number,
): Promise<CityBootstrapManifest | null> {
  try {
    const manifest = bootstrapManifestService.build(ctx, { zoom })
    await primeServiceWorker(manifest)
    return manifest
  } catch (err) {
    console.error('[mapBootstrap] Failed:', err)
    return null
  }
}

// ─── service worker bridge ────────────────────────────────────────────────────

/**
 * Send the manifest to the service worker for background Parquet prefetch.
 * Falls back gracefully when SW is not registered or not supported.
 */
async function primeServiceWorker(manifest: CityBootstrapManifest): Promise<void> {
  if (!('serviceWorker' in navigator)) return

  try {
    const registration = await navigator.serviceWorker.ready
    if (!registration.active) return

    registration.active.postMessage({
      type:          'BOOTSTRAP_MANIFEST',
      manifest,
      // Backward compat: also send hex arrays for the existing PREFETCH_HEXES handler
      mapHexes:      manifest.h3Seeds.cells,
      buildingHexes: [], // separate layer — not yet in dataset
    })
  } catch (err) {
    console.warn('[mapBootstrap] SW prime failed (non-fatal):', err)
  }
}

/**
 * Send updated hex sets to the SW when the user pans the map.
 * Call this from MapView on moveend events.
 */
export function prefetchHexesForViewport(
  mapHexes:      string[],
  buildingHexes: string[] = [],
): void {
  if (!browser || !('serviceWorker' in navigator)) return

  navigator.serviceWorker.ready
    .then((reg) => {
      reg.active?.postMessage({ type: 'PREFETCH_HEXES', mapHexes, buildingHexes })
    })
    .catch(() => { /* SW not ready — silently skip */ })
}

/**
 * Trigger full city download for offline use.
 * Call explicitly on user action (e.g. "Download Nairobi for offline").
 */
export function downloadCityForOffline(manifest: CityBootstrapManifest): void {
  if (!browser || !('serviceWorker' in navigator)) return

  navigator.serviceWorker.ready
    .then((reg) => {
      reg.active?.postMessage({
        type:          'CACHE_CITY',
        manifest,
        mapHexes:      manifest.h3Seeds.cells,
        buildingHexes: [],
      })
    })
    .catch(() => {})
}
