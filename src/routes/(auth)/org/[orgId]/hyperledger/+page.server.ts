// src/routes/org/[orgId]/hyperledger/+page.server.ts
//
// Org ledger dashboard — Fabric chain data for a specific org.
//
// MIGRATION FROM locals.user.*:
//   locals.user.role    → derived from contextType (passed from [orgId] layout)
//   locals.user.orgId   → params.orgId (validated by [orgId] layout gate)
//   locals.user.fabricUserId → queried from hyperledger_enrollment_queue
//
// GRACEFUL DEGRADATION:
//   All Fabric queries run via Promise.allSettled — peer unavailability
//   returns null for that section rather than failing the whole page.
//
// QUEUE VISIBILITY:
//   ORG_CHAIR and ADMIN can see enrollment queue status for this org's
//   actors — pending, exhausted items show as actionable warnings.

import { redirect } from "@sveltejs/kit"
import type { PageServerLoad } from "./$types"
import {
  getFleetSummary,
  getWalletBalance,
  getComplianceEvents,
  getOrgAuditLog,
} from "./utils/ledgerQueries"
import type { OrgConnectionContext } from "./utils/connection"
import {
  ACTOR_TYPES,
  ORG_STAFF_TYPES,
} from "$lib/features/auth/contexts/context.template"

export const load: PageServerLoad = async ({ locals, params }) => {
  const { userState, supabase } = locals
  const { orgId } = params

  // ── Gate ───────────────────────────────────────────────────────────────────
  // [orgId]/+layout.server.ts already validated org access and set contextType.
  // We just need userState to exist and have an actor for this org.
  if (!userState) throw redirect(303, "/login")

  // Derive role context for this page — mirrors what the layout already computed
  const isChair = userState.activeContexts.some((ctx) => {
    if (ctx.status !== "active") return false
    if (
      [ACTOR_TYPES.SUPER_ADMIN, ACTOR_TYPES.ADMIN].includes(
        ctx.type as typeof ACTOR_TYPES.SUPER_ADMIN,
      )
    )
      return true
    if (ctx.type !== ACTOR_TYPES.ORG_CHAIR) return false
    return ctx.jurisdictions.some(
      (j) =>
        j.level === "federal" || (j.level === "org" && j.scope_id === orgId),
    )
  })

  const isStaff =
    !isChair &&
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

  if (!isChair && !isStaff) {
    throw redirect(303, "/org/select?reason=no_access")
  }

  // 'chair' level can see audit log — matches the svelte page gate
  const contextType: "chair" | "staff" = isChair ? "chair" : "staff"

  // ── Resolve Fabric user ID for this actor ──────────────────────────────────
  // Sourced from hyperledger_enrollment_queue — the canonical record of
  // what was enrolled in Fabric CA. Falls back to profile id if not enrolled yet.
  const actorCtx = userState.activeContexts.find((ctx) => {
    if (ctx.status !== "active") return false
    return ctx.jurisdictions.some(
      (j) =>
        j.level === "federal" || (j.level === "org" && j.scope_id === orgId),
    )
  })

  let fabricUserId: string = userState.profile.id // fallback

  if (actorCtx) {
    const { data: enrollmentRow } = await supabase
      .from("hyperledger_enrollment_queue")
      .select("fabric_user_id")
      .eq("actor_id", actorCtx.actorId)
      .eq("status", "success")
      .maybeSingle()

    if (enrollmentRow?.fabric_user_id) {
      fabricUserId = enrollmentRow.fabric_user_id
    }
  }

  const ctx: OrgConnectionContext = {
    userId: fabricUserId,
    orgId,
  }

  // ── Queue status for this org's actors (chair/admin only) ─────────────────
  // Shows admins which crew/operator enrollments are pending or exhausted.
  let enrollmentQueue: {
    id: string
    actor_id: string
    intent: string
    event_name: string
    status: string
    attempts: number
    last_error: string | null
    created_at: string
  }[] = []

  if (isChair) {
    // Find all actor IDs for this org via org memberships
    const orgActorIds = userState.assignments.orgMemberships
      .filter((m) => m.organization_id === orgId)
      .map((m) => m.actor_id)

    // Also find actors via actor_jurisdictions for this org
    const jurisdictionActorIds = userState.activeContexts
      .filter((ctx) =>
        ctx.jurisdictions.some(
          (j) => j.level === "org" && j.scope_id === orgId,
        ),
      )
      .map((ctx) => ctx.actorId)

    const allOrgActorIds = [
      ...new Set([...orgActorIds, ...jurisdictionActorIds]),
    ]

    if (allOrgActorIds.length > 0) {
      // Fetch queue items for all actors in this org — show non-success items
      const { data: queueItems } = await supabase
        .from("hyperledger_enrollment_queue")
        .select(
          "id, actor_id, intent, event_name, status, attempts, last_error, created_at",
        )
        .in("actor_id", allOrgActorIds)
        .in("status", ["pending", "retrying", "exhausted", "failed"])
        .order("created_at", { ascending: false })
        .limit(20)

      enrollmentQueue = queueItems ?? []
    }
  }

  // ── Date range — last 30 days ──────────────────────────────────────────────
  const toDate = new Date().toISOString()
  const fromDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

  // ── Fabric queries — parallel, each degrades gracefully ───────────────────
  const [fleetRes, walletRes, complianceRes, auditRes] =
    await Promise.allSettled([
      getFleetSummary(ctx),
      getWalletBalance(ctx, `wallet-${orgId}`),
      getComplianceEvents(ctx, fromDate, toDate),
      // Audit log only for chair-level — staff cannot see transaction history
      isChair
        ? getOrgAuditLog(ctx, fromDate, toDate)
        : Promise.resolve({ success: true, data: null }),
    ])

  function extract(
    res: PromiseSettledResult<{ success: boolean; data?: unknown }>,
  ) {
    return res.status === "fulfilled" && res.value.success
      ? res.value.data
      : null
  }

  return {
    orgId,
    contextType,
    fabricUserId,
    fleet: extract(fleetRes),
    wallet: extract(walletRes),
    compliance: extract(complianceRes),
    auditLog: extract(auditRes),
    enrollmentQueue,
    dateRange: { fromDate, toDate },
  }
}
