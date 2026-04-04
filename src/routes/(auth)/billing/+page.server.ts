// src/routes/(app)/account/billing/+page.server.ts
//
// Replaces the Stripe-based load. Reads subscription status directly from
// the subscriptions table, which the stk-callback webhook writes to after
// a successful M-Pesa payment.

import type { PageServerLoad } from "./$types"
import { redirect } from "@sveltejs/kit"

export const load: PageServerLoad = async ({
  locals: { safeGetSession, supabase },
}) => {
  const { session, user } = await safeGetSession()
  if (!session || !user?.id) {
    redirect(303, "/login")
  }

  // ── Active subscription ──────────────────────────────────────────────
  // The stk-callback webhook upserts a row here when payment succeeds.
  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("id, plan_id, status, current_period_end, created_at")
    .eq("user_id", user.id)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .single()

  // ── Payment history (replaces Stripe portal invoices) ───────────────
  const { data: payments } = await supabase
    .from("payments")
    .select("transaction_id, amount, status, result_desc, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(10)

  // ── Has ever paid (for showing invoice history link) ─────────────────
  const { count: paymentCount } = await supabase
    .from("payments")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("status", "completed")

  return {
    isActiveCustomer: !!subscription,
    hasEverPaid: (paymentCount ?? 0) > 0,
    currentPlanId: subscription?.plan_id ?? null,
    currentPeriodEnd: subscription?.current_period_end ?? null,
    recentPayments: payments ?? [],
  }
}
