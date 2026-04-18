// src/routes/(auth)/org/[orgId]/vehicles/group/+page.server.ts
import type { PageServerLoad, Actions } from "./$types"
import { redirect, fail } from "@sveltejs/kit"
import { vehicleGroupCreateSchema } from "$lib/security/group.schema"

export const load: PageServerLoad = async ({ params, locals }) => {
  const { safeGetSession, supabase } = locals
  const { session } = await safeGetSession()
  if (!session) redirect(303, "/login")

  const orgId = params.orgId

  const { data: groups, error } = await supabase
    .from("vehicle_groups")
    .select(
      `
      id,
      name,
      description,
      vehicles ( count )
    `,
    )
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false })

  if (error) console.error("[groups load]", error)

  return {
    orgId,
    groups: (groups ?? []).map((g) => ({
      id: g.id,
      name: g.name,
      description: g.description ?? "",
      vehicles: (g.vehicles as any)?.[0]?.count ?? 0,
    })),
  }
}

export const actions: Actions = {
  // ── Create group ──────────────────────────────────────────────────────
  create: async ({ params, request, locals }) => {
    const { safeGetSession, supabase } = locals
    const { session } = await safeGetSession()
    if (!session) return fail(401, { message: "Unauthorised" })

    const form = await request.formData()
    const raw = {
      name: (form.get("name") as string)?.toString().trim() ?? "",
      description: (form.get("description") as string)?.toString().trim() ?? "",
    }

    const parsed = vehicleGroupCreateSchema.safeParse(raw)
    if (!parsed.success) return fail(400, { errors: parsed.error.flatten().fieldErrors })

    const { error } = await supabase
      .from("vehicle_groups")
      .insert({ organization_id: params.orgId, name: parsed.data.name, description: parsed.data.description })

    if (error) return fail(500, { message: error.message })

    return { success: true }
  },

  // ── Delete group ──────────────────────────────────────────────────────
  delete: async ({ params, request, locals }) => {
    const { safeGetSession, supabase } = locals
    const { session } = await safeGetSession()
    if (!session) return fail(401, { message: "Unauthorised" })

    const form = await request.formData()
    const id = form.get("id")?.toString()

    if (!id) return fail(400, { message: "Missing group id" })

    const { error } = await supabase
      .from("vehicle_groups")
      .delete()
      .eq("id", id)
      .eq("organization_id", params.orgId) // scope guard

    if (error) return fail(500, { message: error.message })

    return { success: true }
  },
}
