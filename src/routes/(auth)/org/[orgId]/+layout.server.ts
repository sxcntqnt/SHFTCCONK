// src/routes/(auth)/org/[orgId]/+layout.server.ts
//
// Access guard and data loader for all /org/[orgId]/* routes.
//
// MIGRATION FROM sessionStore:
//   Steps 1–3 (actor fetch, membership check, jurisdiction check,
//   contextType derivation) removed — all of this is already in
//   userState resolved by userStateHandle in hooks.server.ts.
//
//   OLD:  Two-step actor fetch → membership query → jurisdiction query
//         → derive contextType → load org data (5 queries sequential + parallel)
//   NEW:  Read userState → derive contextType in memory → load org data
//         (2 parallel queries, zero sequential gates)
//
// GATE:
//   Must have an active actor with jurisdiction over this orgId.
//   ORG_CHAIR or ADMIN/SUPER_ADMIN → contextType = 'chair'
//   Any other org staff actor      → contextType = 'staff'
//   No qualifying actor            → redirect to /org/select
//
// RESPONSIBILITY:
//   1. Gate  — derive contextType from userState (no DB)
//   2. Fetch — org data, branches, counts (parallel)
//   3. Return — org shell data + contextType for +layout.ts activation

import type { LayoutServerLoad } from "./$types"
import { redirect } from "@sveltejs/kit"
import {
  ACTOR_TYPES,
  ORG_STAFF_TYPES,
} from "$lib/features/auth/contexts/context.template"

export const load: LayoutServerLoad = async ({ params, locals }) => {
  const { userState, activeContext, supabase } = locals
  const { orgId } = params

  // ── Gate ───────────────────────────────────────────────────────────────────
  if (!userState) {
    throw redirect(303, "/login")
  }

  // Derive contextType entirely from userState — no DB queries needed.
  // Mirrors the logic in activateOrgChairContext + activateOrgContext.
  const hasChairAccess = userState.activeContexts.some((ctx) => {
    if (ctx.status !== "active") return false

    // SUPER_ADMIN / ADMIN have federal jurisdiction — chair-level access
    if (
      [ACTOR_TYPES.SUPER_ADMIN, ACTOR_TYPES.ADMIN].includes(
        ctx.type as typeof ACTOR_TYPES.SUPER_ADMIN,
      )
    )
      return true

    // ORG_CHAIR with jurisdiction over this org or federal
    if (ctx.type === ACTOR_TYPES.ORG_CHAIR) {
      return ctx.jurisdictions.some(
        (j) =>
          j.level === "federal" || (j.level === "org" && j.scope_id === orgId),
      )
    }

    return false
  })

  const hasStaffAccess =
    !hasChairAccess &&
    userState.activeContexts.some((ctx) => {
      if (ctx.status !== "active") return false
      if (!ORG_STAFF_TYPES.includes(ctx.type)) return false
      return ctx.jurisdictions.some(
        (j) =>
          j.level === "federal" ||
          (j.level === "org" && j.scope_id === orgId) ||
          (j.level === "branch" && j.scope_id != null),
      )
    })

  if (!hasChairAccess && !hasStaffAccess) {
    throw redirect(303, "/org/select?reason=no_access")
  }

  const contextType: "chair" | "staff" = hasChairAccess ? "chair" : "staff"

  // ── Org data fetch ─────────────────────────────────────────────────────────
  // Parallel — org shell data needed by sidebar + topbar across all
  // /org/[orgId]/* pages. Detail data is loaded per-page.
  const [orgResult, branchResult, vehicleCountResult, memberCountResult] =
    await Promise.all([
      supabase
        .from("organizations")
        .select("id, name, status, metadata")
        .eq("id", orgId)
        .single(),

      supabase
        .from("branches")
        .select("id, name")
        .eq("organization_id", orgId)
        .order("name"),

      // Count only — full vehicle list loaded per-page
      supabase
        .from("vehicles")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", orgId),

      // Count only — full member list loaded in /members/+page.server.ts
      supabase
        .from("organization_members")
        .select("actor_id", { count: "exact", head: true })
        .eq("organization_id", orgId),
    ])

  if (!orgResult.data) {
    throw redirect(303, "/org/select?reason=org_not_found")
  }

  // ── User role label ────────────────────────────────────────────────────────
  // For the topbar pill and sidebar footer.
  // Sourced from userState — no extra DB query needed.
  const userActorCtx = userState.activeContexts.find((ctx) => {
    if (ctx.status !== "active") return false
    return ctx.jurisdictions.some(
      (j) =>
        j.level === "federal" || (j.level === "org" && j.scope_id === orgId),
    )
  })
  const userOrgRole = userActorCtx?.type ?? null

  return {
    userState,
    activeContext,
    orgId,
    organization: orgResult.data,
    branches: branchResult.data ?? [],
    vehicleCount: vehicleCountResult.count ?? 0,
    memberCount: memberCountResult.count ?? 0,
    userOrgRole,
    contextType,
  }
}
