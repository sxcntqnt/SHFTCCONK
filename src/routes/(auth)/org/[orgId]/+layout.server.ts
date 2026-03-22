// src/routes/(auth)/org/[orgId]/+layout.server.ts
//
// Access guard and data loader for all /org/[orgId]/* routes.
//
// CONTEXT ARCHITECTURE:
//   This file (server) validates DB-level access and loads org data.
//   It returns `contextType: "chair" | "staff"` so layout.svelte
//   knows which context to activate on the client.
//
//   Context activation (writing to orgChairCtx / orgCtx Svelte stores)
//   is intentionally client-side — happens in layout.svelte onMount.
//   Server-side Svelte stores are always empty; activating them here
//   would silently do nothing.
//
// FIXES FROM OLD VERSION:
//   BUG 1 — Supabase .in() with a subquery builder (not a string[]):
//     .in('actor_id', supabase.from('actors').select('id')...)
//     .in() expects a plain string[]. Passing a builder silently returns
//     zero results — every user was redirected regardless of real access.
//     Fixed: two-step query — await actor IDs first, then use the array.
//
//   BUG 2 — members fetched with nested join and limit(100):
//     Sidebar only needs vehicleCount and memberCount — not full member rows.
//     Full member data is loaded per-page (e.g. /members/+page.server.ts).
//     Fixed: members query replaced with a count-only query.
//
//   BUG 3 — contextType not returned:
//     layout.svelte needs to know whether to activate orgChairCtx or orgCtx.
//     Fixed: access check logic now derives contextType and returns it.

import type { LayoutServerLoad } from "$lib/types"
import { redirect }              from "@sveltejs/kit"

export const load: LayoutServerLoad = async ({ params, locals }) => {
  const { supabase, session } = locals
  const { orgId }             = params

  if (!session?.user?.id) throw redirect(303, "/login/sign_in")

  // ── Step 1: fetch this user's active actor IDs ────────────────────────────
  // Must be awaited — .in() requires a plain string[], not a builder.
  const { data: actorRows } = await supabase
    .from("actors")
    .select("id, type")
    .eq("profile_id", session.user.id)
    .eq("status", "active")

  const actorIds      = (actorRows ?? []).map((a) => a.id)
  const chairActorIds = (actorRows ?? [])
    .filter((a) => a.type === "ORG_CHAIR")
    .map((a) => a.id)
  const adminActorIds = (actorRows ?? [])
    .filter((a) => ["ADMIN", "SUPER_ADMIN"].includes(a.type))
    .map((a) => a.id)

  if (actorIds.length === 0) {
    throw redirect(303, "/org/select?reason=no_access")
  }

  // ── Step 2: access check ──────────────────────────────────────────────────
  // User must have one of:
  //   (a) direct org membership via any active actor
  //   (b) federal/org jurisdiction via an admin-type actor
  const [{ data: membership }, { data: jurisdictions }] = await Promise.all([
    supabase
      .from("organization_members")
      .select("actor_id, role")
      .eq("organization_id", orgId)
      .in("actor_id", actorIds)
      .limit(1),

    adminActorIds.length > 0
      ? supabase
          .from("actor_jurisdictions")
          .select("level, scope_id, actor_id")
          .in("actor_id", adminActorIds)
          .or(`level.eq.federal,and(level.eq.org,scope_id.eq.${orgId})`)
      : Promise.resolve({ data: [] }),
  ])

  const hasAccess =
    (membership   && membership.length   > 0) ||
    (jurisdictions && jurisdictions.length > 0)

  if (!hasAccess) {
    throw redirect(303, "/org/select?reason=no_access")
  }

  // ── Step 3: derive contextType ────────────────────────────────────────────
  // "chair" if the user holds ORG_CHAIR in this org
  // "admin" if they have federal/org jurisdiction (treated as chair-level)
  // "staff" for all other org members
  const isChairInOrg = chairActorIds.some((id) =>
    (membership ?? []).some((m) => m.actor_id === id),
  )
  const isAdmin = (jurisdictions ?? []).length > 0

  const contextType: "chair" | "staff" =
    isChairInOrg || isAdmin ? "chair" : "staff"

  // ── Step 4: load org data ─────────────────────────────────────────────────
  const [
    { data: organization },
    { data: branches },
    { count: vehicleCount },
    { count: memberCount },
  ] = await Promise.all([
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

    // Count only — full vehicle list is loaded per-page
    supabase
      .from("vehicles")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", orgId),

    // Count only — full member list is loaded in /members/+page.server.ts
    supabase
      .from("organization_members")
      .select("actor_id", { count: "exact", head: true })
      .eq("organization_id", orgId),
  ])

  if (!organization) {
    throw redirect(303, "/org/select?reason=org_not_found")
  }

  // User's role label for the topbar pill and sidebar footer
  const userMembership = (membership ?? []).find((m) =>
    actorIds.includes(m.actor_id),
  )
  const userOrgRole = userMembership?.role ?? (isAdmin ? "ADMIN" : null)

  return {
    orgId,
    organization,
    branches:     branches    ?? [],
    vehicleCount: vehicleCount ?? 0,
    memberCount:  memberCount  ?? 0,
    userOrgRole,
    contextType,   // consumed by layout.svelte to activate correct context
  }
}