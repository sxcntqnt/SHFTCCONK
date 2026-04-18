import type { RequestHandler } from "@sveltejs/kit"
import { json, redirect } from "@sveltejs/kit"
import { driverCreateSchema } from "$lib/security/drivers.schema"

export const POST: RequestHandler = async ({ request, locals }) => {
  const form = await request.formData()
  const raw = {
    name: (form.get("name") as string)?.trim() ?? "",
    license: (form.get("license") as string)?.trim() ?? "",
    vehicle_id: (form.get("vehicle_id") as string) || null,
  }

  const parsed = driverCreateSchema.safeParse(raw)
  if (!parsed.success) {
    console.error("driver create validation failed", parsed.error.flatten().fieldErrors)
    throw redirect(303, "/drivers?error=validation")
  }

  try {
    await (locals.supabase as any)
      .from("drivers")
      .insert({ name: parsed.data.name, license: parsed.data.license, vehicle_id: parsed.data.vehicle_id })
  } catch (e) {
    console.error("drivers add error", e)
  }

  throw redirect(303, "/drivers")
}
