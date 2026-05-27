/**
 * src/hooks-client/analytics.ts
 *
 * Lazy, fire-and-forget initialisation of PostHog and Sentry.
 * Both are dynamically imported so they never block the critical path.
 *
 * Exports:
 *   initSentry()  — idempotent, safe to call multiple times
 *   getPosthog()  — returns the live client or null on failure
 *
 * Called eagerly from hooks.client.ts on browser mount, and defensively
 * from handleError to ensure Sentry is ready before capture.
 */

import { browser }               from '$app/environment'
import { PUBLIC_POSTHOG_KEY }    from '$env/static/public'

// ─── singletons ───────────────────────────────────────────────────────────────

let posthogClient: any  = null
let sentryReady         = false

// ─── posthog ──────────────────────────────────────────────────────────────────

export async function getPosthog(): Promise<any | null> {
  if (!browser)        return null
  if (posthogClient)   return posthogClient

  try {
    const mod    = await import('posthog-js')
    const posthog = mod.default

    posthog.init(PUBLIC_POSTHOG_KEY, {
      api_host:           '/ingest',
      ui_host:            'https://eu.posthog.com',
      defaults:           '2026-01-30',
      capture_exceptions: false,
    })

    posthogClient = posthog
    return posthog
  } catch (err) {
    console.error('[analytics] PostHog failed to load:', err)
    return null
  }
}

// ─── sentry ───────────────────────────────────────────────────────────────────

export async function initSentry(): Promise<void> {
  if (!browser || sentryReady) return

  try {
    const Sentry = await import('@sentry/sveltekit')

    Sentry.init({
      dsn:              'https://939d30ef131c9c0d5ead2c2364017ae0@o4510964210073600.ingest.de.sentry.io/4510964215054416',
      tracesSampleRate: 0.2,
      enableLogs:       true,
      sendDefaultPii:   false,
    })

    sentryReady = true
  } catch (err) {
    console.error('[analytics] Sentry failed to init:', err)
  }
}

/** Whether Sentry has been successfully initialised in this session */
export const isSentryReady = () => sentryReady
