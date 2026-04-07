// src/routes/api/mpesa/callbacks/per-event-escrow/+server.ts
import type { RequestHandler } from "./$types";
import { json } from "@sveltejs/kit";
import { supabaseAdmin } from "$lib/server/db";
import { streamClient } from "$lib/server/redis";
import { anchorBusinessReservation } from "$lib/features/fabric/businessReservation";
import { getPostHogClient } from "$lib/server/posthog";

export const POST: RequestHandler = async ({ request }) => {
  const callback = await request.json();

  // Safaricom sends the callback in this nested structure
  const stkCallback = callback.Body?.stkCallback;
  if (!stkCallback) {
    console.error("Invalid M-Pesa callback structure");
    return json({ ResultCode: 0, ResultDesc: "Accepted" });
  }

  const { CheckoutRequestID, ResultCode, ResultDesc } = stkCallback;

  // Retrieve cached escrow intent
  const intentRaw = await streamClient.get(`escrow_intent:${CheckoutRequestID}`);

  if (!intentRaw) {
    console.error(`Escrow intent not found for CheckoutRequestID: ${CheckoutRequestID}`);
    return json({ ResultCode: 0, ResultDesc: "Accepted" });
  }

  const intent = JSON.parse(intentRaw);

  // ─────────────────────────────────────────────
  // Payment FAILED
  // ─────────────────────────────────────────────
  if (ResultCode !== 0) {
    const { error } = await supabaseAdmin
      .from("per_event_escrow_records")
      .update({
        status: "FAILED",
        failure_reason: ResultDesc || "Unknown failure",
        updated_at: new Date().toISOString(),
      })
      .eq("mpesa_checkout_request_id", CheckoutRequestID);

    if (error) {
      console.error("Failed to update escrow record to FAILED:", error);
    }

    await streamClient.del(`escrow_intent:${CheckoutRequestID}`);

    // Track failed payment
    const posthog = getPostHogClient();
    await posthog.capture({
      distinctId: intent.operator_id,
      event: "per_event_escrow_payment_failed",
      properties: {
        booking_id: intent.booking_id,
        result_code: ResultCode,
        result_desc: ResultDesc,
      },
    });

    return json({ ResultCode: 0, ResultDesc: "Accepted" });
  }

  // ─────────────────────────────────────────────
  // Payment SUCCESS
  // ─────────────────────────────────────────────
  try {
    // 1. Anchor the booking to the ledger
    const anchorResult = await anchorBusinessReservation(
      intent.booking_id,
      intent.operator_id
    );

    // Extract M-Pesa receipt number from callback metadata
    const items = stkCallback.CallbackMetadata?.Item || [];
    const mpesaReceiptNumber = items.find((item: any) => item.Name === "MpesaReceiptNumber")?.Value;

    // 2. Update escrow record
    const { error: escrowError } = await supabaseAdmin
      .from("per_event_escrow_records")
      .update({
        status: "SETTLED",
        mpesa_receipt_number: mpesaReceiptNumber,
        ledger_tx_id: anchorResult.txId,
        settled_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("mpesa_checkout_request_id", CheckoutRequestID);

    if (escrowError) {
      console.error("Failed to update escrow record:", escrowError);
    }

    // 3. Update booking with M-Pesa reference
    const { error: bookingError } = await supabaseAdmin
      .from("fleet_bookings")
      .update({
        mpesa_reference: mpesaReceiptNumber,
        updated_at: new Date().toISOString(),
      })
      .eq("id", intent.booking_id);

    if (bookingError) {
      console.error("Failed to update booking mpesa_reference:", bookingError);
    }

    // 4. Clear cache
    await streamClient.del(`escrow_intent:${CheckoutRequestID}`);

    // 5. Track successful payment
    const posthog = getPostHogClient();
    await posthog.capture({
      distinctId: intent.operator_id,
      event: "per_event_escrow_settled",
      properties: {
        booking_id: intent.booking_id,
        agreed_fare_kes: intent.agreed_fare_kes,
        platform_fee_kes: intent.platform_fee_kes,
        operator_net_kes: intent.operator_net_kes,
        ledger_tx_id: anchorResult.txId,
        mpesa_receipt_number: mpesaReceiptNumber,
      },
    });

  } catch (err: any) {
    console.error("Error processing successful escrow callback:", err);

    // Optional: Mark as partially failed if anchoring fails
    await supabaseAdmin
      .from("per_event_escrow_records")
      .update({
        status: "SETTLED_PAYMENT_FAILED_ANCHOR",
        failure_reason: err.message || "Failed to anchor to ledger",
      })
      .eq("mpesa_checkout_request_id", CheckoutRequestID);
  }

  // Always acknowledge to Safaricom
  return json({ ResultCode: 0, ResultDesc: "Accepted" });
};