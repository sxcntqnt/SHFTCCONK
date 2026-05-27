/**
 * src/hooks-server/SessionSync.ts
 *
 * Responsibility: sync internal auth user → Supabase users row.
 *
 * Only active when AUTH_PROVIDER=internal. Finds or creates the Supabase
 * row that corresponds to the validated internal user, then stores its UUID
 * in event.locals.supabaseUserId. All profile queries and RLS policies
 * anchor on this UUID.
 *
 * HARD FAIL on protected routes: returns 503 rather than letting the request
 * proceed with a null supabaseUserId, which would cause confusing downstream
 * failures in resolveUserState.
 *
 * Placement: AFTER authHandle (needs locals.auth.user),
 *            BEFORE authGuardHandle (sync failure should surface before route check).
 */

import type { Handle } from '@sveltejs/kit'
import { env }         from '$env/dynamic/private'
import { getOrCreateSupabaseUser } from '$lib/features/auth/services/sync'

const PROTECTED_PREFIXES = ['/admin', '/app', '/crew', '/onboarding', '/operator', '/org']

export const sessionSyncHandle: Handle = async ({ event, resolve }) => {
  // No-op for the Supabase provider — user.id is already the Supabase UUID
  if (env.AUTH_PROVIDER !== 'internal') return resolve(event)

  const user = event.locals.auth.user
  if (!user) return resolve(event)  // unauthenticated — skip

  const result = await getOrCreateSupabaseUser(
    event.locals.supabaseServiceRole,
    user.id,    // internalUserId from auth provider
    user.email,
  )

  if (result.supabaseUserId === null) {
    console.error(
      '[hooks:sessionSyncHandle] Failed to sync user:',
      user.id,
      result.error?.message,
    )

    const { pathname } = event.url
    const isProtected  = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p))
                      || pathname.startsWith('/api')

    if (isProtected) {
      return new Response(
        JSON.stringify({ error: 'Session sync failed. Please try again.' }),
        { status: 503, headers: { 'Content-Type': 'application/json' } },
      )
    }

    return resolve(event)  // public route — continue without supabaseUserId
  }

  event.locals.supabaseUserId = result.supabaseUserId

  if (result.created) {
    console.info(
      '[hooks:sessionSyncHandle] New Supabase user created:',
      result.supabaseUserId,
      '← internal:',
      user.id,
    )
  }

  return resolve(event)
}
