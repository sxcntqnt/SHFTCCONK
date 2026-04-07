// src/lib/features/auth/utils/resolveRoute.ts
//
// Shared post-login routing utility.
//
// Determines the correct destination after a successful sign-in based on
// the payload returned by bootstrap_session().
//
// Priority:
//   1. No profile                    → /onboarding
//   2. Incomplete profile            → /app/create_profile
//   3. Platform admin permission     → /admin/dashboard
//   4. ADMIN actor                   → /admin/dashboard
//   5. REGULATOR / PLANNER           → /app/dashboard
//   6. Org-level actor               → /org/{orgId}/dashboard  (or /org/select)
//   7. DRIVER / CONDUCTOR            → /crew/dashboard
//   8. Default (PASSENGER / unknown) → /app/dashboard

import type { BootstrapSessionPayload } from "../stores/auth"

/**
 * Resolves the post-login destination route from a bootstrap_session() payload.
 *
 * Uses `hasFullProfile` to gate the create-profile step: incomplete profiles
 * are redirected to /app/create_profile before reaching any role dashboard.
 *
 * @param payload - The raw return value of supabase.rpc("bootstrap_session"),
 *   already unwrapped from the array form (i.e. `rpcData[0] ?? rpcData`).
 * @returns An absolute path string suitable for use with `goto()` or `redirect()`.
 */
export function resolveRouteFromBootstrap(
  payload: BootstrapSessionPayload | null | undefined,
): string {
  // No profile data → treat as unauthenticated / brand-new user
  if (!payload?.profile) {
    return "/onboarding"
  }

  const { profile, actors = [], organization_memberships: orgs = [] } = payload

  // Profile completeness gate — must have a real full_name
  if (!hasFullProfile(profile)) {
    return "/app/create_profile"
  }

  // Active actors only
  const activeActors = actors.filter((a) => a.status === "active")
  const actorTypes = new Set(activeActors.map((a) => a.type))

  // Platform admin via explicit permission (federal level)
  const hasAdminPermission = (payload.permissions ?? []).some(
    (p) =>
      p.effect === "allow" &&
      p.level === "federal" &&
      (p.action === "admin.full" || p.action === "admin.users"),
  )
  if (hasAdminPermission) return "/admin/dashboard"

  // Actor-type routing (mirrors server-side resolveDestination in auth/callback)
  if (actorTypes.has("ADMIN") || actorTypes.has("SUPER_ADMIN")) {
    return "/admin/dashboard"
  }

  if (actorTypes.has("REGULATOR") || actorTypes.has("PLANNER")) {
    return "/app/dashboard"
  }

  // Org-level actors → org dashboard (or picker when the user belongs to many orgs)
  const ORG_ACTOR_TYPES = ["ORGANIZATION", "STAGE_OPERATOR", "OWNER"] as const
  if (ORG_ACTOR_TYPES.some((t) => actorTypes.has(t))) {
    if (orgs.length === 1) return `/org/${orgs[0].organization_id}/dashboard`
    if (orgs.length > 1) return "/org/select"
    // Org actor but no org memberships yet — safe fallback
    return "/org/dashboard"
  }

  if (actorTypes.has("DRIVER") || actorTypes.has("CONDUCTOR")) {
    return "/crew/dashboard"
  }

  // Default: passenger, guest, or any other role → main app
  return "/app/dashboard"
}

/**
 * Profile completeness gate for bootstrap payloads.
 *
 * Mirrors the server-side check in auth/callback/+server.ts and is
 * intentionally lightweight — the bootstrap Profile shape does not
 * include phone, so only full_name is checked here.
 *
 * For the full check (including phone), see _hasFullProfile in
 * src/lib/features/profile/profile.service.ts.
 */
export function hasFullProfile(
  profile: { full_name?: string | null } | null | undefined,
): boolean {
  if (!profile) return false
  const name = profile.full_name?.trim() ?? ""
  return !!name && name.toLowerCase() !== "user"
}
