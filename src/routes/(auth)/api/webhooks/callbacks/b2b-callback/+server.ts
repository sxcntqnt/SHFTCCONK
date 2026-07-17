// src/routes/api/webhooks/mpesa/b2b-callback/+server.ts
//
// Daraja B2B result callback — fired when a SACCO settlement succeeds or fails.
//
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
  const resultDesc = (result.ResultDesc as string) || "Unknown";
  const conversationId = result.ConversationID as string;

  if (!conversationId) {
    console.error("[b2b-callback] Missing ConversationID in payload");
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

  // ── Update settlement record ────────────────────────────────────────────
  try {
    await sql`
      UPDATE mpesa_settlements
      SET
        status = ${succeeded ? "completed" : "failed"},
        result_code = ${resultCode},
        result_description = ${resultDesc},
        transaction_id = ${transactionId},
        completed_at = ${succeeded ? new Date() : null},
        updated_at = NOW()
      WHERE conversation_id = ${conversationId}
    `;
  } catch (updateError) {
    console.error(
      "[b2b-callback] Failed to update mpesa_settlements:",
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
        'mpesa_b2b_result',
        'mpesa_settlements',
        ${JSON.stringify({
          conversation_id: conversationId,
          transaction_id: transactionId,
          result_code: resultCode,
          result_desc: resultDesc,
          succeeded,
        })}::jsonb
      )
    `;
  } catch (auditError) {
    console.error(
      "[b2b-callback] Failed to insert audit log:",
      auditError
    );
  }

  if (!succeeded) {
    console.warn("[b2b-callback] B2B Settlement failed:", resultDesc, {
      conversationId,
      resultCode,
    });
  } else {
    console.info("[b2b-callback] B2B Settlement successful", {
      conversationId,
      transactionId,
    });
  }

  // Always acknowledge receipt to Safaricom
  return json({ ResultCode: 0, ResultDesc: "Received" });
};
