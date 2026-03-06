// src/routes/(auth)/admin/account/+layout.ts
//
// Account/settings layout.
// Guard: requireAuth → any authenticated user.
//
// Additional logic:
//   - Checks profile completeness → redirects to create_profile if needed
//   - Loads MFA/AAL status for security settings page
//   - Exempts create_profile and sign_out from the completeness redirect
//     (otherwise you'd get an infinite redirect loop)
//
// This is deliberately NOT behind requireAdminAccess — any user
// can access their own account settings, not just admins. The route
// is under /admin/account for URL structure, but the guard is just auth.

// src/routes/(auth)/admin/account/+layout.ts
import type { LayoutLoad } from "./$types";
import { get } from "svelte/store";
import { redirect } from "@sveltejs/kit";

import { requireAuth } from "$lib/security/authGuard";
import { sessionStore } from "$lib/features/auth/stores/auth";

export const load: LayoutLoad = async (event) => {
  await requireAuth(event);

  // Get shared data from parent (/admin/+layout.ts)
  // → includes supabase, session, user, pendingRequestCount, recentAuditCount
  const parentData = await event.parent();

  const s = get(sessionStore);
  const profile = s.profile;

  // Load MFA/AAL for security-related pages
  const { data: aal } = await parentData.supabase.auth.mfa.getAuthenticatorAssuranceLevel();

  // Redirect incomplete profiles → but exempt key paths
  const { pathname } = event.url;
  const exemptPaths = [
    "/admin/account/create_profile",
    "/admin/account/sign_out",
    "/app/sign_out",  // ← if still relevant in your app
  ];

  if (
    profile &&
    !hasFullProfile(profile) &&
    !exemptPaths.some((p) => pathname.startsWith(p))
  ) {
    throw redirect(303, "/admin/account/create_profile");
  }

  return {
    ...parentData,                    // pass through everything from admin parent
    profile,
    amr: aal?.currentAuthenticationMethods ?? null,
  };
};

function hasFullProfile(profile: { full_name: string | null } | null): boolean {
  if (!profile) return false;
  if (!profile.full_name || profile.full_name.trim() === "User") return false;
  // ← extend with more fields if your "full profile" requires them
  return true;
}

// Export for unit tests if needed
export { hasFullProfile as _hasFullProfile };