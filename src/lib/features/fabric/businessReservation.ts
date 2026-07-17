// src/lib/features/billing/anchorBusinessReservation.ts
import { sql } from "$lib/server/pg";
import { streamClient } from "$lib/server/redis";

// Minimal Fabric gateway stub — replace with real Fabric SDK in production
export const fabricGateway = {
  async submitTransaction(contract: string, fn: string, payload: string) {
    // TODO: In production, integrate with Hyperledger Fabric SDK
    const txId = `FABRIC-TX-${Date.now().toString(36)}`;
    return { transactionId: txId };
  },
};

/**
 * Anchors a business reservation to the ledger (Hyperledger Fabric)
 * Called after successful payment (either subscription or per-event escrow)
 */
export async function anchorBusinessReservation(
  bookingId: string,
  operatorId: string
): Promise<{
  txId: string;
  status: string;
}> {
  // Fetch booking details
  const bookings = await sql`
    SELECT *
    FROM fleet_bookings
    WHERE id = ${bookingId}
    LIMIT 1
  `;

  const booking = bookings[0];

  if (!booking) {
    throw new Error("Booking not found");
  }

  // Security: Validate operator ownership
  if (booking.operator_id !== operatorId) {
    throw new Error("Operator mismatch: Unauthorized");
  }

  // Construct ledger payload
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
  };

  // Submit to Fabric ledger
  const fabricResult = await fabricGateway.submitTransaction(
    "FleetBookingContract",
    "CreateBusinessReservation",
    JSON.stringify(ledgerPayload)
  );

  const txId = fabricResult.transactionId;

  // Update booking status in Postgres
  try {
    await sql`
      UPDATE fleet_bookings
      SET
        ledger_tx_id = ${txId},
        status = 'LEDGER_ANCHORED',
        route_deviation_authorised = TRUE,
        updated_at = NOW()
      WHERE id = ${bookingId}
    `;
  } catch (err) {
    throw new Error(
      `Failed to update booking: ${
        err instanceof Error ? err.message : String(err)
      }`
    );
  }

  // Invalidate ledger gate cache so the next check reflects the new anchor count
  await streamClient.del(`ledger_gate:${booking.org_id}`);

  return {
    txId,
    status: "LEDGER_ANCHORED",
  };
}
