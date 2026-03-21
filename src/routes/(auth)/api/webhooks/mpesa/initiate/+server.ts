// src/routes/api/webhooks/mpesa/initiate/+server.ts
//
// Sends an STK push to the customer's phone and records a pending payment.
// The stk-callback route updates the payment status when Safaricom responds.

import type { RequestHandler } from "./$types"
import { json } from "@sveltejs/kit"
import { processMpesaPush } from "$lib/server/mpesa-provider"

export const POST: RequestHandler = async ({ request, locals }) => {
  // Use locals.supabase (injected by hooks) — not a bare import.
  // This ensures RLS and the user's session context are respected.
  const supabase = locals.supabase
  const { session } = await locals.safeGetSession()

  if (!session?.user?.id) {
    return json({ error: "Unauthorised" }, { status: 401 })
  }

  const body = await request.json()
  const { phoneNumber, amount, planId } = body

  if (!phoneNumber || !amount || !planId) {
    return json({ error: "Missing required fields" }, { status: 400 })
  }

  // ── Send STK push ────────────────────────────────────────────────────
  let mpesaResponse: Awaited<ReturnType<typeof processMpesaPush>>
  try {
    mpesaResponse = await processMpesaPush(phoneNumber, amount)
  } catch (err) {
    console.error("[mpesa initiate] provider error:", err)
    return json({ error: "M-Pesa request failed" }, { status: 502 })
  }

  if (mpesaResponse.ResponseCode !== "0") {
    return json(mpesaResponse, { status: 422 })
  }

  // ── Record pending payment ───────────────────────────────────────────
  // stk-callback will update status to 'completed' or 'failed'.
  const { error: dbError } = await supabase.from("payments").insert({
    transaction_id: mpesaResponse.CheckoutRequestID,
    user_id: session.user.id,
    amount,
    phone: phoneNumber,
    status: "pending",
    metadata: { plan_id: planId },
  })

  if (dbError) {
    // Non-fatal — the payment is in flight with Safaricom regardless.
    // Log it but still return success to the client.
    console.error("[mpesa initiate] failed to record payment:", dbError)
  }

  return json(mpesaResponse)
}