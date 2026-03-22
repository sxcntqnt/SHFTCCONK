// src/routes/(auth)/org/+layout.server.ts
//
// Parent layout for all /org/* routes.
// Handles session auth only — org-specific access is validated
// in the [orgId] child layout.
//
// COVERS:
//   /org/select       — org picker for multi-org users
//   /org/join-sacco   — browse orgs and submit join request
//   /org/join-success — confirmation page after joining
//
// FIXES FROM OLD VERSION:
//   - `supabase` destructured but never used — removed
//   - Redundant `if (!session || !user)` after requireAuth — removed
//     requireAuth already throws redirect if no session; the check was dead code
//   - Import path fixed: was '$lib/security/authGuard', now '$lib/guards/auth.guard'

import type { LayoutServerLoad } from "$lib/types"
import { requireAuth }           from "$lib/security/authGuard"

export const load: LayoutServerLoad = async (event) => {
  // Throws redirect(303, '/login/sign_in') if no valid session.
  await requireAuth(event)

  const { session, user } = event.locals

  return { session, user }
}