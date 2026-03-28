// src/routes/(auth)/app/+layout.server.ts
//
// Passenger/Guest/Minor route layout — the default authenticated shell.
//
// MIGRATION FROM sessionStore:
//   No requireAuth() call needed — authGuardHandle already redirected
//   unauthenticated users to /login before this runs.
//   userState is resolved by userStateHandle in hooks.server.ts.
//
// GATE:
//   Loosest gate in the system — any user with a resolved userState
//   can access /app. GUEST actors are allowed through here because
//   the passenger context handles the verified vs unverified UI split.
//   The guest trap in userStateHandle already redirected users with
//   NO actors at all to /onboarding — so userState.isGuest here means
//   "has a GUEST actor" not "has nothing".
//
// RESPONSIBILITY:
//   1. Gate — redirect if userState is missing entirely
//   2. Forward — userState + activeContext to child routes
//   No domain data fetched here — pages fetch their own data.

import type { LayoutServerLoad } from './$types'
import { redirect }              from '@sveltejs/kit'

export const load: LayoutServerLoad = async ({ locals }) => {
  const { userState, activeContext } = locals

  // ── Gate ───────────────────────────────────────────────────────────────────
  // userState being null here means either:
  //   a) resolution failed in userStateHandle (logged there)
  //   b) this is somehow reached without a session (shouldn't happen —
  //      authGuardHandle protects /app)
  // Either way, /login is the safe fallback.
  if (!userState) {
    throw redirect(303, '/login')
  }

  // No actor type check here — PASSENGER and GUEST are both valid.
  // activatePassengerContext() in +layout.ts handles the distinction.

  return {
    userState,
    activeContext,
  }
}