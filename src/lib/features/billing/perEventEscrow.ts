import { supabaseAdmin } from "$lib/server/db"
import { redis } from "$lib/server/redis"
import { mpesa } from "$lib/server/mpesa"

export interface EscrowInitResult {
  collection_initiated: boolean
  checkout_request_id: string | null
  platform_fee_kes: number
  operator_net_kes: number
}

const PLATFORM_FEE_RATE = 0.025
const MINIMUM_FEE_KES = 50

export async function initiatePerEventEscrow(params: {
  bookingId: string
  orgId: string
  operatorId: string
  agreedFareKes: number
  clientPhone: string
  vehicleId: string
}): Promise<EscrowInitResult> {
  const platformFeeKes = Math.max(
    MINIMUM_FEE_KES,
    Math.round(params.agreedFareKes * PLATFORM_FEE_RATE),
  )

  const operatorNetKes = params.agreedFareKes - platformFeeKes

  const callbackUrl = `${process.env.PUBLIC_BASE_URL}/api/mpesa/callbacks/per-event-escrow`

  const stkResult = await mpesa.stkPush({
    phone: params.clientPhone,
    amount: params.agreedFareKes,
    account_reference: `FLAM-${params.bookingId.slice(0, 8).toUpperCase()}`,
    transaction_desc: `Charter booking deposit — ${params.vehicleId}`,
    callback_url: callbackUrl,
  })

  if (!stkResult?.success) {
    return {
      collection_initiated: false,
      checkout_request_id: null,
      platform_fee_kes: platformFeeKes,
      operator_net_kes: operatorNetKes,
    }
  }

  // ✅ Cache escrow intent
  await redis.set(
    `escrow_intent:${stkResult.checkout_request_id}`,
    JSON.stringify({
      booking_id: params.bookingId,
      org_id: params.orgId,
      operator_id: params.operatorId,
      vehicle_id: params.vehicleId,
      agreed_fare_kes: params.agreedFareKes,
      platform_fee_kes: platformFeeKes,
      operator_net_kes: operatorNetKes,
    }),
    { ex: 600 },
  )

  // ✅ Supabase insert (ADMIN)
  const { error } = await supabaseAdmin
    .from("per_event_escrow_records")
    .insert({
      booking_id: params.bookingId,
      org_id: params.orgId,
      operator_id: params.operatorId,
      agreed_fare_kes: params.agreedFareKes,
      platform_fee_kes: platformFeeKes,
      operator_net_kes: operatorNetKes,
      mpesa_checkout_request_id: stkResult.checkout_request_id,
      status: "PENDING",
    })

  if (error) {
    throw new Error(`Escrow record insert failed: ${error.message}`)
  }

  return {
    collection_initiated: true,
    checkout_request_id: stkResult.checkout_request_id,
    platform_fee_kes: platformFeeKes,
    operator_net_kes: operatorNetKes,
  }
}