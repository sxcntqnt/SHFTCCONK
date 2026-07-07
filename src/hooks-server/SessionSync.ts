/**
 * src/hooks-server/SessionSync.ts
 *
 * Responsibility: resolve the Postgres profile_id for the already-verified
 * auth-service identity. This is a data-layer lookup, NOT authentication —
 * authHandle has already established locals.auth.user by this point using
 * auth-service's own session verification (opaque token, /auth/verify or
 * local session check). This hook never determines whether someone is
 * logged in; it only resolves which Postgres row represents them.
 *
 * DELIBERATE CHANGE FROM THE OLD VERSION:
 *   The old sessionSyncHandle hard-failed with a 503 on ANY sync failure,
 *   on the theory that a missing supabaseUserId was unrecoverable for
 *   downstream code. That coupling is exactly what we're removing —
 *   auth-service's session is valid independently of Postgres, so a
 *   profile-resolution failure should degrade the request, not kill it.
 *   locals.profileId is null on failure; routes/load functions that
 *   genuinely require Postgres data decide for themselves whether to
 *   fail (with a clear message) or render a degraded view.
 *
 * Placement: AFTER authHandle (needs locals.auth.user),
 *            BEFORE authGuardHandle.
 */
import type { Handle } from '@sveltejs/kit'
import { env }         from '$env/dynamic/private'
import { resolveProfileId } from '$lib/features/auth/services/sync'

export const sessionSyncHandle: Handle = async ({ event, resolve }) => {
  // No-op for the Supabase provider — that path is being phased out
  // separately; this hook only applies to AUTH_PROVIDER=internal.
  if (env.AUTH_PROVIDER !== 'internal') return resolve(event)

  const user = event.locals.auth.user
  if (!user) return resolve(event)  // unauthenticated — skip

  const result = await resolveProfileId(user.id)

  if (result.profileId === null) {
    // Postgres-side resolution failed — log for visibility, but do NOT
    // block the request. The user's auth-service session is still valid;
    // locals.profileId stays null and downstream code (load functions,
    // route handlers) is responsible for handling that explicitly —
    // e.g. rendering a "some features unavailable right now" state
    // rather than assuming profileId is always present.
    console.error(
      '[hooks:sessionSyncHandle] Profile resolution failed for user:',
      user.id,
      result.error.message,
    )
    return resolve(event)
  }

  event.locals.profileId = result.profileId

  if (result.created) {
    console.info(
      '[hooks:sessionSyncHandle] New profile created:',
      result.profileId,
      '← internal:',
      user.id,
    )
  }

  return resolve(event)
}
