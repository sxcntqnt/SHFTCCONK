// src/routes/(auth)/app/+layout.ts
//
// Passenger/Guest/Minor client layout — activates the passenger context store.
//
// LAZY ACTIVATION PATTERN:
//   Server resolved userState in hooks.server.ts.
//   This layout activates the passenger context store from that data.
//   No DB calls — purely client-side store hydration.
//
// TWO STATES HANDLED:
//   GUEST     → context activates, isVerified = false, UI shows join prompt
//   PASSENGER → context activates, isVerified = true, full booking access
//   MINOR     → PASSENGER subtype, isMinor = true, M-PESA GO gates apply
//
// DO NOT redirect GUEST users here — isVerified handles that in UI.
// The guest trap in hooks.server.ts already handled the "no actors at all" case.

import type { LayoutLoad }              from './$types'
import { redirect }                     from '@sveltejs/kit'
import { activatePassengerContext }     from '$lib/features/auth/contexts/passenger.context'

export const load: LayoutLoad = async ({ data }) => {
  if (!data.userState) throw redirect(303, '/login')

  // activatePassengerContext returns false only if user has NO profile
  // at all — not if they are a guest. Guests get a context too.
  if (!activatePassengerContext(data.userState)) {
    throw redirect(303, '/login')
  }

  return {
    ...data,
  }
}