// src/routes/api/remittance/+server.ts
import { json, error } from "@sveltejs/kit"
import { calculateDistribution } from "$lib/finance/ledger"
import { z } from "zod"
import { logger } from "$lib/utils/logger"

const schema = z.object({
  vehicleId: z.string(),
  driverId: z.string(),
  collected: z.number().positive(),
  target: z.number().positive(),
})

export async function POST({ request }) {
  try {
    const body = await request.json()
    const validated = schema.parse(body)
    const result = calculateDistribution(
      validated.collected,
      validated.target,
      0.1,
    )
    logger.info(`Remittance processed for vehicle ${validated.vehicleId}`)
    return json({ status: "CLEARED", distribution: result })
  } catch (e) {
    logger.error("Remittance error:", e)
    if (e instanceof z.ZodError) {
      return error(400, { message: "Invalid input", details: e.errors })
    }
    return error(500, { message: "Server error" })
  }
}
