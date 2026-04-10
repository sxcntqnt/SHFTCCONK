// src/routes/(auth)/app/settings/+layout.server.ts
//
// Settings layout — profile, preferences, notifications.
// Accessible to ALL authenticated users regardless of role.
// Lives under /app/* because /app is the universal authenticated base.
//
// Does NOT require a specific actor type — a crew member, operator,
// or passenger all manage their own settings here.
//
// Profile completeness check happens here — incomplete profiles
// are sent to create_profile before they can edit settings.

import { redirect } from "@sveltejs/kit"
import type { LayoutServerLoad } from "./$types"
import { _hasFullProfile } from "$lib/features/profile/profile.service"

export const load: LayoutServerLoad = async ({ locals, url }) => {
  const { userState, user } = locals

  if (!userState || !user) throw redirect(303, "/login")

  // Profile must be complete before editing settings
  if (!_hasFullProfile(userState.profile)) {
    const returnTo = encodeURIComponent(url.pathname + url.search)
    const intent =
      ((userState.profile as any).kyc_intent as string | null) ?? "passenger"
    throw redirect(303, `/onboarding/${intent}/create_profile?next=${returnTo}`)
  }

  return {
    userState,
    activeContext: locals.activeContext,
    profile: userState.profile,
  }
}
