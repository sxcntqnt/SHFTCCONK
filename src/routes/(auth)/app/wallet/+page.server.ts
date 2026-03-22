// src/routes/(auth)/app/wallet/+page.server.ts
//
// Passenger wallet — top-up balance, pay for bookings, receive refunds.
//
// MONEY FLOWS IN:
//   - M-Pesa STK Push top-ups (passenger loads credit)
//   - Booking refunds (cancelled trips)
//   - Cashback (future: loyalty programme)
//
// MONEY FLOWS OUT:
//   - Booking payments (deducted at reservation time)
//
// No withdrawal — passenger wallet is for in-app spending only.
// Balance lives in: profiles.wallet_balance_kes (or wallet_transactions table)

import { redirect } from "@sveltejs/kit"
import type { Actions, PageServerLoad } from "./$types"
import { requirePassengerAccess } from "$lib/security/authGuard"
import { get } from "svelte/store"
import { passengerCtx } from "$lib/features/auth/contexts"
import { processMpesaPush } from "$lib/server/mpesa-provider"
import type { WalletTransaction, WalletSummary } from "$lib/features/wallet/wallet.types"

export const load: PageServerLoad = async (event) => {
  await requirePassengerAccess(event)

  const { supabase, session } = await event.parent()
  const passenger = get(passengerCtx)
  if (!passenger) redirect(302, "/app/dashboard")

  const profileId = session!.user.id

  // ── Wallet transactions ───────────────────────────────────────────────────
  const { data: rows } = await supabase
    .from("wallet_transactions")
    .select("id, type, description, amount_kes, direction, status, mpesa_ref, counterpart, created_at")
    .eq("profile_id", profileId)
    .order("created_at", { ascending: false })
    .limit(60)

  const transactions: WalletTransaction[] = (rows ?? []).map((r) => ({
    id:          r.id,
    type:        r.type,
    description: r.description,
    amountKes:   Number(r.amount_kes),
    direction:   r.direction,
    status:      r.status,
    mpesaRef:    r.mpesa_ref ?? null,
    counterpart: r.counterpart ?? undefined,
    createdAt:   r.created_at,
  }))

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

  // Profile phone for pre-filling STK Push
  const { data: profile } = await supabase
    .from("profiles")
    .select("phone")
    .eq("id", profileId)
    .maybeSingle()

  return {
    transactions,
    summary,
    mpesaPhone: profile?.phone ?? null,
    isVerified: passenger.isVerified,
  }
}

export const actions: Actions = {
  topup: async ({ request, locals }) => {
    const { session } = await locals.safeGetSession()
    if (!session) redirect(303, "/login/sign_in")

    const supabase  = locals.supabase
    const formData  = await request.formData()
    const amountKes = Number(formData.get("amount"))
    const phone     = (formData.get("phone") as string)?.trim() ?? ""

    if (!amountKes || amountKes < 50)
      return { error: "Minimum top-up is KES 50", success: false }
    if (amountKes > 100_000)
      return { error: "Maximum single top-up is KES 100,000", success: false }
    if (!phone.match(/^\+254[17]\d{8}$/))
      return { error: "Enter a valid Kenyan phone (+254...)", success: false }

    try {
      const response = await processMpesaPush(
        phone, amountKes, "WALLET_TOPUP", "Wallet top-up",
      )

      // Record pending top-up — confirmed by STK callback
      await supabase.from("wallet_transactions").insert({
        profile_id:   session.user.id,
        type:         "top_up",
        description:  "M-Pesa wallet top-up",
        amount_kes:   amountKes,
        direction:    "in",
        status:       "pending",
        mpesa_ref:    response.CheckoutRequestID,
      })

      return {
        success:           true,
        checkoutRequestId: response.CheckoutRequestID,
        message:           "Check your phone and enter your M-Pesa PIN.",
      }
    } catch (err) {
      return { error: "Top-up failed. Please try again.", success: false }
    }
  },
}