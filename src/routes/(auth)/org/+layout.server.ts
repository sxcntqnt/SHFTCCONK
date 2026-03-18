/**
 * src/routes/(auth)/org/+layout.server.ts
 *
 * FIXES:
 *
 *   BUG 1 — Dead `supabase` variable:
 *     `supabase` was destructured from event.locals but never used.
 *     Removed.
 *
 *   BUG 2 — Redundant double auth check:
 *     requireAuth(event) already throws redirect(303, '/login') if
 *     there is no session — it's the entire purpose of that guard.
 *     The subsequent `if (!session || !user) throw redirect(...)` was
 *     unreachable dead code. Removed.
 *
 * COVERS:
 *   /org/select       — org picker for multi-org users
 *   /org/join-sacco   — browse orgs and submit join request
 *   /org/join-success — confirmation page after joining
 *
 * The [orgId] sub-layout handles its own DB-level access guard
 * for /org/[orgId]/* scoped routes.
 */

import type { LayoutServerLoad } from './$types'
import { requireAuth }           from '$lib/guards/auth.guard'

export const load: LayoutServerLoad = async (event) => {
  // Throws redirect(303, '/login/sign_in') if no session.
  // No need to re-check session after this.
  await requireAuth(event)

  const { session, user } = event.locals

  return {
    session,
    user,
  }
}