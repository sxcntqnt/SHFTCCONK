// src/routes/(auth)/admin/+layout.ts
//
// Admin client layout — activates the super admin context store.
//
// LAZY ACTIVATION PATTERN:
//   Server resolved userState in hooks.server.ts.
//   This layout activates the correct context store from that data.
//   No DB calls — purely client-side store hydration.

import type { LayoutLoad } from "./$types"
import { redirect } from "@sveltejs/kit"
import { activateSuperAdminContext } from "$lib/features/auth/contexts/super-admin.context"

export const load: LayoutLoad = async ({ data }) => {
  if (!data.userState) throw redirect(303, "/login")

  if (!activateSuperAdminContext(data.userState)) {
    throw redirect(303, "/unauthorized")
  }

  return {
    ...data,
  }
}
