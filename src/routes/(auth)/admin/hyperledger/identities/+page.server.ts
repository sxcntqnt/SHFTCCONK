// src/routes/admin/hyperledger/identities/+page.server.ts

import { fail, redirect } from "@sveltejs/kit"
import { revokeSchema } from "$lib/security/hyperledger.schema"
import type { PageServerLoad, Actions } from "./$types"
import { listIdentities, loadIdentity } from "$lib/hyperledger/vault"
import { revokeUser } from "../utils/enrollment"
import { ACTOR_TYPES } from "$lib/features/auth/contexts/context.template"

export const load: PageServerLoad = async ({ locals, url }) => {
  const { userState } = locals
  if (!userState) throw redirect(303, "/login")

  const isAdmin = userState.activeContexts.some(
    (ctx) =>
      [ACTOR_TYPES.SUPER_ADMIN, ACTOR_TYPES.ADMIN].includes(
        ctx.type as typeof ACTOR_TYPES.SUPER_ADMIN,
      ) && ctx.status === "active",
  )
  if (!isAdmin) throw redirect(303, "/admin/dashboard")

  const filterRole = url.searchParams.get("role") ?? ""
  const filterOrg = url.searchParams.get("org") ?? ""
  const includeRevoked = url.searchParams.get("revoked") === "true"

  const userIds = await listIdentities()
  const all = (await Promise.all(userIds.map((id) => loadIdentity(id))))
    .filter(Boolean)
    .map((id) => ({
      userId: id!.userId,
      mspId: id!.mspId,
      attributes: id!.attributes,
      enrolledAt: id!.enrolledAt,
      revoked: id!.revoked ?? false,
    }))

  const identities = all
    .filter((i) => (includeRevoked ? true : !i.revoked))
    .filter((i) => (filterRole ? i.attributes?.role === filterRole : true))
    .filter((i) => (filterOrg ? i.attributes?.orgId === filterOrg : true))

  const orgs = [...new Set(all.map((i) => i.attributes?.orgId).filter(Boolean))]
  const roles = [...new Set(all.map((i) => i.attributes?.role).filter(Boolean))]

  return {
    identities,
    orgs,
    roles,
    filters: { filterRole, filterOrg, includeRevoked },
  }
}

export const actions: Actions = {
  revoke: async ({ request, locals }) => {
    const { userState } = locals
    const isAdmin =
      userState?.activeContexts.some(
        (ctx) =>
          [ACTOR_TYPES.SUPER_ADMIN, ACTOR_TYPES.ADMIN].includes(
            ctx.type as typeof ACTOR_TYPES.SUPER_ADMIN,
          ) && ctx.status === "active",
      ) ?? false
    if (!isAdmin) return fail(403, { error: "Forbidden" })

    const form = await request.formData()
    const raw = { userId: form.get("userId"), reason: form.get("reason"), entityType: form.get("entityType") }
    const parsed = revokeSchema.safeParse(raw)
    if (!parsed.success) return fail(400, { error: parsed.error.flatten().fieldErrors })
    const userId = parsed.data.userId
    const reason = parsed.data.reason
    const type = parsed.data.entityType

    try {
      await revokeUser(userId, reason, type)

      await locals.supabase.from("audit_logs").insert({
        event_type: "hyperledger_identity_revoked",
        performed_by: locals.user!.id,
        details: { userId, reason, type },
      })

      return { success: true, revokedUserId: userId }
    } catch (err) {
      return fail(500, { error: `Revocation failed: ${String(err)}` })
    }
  },
}
