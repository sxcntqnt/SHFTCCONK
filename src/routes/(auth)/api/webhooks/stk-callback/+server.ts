// src/routes/api/webhooks/mpesa/stk-callback/+server.ts
//
// Safaricom POSTs here after the customer responds to the STK push.
// Must use service role to bypass RLS — this is an unauthenticated webhook.
// Original was correct in that choice but didn't update the subscriptions table.

import type { RequestHandler } from "./$types"
import { json } from "@sveltejs/kit"
import { createClient } from "@supabase/supabase-js"
import { SUPABASE_SERVICE_ROLE_KEY } from "$env/static/private"
import { PUBLIC_SUPABASE_URL } from "$env/static/public"

// Service role client — intentional, no user session in a Safaricom webhook
const supabaseAdmin = createClient(PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

export const POST: RequestHandler = async ({ request }) => {
  let body: any
  try {
    body = await request.json()
  } catch {
    return json({ ResultCode: 1, ResultDesc: "Invalid JSON" }, { status: 400 })
  }

  const callback = body?.Body?.stkCallback
  if (!callback) {
    return json({ ResultCode: 1, ResultDesc: "Malformed payload" }, { status: 400 })
  }

  const { CheckoutRequestID, ResultCode, ResultDesc } = callback
  const succeeded = ResultCode === 0

  // ── 1. Update payment record ─────────────────────────────────────────
  const { data: payment, error: payError } = await supabaseAdmin
    .from("payments")
    .update({
      status: succeeded ? "completed" : "failed",
      result_desc: ResultDesc,
      updated_at: new Date().toISOString(),
    })
    .eq("transaction_id", CheckoutRequestID)
    .select("user_id, amount, metadata")
    .single()

  if (payError) {
    console.error("[stk-callback] payment update error:", payError)
    // Still return 200 — Safaricom will retry on non-200
    return json({ ResultCode: 0, ResultDesc: "Received" })
  }

  if (!succeeded) {
    // Payment failed or cancelled — nothing more to do
    return json({ ResultCode: 0, ResultDesc: "Received" })
  }

  // ── 2. Activate subscription ─────────────────────────────────────────
  // Upsert a subscription row so billing/+page.server.ts picks it up.
  // plan_id comes from the metadata stored at payment initiation.
  if (payment?.user_id && payment?.metadata?.plan_id) {
    const planId = payment.metadata.plan_id
    const now = new Date()
    const periodEnd = new Date(now)
    periodEnd.setMonth(periodEnd.getMonth() + 1) // 30-day plan cycle

    const { error: subError } = await supabaseAdmin
      .from("subscriptions")
      .upsert(
        {
          user_id: payment.user_id,
          plan_id: planId,
          status: "active",
          current_period_start: now.toISOString(),
          current_period_end: periodEnd.toISOString(),
          updated_at: now.toISOString(),
        },
        { onConflict: "user_id" }, // one active subscription per user
      )

    if (subError) {
      console.error("[stk-callback] subscription upsert error:", subError)
    }
  }

  // ── 3. Seat reservation (carried over from original) ─────────────────
  // If the payment metadata includes seat_ids, move them from selected → reserved.
  if (payment?.metadata?.seat_ids?.length) {
    const { error: seatError } = await supabaseAdmin
      .from("seats")
      .update({ status: "reserved" })
      .in("id", payment.metadata.seat_ids)

    if (seatError) {
      console.error("[stk-callback] seat reservation error:", seatError)
    }
  }

  // Always return success to Safaricom — internal errors shouldn't cause retries
  return json({ ResultCode: 0, ResultDesc: "Success" })
}