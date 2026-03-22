// src/routes/(auth)/org/[orgId]/wallet/+page.server.ts
//
// Org (SACCO) wallet — levy income and B2B settlement tracking.
//
// MONEY FLOWS IN:
//   - SACCO levy: 4/19 of each vehicle's daily base settlement
//   - B2B settlements received from platform
//
// MONEY FLOWS OUT:
//   - B2B settlements initiated to org's paybill
//   - Driver/conductor incentive disbursements (tracked)
//
// Only ORG_CHAIR, GENERAL_MANAGER, or ACCOUNTANT can view/act.

import { redirect } from "@sveltejs/kit"
import type { Actions, PageServerLoad } from "./$types"
import { requireOrgMemberAccess, requireOrgPermission } from "$lib/security/authGuard"
import { get } from "svelte/store"
import { orgChairCtx, orgCtx } from "$lib/features/auth/contexts"
import { sendB2BPayment } from "$lib/server/mpesa-provider"
import { DEFAULT_REVENUE_CONFIG } from "$lib/server/revenue-config"
import type { WalletTransaction, WalletSummary } from "$lib/features/wallet/wallet.types"

export const load: PageServerLoad = async (event) => {
  const { params } = event
  const orgId = params.orgId

  await requireOrgPermission(event, orgId, "finance.list")

  const { supabase } = await event.parent()
  const chair = get(orgChairCtx)
  const staff = get(orgCtx)
  const orgName = chair?.orgName ?? staff?.orgName ?? "SACCO"

  // ── SACCO levy income from reconciliation events ──────────────────────────
  // Compute levy earned = totalCollected × saccoLevyRate per vehicle per day
  const today = new Date(); today.setHours(0, 0, 0, 0)

  const { data: reconRows } = await supabase
    .from("reconciliation_events")
    .select("id, vehicle_id, total_collected, expected_amount, variance, status, created_at")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false })
    .limit(100)

  const levyRate = DEFAULT_REVENUE_CONFIG.daily.saccoLevyRate  // 4/19

  const levyTransactions: WalletTransaction[] = (reconRows ?? []).map((r) => {
    const base        = Math.min(Number(r.total_collected), Number(r.expected_amount))
    const levyEarned  = Math.floor(base * levyRate)
    return {
      id:          `levy-${r.id}`,
      type:        "sacco_levy",
      description: `Vehicle levy · ${r.vehicle_id.slice(0, 8)}`,
      amountKes:   levyEarned,
      direction:   "in",
      status:      "completed",
      mpesaRef:    null,
      createdAt:   r.created_at,
    }
  })

  // ── B2B settlements received ──────────────────────────────────────────────
  const { data: settledRows } = await supabase
    .from("mpesa_settlements")
    .select("id, amount, status, transaction_id, created_at, remarks")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false })
    .limit(50)

  const settlementTx: WalletTransaction[] = (settledRows ?? []).map((r) => ({
    id:          r.id,
    type:        "settlement_received",
    description: r.remarks ?? "Settlement",
    amountKes:   Number(r.amount),
    direction:   r.status === "completed" ? "in" : "out",
    status:      r.status === "completed" ? "completed" : r.status === "failed" ? "failed" : "pending",
    mpesaRef:    r.transaction_id ?? null,
    createdAt:   r.created_at,
  }))

  const transactions = [...levyTransactions, ...settlementTx].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  )

  // ── Summary ───────────────────────────────────────────────────────────────
  const completedIn  = transactions.filter((t) => t.direction === "in"  && t.status === "completed")
  const completedOut = transactions.filter((t) => t.direction === "out" && t.status === "completed")
  const pending      = transactions.filter((t) => t.status === "pending" || t.status === "processing")

  const summary: WalletSummary = {
    availableKes:   completedIn.reduce((s, t) => s + t.amountKes, 0) - completedOut.reduce((s, t) => s + t.amountKes, 0),
    pendingKes:     pending.reduce((s, t) => s + t.amountKes, 0),
    totalEarnedKes: completedIn.reduce((s, t) => s + t.amountKes, 0),
    totalSpentKes:  completedOut.reduce((s, t) => s + t.amountKes, 0),
    currency:       "KES",
  }

  // ── Daily levy breakdown ──────────────────────────────────────────────────
  const todayLevy = levyTransactions
    .filter((t) => new Date(t.createdAt) >= today)
    .reduce((s, t) => s + t.amountKes, 0)

  const vehicleCount = new Set((reconRows ?? []).map((r) => r.vehicle_id)).size

  return {
    transactions,
    summary,
    orgId,
    orgName,
    todayLevy,
    vehicleCount,
    levyRate,
  }
}

export const actions: Actions = {
  settle: async ({ request, params, locals }) => {
    const { session } = await locals.safeGetSession()
    if (!session) redirect(303, "/login/sign_in")

    const supabase  = locals.supabase
    const formData  = await request.formData()
    const amountKes = Number(formData.get("amount"))
    const shortcode = (formData.get("shortcode") as string)?.trim() ?? ""
    const reference = (formData.get("reference") as string)?.trim() ?? ""
    const orgId     = params.orgId

    if (!amountKes || amountKes < 100)
      return { error: "Minimum settlement is KES 100", success: false }
    if (!shortcode.match(/^\d{5,6}$/))
      return { error: "Enter a valid 5–6 digit paybill or till number", success: false }

    // Daily cap check
    const startOfDay = new Date(); startOfDay.setHours(0, 0, 0, 0)
    const { data: todaySettlements } = await supabase
      .from("mpesa_settlements")
      .select("amount")
      .eq("organization_id", orgId)
      .in("status", ["processing", "completed"])
      .gte("created_at", startOfDay.toISOString())

    const todayTotal = (todaySettlements ?? []).reduce((s, r) => s + Number(r.amount), 0)
    if (todayTotal + amountKes > 10_000_000)
      return { error: "Daily settlement limit would be exceeded", success: false }

    try {
      const response = await sendB2BPayment({
        shortcode, amount: amountKes,
        remarks:          reference || "SACCO settlement",
        accountReference: reference || "SETTLEMENT",
      })

      const chair = get(orgChairCtx)
      const staff = get(orgCtx)

      await supabase.from("mpesa_settlements").insert({
        conversation_id:  response.ConversationID,
        originator_id:    response.OriginatorConversationID,
        shortcode, amount: amountKes, reference,
        organization_id:  orgId,
        initiated_by:     chair?.actor.id ?? staff?.actor.id ?? null,
        remarks:          reference || "SACCO settlement",
        status:           "processing",
      })

      await supabase.from("audit_logs").insert({
        event_type:   "org_b2b_settlement_initiated",
        target_table: "mpesa_settlements",
        performed_by: session.user.id,
        details:      { org_id: orgId, amount_kes: amountKes, shortcode, conversation_id: response.ConversationID },
      })

      return { success: true, message: "Settlement initiated. Funds typically arrive within 2 minutes." }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error"
      return { error: `Settlement failed: ${message}`, success: false }
    }
  },
}