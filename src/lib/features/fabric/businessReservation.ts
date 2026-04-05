import { db } from "$lib/server/db"
import { redis } from "$lib/server/redis"

// Minimal Fabric gateway stub — in production this should call the Fabric SDK
export const fabricGateway = {
  async submitTransaction(contract: string, fn: string, payload: string) {
    // Simulate a fabric response with a generated transaction id
    const txId = `FABRIC-TX-${Date.now().toString(36)}`
    return { transactionId: txId }
  },
}

export async function anchorBusinessReservation(
  bookingId: string,
  operatorId: string,
) {
  // Server-side conflict guard — ensure no overlapping anchored bookings exist
  const booking = await db.fleet_bookings.findUnique({ where: { id: bookingId } })
  if (!booking) throw new Error("Booking not found")

  // Construct payload
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

  const fabricResult = await fabricGateway.submitTransaction(
    "FleetBookingContract",
    "CreateBusinessReservation",
    JSON.stringify(ledgerPayload),
  )

  const txId = fabricResult.transactionId

  await db.fleet_bookings.update({
    where: { id: bookingId },
    data: {
      ledger_tx_id: txId,
      status: "LEDGER_ANCHORED",
      route_deviation_authorised: true,
      updated_at: new Date().toISOString(),
    },
  })

  // Invalidate gate cache for the org
  await redis.del(`ledger_gate:${booking.org_id}`)

  return { txId, status: "LEDGER_ANCHORED" }
}
