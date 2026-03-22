// src/routes/(auth)/operator/wallet/+page.server.ts
//
// Operator wallet — cross-org fleet management earnings.
//
// MONEY FLOWS IN:
//   - operator_fee:  platform-assigned cut per trip dispatched on their routes
//   - bonus:         high vehicle utilisation bonus from platform
//
// MONEY FLOWS OUT:
//   - withdrawal:     personal M-Pesa STK Push
//   - b2b_settlement: to operator's registered business paybill
//
// NOTE: Reservation shares (KES 2/seat) are crew motivation — DRIVER and
//       CONDUCTOR only. Operators earn from trip organisation, not per-seat splits.
//
// Earnings are broken down per org slot since operators span multiple SACCOs.

import { redirect } from "@sveltejs/kit"
import type { Actions, PageServerLoad } from "./$types"
import { requireOperatorAccess } from "$lib/guards/auth.guard"
import { get } from "svelte/store"
import { operatorCtx } from "$lib/features/auth/contexts"
import { processMpesaPush, sendB2BPayment } from "$lib/server/mpesa-provider"
import type { WalletTransaction, WalletSummary } from "$lib/features/finance/wallet.types"

export const load: PageServerLoad = async (event) => {
  await requireOperatorAccess(event)

  const { supabase } = await event.parent()
  const operator = get(operatorCtx)
  if (!operator) redirect(302, "/app/dashboard")

  const actorId  = operator.actor.id
  const orgSlots = operator.orgSlots

  // ── Operator earnings from wallet_transactions ────────────────────────────
  // Types relevant to operators:
  //   operator_fee  — per-trip dispatch fee credited by platform
  //   bonus         — utilisation bonus
  //   withdrawal    — outgoing M-Pesa
  //   b2b_settlement — outgoing to business paybill
  const { data: rows } = await supabase
    .from("wallet_transactions")
    .select("id, type, description, amount_kes, direction, status, mpesa_ref, counterpart, org_id, created_at")
    .eq("actor_id", actorId)
    .in("type", ["operator_fee", "bonus", "withdrawal", "b2b_settlement"])
    .order("created_at", { ascending: false })
    .limit(80)

  const transactions: (WalletTransaction & { orgId?: string })[] = (rows ?? []).map((r) => ({
    id:          r.id,
    type:        r.type,
    description: r.description,
    amountKes:   Number(r.amount_kes),
    direction:   r.direction,
    status:      r.status,
    mpesaRef:    r.mpesa_ref ?? null,
    counterpart: r.counterpart ?? undefined,
    createdAt:   r.created_at,
    orgId:       r.org_id ?? undefined,
  }))

  // ── Per-org earnings breakdown ────────────────────────────────────────────
  const orgBreakdown = orgSlots.map((slot) => {
    const slotTx = transactions.filter(
      (t) => t.orgId === slot.orgId && t.direction === "in" && t.status === "completed",
    )
    return {
      orgId:     slot.orgId,
      orgName:   slot.orgName,
      earnedKes: slotTx.reduce((s, t) => s + t.amountKes, 0),
      txCount:   slotTx.length,
    }
  })

  // ── Summary ───────────────────────────────────────────────────────────────
  const completedIn  = transactions.filter((t) => t.direction === "in"  && t.status === "completed")
  const completedOut = transactions.filter((t) => t.direction === "out" && t.status === "completed")
  const pending      = transactions.filter((t) => t.status === "pending" || t.status === "processing")

  const summary: WalletSummary = {
    availableKes:   Math.max(0, completedIn.reduce((s, t) => s + t.amountKes, 0) - completedOut.reduce((s, t) => s + t.amountKes, 0)),
    pendingKes:     pending.reduce((s, t) => s + t.amountKes, 0),
    totalEarnedKes: completedIn.reduce((s, t) => s + t.amountKes, 0),
    totalSpentKes:  completedOut.reduce((s, t) => s + t.amountKes, 0),
    currency:       "KES",
  }

  // ── Trip count across all org slots ──────────────────────────────────────
  // Count trips dispatched from vehicles in the operator's allocation
  const vehicleIds = orgSlots.flatMap((s) => s.assignedVehicleIds)

  const { count: tripCount } = vehicleIds.length
    ? await supabase
        .from("bookings")
        .select("id", { count: "exact", head: true })
        .in("vehicle_id", vehicleIds)
        .eq("status", "confirmed")
    : { count: 0 }

  return {
    transactions,
    summary,
    orgBreakdown,
    orgSlots,
    tripCount:   tripCount ?? 0,
    vehicleCount: vehicleIds.length,
    mpesaPhone:  operator.actor.metadata?.mpesa_phone as string ?? null,
  }
}

export const actions: Actions = {
  withdraw: async ({ request, locals }) => {
    const { session } = await locals.safeGetSession()
    if (!session) redirect(303, "/login/sign_in")

    const supabase  = locals.supabase
    const formData  = await request.formData()
    const amountKes = Number(formData.get("amount"))
    const phone     = (formData.get("phone") as string)?.trim() ?? ""

    if (!amountKes || amountKes < 10)
      return { error: "Minimum withdrawal is KES 10", success: false }
    if (amountKes > 150_000)
      return { error: "Maximum withdrawal is KES 150,000", success: false }
    if (!phone.match(/^\+254[17]\d{8}$/))
      return { error: "Enter a valid Kenyan phone (+254...)", success: false }

    try {
      const response = await processMpesaPush(
        phone, amountKes, "OP_WITHDRAW", "Operator withdrawal",
      )

      const operator = get(operatorCtx)
      await supabase.from("wallet_transactions").insert({
        actor_id:    operator?.actor.id,
        profile_id:  session.user.id,
        type:        "withdrawal",
        description: "Operator withdrawal to M-Pesa",
        amount_kes:  amountKes,
        direction:   "out",
        status:      "pending",
        mpesa_ref:   response.CheckoutRequestID,
      })

      await supabase.from("audit_logs").insert({
        event_type:   "operator_wallet_withdrawal",
        actor_id:     operator?.actor.id,
        profile_id:   session.user.id,
        performed_by: session.user.id,
        target_table: "wallet_transactions",
        details:      { amount_kes: amountKes, phone, checkout_request_id: response.CheckoutRequestID },
      })

      return { success: true, message: "Check your phone and enter your M-Pesa PIN." }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error"
      return { error: `Withdrawal failed: ${message}`, success: false }
    }
  },

  settle: async ({ request, locals }) => {
    const { session } = await locals.safeGetSession()
    if (!session) redirect(303, "/login/sign_in")

    const supabase  = locals.supabase
    const formData  = await request.formData()
    const amountKes = Number(formData.get("amount"))
    const shortcode = (formData.get("shortcode") as string)?.trim() ?? ""
    const reference = (formData.get("reference") as string)?.trim() ?? ""

    if (!amountKes || amountKes < 100)
      return { error: "Minimum settlement is KES 100", success: false }
    if (!shortcode.match(/^\d{5,6}$/))
      return { error: "Enter a valid 5–6 digit paybill or till number", success: false }

    try {
      const response = await sendB2BPayment({
        shortcode, amount: amountKes,
        remarks:          reference || "Operator B2B settlement",
        accountReference: reference || "SETTLEMENT",
      })

      const operator = get(operatorCtx)
      await supabase.from("mpesa_settlements").insert({
        conversation_id:  response.ConversationID,
        originator_id:    response.OriginatorConversationID,
        shortcode, amount: amountKes, reference,
        organization_id:  operator?.activeOrgId ?? null,
        initiated_by:     operator?.actor.id ?? null,
        remarks:          reference || "Operator B2B settlement",
        status:           "processing",
      })

      await supabase.from("audit_logs").insert({
        event_type:   "operator_b2b_settlement",
        actor_id:     operator?.actor.id,
        performed_by: session.user.id,
        target_table: "mpesa_settlements",
        details:      { amount_kes: amountKes, shortcode, conversation_id: response.ConversationID },
      })

      return { success: true, message: "Settlement initiated — typically completes within 2 minutes." }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error"
      return { error: `Settlement failed: ${message}`, success: false }
    }
  },
}