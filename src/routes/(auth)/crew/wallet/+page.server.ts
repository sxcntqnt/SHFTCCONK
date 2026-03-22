// src/routes/(auth)/crew/wallet/+page.server.ts
//
// Crew wallet — tip shares and reservation motivation shares.
//
// MONEY FLOWS IN:
//   - Tip share:         10% of each tip paid by a passenger
//   - Reservation share: KES 2 per seat on digital bookings on their vehicle
//
// MONEY FLOWS OUT:
//   - Withdrawal: STK Push to crew member's personal M-Pesa phone
//
// Route: /crew/wallet
// Guard: requireCrewAccess → crewCtx already activated by guard

import { redirect } from "@sveltejs/kit"
import type { Actions, PageServerLoad } from "./$types"
import { requireCrewAccess } from "$lib/guards/auth.guard"
import { get } from "svelte/store"
import { crewCtx } from "$lib/features/auth/contexts"
import { processMpesaPush } from "$lib/server/mpesa-provider"
import { DEFAULT_REVENUE_CONFIG } from "$lib/server/revenue-config"
import type { WalletTransaction, WalletSummary } from "$lib/features/finance/wallet.types"

export const load: PageServerLoad = async (event) => {
  // requireCrewAccess activates crewCtx — no second activate needed
  await requireCrewAccess(event)

  const { supabase, session } = await event.parent()
  const crew = get(crewCtx)
  if (!crew) redirect(302, "/crew/dashboard")

  const actorId  = crew.actor.id
  const crewType = crew.crewType   // "DRIVER" | "CONDUCTOR"

  // ── Tip payouts received (B2C from platform → this crew member) ───────────
  const { data: tipRows } = await supabase
    .from("mpesa_payouts")
    .select("id, amount, status, transaction_id, remarks, created_at")
    .eq("actor_id", actorId)
    .order("created_at", { ascending: false })
    .limit(60)

  const tipTx: WalletTransaction[] = (tipRows ?? []).map((p) => ({
    id:          p.id,
    type:        "tip_share",
    description: p.remarks ?? "Tip share",
    amountKes:   Number(p.amount),
    direction:   "in",
    status:      p.status === "completed" ? "completed"
                 : p.status === "failed"  ? "failed"
                 : "pending",
    mpesaRef:    p.transaction_id ?? null,
    createdAt:   p.created_at,
  }))

  // ── Reservation fee shares from bookings on this vehicle ──────────────────
  // KES 2 per seat for the crew member's role
  const perSeatShare = crewType === "DRIVER"
    ? Math.floor(DEFAULT_REVENUE_CONFIG.reservation.totalFeeKes * DEFAULT_REVENUE_CONFIG.reservation.driverRate)
    : Math.floor(DEFAULT_REVENUE_CONFIG.reservation.totalFeeKes * DEFAULT_REVENUE_CONFIG.reservation.conductorRate)

  const { data: bookingRows } = crew.activeVehicleId
    ? await supabase
        .from("bookings")
        .select("id, metadata, created_at")
        .eq("vehicle_id", crew.activeVehicleId)
        .eq("status", "confirmed")
        .order("created_at", { ascending: false })
        .limit(40)
    : { data: [] }

  const resTx: WalletTransaction[] = (bookingRows ?? []).map((b) => {
    const seats  = (b.metadata as { seats?: number } | null)?.seats ?? 1
    return {
      id:          `res-${b.id}`,
      type:        "reservation_share",
      description: `Reservation share · ${seats} seat${seats !== 1 ? "s" : ""}`,
      amountKes:   perSeatShare * seats,
      direction:   "in",
      status:      "completed",
      mpesaRef:    null,
      createdAt:   b.created_at,
    }
  })

  // ── Withdrawals out ───────────────────────────────────────────────────────
  const { data: withdrawRows } = await supabase
    .from("mpesa_payouts")
    .select("id, amount, status, transaction_id, created_at")
    .eq("actor_id", actorId)
    .eq("remarks", "Wallet withdrawal")
    .order("created_at", { ascending: false })
    .limit(20)

  const withdrawTx: WalletTransaction[] = (withdrawRows ?? []).map((w) => ({
    id:          `wd-${w.id}`,
    type:        "withdrawal",
    description: "Withdrawal to M-Pesa",
    amountKes:   Number(w.amount),
    direction:   "out",
    status:      w.status === "completed" ? "completed"
                 : w.status === "failed"  ? "failed"
                 : "pending",
    mpesaRef:    w.transaction_id ?? null,
    createdAt:   w.created_at,
  }))

  // ── Merge and sort ────────────────────────────────────────────────────────
  const transactions = [...tipTx, ...resTx, ...withdrawTx].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  )

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

  return {
    transactions,
    summary,
    crewType,
    perSeatShare,
    mpesaPhone: crew.actor.metadata?.mpesa_phone as string ?? null,
    vehiclePlate: crew.activeVehiclePlate,
  }
}

export const actions = {
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

    const crew = get(crewCtx)
    if (!crew) return { error: "Session expired", success: false }

    try {
      const response = await processMpesaPush(
        phone, amountKes, "CREW_WITHDRAW", "Crew wallet withdrawal",
      )

      await supabase.from("mpesa_payouts").insert({
        conversation_id:  response.CheckoutRequestID,
        actor_id:         crew.actor.id,
        phone,
        amount:           amountKes,
        role:             crew.crewType,
        organization_id:  crew.orgId,
        remarks:          "Wallet withdrawal",
        status:           "processing",
      })

      await supabase.from("audit_logs").insert({
        event_type:   "crew_wallet_withdrawal",
        actor_id:     crew.actor.id,
        profile_id:   session.user.id,
        performed_by: session.user.id,
        target_table: "mpesa_payouts",
        details:      { amount_kes: amountKes, phone, checkout_request_id: response.CheckoutRequestID },
      })

      return {
        success: true,
        message: "Check your phone and enter your M-Pesa PIN to complete the withdrawal.",
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error"
      console.error("[crew wallet withdraw]", message)
      return { error: "Withdrawal failed. Please try again.", success: false }
    }
  },
}