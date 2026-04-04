// src/routes/admin/hyperledger/identities/+server.ts
// GET /admin/hyperledger/identities
// Lists enrolled identities from Vault.
// Supports ?orgId=xxx and ?role=driver filtering.
// Never returns private key material.
// Protected: platform admin only.

import { json, error } from "@sveltejs/kit"
import type { RequestHandler } from "./$types"
import { listIdentities, loadIdentity } from "$lib/hyperledger/vault"

function requirePlatformAdmin(locals: App.Locals) {
  if (!locals.user) throw error(401, "Unauthenticated")
  if (locals.user.role !== "platform-admin")
    throw error(403, "Forbidden: platform admin only")
}

export const GET: RequestHandler = async ({ url, locals }) => {
  requirePlatformAdmin(locals)

  // Optional filters
  const filterOrgId = url.searchParams.get("orgId")
  const filterRole = url.searchParams.get("role")
  const includeRevoked = url.searchParams.get("includeRevoked") === "true"

  // 1. Get all userId keys from Vault
  const userIds = await listIdentities()

  // 2. Load each identity (strip private key material before returning)
  const identities = await Promise.all(
    userIds.map(async (userId) => {
      const identity = await loadIdentity(userId)
      if (!identity) return null
      return {
        userId: identity.userId,
        mspId: identity.mspId,
        attributes: identity.attributes,
        enrolledAt: identity.enrolledAt,
        revoked: identity.revoked ?? false,
        // certPem omitted — available on demand if ever needed for audit
      }
    }),
  )

  // 3. Filter out nulls + apply query params
  const filtered = identities
    .filter((id): id is NonNullable<typeof id> => id !== null)
    .filter((id) => (includeRevoked ? true : !id.revoked))
    .filter((id) => (filterOrgId ? id.attributes?.orgId === filterOrgId : true))
    .filter((id) => (filterRole ? id.attributes?.role === filterRole : true))

  return json({
    success: true,
    total: filtered.length,
    data: filtered,
  })
}
