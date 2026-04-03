// src/routes/api/webhooks/mpesa/query/+server.ts
//
// Polls the payment status for a given CheckoutRequestID.
// The billing page uses Supabase realtime (subscribeToPayment) as the primary
// update mechanism — this endpoint is a fallback for environments where
// WebSockets are unavailable or as a one-off check.
//
// Original used Prisma (db.payment.findUnique) inconsistently alongside
// Supabase everywhere else. Replaced with locals.supabase.

import type { RequestHandler } from "./$types"
import { json } from "@sveltejs/kit"

export const GET: RequestHandler = async ({ url, locals }) => {
  const checkoutRequestId = url.searchParams.get("id")

  if (!checkoutRequestId) {
    return json({ error: "Missing id parameter" }, { status: 400 })
  }

  const supabase = locals.supabase

  const { data: payment, error } = await supabase
    .from("payments")
    .select("status, result_desc")
    .eq("transaction_id", checkoutRequestId)
    .single()

  if (error || !payment) {
    return json({ status: "pending", message: "Waiting for confirmation" })
  }

  return json({
    status: payment.status, // pending | completed | failed
    message: payment.result_desc ?? "—",
  })
}
