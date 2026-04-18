// src/routes/(auth)/app/wallet/+page.server.ts
//
// Passenger wallet — top-up, booking payments, refunds.
//
// MIGRATION:
//   requirePassengerAccess(event) → userState check
//   get(passengerCtx) → locals.userState directly
//   profiles.phone → added via migration
//
// PLAN NUDGE:
//   Free plan passengers must manually refresh their Fabric identity
//   when certificates expire (annual). Subscribed passengers get
//   automatic re-enrollment via the queue processor.
//
// HYPERLEDGER ADDITION:
//   Passenger's enrollment status shown — for identity assurance badge.

import { redirect } from "@sveltejs/kit"
import { topupSchema } from "$lib/security/wallet.schema"
import type { Actions, PageServerLoad } from "./$types"
import { mpesa } from "$lib/server/mpesa-provider"
import type {
  WalletTransaction,
  WalletSummary,
} from "$lib/features/wallet/wallet.types"
import { ACTOR_TYPES } from "$lib/features/auth/contexts/context.template"

export const load: PageServerLoad = async ({ locals }) => {
  const { userState, supabase, user } = locals

  // ── Gate ──────────────────────────────────────────────────────────────────
  if (!userState || !user) throw redirect(303, "/login")

  // Passengers and guests can access the wallet page
  const passengerCtx = userState.activeContexts.find(
    (ctx) =>
      [ACTOR_TYPES.PASSENGER, ACTOR_TYPES.GUEST].includes(ctx.type as any) &&
      ctx.status === "active",
  )
  if (!passengerCtx) throw redirect(303, "/onboarding")

  const profileId = user.id

  // ── Parallel fetch ─────────────────────────────────────────────────────────
  const [txResult, profileResult, mpesaResult, hlfResult] = await Promise.all([
    supabase
      .from("wallet_transactions")
      .select(
        "id, type, description, amount_kes, direction, status, mpesa_ref, counterpart, created_at",
      )
      .eq("profile_id", profileId)
      .order("created_at", { ascending: false })
      .limit(60),

    // Phone for STK push pre-fill
    supabase.from("profiles").select("phone").eq("id", profileId).maybeSingle(),

    // Plan / subscription status from mpesa_customers
    supabase
      .from("mpesa_customers")
      .select(
        "subscription_status, is_minor_account, daily_limit, per_transaction_limit",
      )
      .eq("user_id", profileId)
      .maybeSingle(),

    // Hyperledger enrollment status for this passenger actor
    supabase
      .from("hyperledger_enrollment_queue")
      .select("status, enrolled_at, fabric_user_id, last_error, attempts")
      .eq("actor_id", passengerCtx.actorId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])

  const transactions: WalletTransaction[] = (txResult.data ?? []).map((r) => ({
    id: r.id,
    type: r.type,
    description: r.description,
    amountKes: Number(r.amount_kes),
    direction: r.direction,
    status: r.status,
    mpesaRef: r.mpesa_ref ?? null,
    counterpart: r.counterpart ?? undefined,
    createdAt: r.created_at,
  }))

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

  // ── Plan status ────────────────────────────────────────────────────────────
  const mpesaData = mpesaResult.data
  const isSubscribed = mpesaData?.subscription_status === "active"
  const isMinor = mpesaData?.is_minor_account ?? false

  // ── Hyperledger identity status ────────────────────────────────────────────
  // Passengers don't get Fabric enrolled (passenger intent = kyc_light only,
  // no chaincode role). This field will be null for most passengers.
  // Kept for future: if passenger gets a crew/operator role later.
  const hlfStatus = hlfResult.data
    ? {
        status: hlfResult.data.status,
        enrolledAt: hlfResult.data.enrolled_at,
        fabricId: hlfResult.data.fabric_user_id,
      }
    : null

  return {
    transactions,
    summary,
    mpesaPhone: profileResult.data?.phone ?? null,
    isVerified: passengerCtx.type === ACTOR_TYPES.PASSENGER,
    isSubscribed,
    isMinor,
    dailyLimit: mpesaData?.daily_limit ?? null,
    perTransactionLimit: mpesaData?.per_transaction_limit ?? null,
    hlfStatus,
    // Nudge: free plan users must manually refresh Fabric identity on expiry
    showPlanNudge: !isSubscribed,
  }
}

export const actions: Actions = {
  topup: async ({ request, locals }) => {
    const { user } = locals
    if (!user) throw redirect(303, "/login")

    const supabase = locals.supabase
    const formData = await request.formData()
    const raw = { amount: formData.get("amount"), phone: formData.get("phone") }
    const parsed = topupSchema.safeParse(raw)
    if (!parsed.success) {
      return { error: parsed.error.flatten().formErrors.join(" ") || "Invalid input", success: false }
    }

    const amountKes = parsed.data.amount
    const phone = parsed.data.phone

    // M-PESA GO per-transaction limit check
    const { data: mpesaData } = await supabase
      .from("mpesa_customers")
      .select("per_transaction_limit, is_minor_account")
      .eq("user_id", user.id)
      .maybeSingle()

    if (mpesaData?.is_minor_account && mpesaData.per_transaction_limit) {
      if (amountKes > mpesaData.per_transaction_limit) {
        return {
          error: `Amount exceeds your M-PESA GO per-transaction limit of KES ${mpesaData.per_transaction_limit.toLocaleString()}`,
          success: false,
        }
      }
    }

    try {
      const response = await mpesa.stkPush({
        phone,
        amount: amountKes,
        account_reference: "WALLET_TOPUP",
        transaction_desc: "Wallet top-up",
      })

      if (!response.success || !response.checkout_request_id) {
        return {
          error: "Failed to initiate M-Pesa request. Try again.",
          success: false,
        }
      }

      await supabase.from("wallet_transactions").insert({
        profile_id: user.id,
        type: "top_up",
        description: "M-Pesa wallet top-up",
        amount_kes: amountKes,
        direction: "in",
        status: "pending",
        mpesa_ref: response.checkout_request_id,
      })

      return {
        success: true,
        checkoutRequestId: response.checkout_request_id,
        message: "Check your phone and enter your M-Pesa PIN.",
      }
    } catch (err) {
      console.error("Top-up error:", err)
      return { error: "Top-up failed. Please try again.", success: false }
    }
  },

  // Manual identity refresh for free plan passengers
  refreshIdentity: async ({ locals }) => {
    const { user, userState, supabaseServiceRole } = locals
    if (!user || !userState) throw redirect(303, "/login")

    const passengerActorCtx = userState.activeContexts.find(
      (ctx) => ctx.type === ACTOR_TYPES.PASSENGER && ctx.status === "active",
    )
    if (!passengerActorCtx)
      return { error: "No active passenger actor.", success: false }

    // Check subscription — subscribed users don't need manual refresh
    const { data: mpesa } = await supabaseServiceRole
      .from("mpesa_customers")
      .select("subscription_status")
      .eq("user_id", user.id)
      .maybeSingle()

    if (mpesa?.subscription_status === "active") {
      return {
        error: "Subscribed users refresh automatically.",
        success: false,
      }
    }

    // Check for existing pending/processing refresh
    const { data: existing } = await supabaseServiceRole
      .from("hyperledger_enrollment_queue")
      .select("id, status")
      .eq("actor_id", passengerActorCtx.actorId)
      .in("status", ["pending", "retrying", "processing"])
      .maybeSingle()

    if (existing) {
      return { error: "A refresh is already in progress.", success: false }
    }

    // Queue a fresh enrollment — processor handles it
    const { error: queueError } = await supabaseServiceRole
      .from("hyperledger_enrollment_queue")
      .insert({
        actor_id: passengerActorCtx.actorId,
        profile_id: user.id,
        intent: "passenger",
        event_name: "enroll_crew_member", // passenger re-enrollment event
        status: "pending",
      })

    if (queueError) {
      return {
        error: "Failed to queue refresh. Please try again.",
        success: false,
      }
    }

    return {
      success: true,
      message: "Identity refresh queued. This usually takes a few minutes.",
    }
  },
}