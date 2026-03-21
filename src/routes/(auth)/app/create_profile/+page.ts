// src/routes/(auth)/app/create_profile/+page.ts
//
// Client-side load — runs in the browser after the server load.
// Only responsibility: redirect away if the profile is already complete.

import { redirect } from "@sveltejs/kit"
import type { PageLoad } from "./$types"

export const load: PageLoad = async ({ parent }) => {
  const data = await parent()

  if (hasFullProfile(data?.profile)) {
    redirect(303, "/app/select_plan")
  }

  return data
}

/**
 * Profile is complete when:
 *   - full_name is set and not the default "User" placeholder
 *   - phone is set (saved by this page's form action)
 */
export function hasFullProfile(
  profile:
    | { full_name?: string | null; phone?: string | null }
    | null
    | undefined,
): boolean {
  if (!profile) return false
  const name = profile.full_name?.trim() ?? ""
  if (!name || name.toLowerCase() === "user") return false
  if (!profile.phone?.trim()) return false
  return true
}

export { hasFullProfile as _hasFullProfile }