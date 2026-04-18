// src/hooks.client.ts
//
// Client-side SvelteKit hooks + map bootstrap wiring.
//
// RESPONSIBILITIES:
//   1. Lazy-init Sentry + PostHog (fire-and-forget, non-blocking)
//   2. Unified client error handler
//   3. Map bootstrap bridge — reads requestContext from layout data,
//      builds a CityBootstrapManifest, primes the service worker
//
// WHAT THIS FILE IS NOT:
//   - Not React. The React useState/useEffect stubs have been removed.
//   - Not auth. requestContext is a request optimization hint.
//   - Not a data layer. That lives in map-service.

import type { HandleClientError } from "@sveltejs/kit"
import { browser } from "$app/environment"
import { PUBLIC_POSTHOG_KEY } from "$env/static/public"
import { bootstrapManifestService } from "$lib/map"
import type { RequestContext, CityBootstrapManifest } from "$lib/map"

/* ============================================================
   LAZY SINGLETONS
============================================================ */

let posthogClient: any = null
let sentryReady = false

/* ============================================================
   POSTHOG LAZY INIT
============================================================ */

async function getPosthog() {
  if (!browser) return null
  if (posthogClient) return posthogClient

  try {
    const mod = await import("posthog-js")
    const posthog = mod.default

    posthog.init(PUBLIC_POSTHOG_KEY, {
      api_host: "/ingest",
      ui_host: "https://eu.posthog.com",
      defaults: "2026-01-30",
      capture_exceptions: false,
    })

    posthogClient = posthog
    return posthog
  } catch (err) {
    console.error("PostHog failed to load:", err)
    return null
  }
}

/* ============================================================
   SENTRY LAZY INIT
============================================================ */

async function initSentry() {
  if (!browser || sentryReady) return

  try {
    const Sentry = await import("@sentry/sveltekit")

    Sentry.init({
      dsn: "https://939d30ef131c9c0d5ead2c2364017ae0@o4510964210073600.ingest.de.sentry.io/4510964215054416",
      tracesSampleRate: 0.2,
      enableLogs: true,
      sendDefaultPii: false,
    })

    sentryReady = true
  } catch (err) {
    console.error("Sentry failed to init:", err)
  }
}

/* ============================================================
   EAGER BUT SAFE BOOTSTRAP (NON-BLOCKING)
============================================================ */

if (browser) {
  initSentry()
  getPosthog()
}

/* ============================================================
   UNIFIED ERROR HANDLER
============================================================ */

export const handleError: HandleClientError = async ({
  error,
  status,
  message,
}) => {
  try {
    if (!sentryReady) await initSentry()
    const Sentry = await import("@sentry/sveltekit")
    Sentry.captureException(error)
  } catch (e) {
    console.error("Sentry capture failed:", e)
  }

  try {
    const posthog = await getPosthog()
    posthog?.captureException?.(error)
  } catch (e) {
    console.error("PostHog capture failed:", e)
  }

  return {
    message:
      error instanceof Error
        ? error.message
        : (message ?? "Unexpected client error"),
    status,
  }
}

/* ============================================================
   MAP BOOTSTRAP BRIDGE

   Called from +layout.ts once requestContext is available.
   Builds a CityBootstrapManifest and primes the service worker
   so Parquet shards are warm before the user hits the map.

   PIPELINE:
     layout data (requestContext)
       → BootstrapManifestService.build()
       → CityBootstrapManifest
       → postMessage(SW, BOOTSTRAP_MANIFEST)
       → SW downloads + caches Parquet shards
       → SW notifies clients when ready
============================================================ */

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
  if (!browser) return null
  if (bootstrapPromise) return bootstrapPromise

  bootstrapPromise = _doBootstrap(requestContext, zoom)
  return bootstrapPromise
}

async function _doBootstrap(
  requestContext: RequestContext | null,
  zoom: number,
): Promise<CityBootstrapManifest | null> {
  try {
    // Build the manifest — uses CF geo headers as seed, falls back to Nairobi
    const ctx = requestContext ?? {
      country: "KE",
      city: "Nairobi",
      ip: null,
      regionKey: "KE:Nairobi",
      approxCenter: { lat: -1.2921, lng: 36.8219 },
      h3SeedResolution: 7,
    }

    const manifest = bootstrapManifestService.build(ctx, { zoom })

    // Prime the service worker with the manifest
    // SW will download Parquet shards in the background
    await primeServiceWorker(manifest)

    return manifest
  } catch (err) {
    console.error("[mapBootstrap] Failed:", err)
    return null
  }
}

/**
 * Send the manifest to the service worker for background prefetch.
 * Falls back gracefully if SW is not registered or not supported.
 */
async function primeServiceWorker(
  manifest: CityBootstrapManifest,
): Promise<void> {
  if (!("serviceWorker" in navigator)) return

  try {
    const registration = await navigator.serviceWorker.ready
    if (!registration.active) return

    // Convert manifest to the SW message format
    // SW handles: BOOTSTRAP_MANIFEST → downloads quadtile parquet shards
    registration.active.postMessage({
      type: "BOOTSTRAP_MANIFEST",
      manifest,
      // Backward compat: also send hex arrays for the existing PREFETCH_HEXES handler
      mapHexes: manifest.h3Seeds.cells,
      buildingHexes: [], // separate layer — not yet in dataset
    })
  } catch (err) {
    console.warn("[mapBootstrap] SW prime failed (non-fatal):", err)
  }
}

/**
 * Send updated hex sets to the SW when the user pans the map.
 * Called from MapView on moveend events.
 */
export function prefetchHexesForViewport(
  mapHexes: string[],
  buildingHexes: string[] = [],
): void {
  if (!browser || !("serviceWorker" in navigator)) return

  navigator.serviceWorker.ready
    .then((reg) => {
      reg.active?.postMessage({
        type: "PREFETCH_HEXES",
        mapHexes,
        buildingHexes,
      })
    })
    .catch(() => {
      // SW not ready — silently skip
    })
}

/**
 * Trigger full city download for offline use.
 * Called explicitly by the user (e.g. "Download Nairobi for offline").
 */
export function downloadCityForOffline(
  manifest: CityBootstrapManifest,
): void {
  if (!browser || !("serviceWorker" in navigator)) return

  navigator.serviceWorker.ready
    .then((reg) => {
      reg.active?.postMessage({
        type: "CACHE_CITY",
        manifest,
        mapHexes: manifest.h3Seeds.cells,
        buildingHexes: [],
      })
    })
    .catch(() => {})
}

/* ============================================================
   SW MESSAGE LISTENER

   Listens for messages back from the service worker and
   exposes them as a typed event emitter.
============================================================ */

export type SWMessage =
  | { type: "PREFETCH_COMPLETE" }
  | { type: "CACHE_UPDATED"; url: string }
  | { type: "CACHE_PROGRESS"; progress: number; phase: string }
  | { type: "CITY_CACHED" }
  | { type: "SYNC_COMPLETE" }
  | { type: "BOOTSTRAP_READY"; cityId: string }

type SWMessageHandler = (msg: SWMessage) => void

const swListeners = new Set<SWMessageHandler>()

if (browser && "serviceWorker" in navigator) {
  navigator.serviceWorker.addEventListener("message", (event) => {
    const msg = event.data as SWMessage
    swListeners.forEach((fn) => fn(msg))
  })
}

export function onSWMessage(handler: SWMessageHandler): () => void {
  swListeners.add(handler)
  return () => swListeners.delete(handler)
}