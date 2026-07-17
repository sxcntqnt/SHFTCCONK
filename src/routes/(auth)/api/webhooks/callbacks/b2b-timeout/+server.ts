// src/routes/api/webhooks/mpesa/b2b-timeout/+server.ts
//
// Daraja B2B queue timeout callback.
// TABLE: mpesa_settlements
// LOOKUP KEY: conversation_id

import type { RequestHandler } from "./$types";
import { json } from "@sveltejs/kit";
import { sql } from "$lib/server/pg";

export const POST: RequestHandler = async ({ request }) => {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    // Even on invalid JSON, we should acknowledge to Safaricom
    return json({ ResultCode: 0, ResultDesc: "Received" });
  }

  const conversationId =
    (body as Record<string, unknown>)?.ConversationID as string | undefined;

  if (!conversationId) {
    console.warn("[b2b-timeout] Received timeout callback without ConversationID");
    return json({ ResultCode: 0, ResultDesc: "Received" });
  }

  // ── Mark settlement as timed out ───────────────────────────────────────
  try {
    await sql`
      UPDATE mpesa_settlements
      SET
        status = 'failed',
        result_code = NULL,
        result_description = 'Queue timeout — request did not reach Safaricom in time',
        completed_at = NULL,
        updated_at = NOW()
      WHERE conversation_id = ${conversationId}
    `;
  } catch (updateError) {
    console.error(
      "[b2b-timeout] Failed to update mpesa_settlements:",
      updateError
    );
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
        'mpesa_b2b_timeout',
        'mpesa_settlements',
        ${JSON.stringify({
          conversation_id: conversationId,
          reason: "Queue timeout",
        })}::jsonb
      )
    `;
  } catch (auditError) {
    console.error(
      "[b2b-timeout] Failed to insert audit log:",
      auditError
    );
  }

  console.warn("[b2b-timeout] B2B Settlement timed out:", conversationId);

  // Always acknowledge to Safaricom
  return json({ ResultCode: 0, ResultDesc: "Received" });
};
