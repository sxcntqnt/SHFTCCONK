// src/routes/api/webhooks/mpesa/b2b-timeout/+server.ts
//
// Daraja B2B queue timeout callback.
// TABLE: mpesa_settlements
// LOOKUP KEY: conversation_id

import type { RequestHandler } from "./$types"
import { json } from "@sveltejs/kit"
import { createClient } from "@supabase/supabase-js"
import { PRIVATE_SUPABASE_SERVICE_ROLE } from "$env/static/private"
import { PUBLIC_SUPABASE_URL } from "$env/static/public"

const supabaseAdmin = createClient(
  PUBLIC_SUPABASE_URL,
  PRIVATE_SUPABASE_SERVICE_ROLE,
)

export const POST: RequestHandler = async ({ request }) => {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return json({ ResultCode: 0, ResultDesc: "Received" })
  }

  const conversationId = (body as Record<string, unknown>)?.ConversationID as
    | string
    | undefined

  if (conversationId) {
    const { error } = await supabaseAdmin
      .from("mpesa_settlements")
      .update({
        status: "failed",
        result_code: null,
        result_description:
          "Queue timeout — request did not reach Safaricom in time",
      })
      .eq("conversation_id", conversationId)

    if (error) {
      console.error("[b2b-timeout] DB update failed:", error)
    }

    await supabaseAdmin.from("audit_logs").insert({
      event_type: "mpesa_b2b_timeout",
      target_table: "mpesa_settlements",
      details: { conversation_id: conversationId },
    })

    console.warn("[b2b-timeout] Settlement timed out:", conversationId)
  }

  return json({ ResultCode: 0, ResultDesc: "Received" })
}
