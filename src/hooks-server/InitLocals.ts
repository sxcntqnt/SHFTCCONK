/**
 * src/hooks-server/InitLocals.ts
 *
 * Responsibility: zero all auth/domain locals before authHandle runs.
 *
 * Supabase has been fully removed. Identity is established by authHandle
 * (auth-service, opaque tokens) → locals.auth. Database access — including
 * everything Supabase RPC/PostgREST used to cover — goes through Neon via
 * pg.ts's withProfileContext(profileId).
 *
 * This handle owns NO session logic and creates NO clients. Its only job
 * is to guarantee downstream handles never read an undefined local on
 * routes that run before the rest of the pipeline (e.g. early CF errors).
 *
 * Locals zeroed:     auth, profileId, userState, activeContext
 * Locals preserved:  requestContext (already populated by locationHandle,
 *                     which runs before this handle — never overwrite it here)
 *
 * Placement: AFTER cloudflareHttpsFix, BEFORE authHandle.
 */

import type { Handle } from '@sveltejs/kit'

export const initLocalsHandle: Handle = async ({ event, resolve }) => {
  event.locals.auth          = { session: null, user: null, amr: [] }
  event.locals.profileId     = null
  event.locals.userState     = null
  event.locals.activeContext = null

  return resolve(event)
}
