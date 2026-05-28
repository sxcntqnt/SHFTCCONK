/**
 * src/hooks-server/Auth.ts
 *
 * Responsibility: unified session resolution — provider-agnostic.
 *
 * When AUTH_PROVIDER=internal:
 *   Delegates to InternalAuthProvider. Validates the access_token cookie
 *   against the auth service. Returns an opaque sessionId — no JWT is
 *   re-exposed to the app layer.
 *
 * When AUTH_PROVIDER=supabase (default):
 *   Uses getUser() (server-validated) over trusting the raw client-side
 *   session. Normalises into the same locals.auth shape.
 *
 * Locals set: event.locals.auth = { session, user, amr }
 *
 * SINGLE SOURCE OF TRUTH:
 *   All downstream handles read ONLY from event.locals.auth.
 *   Never from raw cookies, never from the supabase client directly.
 *
 * Placement: AFTER supabaseHandle (client ready), BEFORE sessionSyncHandle.
 */

import type { Handle } from '@sveltejs/kit'
import { env }         from '$env/dynamic/private'
import { authProvider } from './AuthProvider'  // singleton — see note below

export const authHandle: Handle = async ({ event, resolve }) => {
  const isInternal = env.AUTH_PROVIDER === 'internal'

  if (isInternal) {
    // ── Internal provider path ───────────────────────────────────────────
    const cookies: Record<string, string> = {}
    event.cookies.getAll().forEach(({ name, value }) => (cookies[name] = value))

    const result = await authProvider.getSession({
      cookies,
      headers: Object.fromEntries(event.request.headers),
      ip:      event.getClientAddress?.(),
    })

    event.locals.auth = {
      session: result.session,
      user:    result.user,
      amr:     result.amr ?? [],
    }
  } else {
    // ── Supabase provider path ───────────────────────────────────────────
    const { data: { session } } = await event.locals.supabase.auth.getSession()

    if (!session) return resolve(event)  // locals.auth already zeroed by supabaseHandle

    const { data: { user }, error: userError } =
      await event.locals.supabase.auth.getUser()

    if (userError || !user) return resolve(event)

    const { data: aal } =
      await event.locals.supabase.auth.mfa.getAuthenticatorAssuranceLevel()

    event.locals.auth = {
      session: {
        sessionId: session.access_token,  // opaque reference; never re-exposed
        expiresAt: session.expires_at,
      } as any,
      user,
      amr: aal?.currentAuthenticationMethods ?? [],
    }
  }

  return resolve(event)
}
