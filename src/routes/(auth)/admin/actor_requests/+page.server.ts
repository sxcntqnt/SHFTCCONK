/**
 * src/routes/(auth)/admin/actor_requests/+page.server.ts
 *
 * FIXES FROM PREVIOUS VERSION:
 *
 *   BUG 1 — Wrong redirect:
 *     Before: return { status: 303, headers: { location: '...' } }
 *     After:  throw redirect(303, '/admin/actor_requests')
 *     The old form silently returned a plain object. SvelteKit ignores it.
 *     The page never actually redirected after approve.
 *
 *   BUG 2 — `(locals.supabase as any)` everywhere:
 *     Removed. Now using typed locals.supabase. Errors will surface properly.
 *
 *   BUG 3 — No reject action:
 *     Added `reject` action. Updates status to 'rejected', records reason,
 *     sets processed_by + processed_at.
 *
 *   IMPROVEMENT — Profile join on load:
 *     requests now joins profiles so the UI can show full_name + avatar
 *     instead of raw profile_id UUIDs.
 *
 *   IMPROVEMENT — Org name join:
 *     payload->>'organization_id' is resolved to org name in the load query.
 *
 *   IMPROVEMENT — Binding types aligned with actor_requests flow:
 *     Old types (driver_assignment, fleet_ownership, conductor_assignment)
 *     are kept for backward compat but the PRIMARY flow for SACCOs is:
 *       requested_type = 'org_member' → approve → org admin role assigned
 *     New binding type 'sacco_chair' maps to admin_activate_org_member RPC.
 */

import type { PageServerLoad, Actions } from "./$types"
import { fail, redirect } from "@sveltejs/kit"
import { actorRequestApproveSchema } from "$lib/security/admin.schema"

const UUID_RE =
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/

/* ============================================================
   LOAD
============================================================ */
export const load: PageServerLoad = async ({ locals }) => {
  const { supabase } = locals

  // Fetch pending requests with profile info joined
  // (profile_id → profiles.full_name, avatar_url)
  const { data: requests, error: reqErr } = await supabase
    .from("actor_requests")
    .select(
      `
      id,
      profile_id,
      requested_type,
      payload,
      status,
      created_at,
      profiles (
        full_name,
        avatar_url,
        company_name
      )
    `,
    )
    .eq("status", "pending")
    .order("created_at", { ascending: false })

  if (reqErr) {
    console.error("[actor_requests] load error:", reqErr)
  }

  // Resolve org names for requests that reference an org in payload
  let orgMap: Record<string, string> = {}
  const orgIds = (requests ?? [])
    .map((r) => r.payload?.organization_id as string | undefined)
    .filter((id): id is string => !!id && UUID_RE.test(id))

  if (orgIds.length > 0) {
    const { data: orgs } = await supabase
      .from("organizations")
      .select("id, name")
      .in("id", orgIds)

    orgMap = Object.fromEntries((orgs ?? []).map((o) => [o.id, o.name]))
  }

  // Vehicle + org dropdowns for binding selects
  const [{ data: vehicles }, { data: organizations }] = await Promise.all([
    supabase.from("vehicles").select("id, reg_number, capacity").limit(200),
    supabase.from("organizations").select("id, name, status").limit(200),
  ])

  return {
    requests: requests ?? [],
    orgMap,
    vehicles: vehicles ?? [],
    organizations: organizations ?? [],
  }
}

/* ============================================================
   ACTIONS
============================================================ */
export const actions: Actions = {
  /* ── Approve ─────────────────────────────────────────────── */
  approve: async ({ request, locals }) => {
    const { supabase, user } = locals
    const form = await request.formData()
    const raw = {
      request_id: form.get("request_id"),
      binding_type: form.get("binding_type"),
      binding_target: form.get("binding_target"),
    }

    const parsed = actorRequestApproveSchema.safeParse(raw)
    if (!parsed.success) return fail(400, { error: "missing_or_invalid_request_id" })
    const id = parsed.data.request_id
    const bindingType = (parsed.data.binding_type as string) || null
    const bindingTarget = (parsed.data.binding_target as string) || null

    if (!user) return fail(403, { error: "not_authenticated" })

    // Validate binding target UUID when required
    const requiresTarget = [
      "driver_assignment",
      "conductor_assignment",
      "fleet_ownership",
      "organization_member",
      "sacco_chair",
    ]
    if (bindingType && requiresTarget.includes(bindingType)) {
      if (!bindingTarget) return fail(400, { error: "binding_target_required" })
      if (!UUID_RE.test(bindingTarget))
        return fail(400, { error: "binding_target_invalid_uuid" })
    }

    // ── Server-side existence + ownership checks ───────────────
    try {
      // Vehicle-binding checks
      if (
        [
          "driver_assignment",
          "conductor_assignment",
          "fleet_ownership",
        ].includes(bindingType ?? "")
      ) {
        const { data: vehicle, error: vErr } = await supabase
          .from("vehicles")
          .select("id, organization_id")
          .eq("id", bindingTarget)
          .maybeSingle()

        if (vErr || !vehicle) return fail(400, { error: "vehicle_not_found" })

        if (vehicle.organization_id) {
          const hasAccess = await _isOrgAdminOrPlatform(
            supabase,
            user.id,
            vehicle.organization_id,
          )
          if (!hasAccess)
            return fail(403, { error: "not_org_admin_for_vehicle" })
        }
      }

      // Org-binding checks
      if (
        ["organization_member", "fleet_ownership", "sacco_chair"].includes(
          bindingType ?? "",
        )
      ) {
        const targetOrgId =
          bindingType === "fleet_ownership" ? bindingTarget : bindingTarget
        const { data: org, error: oErr } = await supabase
          .from("organizations")
          .select("id")
          .eq("id", targetOrgId)
          .maybeSingle()

        if (oErr || !org) return fail(400, { error: "organization_not_found" })

        const hasAccess = await _isOrgAdminOrPlatform(
          supabase,
          user.id,
          targetOrgId!,
        )
        if (!hasAccess) return fail(403, { error: "not_org_admin_for_org" })
      }
    } catch (e) {
      console.error("[actor_requests] binding validation error:", e)
      return fail(500, { error: "binding_validation_failed" })
    }

    // ── Call RPC ───────────────────────────────────────────────
    // For SACCO chair activation: use admin_activate_org_member RPC
    if (bindingType === "sacco_chair") {
      const { data: req } = await supabase
        .from("actor_requests")
        .select("profile_id")
        .eq("id", id)
        .single()

      const { error: rpcErr } = await supabase.rpc(
        "admin_activate_org_member",
        {
          p_org_id: bindingTarget,
          p_profile_id: req?.profile_id,
        },
      )

      if (rpcErr) {
        console.error(
          "[actor_requests] admin_activate_org_member error:",
          rpcErr,
        )
        return fail(500, { error: rpcErr.message })
      }

      throw redirect(303, "/admin/actor_requests")
    }

    // General approve RPC for all other binding types
    const { error: rpcErr } = await supabase.rpc("approve_actor_request", {
      request_id: id,
      binding_type: bindingType ?? null,
      binding_target: bindingTarget ?? null,
    })

    if (rpcErr) {
      console.error("[actor_requests] approve_actor_request error:", rpcErr)
      return fail(500, { error: rpcErr.message })
    }

    // BUG FIX: was `return { status: 303, headers: {...} }` — ignored by SvelteKit
    throw redirect(303, "/admin/actor_requests")
  },

  /* ── Reject ───────────────────────────────────────────────── */
  reject: async ({ request, locals }) => {
    const { supabase, user } = locals
    const form = await request.formData()
    const raw = { request_id: form.get("request_id"), reject_reason: form.get("reject_reason") }
    const parsed = actorRequestApproveSchema.safeParse({ request_id: raw.request_id })
    if (!parsed.success) return fail(400, { error: "missing_or_invalid_request_id" })
    const id = parsed.data.request_id
    const reason = (raw.reject_reason as string) || "Rejected by admin"

    if (!user) return fail(403, { error: "not_authenticated" })

    const { error } = await supabase
      .from("actor_requests")
      .update({
        status: "rejected",
        processed_at: new Date().toISOString(),
        processed_by: user.id,
        metadata: { reject_reason: reason },
      })
      .eq("id", id)
      .eq("status", "pending") // only reject if still pending

    if (error) {
      console.error("[actor_requests] reject error:", error)
      return fail(500, { error: error.message })
    }

    throw redirect(303, "/admin/actor_requests")
  },
}

/* ============================================================
   INTERNAL HELPERS
============================================================ */

/**
 * Returns true if userId is either:
 *   (a) an org admin of orgId, or
 *   (b) a platform SUPER_ADMIN / ADMIN (federal jurisdiction)
 *
 * Used for binding target authorization checks.
 */
async function _isOrgAdminOrPlatform(
  supabase: any,
  userId: string,
  orgId: string,
): Promise<boolean> {
  // Get all actor IDs for this user
  const { data: actors } = await supabase
    .from("actors")
    .select("id, type")
    .eq("profile_id", userId)

  if (!actors?.length) return false

  const actorIds = actors.map((a: { id: string }) => a.id)

  // Platform admin check (SUPER_ADMIN or ADMIN actor with federal jurisdiction)
  const isPlatformAdmin = actors.some(
    (a: { type: string }) => a.type === "SUPER_ADMIN" || a.type === "ADMIN",
  )
  if (isPlatformAdmin) return true

  // Org admin check
  const { data: membership } = await supabase
    .from("organization_members")
    .select("actor_id")
    .in("actor_id", actorIds)
    .eq("organization_id", orgId)
    .eq("role", "admin")
    .limit(1)

  return !!membership?.length
}
