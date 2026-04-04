import type { RequestHandler } from "./$types"
import { json } from "@sveltejs/kit"
import { redis } from "$lib/server/redis"
import { db } from "$lib/server/db"
import { anchorBusinessReservation } from "$lib/server/fabric/businessReservation"
import { posthog } from "$lib/server/posthog"

export const POST: RequestHandler = async ({ request }) => {
  const callback = await request.json()
  const { CheckoutRequestID, ResultCode } = callback.Body.stkCallback

  const intentRaw = await redis.get(`escrow_intent:${CheckoutRequestID}`)
  if (!intentRaw) {
    console.error(`Escrow intent not found for CheckoutRequestID: ${CheckoutRequestID}`)
    return json({ ResultCode: 0, ResultDesc: "Accepted" })
  }

  const intent = JSON.parse(intentRaw)

  if (ResultCode !== 0) {
    await db.per_event_escrow_records.update({
      where: { mpesa_checkout_request_id: CheckoutRequestID },
      data: { status: "FAILED", failure_reason: callback.Body.stkCallback.ResultDesc },
    })

    await redis.del(`escrow_intent:${CheckoutRequestID}`)

    await posthog.capture({
      distinctId: intent.operator_id,
      event: "per_event_escrow_payment_failed",
      properties: { booking_id: intent.booking_id, result_desc: callback.Body.stkCallback.ResultDesc },
    })

    return json({ ResultCode: 0, ResultDesc: "Accepted" })
  }

  const anchorResult = await anchorBusinessReservation(intent.booking_id, intent.operator_id)

  const mpesaRef = callback.Body.stkCallback.CallbackMetadata?.Item?.find((i: any) => i.Name === "MpesaReceiptNumber")?.Value

  await db.per_event_escrow_records.update({
    where: { mpesa_checkout_request_id: CheckoutRequestID },
    data: {
      status: "SETTLED",
      mpesa_receipt_number: mpesaRef,
      ledger_tx_id: anchorResult.txId,
      settled_at: new Date().toISOString(),
    },
  })

  await db.fleet_bookings.update({
    where: { id: intent.booking_id },
    data: { mpesa_reference: mpesaRef },
  })

  await redis.del(`escrow_intent:${CheckoutRequestID}`)

  await posthog.capture({
    distinctId: intent.operator_id,
    event: "per_event_escrow_settled",
    properties: {
      booking_id: intent.booking_id,
      agreed_fare_kes: intent.agreed_fare_kes,
      platform_fee_kes: intent.platform_fee_kes,
      operator_net_kes: intent.operator_net_kes,
      ledger_tx_id: anchorResult.txId,
    },
  })

  return json({ ResultCode: 0, ResultDesc: "Accepted" })
}
