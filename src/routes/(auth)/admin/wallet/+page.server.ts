// src/routes/(auth)/admin/wallet/+page.server.ts
//
// Platform (admin) wallet — sxcntqnt revenue dashboard.
//
// MONEY FLOWS IN (all platform cuts):
//   - Reservation fee platform share: KES 15 per seat (15/19)
//   - Tip platform cut: 80% of each tip
//   - Daily excess platform cut: 80% of each vehicle's excess above target
//   - Plan subscription revenue (KES 1,499/mo Pro, Fleet custom)
//
// MONEY FLOWS OUT:
//   - B2C payouts to crew (tips — 10% each, tracked here for accounting)
//   - B2B settlements to SACCOs
//
// This is a READ-ONLY reporting wallet — no withdrawal actions.
// Actual funds flow through Safaricom Daraja under the platform shortcode.

import { redirect } from "@sveltejs/kit"
import type { PageServerLoad } from "./$types"
import { requireAdminAccess } from "$lib/guards/auth.guard"
import { DEFAULT_REVENUE_CONFIG, calculateReservationSplit, calculateTipSplit } from "$lib/server/revenue-config"
import type { WalletTransaction, WalletSummary } from "$lib/features/finance/wallet.types"

export const load: PageServerLoad = async (event) => {
  await requireAdminAccess(event)

  const { supabase } = await event.parent()

  // ── Date range helpers ────────────────────────────────────────────────────
  const now        = new Date()
  const startMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const startToday = new Date(now); startToday.setHours(0, 0, 0, 0)

  // ── 1. Reservation fee revenue ────────────────────────────────────────────
  // Pull confirmed bookings this month — compute platform cut per seat
  const { data: bookings } = await supabase
    .from("bookings")
    .select("id, seats, created_at")
    .eq("status", "confirmed")
    .gte("created_at", startMonth.toISOString())

  const reservationTx: WalletTransaction[] = (bookings ?? []).map((b) => {
    const seats   = (b as { seats?: number }).seats ?? 1
    const split   = calculateReservationSplit(DEFAULT_REVENUE_CONFIG.reservation, seats)
    return {
      id:          `res-${b.id}`,
      type:        "platform_cut",
      description: `Reservation fee · ${seats} seat${seats !== 1 ? "s" : ""}`,
      amountKes:   split.platformKes,
      direction:   "in",
      status:      "completed",
      mpesaRef:    null,
      createdAt:   b.created_at,
    }
  })

  // ── 2. B2C tip payouts sent (outflow — platform disbursed to crew) ─────────
  const { data: tipPayouts } = await supabase
    .from("mpesa_payouts")
    .select("id, amount, status, transaction_id, role, created_at")
    .gte("created_at", startMonth.toISOString())
    .order("created_at", { ascending: false })

  const tipOutTx: WalletTransaction[] = (tipPayouts ?? []).map((p) => ({
    id:          `payout-${p.id}`,
    type:        "b2c_payout",
    description: `Tip payout · ${p.role}`,
    amountKes:   Number(p.amount),
    direction:   "out",
    status:      p.status === "completed" ? "completed" : p.status === "failed" ? "failed" : "pending",
    mpesaRef:    p.transaction_id ?? null,
    createdAt:   p.created_at,
  }))

  // ── 3. B2B settlements sent (outflow — platform to SACCOs) ───────────────
  const { data: settlements } = await supabase
    .from("mpesa_settlements")
    .select("id, amount, status, transaction_id, shortcode, created_at")
    .gte("created_at", startMonth.toISOString())
    .order("created_at", { ascending: false })

  const settlementOutTx: WalletTransaction[] = (settlements ?? []).map((s) => ({
    id:          `settle-${s.id}`,
    type:        "b2b_settlement",
    description: `B2B settlement → ${s.shortcode}`,
    amountKes:   Number(s.amount),
    direction:   "out",
    status:      s.status === "completed" ? "completed" : s.status === "failed" ? "failed" : "pending",
    mpesaRef:    s.transaction_id ?? null,
    createdAt:   s.created_at,
  }))

  // ── 4. Plan subscription revenue ─────────────────────────────────────────
  const { data: plans } = await supabase
    .from("profiles")
    .select("id, plan, plan_expires_at, mpesa_ref")
    .neq("plan", "free")
    .not("mpesa_ref", "is", null)

  const PLAN_PRICES: Record<string, number> = { pro: 1499, fleet: 0 }
  const planTx: WalletTransaction[] = (plans ?? []).map((p) => ({
    id:          `plan-${p.id}`,
    type:        "platform_cut",
    description: `${p.plan === "pro" ? "Pro" : "Fleet"} plan subscription`,
    amountKes:   PLAN_PRICES[p.plan] ?? 0,
    direction:   "in",
    status:      "completed",
    mpesaRef:    p.mpesa_ref ?? null,
    createdAt:   p.plan_expires_at ?? new Date().toISOString(),
  }))

  const transactions = [
    ...reservationTx,
    ...tipOutTx,
    ...settlementOutTx,
    ...planTx,
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

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

  // ── Revenue breakdown ─────────────────────────────────────────────────────
  const breakdown = {
    reservationKes: reservationTx.reduce((s, t) => s + t.amountKes, 0),
    planKes:        planTx.reduce((s, t) => s + t.amountKes, 0),
    totalPayoutsKes: tipOutTx.filter((t) => t.status === "completed").reduce((s, t) => s + t.amountKes, 0),
    totalSettledKes: settlementOutTx.filter((t) => t.status === "completed").reduce((s, t) => s + t.amountKes, 0),
    totalSeats:      (bookings ?? []).reduce((s, b) => s + ((b as { seats?: number }).seats ?? 1), 0),
    totalBookings:   (bookings ?? []).length,
  }

  return { transactions, summary, breakdown }
}