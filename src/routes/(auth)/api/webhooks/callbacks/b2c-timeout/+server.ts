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
import { sql } from "$lib/server/pg";

export const POST: RequestHandler = async ({ request }) => {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    // Always acknowledge even on invalid JSON
    return json({ ResultCode: 0, ResultDesc: "Received" });
  }

  const conversationId =
    (body as Record<string, unknown>)?.ConversationID as string | undefined;

  if (!conversationId) {
    console.warn("[b2c-timeout] Received timeout callback without ConversationID");
    return json({ ResultCode: 0, ResultDesc: "Received" });
  }

  // ── Mark payout as timed out ───────────────────────────────────────────
  try {
    await sql`
      UPDATE mpesa_payouts
      SET
        status = 'failed',
        result_code = NULL,
        result_description = 'Queue timeout — request did not reach Safaricom in time',
        completed_at = NULL,
        updated_at = NOW()
      WHERE conversation_id = ${conversationId}
    `;
  } catch (updateError) {
    console.error("[b2c-timeout] Failed to update mpesa_payouts:", updateError);
  }

  // ── Audit log ───────────────────────────────────────────────────────────
  try {
    await sql`
      INSERT INTO audit_logs (
        event_type,
        target_table,
        details
      )
      VALUES (
        'mpesa_b2c_timeout',
        'mpesa_payouts',
        ${JSON.stringify({
          conversation_id: conversationId,
          reason: "Queue timeout",
        })}::jsonb
      )
    `;
  } catch (auditError) {
    console.error("[b2c-timeout] Failed to insert audit log:", auditError);
  }

  console.warn("[b2c-timeout] B2C Payout timed out:", conversationId);

  // Always acknowledge to Safaricom
  return json({ ResultCode: 0, ResultDesc: "Received" });
};
