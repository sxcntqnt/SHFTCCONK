import type { RequestHandler } from "@sveltejs/kit"
import { redirect } from "@sveltejs/kit"
import { orgCreateSchema } from "$lib/security/org.schema"

export const POST: RequestHandler = async ({ request, locals }) => {
  const form = await request.formData()
  const raw = {
    name: (form.get("name") as string)?.trim() ?? "",
    description: (form.get("description") as string)?.trim() ?? null,
  }

  const parsed = orgCreateSchema.safeParse(raw)
  if (!parsed.success) {
    console.error("org create validation failed", parsed.error.flatten().fieldErrors)
    throw redirect(303, "/enterprise?error=validation")
  }

  try {
    await (locals.supabase as any)
      .from("organizations")
      .insert({ name: parsed.data.name, description: parsed.data.description })
  } catch (e) {
    console.error("create organization error", e)
  }

  throw redirect(303, "/enterprise")
}
