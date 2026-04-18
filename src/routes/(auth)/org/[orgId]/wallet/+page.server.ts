// src/routes/(auth)/org/[orgId]/wallet/+page.server.ts
//
// Org (SACCO) treasury — levy income, B2B settlement.
//
// MIGRATION:
//   requireOrgPermission → userState + permission check via extractPermissions
//   get(orgChairCtx) / get(orgCtx) → locals.userState directly
//   session.user.id → locals.user.id
//
// HYPERLEDGER ADDITION:
//   Org's Fabric registration status shown — org must be registered
//   on-chain to participate in verified trip logging.

import { redirect } from "@sveltejs/kit"
import type { Actions, PageServerLoad } from "./$types"
import { mpesa } from "$lib/server/mpesa-provider"
import { orgSettleSchema } from "$lib/security/orgWallet.schema"
import { DEFAULT_REVENUE_CONFIG } from "$lib/server/revenue-config"
import type {
  WalletTransaction,
  WalletSummary,
} from "$lib/features/wallet/wallet.types"
import {
  ACTOR_TYPES,
  ORG_STAFF_TYPES,
} from "$lib/features/auth/contexts/context.template"

export const load: PageServerLoad = async ({ params, locals }) => {
  const { userState, supabase, user } = locals
  const { orgId } = params

  // ── Gate ──────────────────────────────────────────────────────────────────
  if (!userState || !user) throw redirect(303, "/login")

  const actorCtx = userState.activeContexts.find((ctx) => {
    if (ctx.status !== "active") return false

    if (
      [
        ACTOR_TYPES.SUPER_ADMIN,
        ACTOR_TYPES.ADMIN,
        ACTOR_TYPES.ORG_CHAIR,
      ].includes(ctx.type as any)
    ) {
      return ctx.jurisdictions.some(
        (j) =>
          j.level === "federal" || (j.level === "org" && j.scope_id === orgId),
      )
    }

    if (ORG_STAFF_TYPES.includes(ctx.type)) {
      return ctx.permissions.some(
        (p) =>
          p.action === "finance.list" &&
          p.effect === "allow" &&
          (p.scope_id === orgId || p.level === "federal"),
      )
    }

    return false
  })

  if (!actorCtx)
    throw redirect(303, `/org/${orgId}/dashboard?denied=finance.list`)

  const isChair = [
    ACTOR_TYPES.SUPER_ADMIN,
    ACTOR_TYPES.ADMIN,
    ACTOR_TYPES.ORG_CHAIR,
  ].includes(actorCtx.type as any)

  const orgMembership = actorCtx.orgMemberships.find(
    (m) => m.organization_id === orgId,
  )
  const orgName = orgMembership?.org_name ?? "SACCO"

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // ── Parallel fetch ─────────────────────────────────────────────────────────
  const [reconResult, settlementResult, hlfResult] = await Promise.all([
    supabase
      .from("reconciliation_events")
      .select(
        "id, vehicle_id, total_collected, expected_amount, variance, status, created_at",
      )
      .eq("organization_id", orgId)
      .order("created_at", { ascending: false })
      .limit(100),

    supabase
      .from("mpesa_settlements")
      .select("id, amount, status, transaction_id, created_at, remarks")
      .eq("organization_id", orgId)
      .order("created_at", { ascending: false })
      .limit(50),

    supabase
      .from("hyperledger_enrollment_queue")
      .select("status, enrolled_at, fabric_user_id, msp_id, last_error")
      .eq("intent", "org")
      .eq("status", "success")
      .limit(1)
      .maybeSingle(),
  ])

  const levyRate = DEFAULT_REVENUE_CONFIG.daily.saccoLevyRate

  const levyTransactions: WalletTransaction[] = (reconResult.data ?? []).map(
    (r) => {
      const base = Math.min(
        Number(r.total_collected),
        Number(r.expected_amount),
      )
      const levyEarned = Math.floor(base * levyRate)
      return {
        id: `levy-${r.id}`,
        type: "sacco_levy",
        description: `Vehicle levy · ${r.vehicle_id.slice(0, 8)}`,
        amountKes: levyEarned,
        direction: "in",
        status: "completed",
        mpesaRef: null,
        createdAt: r.created_at,
      }
    },
  )

  const settlementTx: WalletTransaction[] = (settlementResult.data ?? []).map(
    (r) => ({
      id: r.id,
      type: "settlement_received",
      description: r.remarks ?? "Settlement",
      amountKes: Number(r.amount),
      direction: r.status === "completed" ? "in" : "out",
      status:
        r.status === "completed"
          ? "completed"
          : r.status === "failed"
            ? "failed"
            : "pending",
      mpesaRef: r.transaction_id ?? null,
      createdAt: r.created_at,
    }),
  )

  const transactions = [...levyTransactions, ...settlementTx].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  )

  const completedIn = transactions.filter(
    (t) => t.direction === "in" && t.status === "completed",
  )
  const completedOut = transactions.filter(
    (t) => t.direction === "out" && t.status === "completed",
  )
  const pending = transactions.filter(
    (t) => t.status === "pending" || t.status === "processing",
  )

  const summary: WalletSummary = {
    availableKes:
      completedIn.reduce((s, t) => s + t.amountKes, 0) -
      completedOut.reduce((s, t) => s + t.amountKes, 0),
    pendingKes: pending.reduce((s, t) => s + t.amountKes, 0),
    totalEarnedKes: completedIn.reduce((s, t) => s + t.amountKes, 0),
    totalSpentKes: completedOut.reduce((s, t) => s + t.amountKes, 0),
    currency: "KES",
  }

  const todayLevy = levyTransactions
    .filter((t) => new Date(t.createdAt) >= today)
    .reduce((s, t) => s + t.amountKes, 0)

  const vehicleCount = new Set(
    (reconResult.data ?? []).map((r) => r.vehicle_id),
  ).size

  const hlfData = hlfResult.data
  const hlfStatus = hlfData
    ? {
        registered: true,
        enrolledAt: hlfData.enrolled_at,
        fabricId: hlfData.fabric_user_id,
        mspId: hlfData.msp_id,
        canValidate: true,
      }
    : {
        registered: false,
        enrolledAt: null,
        fabricId: null,
        mspId: null,
        canValidate: false,
      }

  return {
    transactions,
    summary,
    orgId,
    orgName,
    todayLevy,
    vehicleCount,
    levyRate,
    isChair,
    hlfStatus,
    actorId: actorCtx.actorId,
  }
}

export const actions: Actions = {
  settle: async ({ request, params, locals }) => {
    const { user, userState, supabase } = locals
    if (!user || !userState) throw redirect(303, "/login")

    const { orgId } = params

    const canSettle = userState.activeContexts.some((ctx) => {
      if (ctx.status !== "active") return false
      if (
        [
          ACTOR_TYPES.SUPER_ADMIN,
          ACTOR_TYPES.ADMIN,
          ACTOR_TYPES.ORG_CHAIR,
        ].includes(ctx.type as any)
      )
        return true
      return ctx.permissions.some(
        (p) =>
          (p.action === "finance.edit" || p.action === "finance.add") &&
          p.effect === "allow" &&
          (p.scope_id === orgId || p.level === "federal"),
      )
    })
    if (!canSettle)
      return {
        error: "You do not have permission to initiate settlements.",
        success: false,
      }

    const formData = await request.formData()
    const raw = {
      amount: formData.get("amount"),
      shortcode: (formData.get("shortcode") as string)?.trim() ?? "",
      reference: (formData.get("reference") as string)?.trim() ?? null,
    }

    const parsed = orgSettleSchema.safeParse(raw)
    if (!parsed.success) return { error: parsed.error.flatten().fieldErrors, success: false }

    const amountKes = parsed.data.amount
    const shortcode = parsed.data.shortcode
    const reference = parsed.data.reference

    const startOfDay = new Date()
    startOfDay.setHours(0, 0, 0, 0)
    const { data: todaySettlements } = await supabase
      .from("mpesa_settlements")
      .select("amount")
      .eq("organization_id", orgId)
      .in("status", ["processing", "completed"])
      .gte("created_at", startOfDay.toISOString())

    const todayTotal = (todaySettlements ?? []).reduce(
      (s, r) => s + Number(r.amount),
      0,
    )
    if (todayTotal + amountKes > 10_000_000)
      return {
        error: "Daily settlement limit would be exceeded",
        success: false,
      }

    try {
      const response = await mpesa.sendB2BPayment({
        shortcode,
        amount: amountKes,
        remarks: reference || "SACCO settlement",
        accountReference: reference || "SETTLEMENT",
      })

      const initiatingCtx = userState.activeContexts.find(
        (ctx) =>
          ctx.status === "active" &&
          ctx.jurisdictions.some(
            (j) => j.scope_id === orgId || j.level === "federal",
          ),
      )

      await supabase.from("mpesa_settlements").insert({
        conversation_id: response.ConversationID,
        originator_id: response.OriginatorConversationID,
        shortcode,
        amount: amountKes,
        reference,
        organization_id: orgId,
        initiated_by: initiatingCtx?.actorId ?? null,
        remarks: reference || "SACCO settlement",
        status: "processing",
      })

      await supabase.from("audit_logs").insert({
        event_type: "org_b2b_settlement_initiated",
        actor_id: initiatingCtx?.actorId ?? null,
        performed_by: user.id,
        target_table: "mpesa_settlements",
        details: {
          org_id: orgId,
          amount_kes: amountKes,
          shortcode,
          conversation_id: response.ConversationID,
        },
      })

      return {
        success: true,
        message:
          "Settlement initiated. Funds typically arrive within 2 minutes.",
      }
    } catch (err) {
      return {
        error: `Settlement failed: ${err instanceof Error ? err.message : "Unknown error"}`,
        success: false,
      }
    }
  },
}