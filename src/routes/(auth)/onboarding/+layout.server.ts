// src/routes/(auth)/onboarding/+layout.server.ts
//
// Onboarding layout server — pass-through only.
// authGuardHandle already validated the session.
// userStateHandle already resolved userState.
//
// Does NOT check profile completeness or actor type — onboarding
// pages handle that step by step.
// Does NOT block guests — guests are WHO this layout serves.

import type { LayoutServerLoad } from "./$types"
import { redirect } from "@sveltejs/kit"

export const load: LayoutServerLoad = async ({ locals }) => {
  // Must be authenticated — authGuardHandle covers this,
  // but we guard against resolution failure explicitly.
  if (!locals.session) {
    throw redirect(303, "/login")
  }

  return {
    userState: locals.userState,
    activeContext: locals.activeContext,
  }
}
