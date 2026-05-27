/**
 * src/hooks.client.ts
 *
 * Client-side SvelteKit hooks — composition only.
 * All implementations live in src/hooks-client/*.
 *
 * Module inventory:
 *   analytics      — PostHog + Sentry lazy singletons
 *   map-bootstrap  — requestContext → manifest → SW prime pipeline
 *   sw-messages    — typed SW → client event emitter
 *   csrf-client    — double-submit token reader + csrfFetch wrapper
 */

import type { HandleClientError } from '@sveltejs/kit'
import { browser }                from '$app/environment'
import { initSentry, getPosthog } from './hooks-client/analytics'

// ─── eager but non-blocking init ─────────────────────────────────────────────
// Fire-and-forget on browser mount.  Neither call blocks rendering.

if (browser) {
  initSentry()
  getPosthog()
}

// ─── unified error handler ────────────────────────────────────────────────────

export const handleError: HandleClientError = async ({ error, status, message }) => {
  // Ensure Sentry is ready — it may not have finished lazy-loading yet
  try {
    await initSentry()
    const Sentry = await import('@sentry/sveltekit')
    Sentry.captureException(error)
  } catch (e) {
    console.error('[hooks.client] Sentry capture failed:', e)
  }

  try {
    const posthog = await getPosthog()
    posthog?.captureException?.(error)
  } catch (e) {
    console.error('[hooks.client] PostHog capture failed:', e)
  }

  return {
    message: error instanceof Error
      ? error.message
      : (message ?? 'Unexpected client error'),
    status,
  }
}

// ─── re-export public surface ─────────────────────────────────────────────────
// Consumers import from here rather than reaching into hooks-client directly.

export {
  initMapBootstrap,
  prefetchHexesForViewport,
  downloadCityForOffline,
} from './hooks-client/map-bootstrap'

export { onSWMessage }    from './hooks-client/sw-messages'
export type { SWMessage } from './hooks-client/sw-messages'

export { getCsrfToken, withCsrfHeader, csrfFetch } from './hooks-client/csrf-client'
