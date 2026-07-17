// src/routes/(auth)/onboarding/+layout.server.ts
//
// Onboarding layout.
//
// Responsibility:
//   Ensure only authenticated users can access the onboarding flow while
//   forwarding the already-resolved domain state to child pages.
//
// PIPELINE:
//
//   authHandle
//     → sessionSyncHandle
//     → authGuardHandle
//     → userStateHandle
//     → this layout
//
// Therefore:
//
//   • authHandle has already populated locals.auth.
//   • authGuardHandle has already rejected unauthenticated requests.
//   • userStateHandle has already resolved locals.userState.
//
// This layout deliberately DOES NOT:
//
//   • decide whether the user is a guest
//   • decide whether KYC is complete
//   • choose dashboards
//   • activate contexts
//
// Those responsibilities belong exclusively to userStateHandle and the
// individual onboarding pages. This layout is simply a defensive guard and
// pass-through.

import { redirect } from "@sveltejs/kit";
import type { LayoutServerLoad } from "./$types";

export const load: LayoutServerLoad = async ({ locals }) => {
  // Defensive check.
  //
  // authGuardHandle should already have rejected anonymous requests before
  // this layout executes, but keeping this guard protects against future
  // pipeline changes and direct invocation during testing.
  if (!locals.auth.user) {
    throw redirect(303, "/login");
  }

  return {
    userState: locals.userState,
    activeContext: locals.activeContext,
  };
};
