// src/routes/org/select/+page.ts
//
// Org picker: for users with jurisdiction over multiple orgs.
// If user has exactly one org, redirects directly.

import { redirect } from "@sveltejs/kit"
import { get } from "svelte/store"
import { sessionStore, getJurisdictionOrgIds } from "$lib/features/auth/stores/auth"
import type { PageLoad } from "../../../$types"

export const load: PageLoad = async ({ parent, url }) => {
  const { session } = await parent()

  if (!session) {
    redirect(303, "/login/sign_in")
  }

  const s = get(sessionStore)
  const orgIds = getJurisdictionOrgIds()

  // Single org → skip picker, go directly
  if (orgIds.length === 1) {
    redirect(303, `/org/${orgIds[0]}/dashboard`)
  }

  // No orgs → dashboard
  if (orgIds.length === 0) {
    redirect(303, "/dashboard")
  }

  // Multiple orgs → show picker
  return {
    orgs: s.orgMemberships,
    reason: url.searchParams.get("reason"),
  }
}