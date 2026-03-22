// src/routes/api/webhooks/mpesa/b2c-timeout/+server.ts
//
// Daraja B2C queue timeout callback.
// Fired when the B2C request sits in Daraja's queue too long without processing.
// This is NOT a payment failure — it means Daraja couldn't process in time.
// Mark as 'failed' and let the operator retry.
//
// TABLE: mpesa_payouts
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
    return json({ ResultCode: 0, ResultDesc: "Received" })
  }

  const conversationId = (body as Record<string, unknown>)?.ConversationID as string | undefined

  if (conversationId) {
    const { error } = await supabaseAdmin
      .from("mpesa_payouts")
      .update({
        status:             "failed",
        result_code:        null,
        result_description: "Queue timeout — request did not reach Safaricom in time",
      })
      .eq("conversation_id", conversationId)

    if (error) {
      console.error("[b2c-timeout] DB update failed:", error)
    }

    await supabaseAdmin.from("audit_logs").insert({
      event_type:   "mpesa_b2c_timeout",
      target_table: "mpesa_payouts",
      details: { conversation_id: conversationId },
    })

    console.warn("[b2c-timeout] Payout timed out:", conversationId)
  }

  return json({ ResultCode: 0, ResultDesc: "Received" })
}