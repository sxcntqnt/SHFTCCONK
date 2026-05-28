/**
 * src/hooks-server/AuthGuard.ts
 *
 * Responsibility: session existence check + route protection.
 *
 * Reads ONLY from event.locals.auth (written by authHandle).
 * Makes NO domain decisions — those belong to userStateHandle.
 * Knows nothing about location, request context, or auth providers.
 *
 * Protected page prefixes → redirect to /login/sign_in?next=<path>
 * Protected API prefixes  → 401 JSON response
 *
 * Placement: AFTER sessionSyncHandle (locals.auth is guaranteed populated),
 *            BEFORE userStateHandle (no point resolving state for guests).
 */

import { redirect, type Handle } from '@sveltejs/kit'
import { env }                   from '$env/dynamic/private'
import { authProvider }          from './AuthProvider'

// ─── route config ─────────────────────────────────────────────────────────────

const PROTECTED_PAGE_PREFIXES = [
  '/admin',
  '/app',
  '/crew',
  '/onboarding',
  '/operator',
  '/org',
] as const

// ─── handle ───────────────────────────────────────────────────────────────────

export const authGuardHandle: Handle = async ({ event, resolve }) => {
  const { pathname } = event.url

  const isProtectedPage = PROTECTED_PAGE_PREFIXES.some((p) => pathname.startsWith(p))
  const isProtectedApi  = pathname.startsWith('/api')

  if (isProtectedPage || isProtectedApi) {
    const { session, user } = event.locals.auth  // ← unified source; no more safeGetSession()

    if (!session || !user) {
      // Clear provider cookies on auth failure
      if ('clearCookies' in authProvider) {
        ;(authProvider as any).clearCookies(event)
      } else {
        await event.locals.supabase.auth.signOut()
      }

      if (isProtectedApi) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status:  401,
          headers: { 'Content-Type': 'application/json' },
        })
      }

      const loginUrl = new URL('/login/sign_in', event.url.origin)
      loginUrl.searchParams.set('next', event.url.pathname + event.url.search)
      throw redirect(303, loginUrl.toString())
    }
  }

  return resolve(event)
}
