// src/routes/(auth)/onboarding/+layout.ts
//
// Onboarding layout.
// Guard: requireAuth → must be logged in, but profile can be incomplete.
// This is the new user setup flow — called after first login or
// invite acceptance when the user has no profile/actor yet.
//
// Does NOT check profile completeness or actor type — that's the
// whole point of onboarding. The onboarding pages themselves
// handle step-by-step profile creation and actor selection.

import type { LayoutLoad } from "./$types"
import { requireAuth } from "$lib/security/authGuard"

export const load: LayoutLoad = async (event) => {
  await requireAuth(event)

  const { supabase, session, user } = await event.parent()

  return {
    supabase,
    session,
    user,
  }
}