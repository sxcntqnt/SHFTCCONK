// src/routes/(auth)/onboarding/+layout.ts
//
// Onboarding client layout — no context activation.
// Passengers, invited crew, operators, owners all pass through here.
// No context store is activated — user has no active actors yet.

import type { LayoutLoad } from "./$types"
import { redirect } from "@sveltejs/kit"

export const load: LayoutLoad = async ({ data }) => {
  // Authenticated but no userState = resolution failure
  if (data.session && !data.userState) {
    // Allow through — onboarding is exactly where unresolved users belong
  }

  return { ...data }
}
