// src/routes/(auth)/app/+layout.ts
//
// Main application layout.
// Guard: requireAuth → any authenticated user can access.
// This is the passenger/default section: map, chat, feed, routes,
// settings, bookings, weather, etc.
//
// No actor type restriction — passengers, regulators, planners,
// and even admins can use the main app. Individual pages gate
// features via permissions if needed (e.g. geofences might need
// a specific permission).

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