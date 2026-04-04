// src/routes/admin/hyperledger/enroll/+page.server.ts
//
// Manual enrollment page — now a fallback for edge cases only.
// Normal enrollment is handled automatically by the queue processor.
// Admin uses this for: IoT devices, emergency re-enrollment, edge cases.

import { fail, redirect } from "@sveltejs/kit"
import type { PageServerLoad, Actions } from "./$types"
import { enrollUser, enrollDevice } from "../utils/enrollment"
import { ACTOR_TYPES } from "$lib/features/auth/contexts/context.template"

export const load: PageServerLoad = async ({ locals }) => {
  const { userState } = locals
  if (!userState) throw redirect(303, "/login")

  const isAdmin = userState.activeContexts.some(
    (ctx) =>
      [ACTOR_TYPES.SUPER_ADMIN, ACTOR_TYPES.ADMIN].includes(
        ctx.type as typeof ACTOR_TYPES.SUPER_ADMIN,
      ) && ctx.status === "active",
  )
  if (!isAdmin) throw redirect(303, "/admin/dashboard")

  return {}
}

export const actions: Actions = {
  enrollUser: async ({ request, locals }) => {
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
    const userId = String(form.get("userId") ?? "").trim()
    const role = String(form.get("role") ?? "").trim()
    const orgId = String(form.get("orgId") ?? "").trim()
    const affiliation = String(
      form.get("affiliation") ?? "platform.users",
    ).trim()

    if (!userId || !role || !orgId) {
      return fail(400, { error: "userId, role and orgId are required." })
    }

    const validRoles = ["driver", "fleet-manager", "org-admin"]
    if (!validRoles.includes(role)) {
      return fail(400, {
        error: `Invalid role. Choose: ${validRoles.join(", ")}`,
      })
    }

    try {
      const result = await enrollUser({
        userId,
        role: role as any,
        orgId,
        affiliation,
      })

      // Audit the manual enrollment
      await locals.supabase.from("audit_logs").insert({
        event_type: "hyperledger_manual_enroll",
        performed_by: locals.user!.id,
        details: { userId, role, orgId, msp_id: result.mspId },
      })

      return {
        success: true,
        type: "user",
        userId: result.userId,
        mspId: result.mspId,
      }
    } catch (err) {
      return fail(500, { error: `Enrollment failed: ${String(err)}` })
    }
  },

  enrollDevice: async ({ request, locals }) => {
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
    const deviceId = String(form.get("deviceId") ?? "").trim()
    const vehicleId = String(form.get("vehicleId") ?? "").trim()
    const orgId = String(form.get("orgId") ?? "").trim()
    const location = String(form.get("location") ?? "unknown").trim()

    if (!deviceId || !orgId) {
      return fail(400, { error: "deviceId and orgId are required." })
    }

    try {
      const result = await enrollDevice({
        deviceId,
        vehicleId,
        orgId,
        location,
      })

      await locals.supabase.from("audit_logs").insert({
        event_type: "hyperledger_device_enroll",
        performed_by: locals.user!.id,
        details: { deviceId, vehicleId, orgId, msp_id: result.mspId },
      })

      return {
        success: true,
        type: "device",
        deviceId: result.deviceId,
        mspId: result.mspId,
        certificate: result.certificate,
        privateKey: result.privateKey,
      }
    } catch (err) {
      return fail(500, { error: `Device enrollment failed: ${String(err)}` })
    }
  },
}
