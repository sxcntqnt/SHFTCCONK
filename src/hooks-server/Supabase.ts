/**
 * src/hooks/supabase.ts
 *
 * Creates the per-request Supabase SSR client and service-role client, then
 * attaches a safeGetSession helper that validates the JWT server-side via
 * getUser() rather than trusting the client-controlled session object.
 *
 * Also null-initialises all auth-related locals so downstream handles never
 * encounter `undefined` on public routes:
 *   session, user, userState, activeContext → null
 *
 * Note: requestContext is already set by locationHandle before this runs.
 *
 * Placement: AFTER posthogProxy (which short-circuits /ingest routes),
 *            BEFORE authGuardHandle + userStateHandle.
 */

import type { Handle }                      from '@sveltejs/kit'
import type { Session, User }               from '@supabase/supabase-js'
import type { AuthenticatorAssuranceLevelEntry } from '@supabase/supabase-js'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { createClient }                     from '@supabase/supabase-js'
import {
  PUBLIC_SUPABASE_URL,
  PUBLIC_SUPABASE_ANON_KEY,
} from '$env/static/public'
import { PRIVATE_SUPABASE_SERVICE_ROLE }    from '$env/static/private'

// ─── types ────────────────────────────────────────────────────────────────────

export type SafeSessionResult = {
  session: Session | null
  user:    User    | null
  amr:     AuthenticatorAssuranceLevelEntry[] | null
}

// ─── handle ───────────────────────────────────────────────────────────────────

export const supabaseHandle: Handle = async ({ event, resolve }) => {
  // Null-initialise all auth locals — prevents `undefined` on public routes
  event.locals.session      = null
  event.locals.user         = null
  event.locals.userState    = null
  event.locals.activeContext = null
  // Note: requestContext already set by locationHandle

  // ── per-request SSR client (cookie-backed, user-scoped) ─────────────────
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

  // ── service-role client (admin ops, no user context) ─────────────────────
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

  // Suppress the internal warning about calling getSession() server-side —
  // we always follow up with getUser() for real validation.
  if ('suppressGetSessionWarning' in event.locals.supabase.auth) {
    // @ts-expect-error — internal Supabase flag
    event.locals.supabase.auth.suppressGetSessionWarning = true
  }

  // ── safeGetSession — validates JWT server-side ──────────────────────────
  event.locals.safeGetSession = async (): Promise<SafeSessionResult> => {
    const { data: { session } } = await event.locals.supabase.auth.getSession()
    if (!session) return { session: null, user: null, amr: null }

    const { data: { user }, error } = await event.locals.supabase.auth.getUser()
    if (error || !user) return { session: null, user: null, amr: null }

    const { data: aal } =
      await event.locals.supabase.auth.mfa.getAuthenticatorAssuranceLevel()

    return {
      session,
      user,
      amr: aal?.currentAuthenticationMethods ?? null,
    }
  }

  return resolve(event, {
    filterSerializedResponseHeaders: (name) =>
      name === 'content-range' || name === 'x-supabase-api-version',
  })
}
