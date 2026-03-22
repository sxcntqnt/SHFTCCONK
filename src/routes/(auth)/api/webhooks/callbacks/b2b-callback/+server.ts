// src/routes/api/webhooks/mpesa/b2b-callback/+server.ts
//
// Daraja B2B result callback — fired when a SACCO settlement succeeds or fails.
//
// TABLE: mpesa_settlements
// LOOKUP KEY: conversation_id

import type { RequestHandler } from "./$types"
import { json } from "@sveltejs/kit"
import { createClient } from "@supabase/supabase-js"
import { SUPABASE_SERVICE_ROLE_KEY } from "$env/static/private"
import { PUBLIC_SUPABASE_URL } from "$env/static/public"

const supabaseAdmin = createClient(PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

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
    console.error("[b2b-callback] Missing ConversationID in payload")
    return json({ ResultCode: 1, ResultDesc: "Missing ConversationID" }, { status: 400 })
  }

  // ── Extract M-Pesa transaction ID from ResultParameters ───────────────────
  let transactionId: string | null = null

  if (succeeded) {
    const params = result.ResultParameters as { ResultParameter?: { Key: string; Value: unknown }[] } | undefined
    const items  = params?.ResultParameter ?? []
    const txItem = items.find((p) => p.Key === "TransactionID")
    transactionId = txItem ? String(txItem.Value) : null
  }

  // ── Update mpesa_settlements ──────────────────────────────────────────────
  const { error: updateError } = await supabaseAdmin
    .from("mpesa_settlements")
    .update({
      status:             succeeded ? "completed" : "failed",
      result_code:        resultCode,
      result_description: resultDesc,
      transaction_id:     transactionId,
      completed_at:       succeeded ? new Date().toISOString() : null,
    })
    .eq("conversation_id", conversationId)

  if (updateError) {
    console.error("[b2b-callback] DB update failed:", updateError)
  }

  // ── Audit log ─────────────────────────────────────────────────────────────
  await supabaseAdmin.from("audit_logs").insert({
    event_type:   "mpesa_b2b_result",
    target_table: "mpesa_settlements",
    details: {
      conversation_id: conversationId,
      transaction_id:  transactionId,
      result_code:     resultCode,
      result_desc:     resultDesc,
      succeeded,
    },
  })

  if (!succeeded) {
    console.warn("[b2b-callback] Settlement failed:", resultDesc, { conversationId })
  }

  return json({ ResultCode: 0, ResultDesc: "Received" })
}