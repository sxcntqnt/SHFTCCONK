// src/routes/api/bookings/[id]/anchor/+server.ts
import type { RequestHandler } from "./$types";
import { json, error } from "@sveltejs/kit";
import { withProfileContext } from "$lib/server/pg";
import { assertLedgerNotGated } from "$lib/features/billing/ledgerGate";
import { initiatePerEventEscrow } from "$lib/features/billing/perEventEscrow";
import { anchorBusinessReservation } from "$lib/features/fabric/businessReservation";
import { streamClient } from "$lib/server/redis";
import { getPostHogClient } from "$lib/server/posthog";

export const POST: RequestHandler = async ({ params, request, locals }) => {
  const { id: bookingId } = params;
  const { route } = (await request.json()) as {
    route: "SUBSCRIPTION" | "PER_EVENT";
  };

  const operatorId = locals?.session?.user?.id;
  const orgId = locals?.session?.org_id;

  if (!operatorId || !orgId) {
    throw error(401, "Unauthenticated");
  }

  // Fetch booking with RLS enforcement
  const booking = await withProfileContext(operatorId, async (tx) => {
    const rows = await tx`
      SELECT *
      FROM fleet_bookings
      WHERE id = ${bookingId}
        AND org_id = ${orgId}
        AND operator_id = ${operatorId}
    `;

    return rows[0];
  });

  if (!booking) {
    throw error(404, "Booking not found or not accessible.");
  }

  if (booking.status === "LEDGER_ANCHORED") {
    throw error(409, "Booking already anchored.");
  }

  // Check ledger gating status
  const { permitted, route: resolvedRoute } = await assertLedgerNotGated(
    orgId,
    booking.agreed_fare
  );

  if (!permitted) {
    throw error(402, {
      code: "LEDGER_GATE_BLOCKED",
      reason: "FREE_TIER_EXHAUSTED",
      message:
        "Monthly anchor limit reached. Upgrade or add a booking fare to unlock per-event anchoring.",
    });
  }

  // ─────────────────────────────────────────────
  // PER-EVENT FLOW (M-Pesa Escrow)
  // ─────────────────────────────────────────────
  if (resolvedRoute === "PER_EVENT") {
    if (!booking.agreed_fare || !booking.client_contact) {
      throw error(400, "Per-event anchoring requires an agreed fare and client contact.");
    }

    const escrowResult = await initiatePerEventEscrow({
      bookingId,
      orgId,
      operatorId,
      agreedFareKes: booking.agreed_fare,
      clientPhone: booking.client_contact,
      vehicleId: booking.vehicle_id,
    });

    if (!escrowResult.collection_initiated) {
      throw error(
        502,
        "M-Pesa STK push to client failed. Verify the client phone number and retry."
      );
    }

    return json({
      status: "ESCROW_PENDING",
      mpesa_checkout_request_id: escrowResult.checkout_request_id,
      per_event_fee_kes: escrowResult.platform_fee_kes,
      message:
        "M-Pesa payment request sent to client. Ledger anchor will fire automatically on payment confirmation.",
    });
  }

  // ─────────────────────────────────────────────
  // SUBSCRIPTION FLOW (Direct ledger anchor)
  // ─────────────────────────────────────────────
  const result = await anchorBusinessReservation(bookingId, operatorId);

  // Invalidate ledger gate cache
  await streamClient.del(`ledger_gate:${orgId}`);

  // Track analytics with PostHog (correct usage)
  const posthog = getPostHogClient();

  await posthog.capture({
    distinctId: operatorId,
    event: "business_reservation_ledger_anchored_api",
    properties: {
      booking_id: bookingId,
      ledger_tx_id: result.txId,
      org_id: orgId,
    },
  });

  return json({
    status: "LEDGER_ANCHORED",
    ledger_tx_id: result.txId,
  });
};
