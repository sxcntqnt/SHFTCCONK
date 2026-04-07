// src/routes/(auth)/admin/wallet/+page.server.ts
//
// Platform revenue dashboard — sxcntqnt admin wallet.
//
// MIGRATION:
//   requireAdminAccess(event) → userState actor check
//   event.parent() for supabase → locals.supabase directly
//   profiles.plan/mpesa_ref → removed (schema gaps)
//
// HYPERLEDGER ADDITION:
//   Total enrollment counts added to breakdown — admin sees
//   how many identities are active/pending/exhausted platform-wide.

import { redirect } from "@sveltejs/kit"
import type { PageServerLoad } from "./$types"
import {
  DEFAULT_REVENUE_CONFIG,
  calculateReservationSplit,
} from "$lib/server/revenue-config"
import type {
  WalletTransaction,
  WalletSummary,
} from "$lib/features/wallet/wallet.types"
import { ACTOR_TYPES } from "$lib/features/auth/contexts/context.template"

export const load: PageServerLoad = async ({ locals }) => {
  const { userState, supabase } = locals

  // ── Gate ──────────────────────────────────────────────────────────────────
  if (!userState) throw redirect(303, "/login")

  const isAdmin = userState.activeContexts.some(
    (ctx) =>
      [ACTOR_TYPES.SUPER_ADMIN, ACTOR_TYPES.ADMIN].includes(
        ctx.type as typeof ACTOR_TYPES.SUPER_ADMIN,
      ) && ctx.status === "active",
  )
  if (!isAdmin) throw redirect(303, "/admin/dashboard")

  // ── Date ranges ────────────────────────────────────────────────────────────
  const now = new Date()
  const startMonth = new Date(
    now.getFullYear(),
    now.getMonth(),
    1,
  ).toISOString()

  // ── Parallel fetch ─────────────────────────────────────────────────────────
  const [
    bookingsResult,
    tipPayoutsResult,
    settlementsResult,
    mpesaSubscribersResult,
    hlfQueueResult,
  ] = await Promise.all([
    supabase
      .from("bookings")
      .select("id, fare, created_at")
      .eq("status", "confirmed")
      .gte("created_at", startMonth),

    supabase
      .from("mpesa_payouts")
      .select("id, amount, status, transaction_id, role, created_at")
      .gte("created_at", startMonth)
      .order("created_at", { ascending: false }),

    supabase
      .from("mpesa_settlements")
      .select("id, amount, status, transaction_id, shortcode, created_at")
      .gte("created_at", startMonth)
      .order("created_at", { ascending: false }),

    // Subscribed users — from mpesa_customers (replaced stripe)
    supabase
      .from("mpesa_customers")
      .select("user_id, subscription_status, subscription_code")
      .eq("subscription_status", "active"),

    // Platform-wide enrollment queue summary
    supabase.from("hyperledger_enrollment_queue").select("status"),
  ])

  // ── Reservation transactions ───────────────────────────────────────────────
  const reservationTx: WalletTransaction[] = (bookingsResult.data ?? []).map(
    (b) => {
      const split = calculateReservationSplit(
        DEFAULT_REVENUE_CONFIG.reservation,
        1,
      )
      return {
        id: `res-${b.id}`,
        type: "platform_cut",
        description: "Reservation fee",
        amountKes: split.platformKes,
        direction: "in",
        status: "completed",
        mpesaRef: null,
        createdAt: b.created_at,
      }
    },
  )

  // ── Tip payout outflows ────────────────────────────────────────────────────
  const tipOutTx: WalletTransaction[] = (tipPayoutsResult.data ?? []).map(
    (p) => ({
      id: `payout-${p.id}`,
      type: "b2c_payout",
      description: `Tip payout · ${p.role}`,
      amountKes: Number(p.amount),
      direction: "out",
      status:
        p.status === "completed"
          ? "completed"
          : p.status === "failed"
            ? "failed"
            : "pending",
      mpesaRef: p.transaction_id ?? null,
      createdAt: p.created_at,
    }),
  )

  // ── B2B settlement outflows ────────────────────────────────────────────────
  const settlementOutTx: WalletTransaction[] = (
    settlementsResult.data ?? []
  ).map((s) => ({
    id: `settle-${s.id}`,
    type: "b2b_settlement",
    description: `B2B settlement → ${s.shortcode}`,
    amountKes: Number(s.amount),
    direction: "out",
    status:
      s.status === "completed"
        ? "completed"
        : s.status === "failed"
          ? "failed"
          : "pending",
    mpesaRef: s.transaction_id ?? null,
    createdAt: s.created_at,
  }))

  // ── Subscription revenue (M-Pesa GO / standing orders) ────────────────────
  // Count active subscribers — actual KES amounts tracked in wallet_transactions
  const subscriberCount = mpesaSubscribersResult.data?.length ?? 0

  const transactions = [...reservationTx, ...tipOutTx, ...settlementOutTx].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  )

  // ── Summary ────────────────────────────────────────────────────────────────
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

  // ── Hyperledger enrollment platform summary ────────────────────────────────
  const queueRows = hlfQueueResult.data ?? []
  const hlfSummary = {
    total: queueRows.length,
    success: queueRows.filter((r) => r.status === "success").length,
    pending: queueRows.filter((r) => ["pending", "retrying"].includes(r.status))
      .length,
    exhausted: queueRows.filter((r) => r.status === "exhausted").length,
  }

  const breakdown = {
    reservationKes: reservationTx.reduce((s, t) => s + t.amountKes, 0),
    totalPayoutsKes: tipOutTx
      .filter((t) => t.status === "completed")
      .reduce((s, t) => s + t.amountKes, 0),
    totalSettledKes: settlementOutTx
      .filter((t) => t.status === "completed")
      .reduce((s, t) => s + t.amountKes, 0),
    totalBookings: bookingsResult.data?.length ?? 0,
    subscriberCount,
  }

  return { transactions, summary, breakdown, hlfSummary }
}