import { error, fail, redirect } from "@sveltejs/kit"
import type { PageServerLoad, Actions } from "./$types"

export const load: PageServerLoad = async ({ params, locals }) => {
  const session = locals.session
  const user = locals.user
  if (!session || !user) throw redirect(303, "/auth/login")

  const { orgId } = params

  // Fetch org directly by id
  const { data: org, error: oErr } = await (locals.supabase as any)
    .from("organizations")
    .select("id, name, status, metadata, created_at")
    .eq("id", orgId)
    .maybeSingle()

  if (oErr) throw error(500, "Failed to load organization")
  if (!org) throw error(404, "Organization not found")

  // Verify current user belongs to this org as admin
  const { data: userActors } = await (locals.supabase as any)
    .from("actors")
    .select("id")
    .eq("profile_id", user.id)

  const actorIds = (userActors ?? []).map((a: any) => a.id)

  let membership: any = null
  if (actorIds.length > 0) {
    const { data: memberships } = await (locals.supabase as any)
      .from("organization_members")
      .select("actor_id, role")
      .in("actor_id", actorIds)
      .eq("organization_id", org.id)
      .limit(1)

    if (memberships && memberships.length > 0) {
      membership = memberships[0]
    }
  }

  if (!membership || membership.role !== "admin") {
    throw error(403, "Only organization admins can manage news")
  }

  // Fetch org's news
  const { data: news, error: nErr } = await (locals.supabase as any)
    .from("org_news")
    .select("*, profiles:author_id ( full_name, avatar_url )")
    .eq("organization_id", org.id)
    .order("pinned", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(100)

  if (nErr) console.error("org_news fetch error", nErr)

  // Fetch org's routes for linking
  let routes: any[] = []
  try {
    const { data: stages } = await (locals.supabase as any)
      .from("stage_assignments")
      .select("id, stage_name, route")
      .eq("organization_id", org.id)
      .order("stage_name")
    if (stages) routes = stages
  } catch (e) {
    /* ignore */
  }

  // Subscriber count
  let subscriberCount = 0
  try {
    const { data: subs } = await (locals.supabase as any)
      .from("contact_requests")
      .select("id")
      .eq("company_name", org.name)
      .like("message_body", "%route_subscription%")
    if (subs) subscriberCount = subs.length
  } catch (e) {
    /* ignore */
  }

  // Fetch user profile for author display
  const { data: profile } = await (locals.supabase as any)
    .from("profiles")
    .select("full_name, avatar_url")
    .eq("id", user.id)
    .maybeSingle()

  return {
    session,
    org,
    news: news ?? [],
    routes,
    subscriberCount,
    profile: profile ?? null,
    orgId,
  }
}

export const actions: Actions = {
  create: async ({ request, params, locals }) => {
    const user = locals.user
    if (!user) return fail(401, { error: "Not authenticated" })

    const form = await request.formData()
    const title = (form.get("title") as string)?.trim()
    const body = (form.get("body") as string)?.trim()
    const category = (form.get("category") as string) || "general"
    const severity = (form.get("severity") as string) || "info"
    const pinned = form.get("pinned") === "true"
    const published = form.get("published") !== "false"
    const routeIdsRaw = form.getAll("route_ids") as string[]
    const { orgId } = params

    if (!title) return fail(400, { error: "Title is required" })
    if (!body) return fail(400, { error: "Body is required" })

    const { error: insertErr } = await (locals.supabase as any)
      .from("org_news")
      .insert({
        organization_id: orgId,
        author_id: user.id,
        title,
        body,
        category,
        severity,
        pinned,
        published,
        route_ids: routeIdsRaw.length > 0 ? routeIdsRaw : [],
      })

    if (insertErr) {
      console.error("create news error", insertErr)
      return fail(500, { error: insertErr.message })
    }

    return { created: true }
  },

  update: async ({ request, locals }) => {
    const user = locals.user
    if (!user) return fail(401, { error: "Not authenticated" })

    const form = await request.formData()
    const id = form.get("id") as string
    const title = (form.get("title") as string)?.trim()
    const body = (form.get("body") as string)?.trim()
    const category = (form.get("category") as string) || "general"
    const severity = (form.get("severity") as string) || "info"
    const pinned = form.get("pinned") === "true"
    const published = form.get("published") !== "false"

    if (!id) return fail(400, { error: "Missing news id" })
    if (!title) return fail(400, { error: "Title is required" })

    const { error: updateErr } = await (locals.supabase as any)
      .from("org_news")
      .update({ title, body, category, severity, pinned, published })
      .eq("id", id)

    if (updateErr) {
      console.error("update news error", updateErr)
      return fail(500, { error: updateErr.message })
    }

    return { updated: true }
  },

  delete: async ({ request, locals }) => {
    const user = locals.user
    if (!user) return fail(401, { error: "Not authenticated" })

    const form = await request.formData()
    const id = form.get("id") as string
    if (!id) return fail(400, { error: "Missing news id" })

    const { error: deleteErr } = await (locals.supabase as any)
      .from("org_news")
      .delete()
      .eq("id", id)

    if (deleteErr) return fail(500, { error: deleteErr.message })
    return { deleted: true }
  },

  toggle_pin: async ({ request, locals }) => {
    const form = await request.formData()
    const id = form.get("id") as string
    const pinned = form.get("pinned") === "true"
    if (!id) return fail(400, { error: "Missing id" })

    const { error: err } = await (locals.supabase as any)
      .from("org_news")
      .update({ pinned: !pinned })
      .eq("id", id)

    if (err) return fail(500, { error: err.message })
    return { toggled: true }
  },

  toggle_publish: async ({ request, locals }) => {
    const form = await request.formData()
    const id = form.get("id") as string
    const published = form.get("published") === "true"
    if (!id) return fail(400, { error: "Missing id" })

    const { error: err } = await (locals.supabase as any)
      .from("org_news")
      .update({ published: !published })
      .eq("id", id)

    if (err) return fail(500, { error: err.message })
    return { toggled: true }
  },
}
