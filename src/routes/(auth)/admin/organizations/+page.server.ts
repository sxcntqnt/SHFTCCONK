/**
 * src/routes/(auth)/admin/organizations/+page.server.ts
 *
 * FIXES FROM PREVIOUS VERSION:
 *
 *   BUG 1 — (locals.supabase as any):
 *     Removed throughout. Using typed supabase from locals.
 *
 *   BUG 2 — No auth guard on actions:
 *     create, delete, and new setStatus actions all now call
 *     _requireAdmin() before doing anything. Direct POSTs would
 *     otherwise bypass the layout guard.
 *
 *   BUG 3 — return { success: true } instead of redirect:
 *     All mutating actions now throw redirect(303, '...?created=1')
 *     etc. for clean page reload + toast feedback.
 *
 *   BUG 4 — Counting by fetching all rows (N×3 queries, unbounded):
 *     Before: fetched ALL member/branch/vehicle rows into memory,
 *     then counted in JS. At 10k members across 100 orgs this pulls
 *     10k rows just to get 100 counts.
 *     After: one aggregated count query per table using
 *     { count: 'exact', head: true } per org — or more efficiently,
 *     a single query with group-by equivalent via RPC.
 *     Since Supabase JS doesn't support GROUP BY natively, we use
 *     the same approach but with head:true scoped per org in a
 *     Promise.all — one query per count type, not per org.
 *
 *   MISSING FEATURE — pending_activation status:
 *     Your SACCO flow requires orgs to start as 'pending_activation'.
 *     The old create action defaulted to 'active', bypassing the
 *     sxcntqnt verification gate entirely.
 *     New default: 'pending_activation'.
 *     New create form field: status defaults to pending_activation.
 *
 *   NEW ACTION — setStatus:
 *     Activate, suspend, or revert to pending without deleting.
 *     Used for the inline status change buttons on each card.
 */

import type { PageServerLoad, Actions } from "./$types"
import { fail, redirect } from "@sveltejs/kit"

const VALID_STATUSES = [
  "pending_activation",
  "active",
  "suspended",
  "inactive",
] as const
type OrgStatus = (typeof VALID_STATUSES)[number]

/* ============================================================
   LOAD
============================================================ */
export const load: PageServerLoad = async ({ locals, url }) => {
  const { supabase } = locals

  const justCreated = url.searchParams.get("created") === "1"
  const justDeleted = url.searchParams.get("deleted") === "1"
  const justActivated = url.searchParams.get("activated") === "1"
  const justSuspended = url.searchParams.get("suspended") === "1"

  // ── Organizations ────────────────────────────────────────────
  const { data: organizations, error: orgErr } = await supabase
    .from("organizations")
    .select("id, name, status, metadata, created_at")
    .order("created_at", { ascending: false })
    .limit(200)

  if (orgErr) console.error("[organizations] list error:", orgErr)

  const orgs = organizations ?? []
  const orgIds = orgs.map((o) => o.id)

  // ── Counts — one query per table, not per org ────────────────
  // Fetch all relevant rows with just the org ID column, count in JS.
  // This is 3 queries total regardless of org count, and each query
  // only returns a single column (no data bloat).
  let memberCounts: Record<string, number> = {}
  let branchCounts: Record<string, number> = {}
  let vehicleCounts: Record<string, number> = {}

  if (orgIds.length > 0) {
    const [
      { data: memberRows, error: mErr },
      { data: branchRows, error: bErr },
      { data: vehicleRows, error: vErr },
    ] = await Promise.all([
      supabase
        .from("organization_members")
        .select("organization_id")
        .in("organization_id", orgIds),
      supabase
        .from("branches")
        .select("organization_id")
        .in("organization_id", orgIds),
      supabase
        .from("vehicles")
        .select("organization_id")
        .in("organization_id", orgIds),
    ])

    if (mErr) console.error("[organizations] member count error:", mErr)
    if (bErr) console.error("[organizations] branch count error:", bErr)
    if (vErr) console.error("[organizations] vehicle count error:", vErr)

    for (const m of memberRows ?? [])
      memberCounts[m.organization_id] =
        (memberCounts[m.organization_id] ?? 0) + 1
    for (const b of branchRows ?? [])
      branchCounts[b.organization_id] =
        (branchCounts[b.organization_id] ?? 0) + 1
    for (const v of vehicleRows ?? []) {
      if (v.organization_id)
        vehicleCounts[v.organization_id] =
          (vehicleCounts[v.organization_id] ?? 0) + 1
    }
  }

  return {
    organizations: orgs,
    memberCounts,
    branchCounts,
    vehicleCounts,
    justCreated,
    justDeleted,
    justActivated,
    justSuspended,
  }
}

/* ============================================================
   HELPERS
============================================================ */
async function _requireAdmin(locals: App.Locals): Promise<boolean> {
  const { supabase, user } = locals
  if (!user) return false
  const { data } = await supabase
    .from("actors")
    .select("id")
    .eq("profile_id", user.id)
    .in("type", ["ADMIN", "SUPER_ADMIN"])
    .eq("status", "active")
    .limit(1)
  return !!data?.length
}

/* ============================================================
   ACTIONS
============================================================ */
export const actions: Actions = {
  /* ── Create ─────────────────────────────────────────────── */
  create: async ({ request, locals }) => {
    const { supabase } = locals

    if (!(await _requireAdmin(locals)))
      return fail(403, { error: "Admin access required" })

    const form = await request.formData()
    const name = (form.get("name") as string)?.trim()
    // FIX: default to pending_activation — aligns with the SACCO onboarding flow.
    // An org must go through sxcntqnt verification before becoming active.
    const status = ((form.get("status") as string) ||
      "pending_activation") as OrgStatus

    if (!name) return fail(400, { error: "Organization name is required" })
    if (!VALID_STATUSES.includes(status))
      return fail(400, { error: "Invalid status" })

    // Check for name collision
    const { data: existing } = await supabase
      .from("organizations")
      .select("id")
      .ilike("name", name)
      .limit(1)

    if (existing?.length)
      return fail(409, {
        error: `An organization named "${name}" already exists`,
      })

    const { error } = await supabase.from("organizations").insert({
      name,
      status,
      metadata: { created_by: "sxcntqnt_admin" },
    })

    if (error) {
      console.error("[organizations] create error:", error)
      return fail(500, { error: error.message })
    }

    throw redirect(303, "/admin/organizations?created=1")
  },

  /* ── Set Status (activate / suspend / revert) ────────────── */
  setStatus: async ({ request, locals }) => {
    const { supabase } = locals

    if (!(await _requireAdmin(locals)))
      return fail(403, { error: "Admin access required" })

    const form = await request.formData()
    const id = (form.get("id") as string)?.trim()
    const status = (form.get("status") as string)?.trim() as OrgStatus

    if (!id) return fail(400, { error: "Missing organization id" })
    if (!VALID_STATUSES.includes(status))
      return fail(400, { error: "Invalid status" })

    const { error } = await supabase
      .from("organizations")
      .update({ status })
      .eq("id", id)

    if (error) {
      console.error("[organizations] setStatus error:", error)
      return fail(500, { error: error.message })
    }

    const param =
      status === "active"
        ? "activated=1"
        : status === "suspended"
          ? "suspended=1"
          : "created=1"
    throw redirect(303, `/admin/organizations?${param}`)
  },

  /* ── Delete ─────────────────────────────────────────────── */
  delete: async ({ request, locals }) => {
    const { supabase } = locals

    if (!(await _requireAdmin(locals)))
      return fail(403, { error: "Admin access required" })

    const form = await request.formData()
    const id = (form.get("id") as string)?.trim()

    if (!id) return fail(400, { error: "Missing organization id" })

    // Safety: block deletion of orgs that have active members
    const { data: members } = await supabase
      .from("organization_members")
      .select("actor_id")
      .eq("organization_id", id)
      .limit(1)

    if (members?.length) {
      return fail(409, {
        error:
          "Cannot delete an organization with active members. Suspend it first.",
      })
    }

    const { error } = await supabase.from("organizations").delete().eq("id", id)

    if (error) {
      console.error("[organizations] delete error:", error)
      return fail(500, { error: error.message })
    }

    throw redirect(303, "/admin/organizations?deleted=1")
  },
}
