// src/lib/features/billing/perEventEscrow.ts// 
import { supabaseAdmin } from "$lib/server/db";
import { streamClient } from "$lib/server/redis";
import { mpesa } from "$lib/server/mpesa-provider";

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

  const callbackUrl = `${process.env.PUBLIC_BASE_URL}/api/mpesa/callbacks/per-event-escrow`;

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

  // Persist to Supabase (using admin client)
  const { error } = await supabaseAdmin
    .from("per_event_escrow_records")
    .insert({
      booking_id: params.bookingId,
      org_id: params.orgId,
      operator_id: params.operatorId,
      agreed_fare_kes: params.agreedFareKes,
      platform_fee_kes: platformFeeKes,
      operator_net_kes: operatorNetKes,
      mpesa_checkout_request_id: checkoutId,
      status: "PENDING",
    });

  if (error) {
    console.error("Failed to insert escrow record:", error);
    throw new Error(`Escrow record insert failed: ${error.message}`);
  }

  return {
    collection_initiated: true,
    checkout_request_id: checkoutId,
    platform_fee_kes: platformFeeKes,
    operator_net_kes: operatorNetKes,
  };
}