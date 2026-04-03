import type { RequestHandler } from "@sveltejs/kit"
import { redirect } from "@sveltejs/kit"

export const POST: RequestHandler = async ({ request, locals }) => {
  const form = await request.formData()
  const name = form.get("name") as string
  const description = form.get("description") as string

  try {
    await (locals.supabase as any)
      .from("organizations")
      .insert({ name, description })
  } catch (e) {
    console.error("create organization error", e)
  }

  throw redirect(303, "/enterprise")
}
