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

/**
 * src/hooks-server/MapService.ts
 *
 * Singleton-safe DuckDB + SSE map service bootstrap.
 *
 * DESIGN SHIFT:
 * ❌ BEFORE: request-middleware initialization (race-prone under prerender)
 * ✅ NOW: process-level lazy singleton initialization
 *
 * This module MUST NOT depend on SvelteKit request lifecycle.
 */

import { building } from '$app/environment'
import { createMapService, getMapService } from '$lib/map/index.server'
import { buildMapServiceConfig } from '$lib/map/services/Config.server'

/**
 * Single shared init promise for the entire Node process.
 * Prevents concurrent initialization storms.
 */
let initPromise: Promise<void> | null = null

/**
 * Tracks successful readiness.
 */
let ready = false

/**
 * Core initializer.
 *
 * Safe to call:
 * - multiple times
 * - from request handlers
 * - during SSR
 *
 * Only the first call triggers actual startup.
 */
export async function initMapService(): Promise<void> {
	// ❄️ Never initialize during build/prerender phase
	if (building) return

	// 🚀 Already fully initialized
	if (ready && getMapService()) return

	// 🧠 If initialization is already in progress, reuse it
	if (initPromise) {
		await initPromise
		return
	}

	initPromise = (async () => {
		const existing = getMapService()

		const service =
			existing ?? (await createMapService(buildMapServiceConfig()))

		await service.start()

		ready = true

		console.info('[map-service] initialized successfully')
	})().catch((err) => {
		// 🧹 reset so next request can retry cleanly
		initPromise = null
		ready = false

		console.error('[map-service] initialization failed:', err)

		throw err
	})

	await initPromise
}

/**
 * Optional helper if other modules need direct access safely.
 */
export async function getReadyMapService() {
	await initMapService()
	return getMapService()
}
