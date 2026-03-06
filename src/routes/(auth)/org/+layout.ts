// src/routes/(auth)/org/+layout.ts
//
// Top-level org layout.
// Guard: requireAuth → any authenticated user.
//
// This covers:
//   /org/select     — org picker (user has multiple orgs)
//   /org/join-sacco — join an existing organization
//   /org/join-success — confirmation page after joining
//
// No org-specific guard here — the [orgId] sub-layout handles
// that for scoped routes like /org/[orgId]/dashboard.

import type { LayoutLoad } from "./$types"
import { requireAuth } from "$lib/guards/auth.guard"

export const load: LayoutLoad = async (event) => {
  await requireAuth(event)

  const { supabase, session, user } = await event.parent()

  return {
    supabase,
    session,
    user,
  }
}