import type { RequestHandler } from "./$types"
import { json, error } from "@sveltejs/kit"

import { verifyPairingToken } from "$lib/features/auth/services/pairingToken"
import { supabaseAdmin } from "$lib/server/db"
import { generateDriverSessionToken } from "$lib/server/auth/driverSession"
import { redis } from "$lib/server/redis"

export const POST: RequestHandler = async ({ request }) => {
  const { pairing_token } = await request.json()

  let payload
  try {
    payload = await verifyPairingToken(pairing_token)
  } catch (e) {
    throw error(401, {
      code: "TOKEN_EXPIRED",
      message: "Pairing link has expired. Request a new one from your operator.",
    })
  }

  // ✅ Fetch token record
  const { data: tokenRecord, error: fetchError } = await supabaseAdmin
    .from("vehicle_pairing_tokens")
    .select("*")
    .eq("vehicle_id", payload.vehicle_id)
    .is("consumed_at", null)
    .single()

  if (fetchError || !tokenRecord) {
    throw error(409, {
      code: "TOKEN_CONSUMED",
      message: "This pairing link has already been used.",
    })
  }

  // ✅ Mark as consumed
  const { error: updateError } = await supabaseAdmin
    .from("vehicle_pairing_tokens")
    .update({
      consumed_at: new Date().toISOString(),
    })
    .eq("id", tokenRecord.id)

  if (updateError) {
    throw new Error(`Failed to consume token: ${updateError.message}`)
  }

  // ✅ Generate session
  const sessionToken = await generateDriverSessionToken({
    vehicle_id: payload.vehicle_id,
    org_id: payload.org_id,
    operator_id: payload.operator_id,
  })

  // ✅ Cache session
  await redis.set(
    `driver_session:${payload.vehicle_id}`,
    JSON.stringify({
      vehicle_id: payload.vehicle_id,
      org_id: payload.org_id,
      operator_id: payload.operator_id,
    }),
    { ex: 30 * 24 * 60 * 60 },
  )

  return json({
    vehicle_id: payload.vehicle_id,
    org_id: payload.org_id,
    operator_id: payload.operator_id,
    plate_number: payload.plate_number,
    paired_at: new Date().toISOString(),
    session_token: sessionToken,
  })
}