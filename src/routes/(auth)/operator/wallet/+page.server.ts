// src/routes/(auth)/operator/wallet/+page.server.ts
//
// Operator wallet — cross-org earnings, withdrawal, B2B settlement.
//
// MIGRATION:
//   requireOperatorAccess(event) → userState check
//   get(operatorCtx) → locals.userState directly
//   session.user.id → locals.user.id
//
// HYPERLEDGER ADDITION:
//   Operator's Fabric enrollment status shown per org slot —
//   operators need an active Fabric identity to log trips on-chain.

import { redirect } from "@sveltejs/kit"
import type { Actions, PageServerLoad } from "./$types"
import { mpesa } from "$lib/server/mpesa-provider"
import { operatorWithdrawSchema, operatorSettleSchema } from "$lib/security/operator.schema"
import type {
  WalletTransaction,
  WalletSummary,
} from "$lib/features/wallet/wallet.types"
import { ACTOR_TYPES } from "$lib/features/auth/contexts/context.template"

export const load: PageServerLoad = async ({ locals }) => {
  const { userState, supabase, user } = locals

  // ── Gate ──────────────────────────────────────────────────────────────────
  if (!userState || !user) throw redirect(303, "/login")

  const operatorActorCtx = userState.activeContexts.find(
    (ctx) => ctx.type === ACTOR_TYPES.OPERATOR && ctx.status === "active",
  )
  if (!operatorActorCtx)
    throw redirect(303, "/app/dashboard?denied=operator_not_active")

  const actorId = operatorActorCtx.actorId
  const orgSlots = operatorActorCtx.orgMemberships.map((m) => ({
    orgId: m.organization_id,
    orgName: m.org_name,
    assignedVehicleIds: operatorActorCtx.fleetOwnership
      .filter((f) => f.actor_id === actorId)
      .map((f) => f.vehicle_id),
  }))

  // ── Parallel fetch ─────────────────────────────────────────────────────────
  const vehicleIds = orgSlots.flatMap((s) => s.assignedVehicleIds)

  const [txResult, tripCountResult, hlfResult] = await Promise.all([
    supabase
      .from("wallet_transactions")
      .select(
        "id, type, description, amount_kes, direction, status, mpesa_ref, counterpart, org_id, created_at",
      )
      .eq("actor_id", actorId)
      .in("type", ["operator_fee", "bonus", "withdrawal", "b2b_settlement"])
      .order("created_at", { ascending: false })
      .limit(80),

    vehicleIds.length > 0
      ? supabase
          .from("bookings")
          .select("id", { count: "exact", head: true })
          .in("vehicle_id", vehicleIds)
          .eq("status", "confirmed")
      : Promise.resolve({ count: 0 }),

    // Operator Fabric enrollment status
    supabase
      .from("hyperledger_enrollment_queue")
      .select("status, enrolled_at, fabric_user_id, last_error, msp_id")
      .eq("actor_id", actorId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])

  const transactions: (WalletTransaction & { orgId?: string })[] = (
    txResult.data ?? []
  ).map((r) => ({
    id: r.id,
    type: r.type,
    description: r.description,
    amountKes: Number(r.amount_kes),
    direction: r.direction,
    status: r.status,
    mpesaRef: r.mpesa_ref ?? null,
    counterpart: r.counterpart ?? undefined,
    createdAt: r.created_at,
    orgId: r.org_id ?? undefined,
  }))

  const orgBreakdown = orgSlots.map((slot) => {
    const slotTx = transactions.filter(
      (t) =>
        t.orgId === slot.orgId &&
        t.direction === "in" &&
        t.status === "completed",
    )
    return {
      orgId: slot.orgId,
      orgName: slot.orgName,
      earnedKes: slotTx.reduce((s, t) => s + t.amountKes, 0),
      txCount: slotTx.length,
    }
  })

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
    availableKes: Math.max(
      0,
      completedIn.reduce((s, t) => s + t.amountKes, 0) -
        completedOut.reduce((s, t) => s + t.amountKes, 0),
    ),
    pendingKes: pending.reduce((s, t) => s + t.amountKes, 0),
    totalEarnedKes: completedIn.reduce((s, t) => s + t.amountKes, 0),
    totalSpentKes: completedOut.reduce((s, t) => s + t.amountKes, 0),
    currency: "KES",
  }

  // ── Hyperledger identity status ────────────────────────────────────────────
  const hlfData = hlfResult.data
  const hlfStatus = hlfData
    ? {
        status: hlfData.status,
        enrolledAt: hlfData.enrolled_at,
        fabricId: hlfData.fabric_user_id,
        mspId: hlfData.msp_id,
        lastError: hlfData.last_error,
        // Operator can't dispatch on-chain without active Fabric identity
        canDispatch: hlfData.status === "success",
      }
    : null

  const mpesaPhone = ((userState.profile as any).phone as string | null) ?? null

  return {
    transactions,
    summary,
    orgBreakdown,
    orgSlots,
    tripCount: tripCountResult.count ?? 0,
    vehicleCount: vehicleIds.length,
    mpesaPhone,
    hlfStatus,
    actorId,
  }
}

export const actions: Actions = {
  withdraw: async ({ request, locals }) => {
    const { user, userState, supabase } = locals
    if (!user || !userState) throw redirect(303, "/login")

    const operatorCtxData = userState.activeContexts.find(
      (ctx) => ctx.type === ACTOR_TYPES.OPERATOR && ctx.status === "active",
    )
    if (!operatorCtxData)
      return { error: "No active operator account.", success: false }

    const formData = await request.formData()
    const raw = {
      amount: formData.get("amount"),
      phone: (formData.get("phone") as string)?.trim() ?? "",
    }

    const parsed = operatorWithdrawSchema.safeParse(raw)
    if (!parsed.success) return { error: parsed.error.flatten().fieldErrors, success: false }

    const amountKes = parsed.data.amount
    const phone = parsed.data.phone

    try {
      const response = await mpesa.stkPush({
        phone,
        amount: amountKes,
        account_reference: "OP_WITHDRAW",
        transaction_desc: "Operator withdrawal",
      })

      if (!response.success || !response.checkout_request_id) {
        return {
          error: "Failed to initiate withdrawal request.",
          success: false,
        }
      }

      await supabase.from("wallet_transactions").insert({
        actor_id: operatorCtxData.actorId,
        profile_id: user.id,
        type: "withdrawal",
        description: "Operator withdrawal to M-Pesa",
        amount_kes: amountKes,
        direction: "out",
        status: "pending",
        mpesa_ref: response.checkout_request_id,
      })

      await supabase.from("audit_logs").insert({
        event_type: "operator_wallet_withdrawal",
        actor_id: operatorCtxData.actorId,
        profile_id: user.id,
        performed_by: user.id,
        target_table: "wallet_transactions",
        details: {
          amount_kes: amountKes,
          phone,
          checkout_request_id: response.checkout_request_id,
        },
      })

      return {
        success: true,
        message: "Check your phone and enter your M-Pesa PIN.",
      }
    } catch (err) {
      return {
        error: `Withdrawal failed: ${err instanceof Error ? err.message : "Unknown error"}`,
        success: false,
      }
    }
  },

  settle: async ({ request, locals }) => {
    const { user, userState, supabase } = locals
    if (!user || !userState) throw redirect(303, "/login")

    const operatorCtxData = userState.activeContexts.find(
      (ctx) => ctx.type === ACTOR_TYPES.OPERATOR && ctx.status === "active",
    )
    if (!operatorCtxData)
      return { error: "No active operator account.", success: false }

    const formData = await request.formData()
    const raw = {
      amount: formData.get("amount"),
      shortcode: (formData.get("shortcode") as string)?.trim() ?? "",
      reference: (formData.get("reference") as string)?.trim() ?? null,
    }

    const parsed = operatorSettleSchema.safeParse(raw)
    if (!parsed.success) return { error: parsed.error.flatten().fieldErrors, success: false }

    const amountKes = parsed.data.amount
    const shortcode = parsed.data.shortcode
    const reference = parsed.data.reference

    try {
      const response = await mpesa.sendB2BPayment({
        shortcode,
        amount: amountKes,
        remarks: reference || "Operator B2B settlement",
        accountReference: reference || "SETTLEMENT",
      })

      await supabase.from("mpesa_settlements").insert({
        conversation_id: response.ConversationID,
        originator_id: response.OriginatorConversationID,
        shortcode,
        amount: amountKes,
        reference,
        organization_id: null,
        initiated_by: operatorCtxData.actorId,
        remarks: reference || "Operator B2B settlement",
        status: "processing",
      })

      await supabase.from("audit_logs").insert({
        event_type: "operator_b2b_settlement",
        actor_id: operatorCtxData.actorId,
        performed_by: user.id,
        target_table: "mpesa_settlements",
        details: {
          amount_kes: amountKes,
          shortcode,
          conversation_id: response.ConversationID,
        },
      })

      return {
        success: true,
        message: "Settlement initiated — typically completes within 2 minutes.",
      }
    } catch (err) {
      return {
        error: `Settlement failed: ${err instanceof Error ? err.message : "Unknown error"}`,
        success: false,
      }
    }
  },
}