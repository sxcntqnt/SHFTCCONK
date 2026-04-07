// src/routes/api/webhooks/mpesa/b2c-callback/+server.ts
//
// Daraja B2C result callback — fired when a tip payout succeeds or fails.
// Safaricom POSTs to this URL after processing the B2C request.
//
// LOOKUP KEY: conversation_id
// TABLE:     mpesa_payouts

import type { RequestHandler } from "./$types";
import { json } from "@sveltejs/kit";
import { supabaseAdmin } from "$lib/server/db";

export const POST: RequestHandler = async ({ request }) => {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return json({ ResultCode: 1, ResultDesc: "Invalid JSON" }, { status: 400 });
  }

  const result = (body as Record<string, unknown>)?.Result as
    | Record<string, unknown>
    | undefined;

  if (!result) {
    return json(
      { ResultCode: 1, ResultDesc: "Malformed payload" },
      { status: 400 }
    );
  }

  const resultCode = result.ResultCode as number;
  const resultDesc = (result.ResultDesc as string) || "Unknown error";
  const conversationId = result.ConversationID as string;

  if (!conversationId) {
    console.error("[b2c-callback] Missing ConversationID in payload");
    return json(
      { ResultCode: 1, ResultDesc: "Missing ConversationID" },
      { status: 400 }
    );
  }

  const succeeded = resultCode === 0;

  // ── Extract TransactionID from ResultParameters (only on success) ───────
  let transactionId: string | null = null;

  if (succeeded) {
    const params = result.ResultParameters as
      | { ResultParameter?: { Key: string; Value: unknown }[] }
      | undefined;

    const items = params?.ResultParameter ?? [];
    const txItem = items.find((p) => p.Key === "TransactionID");
    transactionId = txItem ? String(txItem.Value) : null;
  }

  // ── Update payout record ────────────────────────────────────────────────
  const { error: updateError } = await supabaseAdmin
    .from("mpesa_payouts")
    .update({
      status: succeeded ? "completed" : "failed",
      result_code: resultCode,
      result_description: resultDesc,
      transaction_id: transactionId,
      completed_at: succeeded ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq("conversation_id", conversationId);

  if (updateError) {
    console.error("[b2c-callback] Failed to update mpesa_payouts:", updateError);
  }

  // ── Audit log ───────────────────────────────────────────────────────────
  const { error: auditError } = await supabaseAdmin.from("audit_logs").insert({
    event_type: "mpesa_b2c_result",
    target_table: "mpesa_payouts",
    details: {
      conversation_id: conversationId,
      transaction_id: transactionId,
      result_code: resultCode,
      result_desc: resultDesc,
      succeeded,
    },
  });

  if (auditError) {
    console.error("[b2c-callback] Failed to insert audit log:", auditError);
  }

  if (!succeeded) {
    console.warn("[b2c-callback] B2C Payout failed:", resultDesc, {
      conversationId,
      resultCode,
    });
  } else {
    console.info("[b2c-callback] B2C Payout successful", {
      conversationId,
      transactionId,
    });
  }

  // Always acknowledge to Safaricom (they retry on non-200)
  return json({ ResultCode: 0, ResultDesc: "Received" });
};