// src/routes/api/webhooks/mpesa/b2c-callback/+server.ts
//
// Daraja B2C result callback — fired when a tip payout succeeds or fails.
// Safaricom POSTs to this URL after processing the B2C request.
//
// LOOKUP KEY: conversation_id (ConversationID from Daraja)
// TABLE:      mpesa_payouts
//
// On success: extracts the M-Pesa transaction code from ResultParameters
//             and marks the payout completed.
// On failure: marks failed, logs the reason.

import type { RequestHandler } from "./$types"
import { json } from "@sveltejs/kit"
import { createClient } from "@supabase/supabase-js"
import { PRIVATE_SUPABASE_SERVICE_ROLE } from "$env/static/private"
import { PUBLIC_SUPABASE_URL } from "$env/static/public"

// Service role client — callbacks have no user session
const supabaseAdmin = createClient(PUBLIC_SUPABASE_URL, PRIVATE_SUPABASE_SERVICE_ROLE)

export const POST: RequestHandler = async ({ request }) => {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return json({ ResultCode: 1, ResultDesc: "Invalid JSON" }, { status: 400 })
  }

  const result = (body as Record<string, unknown>)?.Result as Record<string, unknown> | undefined
  if (!result) {
    return json({ ResultCode: 1, ResultDesc: "Malformed payload" }, { status: 400 })
  }

  const resultCode     = result.ResultCode     as number
  const resultDesc     = result.ResultDesc     as string
  const conversationId = result.ConversationID as string
  const succeeded      = resultCode === 0

  if (!conversationId) {
    console.error("[b2c-callback] Missing ConversationID in payload")
    return json({ ResultCode: 1, ResultDesc: "Missing ConversationID" }, { status: 400 })
  }

  // ── Extract M-Pesa transaction ID from ResultParameters ───────────────────
  // Daraja embeds the actual transaction code (e.g. MPESA4G8K2L) in
  // ResultParameters as a key-value array.
  let transactionId: string | null = null

  if (succeeded) {
    const params = result.ResultParameters as { ResultParameter?: { Key: string; Value: unknown }[] } | undefined
    const items  = params?.ResultParameter ?? []
    const txItem = items.find((p) => p.Key === "TransactionID")
    transactionId = txItem ? String(txItem.Value) : null
  }

  // ── Update mpesa_payouts ──────────────────────────────────────────────────
  const { error: updateError } = await supabaseAdmin
    .from("mpesa_payouts")
    .update({
      status:             succeeded ? "completed" : "failed",
      result_code:        resultCode,
      result_description: resultDesc,
      transaction_id:     transactionId,
      completed_at:       succeeded ? new Date().toISOString() : null,
    })
    .eq("conversation_id", conversationId)

  if (updateError) {
    console.error("[b2c-callback] DB update failed:", updateError)
    // Return 200 to Daraja — retrying won't fix a DB error
    return json({ ResultCode: 0, ResultDesc: "Received" })
  }

  // ── Audit log ─────────────────────────────────────────────────────────────
  await supabaseAdmin.from("audit_logs").insert({
    event_type:   "mpesa_b2c_result",
    target_table: "mpesa_payouts",
    details: {
      conversation_id: conversationId,
      transaction_id:  transactionId,
      result_code:     resultCode,
      result_desc:     resultDesc,
      succeeded,
    },
  })

  if (!succeeded) {
    console.warn("[b2c-callback] Payout failed:", resultDesc, { conversationId })
  }

  // Always return 200 — Daraja will retry on non-200
  return json({ ResultCode: 0, ResultDesc: "Received" })
}