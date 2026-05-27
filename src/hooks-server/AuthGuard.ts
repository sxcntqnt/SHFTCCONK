/**
 * src/hooks/auth-guard.ts
 *
 * Responsibility: session existence check + route protection.
 *
 * This handle does ONE thing — it checks whether a valid session exists and
 * redirects/rejects unauthenticated requests to protected paths.  It makes
 * NO domain decisions (those belong to userStateHandle) and knows nothing
 * about location or request context.
 *
 * Protected page prefixes → redirect to /login/sign_in?next=<path>
 * Protected API prefixes  → 401 JSON response
 *
 * Placement: AFTER supabaseHandle (safeGetSession is available),
 *            BEFORE userStateHandle (no point resolving state for guests).
 */

import { redirect, type Handle } from '@sveltejs/kit'

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

  const isProtectedPage = PROTECTED_PAGE_PREFIXES.some((p) =>
    pathname.startsWith(p),
  )
  const isProtectedApi = pathname.startsWith('/api')

  if (isProtectedPage || isProtectedApi) {
    const { session, user } = await event.locals.safeGetSession()

    if (!session || !user) {
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

    event.locals.session = session
    event.locals.user    = user
  }

  return resolve(event)
}
