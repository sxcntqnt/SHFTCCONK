// src/routes/account/+layout.ts
//
// Account section: requires authentication and checks profile completeness.
// This replaces the old admin/account/+layout.ts, keeping Stripe + MFA
// integration while using the federated session store.

import { redirect } from "@sveltejs/kit"
import { get } from "svelte/store"
import { sessionStore, profileComplete } from "$lib/features/auth/stores/auth"
import { CreateProfileStep } from "../../../../config"
import type { LayoutLoad } from "$lib/types"

export const load: LayoutLoad = async ({ parent, url }) => {
  const { supabase, session, user, bootstrapped } = await parent()

  // ─── Auth guard ───────────────────────────────────────────
  if (!session || !user) {
    const returnTo = url.pathname + url.search
    redirect(303, `/login/sign_in?next=${encodeURIComponent(returnTo)}`)
  }

  // ─── Profile from store (already bootstrapped by root layout) ─
  const s = get(sessionStore)
  const profile = s.profile

  // ─── MFA status ───────────────────────────────────────────
  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()

  // ─── Profile completeness redirect ────────────────────────
  const createProfilePath = "/account/create_profile"
  const signOutPath = "/account/sign_out"
  const exemptPaths = [createProfilePath, signOutPath]

  if (
    CreateProfileStep &&
    profile &&
    !hasFullProfile(profile) &&
    !exemptPaths.includes(url.pathname)
  ) {
    redirect(303, createProfilePath)
  }

  return {
    supabase,
    session,
    user,
    profile,
    amr: aal?.currentAuthenticationMethods,
  }
}

/**
 * Profile completeness check.
 * Adjust required fields to match your onboarding requirements.
 */
function hasFullProfile(
  profile: {
    full_name: string | null
    company_name: string | null
    website: string | null
  } | null,
): boolean {
  if (!profile) return false
  if (!profile.full_name) return false
  // company_name and website are optional in the federated model
  // since not all actor types need them (e.g. passengers, drivers)
  // Uncomment if you want to require them:
  // if (!profile.company_name) return false
  // if (!profile.website) return false
  return true
}

// Export for testing
export { hasFullProfile as _hasFullProfile }
