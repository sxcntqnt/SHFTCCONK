// src/routes/(auth)/org/[orgId]/+layout.ts
//
// Org client layout — activates the correct context store based on
// contextType returned by +layout.server.ts.
//
// LAZY ACTIVATION PATTERN:
//   Server derived contextType in memory from userState (no DB).
//   This layout activates orgChairCtx or orgCtx accordingly.
//
// FALLBACK CHAIN:
//   Try ORG_CHAIR context first.
//   If that returns false (user is staff, not chair), try org staff.
//   If both fail (race condition between server gate and client activate),
//   redirect to /org/select.
//
// NOTE ON orgId:
//   activateOrgChairContext and activateOrgContext both require orgId
//   to scope permissions to this specific org. Comes from data.orgId
//   which was set by +layout.server.ts from params.

import type { LayoutLoad } from "./$types"
import { redirect } from "@sveltejs/kit"
import { activateOrgChairContext } from "$lib/features/auth/contexts/org-chair.context"
import { activateOrgContext } from "$lib/features/auth/contexts/org.context"

export const load: LayoutLoad = async ({ data }) => {
  if (!data.userState) throw redirect(303, "/login")

  if (data.contextType === "chair") {
    // ORG_CHAIR or ADMIN/SUPER_ADMIN acting as chair
    if (!activateOrgChairContext(data.userState, data.orgId)) {
      // Fallback — ADMIN actors use federal jurisdiction,
      // activateOrgChairContext may still return false for ADMIN type.
      // Try staff context before giving up.
      if (!activateOrgContext(data.userState, data.orgId)) {
        throw redirect(303, "/org/select?reason=no_access")
      }
    }
  } else {
    // Staff — any non-chair org role
    if (!activateOrgContext(data.userState, data.orgId)) {
      throw redirect(303, "/org/select?reason=no_access")
    }
  }

  return {
    ...data,
  }
}
