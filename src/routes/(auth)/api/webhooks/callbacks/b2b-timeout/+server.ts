// src/routes/api/webhooks/mpesa/b2b-timeout/+server.ts
//
// Daraja B2B queue timeout callback.
// TABLE: mpesa_settlements
// LOOKUP KEY: conversation_id

import type { RequestHandler } from "./$types";
import { json } from "@sveltejs/kit";
import { supabaseAdmin } from "$lib/server/db";

export const POST: RequestHandler = async ({ request }) => {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    // Even on invalid JSON, we should acknowledge to Safaricom
    return json({ ResultCode: 0, ResultDesc: "Received" });
  }

  const conversationId = (body as Record<string, unknown>)?.ConversationID as string | undefined;

  if (!conversationId) {
    console.warn("[b2b-timeout] Received timeout callback without ConversationID");
    return json({ ResultCode: 0, ResultDesc: "Received" });
  }

  // ── Mark settlement as timed out ───────────────────────────────────────
  const { error: updateError } = await supabaseAdmin
    .from("mpesa_settlements")
    .update({
      status: "failed",
      result_code: null,
      result_description: "Queue timeout — request did not reach Safaricom in time",
      completed_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq("conversation_id", conversationId);

  if (updateError) {
    console.error("[b2b-timeout] Failed to update mpesa_settlements:", updateError);
  }

  // ── Audit log ───────────────────────────────────────────────────────────
  const { error: auditError } = await supabaseAdmin.from("audit_logs").insert({
    event_type: "mpesa_b2b_timeout",
    target_table: "mpesa_settlements",
    details: {
      conversation_id: conversationId,
      reason: "Queue timeout",
    },
  });

  if (auditError) {
    console.error("[b2b-timeout] Failed to insert audit log:", auditError);
  }

  console.warn("[b2b-timeout] B2B Settlement timed out:", conversationId);

  // Always acknowledge to Safaricom
  return json({ ResultCode: 0, ResultDesc: "Received" });
};