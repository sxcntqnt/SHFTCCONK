// src/routes/(auth)/admin/+layout.server.ts
//
// Admin route layout — platform super admin + admin context.
//
// MIGRATION FROM sessionStore:
//   requireAdminAccess() removed — replaced by reading locals.userState
//   which was resolved by userStateHandle in hooks.server.ts.
//   activateSuperAdminContext() is called CLIENT-SIDE from +layout.ts
//   using data.userState — NOT here. Server layout only gates + fetches.
//
// RESPONSIBILITY:
//   1. Gate — redirect if no SUPER_ADMIN or ADMIN actor in userState
//   2. Fetch — admin-specific domain data (counts, breakdowns)
//   3. Return — merged payload for the admin shell UI
//
// WHAT IS NOT HERE:
//   - No session/user null checks (authGuardHandle handles that)
//   - No resolveUserState() calls (userStateHandle handles that)
//   - No activateSuperAdminContext() calls (belongs in +layout.ts)
//   - No domain logic — only data fetching for the admin nav/dashboard

import type { LayoutServerLoad } from "./$types"
import { redirect } from "@sveltejs/kit"
import { ACTOR_TYPES } from "$lib/features/auth/contexts/context.template"

export const load: LayoutServerLoad = async ({ locals }) => {
  const { userState, activeContext, supabase } = locals

  // ── Gate ───────────────────────────────────────────────────────────────────
  // userState is null only if resolution failed or this is a public path.
  // authGuardHandle already redirected unauthenticated users to /login.
  // Here we check the domain condition: must have an admin-level actor.
  if (!userState) {
    throw redirect(303, "/login")
  }

  const hasAdminActor = userState.activeContexts.some(
    (ctx) =>
      [ACTOR_TYPES.SUPER_ADMIN, ACTOR_TYPES.ADMIN].includes(
        ctx.type as typeof ACTOR_TYPES.SUPER_ADMIN | typeof ACTOR_TYPES.ADMIN,
      ) && ctx.status === "active",
  )

  if (!hasAdminActor) {
    throw redirect(303, "/unauthorized")
  }

  // ── Domain data fetch ──────────────────────────────────────────────────────
  // All queries run in parallel — one network round trip.
  // These are admin-specific counts that the nav shell and dashboard
  // summary cards need. Pages under /admin fetch their own detail data.
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

  const [
    pendingRequestsResult,
    recentAuditResult,
    orgCountResult,
    pendingByTypeResult,
  ] = await Promise.all([
    // Total pending actor_requests — badge on nav link
    supabase
      .from("actor_requests")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending"),

    // Audit events in last 24h — activity indicator
    supabase
      .from("audit_logs")
      .select("*", { count: "exact", head: true })
      .gte("created_at", yesterday),

    // Active org count — dashboard summary card
    supabase
      .from("organizations")
      .select("*", { count: "exact", head: true })
      .eq("status", "active"),

    // Pending requests by type — nav badge breakdown
    // e.g. "3 org_member, 1 crew" without a GROUP BY RPC
    supabase
      .from("actor_requests")
      .select("requested_type")
      .eq("status", "pending"),
  ])

  // Build type breakdown client-side from the raw rows
  const typeBreakdown: Record<string, number> = {}
  for (const row of pendingByTypeResult.data ?? []) {
    typeBreakdown[row.requested_type] =
      (typeBreakdown[row.requested_type] ?? 0) + 1
  }

  return {
    // ── Forwarded from hooks — available to all /admin/* pages ────
    userState,
    activeContext,

    // ── Admin nav + dashboard summary data ────────────────────────
    pendingRequestCount: pendingRequestsResult.count ?? 0,
    recentAuditCount: recentAuditResult.count ?? 0,
    orgCount: orgCountResult.count ?? 0,
    typeBreakdown,
  }
}
