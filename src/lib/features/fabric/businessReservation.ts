import { supabaseAdmin } from "$lib/server/db"
import { redis } from "$lib/server/redis"

// Minimal Fabric gateway stub — in production this should call the Fabric SDK
export const fabricGateway = {
  async submitTransaction(contract: string, fn: string, payload: string) {
    const txId = `FABRIC-TX-${Date.now().toString(36)}`
    return { transactionId: txId }
  },
}

export async function anchorBusinessReservation(
  bookingId: string,
  operatorId: string,
) {
  // ✅ Fetch booking
  const { data: booking, error: fetchError } = await supabaseAdmin
    .from("fleet_bookings")
    .select("*")
    .eq("id", bookingId)
    .single()

  if (fetchError || !booking) {
    throw new Error("Booking not found")
  }

  // (Optional but recommended) validate operator ownership
  if (booking.operator_id !== operatorId) {
    throw new Error("Operator mismatch")
  }

  // ✅ Construct ledger payload
  const ledgerPayload = {
    event_type: "BUSINESS_RESERVATION",
    booking_id: booking.id,
    vehicle_id: booking.vehicle_id,
    operator_id: booking.operator_id,
    org_id: booking.org_id,
    booking_type: booking.booking_type,
    starts_at: booking.starts_at,
    ends_at: booking.ends_at,
    route_deviation_authorised: booking.route_deviation_authorised,
    agreed_fare_kes: booking.agreed_fare,
    mpesa_reference: booking.mpesa_reference,
    anchored_at: new Date().toISOString(),
  }

  // ✅ Send to Fabric
  const fabricResult = await fabricGateway.submitTransaction(
    "FleetBookingContract",
    "CreateBusinessReservation",
    JSON.stringify(ledgerPayload),
  )

  const txId = fabricResult.transactionId

  // ✅ Update booking (ADMIN)
  const { error: updateError } = await supabaseAdmin
    .from("fleet_bookings")
    .update({
      ledger_tx_id: txId,
      status: "LEDGER_ANCHORED",
      route_deviation_authorised: true,
      updated_at: new Date().toISOString(),
    })
    .eq("id", bookingId)

  if (updateError) {
    throw new Error(`Failed to update booking: ${updateError.message}`)
  }

  // ✅ Invalidate gate cache
  await redis.del(`ledger_gate:${booking.org_id}`)

  return { txId, status: "LEDGER_ANCHORED" }
}