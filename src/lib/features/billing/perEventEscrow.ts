// src/lib/features/billing/perEventEscrow.ts//
import { sql } from "$lib/server/pg";
import { streamClient } from "$lib/server/redis";
import { mpesa } from "$lib/server/mpesa-provider";
import { env } from "$env/dynamic/private";

export interface EscrowInitResult {
  collection_initiated: boolean;
  checkout_request_id: string | null;
  platform_fee_kes: number;
  operator_net_kes: number;
}

const PLATFORM_FEE_RATE = 0.025; // 2.5%
const MINIMUM_FEE_KES = 50;



export async function initiatePerEventEscrow(params: {
  bookingId: string;
  orgId: string;
  operatorId: string;
  agreedFareKes: number;
  clientPhone: string;
  vehicleId: string;
}): Promise<EscrowInitResult> {
  const platformFeeKes = Math.max(
    MINIMUM_FEE_KES,
    Math.round(params.agreedFareKes * PLATFORM_FEE_RATE)
  );

  const operatorNetKes = params.agreedFareKes - platformFeeKes;
  const callbackUrl = `${env.PUBLIC_BASE_URL}/api/mpesa/callbacks/per-event-escrow`;

  // Initiate M-Pesa STK Push
  const stkResult = await mpesa.stkPush({
    phone: params.clientPhone,
    amount: params.agreedFareKes,
    account_reference: `FLAM-${params.bookingId.slice(0, 8).toUpperCase()}`,
    transaction_desc: `Charter booking deposit — ${params.vehicleId}`,
    callback_url: callbackUrl,
  });

  if (!stkResult.success || !stkResult.checkout_request_id) {
    return {
      collection_initiated: false,
      checkout_request_id: null,
      platform_fee_kes: platformFeeKes,
      operator_net_kes: operatorNetKes,
    };
  }

  const checkoutId = stkResult.checkout_request_id;

  // Cache escrow intent in Redis (10 minutes TTL)
  const escrowIntent = {
    booking_id: params.bookingId,
    org_id: params.orgId,
    operator_id: params.operatorId,
    vehicle_id: params.vehicleId,
    agreed_fare_kes: params.agreedFareKes,
    platform_fee_kes: platformFeeKes,
    operator_net_kes: operatorNetKes,
  };

  await streamClient.set(
    `escrow_intent:${checkoutId}`,
    JSON.stringify(escrowIntent),
    "EX",
    600 // 10 minutes
  );

  // Persist to Postgres
  try {
    await sql`
      INSERT INTO per_event_escrow_records (
        booking_id,
        org_id,
        operator_id,
        agreed_fare_kes,
        platform_fee_kes,
        operator_net_kes,
        mpesa_checkout_request_id,
        status
      )
      VALUES (
        ${params.bookingId},
        ${params.orgId},
        ${params.operatorId},
        ${params.agreedFareKes},
        ${platformFeeKes},
        ${operatorNetKes},
        ${checkoutId},
        'PENDING'
      )
    `;
  } catch (err) {
    console.error("Failed to insert escrow record:", err);
    throw new Error(
      `Escrow record insert failed: ${
        err instanceof Error ? err.message : String(err)
      }`
    );
  }

  return {
    collection_initiated: true,
    checkout_request_id: checkoutId,
    platform_fee_kes: platformFeeKes,
    operator_net_kes: operatorNetKes,
  };
}
