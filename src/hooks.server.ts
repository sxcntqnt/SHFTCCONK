/**
 * src/hooks.server.ts
 *
 * SvelteKit server hooks — composition only.
 * All handle implementations live in src/hooks-server/*.
 *
 * Pipeline order (each step depends on the ones above it):
 *
 *   1. Sentry            — error reporting + distributed tracing (must be first)
 *   2. cloudflareHttpsFix — http→https rewrite behind CF proxy
 *   3. locationHandle    — geo seed from CF headers → requestContext [NOT auth]
 *   4. posthogProxy      — /ingest reverse proxy (short-circuits early)
 *   5. initLocalsHandle  — zeros all auth/domain locals (no clients — Supabase removed)
 *   6. authHandle        — unified session resolution → locals.auth
 *   7. sessionSyncHandle — resolves locals.profileId, RLS's only trusted
 *                          identity (see pg.ts's withProfileContext)
 *   8. csrfHandle        — double-submit token issue + verify, session-bound
 *   9. authGuardHandle   — session check → redirect/401
 *  10. userStateHandle   — domain resolution, KYC traps, context activation
 *
 * NOTE — map service is NOT in this pipeline:
 *   initMapService() / getReadyMapService() (see MapService.ts) is a
 *   process-level lazy singleton, called directly from wherever map data
 *   is first needed (e.g. a load function), not from a request hook. This
 *   is a deliberate design shift away from request-middleware init, which
 *   was race-prone under prerender. Do not add it to sequence(...) below.
 *
 * WHY CSRF SITS AFTER authHandle:
 *   getSessionId reads event.locals.auth.user directly — one server-validated
 *   auth-service check per request. CSRF still fires before authGuardHandle,
 *   so it covers every state-mutating request including unauthenticated ones
 *   (login form POSTs, etc.).
 */

import * as Sentry                from '@sentry/sveltekit'
import { sequence }               from '@sveltejs/kit/hooks'
import type { HandleServerError } from '@sveltejs/kit'
import { CSRF_SECRET }            from '$env/static/private'
import { getPostHogClient }       from '$lib/server/posthog'

import {
  cloudflareHttpsFix,
  locationHandle,
  posthogProxy,
  initLocalsHandle,
  authHandle,
  sessionSyncHandle,
  createCsrfHandle,
  authGuardHandle,
  userStateHandle,
  requestLogger,
} from './hooks-server'

// ─── csrf handle ──────────────────────────────────────────────────────────────

const csrfHandle = createCsrfHandle({
  secret: CSRF_SECRET,

  // Lock down the Origin header in production.
  // An empty array disables origin validation — useful during local dev where
  // the origin may vary (localhost:5173, previews, etc.).
  allowedOrigins: process.env.NODE_ENV === 'production'
    ? [process.env.PUBLIC_SITE_URL ?? ''].filter(Boolean)
    : [],

  // Bind each token to the authenticated user's id.
  // authHandle runs before this so event.locals.auth is already populated —
  // no second lookup needed.
  // Returns undefined for unauthenticated requests — token is still issued
  // and verified, just without user binding.
  getSessionId: async (event) => event.locals.auth.user?.id,

  tokenTtlMs: 2 * 60 * 60 * 1_000, // 2 hours — matches typical session length
})

// ─── composed handle ──────────────────────────────────────────────────────────

export const handle = sequence(
  Sentry.sentryHandle(),
  requestLogger,
  cloudflareHttpsFix,
  locationHandle,
  posthogProxy,
  initLocalsHandle,   // zeros all auth locals — no clients created
  authHandle,         // → locals.auth
  sessionSyncHandle,  // → locals.profileId
  csrfHandle,         // after authHandle (locals.auth ready), before authGuard
  authGuardHandle,
  userStateHandle,
)

// ─── global error handler ─────────────────────────────────────────────────────

export const handleError: HandleServerError = Sentry.handleErrorWithSentry(
  async ({ error, status, message }) => {
    const posthog = getPostHogClient()

    posthog.capture({
      distinctId: 'server',
      event:      'server_error',
      properties: {
        error:   error instanceof Error ? error.message : String(error),
        status,
        message,
        stack:   error instanceof Error ? error.stack : undefined,
      },
    })

    return { message, status }
  },
)
