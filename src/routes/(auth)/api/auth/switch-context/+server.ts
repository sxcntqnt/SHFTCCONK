// src/routes/api/auth/switch-context/+server.ts
import { redirect, error } from "@sveltejs/kit"
import { switchContextSchema } from "$lib/security/switchContext.schema"

export const POST = async ({ request, locals, cookies }) => {
  const { session, user } = await locals.safeGetSession()
  if (!session) throw error(401)

  const formData = await request.formData()
  const raw = {
    context: (formData.get("context") as string) ?? "",
    orgId: (formData.get("orgId") as string) ?? null,
  }

  const parsed = switchContextSchema.safeParse(raw)
  if (!parsed.success) throw error(400, "Invalid request")

  const targetContext = parsed.data.context
  const orgId = parsed.data.orgId

  // 1. Validate the user actually has this capability
  // We use your resolveUserState logic here
  const userState = await resolveUserState(user.id)
  const hasCapability = userState.activeContexts.some((ctx) => {
    if (targetContext === "crew")
      return ["driver", "conductor"].includes(ctx.type)
    if (targetContext === "passenger") return ctx.type === "passenger"
    return ctx.type === targetContext
  })

  if (!hasCapability) throw error(403, "You do not have this capability.")

  // 2. Persist the choice
  // We store the "Preferred Context" in a cookie so hooks.server.ts sees it
  cookies.set("active_context", targetContext, { path: "/", httpOnly: true })
  if (orgId) cookies.set("active_org_id", orgId, { path: "/", httpOnly: true })

  // 3. Redirect to the appropriate root for that context
  const destination =
    targetContext === "crew" ? "/crew/dashboard" : "/app/dashboard"
  throw redirect(303, destination)
}
