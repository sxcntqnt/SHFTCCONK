import type { RequestHandler } from "./$types"
import { json, error } from "@sveltejs/kit"
import { verifyPairingToken } from "$lib/server/auth/pairingToken"
import { db } from "$lib/server/db"
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

  const tokenRecord = await db.vehicle_pairing_tokens.findFirst({
    where: { vehicle_id: payload.vehicle_id, consumed_at: null },
  })

  if (!tokenRecord) {
    throw error(409, {
      code: "TOKEN_CONSUMED",
      message: "This pairing link has already been used.",
    })
  }

  await db.vehicle_pairing_tokens.update({
    where: { id: tokenRecord.id },
    data: { consumed_at: new Date().toISOString() },
  })

  const sessionToken = await generateDriverSessionToken({
    vehicle_id: payload.vehicle_id,
    org_id: payload.org_id,
    operator_id: payload.operator_id,
  })

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
