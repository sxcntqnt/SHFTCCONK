// src/routes/api/webhooks/mpesa/stk-callback/+server.ts
//
// Safaricom POSTs here after the customer responds to the STK push (CustomerPayBillOnline).
// This handles both regular plan payments and per-event escrow payments.
//
// Must use service role client because this is an unauthenticated webhook from Safaricom.

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

  const callback = (body as any)?.Body?.stkCallback;

  if (!callback) {
    return json(
      { ResultCode: 1, ResultDesc: "Malformed payload" },
      { status: 400 }
    );
  }

  const { CheckoutRequestID, ResultCode, ResultDesc } = callback;
  const succeeded = ResultCode === 0;

  // ── 1. Update the payments record ───────────────────────────────────────
  let payment:
    | {
        user_id: string | null;
        amount: number;
        metadata: any;
      }
    | undefined;

  try {
    const rows = await sql`
      UPDATE payments
      SET
        status = ${succeeded ? "completed" : "failed"},
        result_desc = ${ResultDesc || "Unknown"},
        updated_at = NOW()
      WHERE transaction_id = ${CheckoutRequestID}
      RETURNING
        user_id,
        amount,
        metadata
    `;

    payment = rows[0];
  } catch (payError) {
    console.error("[stk-callback] Failed to update payments table:", payError);

    // Still acknowledge to Safaricom
    return json({ ResultCode: 0, ResultDesc: "Received" });
  }

  if (!succeeded || !payment) {
    // Payment failed/cancelled — no further processing needed
    return json({ ResultCode: 0, ResultDesc: "Received" });
  }

  // ── 2. Handle subscription activation (for plan payments) ───────────────
  if (payment.user_id && payment.metadata?.plan_id) {
    const planId = payment.metadata.plan_id;
    const now = new Date();
    const periodEnd = new Date(now);
    periodEnd.setMonth(periodEnd.getMonth() + 1); // 30-day subscription cycle

    try {
      await sql`
        INSERT INTO subscriptions (
          user_id,
          plan_id,
          status,
          current_period_start,
          current_period_end,
          updated_at
        )
        VALUES (
          ${payment.user_id},
          ${planId},
          'active',
          ${now},
          ${periodEnd},
          ${now}
        )
        ON CONFLICT (user_id)
        DO UPDATE
        SET
          plan_id = EXCLUDED.plan_id,
          status = EXCLUDED.status,
          current_period_start = EXCLUDED.current_period_start,
          current_period_end = EXCLUDED.current_period_end,
          updated_at = EXCLUDED.updated_at
      `;
    } catch (subError) {
      console.error("[stk-callback] Failed to upsert subscription:", subError);
    }
  }

  // ── 3. Handle seat reservation (if this was a seat booking payment) ───────
  if (payment.metadata?.seat_ids?.length) {
    try {
      await sql`
        UPDATE seats
        SET status = 'reserved'
        WHERE id = ANY(${payment.metadata.seat_ids})
      `;
    } catch (seatError) {
      console.error("[stk-callback] Failed to update seat status:", seatError);
    }
  }

  // Note: For per-event escrow payments, the actual anchoring logic is handled
  // in the dedicated per-event-escrow callback route (not here).

  console.info("[stk-callback] STK Push completed successfully", {
    checkoutRequestId: CheckoutRequestID,
    amount: payment.amount,
  });

  // Always return success to Safaricom — they retry on non-200 responses
  return json({ ResultCode: 0, ResultDesc: "Received" });
};
