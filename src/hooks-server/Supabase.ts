/**
 * src/hooks-server/Supabase.ts
 *
 * Responsibility: create Supabase clients and zero all auth/domain locals.
 *
 * This handle deliberately owns NO session logic. Session resolution has
 * moved to authHandle (Auth.ts) so that the Supabase and internal auth
 * providers both produce the same locals.auth shape downstream.
 *
 * Locals set:    supabase, supabaseServiceRole
 * Locals zeroed: auth, supabaseUserId, userState, activeContext
 *
 * Placement: AFTER cloudflareHttpsFix, BEFORE authHandle.
 */

import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { createClient }                            from '@supabase/supabase-js'
import type { Handle }                             from '@sveltejs/kit'
import {
  PUBLIC_SUPABASE_URL,
  PUBLIC_SUPABASE_ANON_KEY,
} from '$env/static/public'
import { PRIVATE_SUPABASE_SERVICE_ROLE } from '$env/static/private'

export const supabaseHandle: Handle = async ({ event, resolve }) => {
  // ── Zero all auth/domain locals ─────────────────────────────────────────
  // Prevents undefined-access errors in downstream handles on public routes.
  // authHandle is the authoritative writer for event.locals.auth.
  event.locals.auth             = { session: null, user: null, amr: [] }
  event.locals.supabaseUserId   = null
  event.locals.supabaseUserEmail = null
  event.locals.userState        = null
  event.locals.activeContext    = null

  // ── SSR client (user-scoped, cookie-backed) ──────────────────────────────
  event.locals.supabase = createServerClient(
    PUBLIC_SUPABASE_URL,
    PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll: () => event.cookies.getAll(),
        setAll: (
          cookiesToSet: { name: string; value: string; options: CookieOptions }[],
        ) => {
          cookiesToSet.forEach(({ name, value, options }) => {
            event.cookies.set(name, value, { ...options, path: '/' })
          })
        },
      },
    },
  )

  // ── Service-role client (RLS bypass — server-only operations) ───────────
  event.locals.supabaseServiceRole = createClient(
    PUBLIC_SUPABASE_URL,
    PRIVATE_SUPABASE_SERVICE_ROLE,
    {
      auth: {
        autoRefreshToken: false,
        persistSession:   false,
      },
    },
  )

  // Suppress the @supabase/ssr warning about getSession() in server context.
  // We call getUser() (server-validated) in authHandle — the warning is noise.
  if ('suppressGetSessionWarning' in event.locals.supabase.auth) {
    // @ts-expect-error — internal flag, not in public types
    event.locals.supabase.auth.suppressGetSessionWarning = true
  }

  return resolve(event, {
    filterSerializedResponseHeaders: (name) =>
      name === 'content-range' || name === 'x-supabase-api-version',
  })
}
