// src/routes/admin/hyperledger/revoke/+server.ts
// DELETE /admin/hyperledger/revoke
// Revokes a Fabric identity (user, driver, or device) at the CA level.
// Protected: platform admin only.

import { json, error } from "@sveltejs/kit"
import type { RequestHandler } from "./$types"
import { revokeIdentity } from "$lib/hyperledger/ca"

// Valid Fabric CA revocation reasons
const VALID_REASONS = [
  "unspecified",
  "keycompromise",
  "cacompromise",
  "affiliationchange",
  "superseded",
  "cessationofoperation",
  "privilegewithdrawn", // default — covers offboarding, suspension
]

function requirePlatformAdmin(locals: App.Locals) {
  if (!locals.user) throw error(401, "Unauthenticated")
  if (locals.user.role !== "platform-admin")
    throw error(403, "Forbidden: platform admin only")
}

export const DELETE: RequestHandler = async ({ request, locals }) => {
  requirePlatformAdmin(locals)

  const body = await request.json()
  const { userId, reason = "privilegewithdrawn" } = body

  if (!userId) {
    throw error(400, "Missing required field: userId")
  }

  if (!VALID_REASONS.includes(reason)) {
    throw error(400, `Invalid reason. Allowed: ${VALID_REASONS.join(" | ")}`)
  }

  await revokeIdentity(userId, reason)

  return json({
    success: true,
    message: `Identity revoked: ${userId}`,
    data: { userId, reason, revokedAt: new Date().toISOString() },
  })
}
