// src/routes/api/webhooks/mpesa/initiate/+server.ts
//
// Initiates an M-Pesa STK Push (CustomerPayBillOnline) and records a pending payment.
// The actual payment confirmation is handled by the stk-callback route.

import type { RequestHandler } from "./$types";
import { json } from "@sveltejs/kit";
import { mpesa } from "$lib/server/mpesa-provider";

export const POST: RequestHandler = async ({ request, locals }) => {
  const supabase = locals.supabase;
  const { session } = await locals.safeGetSession();

  if (!session?.user?.id) {
    return json({ error: "Unauthorised" }, { status: 401 });
  }

  const body = await request.json();
  const { phoneNumber, amount, planId, accountReference, transactionDesc } = body;

  if (!phoneNumber || !amount || !planId) {
    return json({ error: "Missing required fields: phoneNumber, amount, planId" }, { status: 400 });
  }

  // ── Send STK Push using the modern mpesa service ─────────────────────
  let stkResult;
  try {
    stkResult = await mpesa.stkPush({
      phone: phoneNumber,
      amount: Number(amount),
      account_reference: accountReference || `PLAN-${planId}`,
      transaction_desc: transactionDesc || "Plan Subscription Payment",
    });
  } catch (err: any) {
    console.error("[mpesa initiate] STK Push failed:", err);
    return json(
      { error: "M-Pesa request failed", details: err.message },
      { status: 502 }
    );
  }

  if (!stkResult.success || !stkResult.checkout_request_id) {
    console.error("[mpesa initiate] Provider returned failure:", stkResult.data);
    return json(
      {
        error: "M-Pesa STK Push rejected",
        response: stkResult.data,
      },
      { status: 422 }
    );
  }

  // ── Record pending payment in Supabase ───────────────────────────────
  // The stk-callback route will later update this record to 'completed' or 'failed'
  const { error: dbError } = await supabase.from("payments").insert({
    transaction_id: stkResult.checkout_request_id,   // CheckoutRequestID
    user_id: session.user.id,
    amount: Number(amount),
    phone: phoneNumber,
    status: "pending",
    metadata: {
      plan_id: planId,
      merchant_request_id: stkResult.data?.MerchantRequestID,
    },
  });

  if (dbError) {
    // Non-critical — payment is already initiated with Safaricom
    console.error("[mpesa initiate] Failed to record payment in database:", dbError);
  }

  // Return success to client
  return json({
    success: true,
    checkout_request_id: stkResult.checkout_request_id,
    merchant_request_id: stkResult.data?.MerchantRequestID,
    customer_message: stkResult.data?.CustomerMessage,
    response_description: stkResult.data?.ResponseDescription,
  });
};