// src/routes/api/webhooks/mpesa/b2c-timeout/+server.ts
//
// Daraja B2C queue timeout callback.
// Fired when the B2C request sits in Daraja's queue too long without processing.
// This is NOT a payment failure — it means Daraja couldn't process in time.
// Mark as 'failed' and let the operator retry.
//
// TABLE: mpesa_payouts
// LOOKUP KEY: conversation_id

import type { RequestHandler } from "./$types";
import { json } from "@sveltejs/kit";
import { supabaseAdmin } from "$lib/server/db";

export const POST: RequestHandler = async ({ request }) => {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    // Always acknowledge even on invalid JSON
    return json({ ResultCode: 0, ResultDesc: "Received" });
  }

  const conversationId = (body as Record<string, unknown>)?.ConversationID as string | undefined;

  if (!conversationId) {
    console.warn("[b2c-timeout] Received timeout callback without ConversationID");
    return json({ ResultCode: 0, ResultDesc: "Received" });
  }

  // ── Mark payout as timed out ───────────────────────────────────────────
  const { error: updateError } = await supabaseAdmin
    .from("mpesa_payouts")
    .update({
      status: "failed",
      result_code: null,
      result_description: "Queue timeout — request did not reach Safaricom in time",
      completed_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq("conversation_id", conversationId);

  if (updateError) {
    console.error("[b2c-timeout] Failed to update mpesa_payouts:", updateError);
  }

  // ── Audit log ───────────────────────────────────────────────────────────
  const { error: auditError } = await supabaseAdmin.from("audit_logs").insert({
    event_type: "mpesa_b2c_timeout",
    target_table: "mpesa_payouts",
    details: {
      conversation_id: conversationId,
      reason: "Queue timeout",
    },
  });

  if (auditError) {
    console.error("[b2c-timeout] Failed to insert audit log:", auditError);
  }

  console.warn("[b2c-timeout] B2C Payout timed out:", conversationId);

  // Always acknowledge to Safaricom
  return json({ ResultCode: 0, ResultDesc: "Received" });
};