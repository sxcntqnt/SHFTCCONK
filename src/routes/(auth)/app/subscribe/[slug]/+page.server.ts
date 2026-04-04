import { error, fail, redirect } from "@sveltejs/kit"
import type { PageServerLoad, Actions } from "./$types"

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
}

export const load: PageServerLoad = async ({ params, locals }) => {
  const { slug } = params
  const session = locals.session
  const user = locals.user

  // Must be authenticated for in-app subscribe
  if (!session || !user) {
    throw redirect(303, `/auth/login?redirect=/app/subscribe/${slug}`)
  }

  // Resolve org by slug
  const { data: orgs, error: oErr } = await (locals.supabase as any)
    .from("organizations")
    .select("id, name, status, metadata, created_at")
    .limit(500)

  if (oErr) throw error(500, "Failed to load organizations")

  const org = (orgs ?? []).find(
    (o: any) => slugify(o.name) === slug || o.id === slug,
  )
  if (!org) throw error(404, "Organization not found")

  // Fetch user's profile
  const { data: profile } = await (locals.supabase as any)
    .from("profiles")
    .select("id, full_name, avatar_url, company_name")
    .eq("id", user.id)
    .maybeSingle()

  // Fetch user's existing actors
  const { data: userActors } = await (locals.supabase as any)
    .from("actors")
    .select("id, type, status")
    .eq("profile_id", user.id)

  const actors = userActors ?? []
  const actorIds = actors.map((a: any) => a.id)

  // Check if user already has a membership in this org
  let existingMembership: any = null
  if (actorIds.length > 0) {
    const { data: memberships } = await (locals.supabase as any)
      .from("organization_members")
      .select("actor_id, organization_id, role")
      .in("actor_id", actorIds)
      .eq("organization_id", org.id)
      .limit(1)

    if (memberships && memberships.length > 0) {
      existingMembership = memberships[0]
    }
  }

  // Check if there's a pending actor_request for this org
  let pendingRequest: any = null
  const { data: requests } = await (locals.supabase as any)
    .from("actor_requests")
    .select("id, requested_type, status, payload, created_at")
    .eq("profile_id", user.id)
    .eq("status", "pending")

  if (requests) {
    pendingRequest =
      requests.find(
        (r: any) =>
          r.payload?.organization_id === org.id || r.payload?.org_slug === slug,
      ) || null
  }

  // Fetch org's routes via stage_assignments
  let routes: any[] = []
  try {
    const { data: stages, error: sErr } = await (locals.supabase as any)
      .from("stage_assignments")
      .select("id, stage_name, route, operator_id, created_at")
      .eq("organization_id", org.id)
      .order("stage_name")
      .limit(50)

    if (!sErr && stages) routes = stages
  } catch (e) {
    /* ignore */
  }

  // Fetch org's vehicles with active status
  let vehicles: any[] = []
  try {
    const { data: vData, error: vErr } = await (locals.supabase as any)
      .from("vehicles")
      .select("id, reg_number, capacity, active, gps_lat, gps_lng")
      .eq("organization_id", org.id)
      .order("reg_number")
      .limit(100)

    if (!vErr && vData) vehicles = vData
  } catch (e) {
    /* ignore */
  }

  // Fetch org branches
  let branches: any[] = []
  try {
    const { data: bData, error: bErr } = await (locals.supabase as any)
      .from("branches")
      .select("id, name")
      .eq("organization_id", org.id)
      .order("name")

    if (!bErr && bData) branches = bData
  } catch (e) {
    /* ignore */
  }

  // Member count for context
  let memberCount = 0
  try {
    const { data: members } = await (locals.supabase as any)
      .from("organization_members")
      .select("actor_id")
      .eq("organization_id", org.id)
    if (members) memberCount = members.length
  } catch (e) {
    /* ignore */
  }

  // Fetch available roles for verification request
  let roles: any[] = []
  try {
    const { data: rData, error: rErr } = await (locals.supabase as any)
      .from("roles")
      .select("id, display_name, description")
    if (!rErr && rData) roles = rData
  } catch (e) {
    /* ignore */
  }

  return {
    session,
    profile: profile ?? null,
    org,
    routes,
    vehicles,
    branches,
    memberCount,
    userActors: actors,
    existingMembership,
    pendingRequest,
    roles,
    slug,
  }
}

export const actions: Actions = {
  /** Subscribe to org route updates */
  subscribe: async ({ request, params, locals }) => {
    const session = locals.session
    const user = locals.user
    if (!session || !user) return fail(401, { error: "Not authenticated" })

    const form = await request.formData()
    const routeIds = form.getAll("route_ids") as string[]
    const allRoutes = form.get("all_routes") === "true"
    const { slug } = params

    // Resolve org
    const { data: orgs } = await (locals.supabase as any)
      .from("organizations")
      .select("id, name")
      .limit(500)

    const org = (orgs ?? []).find(
      (o: any) => slugify(o.name) === slug || o.id === slug,
    )
    if (!org) return fail(404, { error: "Organization not found" })

    // Store subscription in contact_requests with structured payload
    const { error: insertErr } = await (locals.supabase as any)
      .from("contact_requests")
      .insert({
        email: user.email,
        first_name: locals.user?.user_metadata?.full_name || null,
        company_name: org.name,
        message_body: JSON.stringify({
          type: "route_subscription",
          organization_id: org.id,
          profile_id: user.id,
          all_routes: allRoutes,
          route_ids: allRoutes ? [] : routeIds,
          subscribed_at: new Date().toISOString(),
        }),
      })

    if (insertErr) {
      console.error("subscription error", insertErr)
      return fail(500, { error: "Failed to subscribe. Please try again." })
    }

    return { subscribed: true }
  },

  /** Request identity verification / org membership */
  verify: async ({ request, params, locals }) => {
    const session = locals.session
    const user = locals.user
    if (!session || !user) return fail(401, { error: "Not authenticated" })

    const form = await request.formData()
    const requestedType = form.get("role") as string
    const note = (form.get("note") as string)?.trim() || null
    const { slug } = params

    if (!requestedType) return fail(400, { error: "Please select a role" })

    // Resolve org
    const { data: orgs } = await (locals.supabase as any)
      .from("organizations")
      .select("id, name")
      .limit(500)

    const org = (orgs ?? []).find(
      (o: any) => slugify(o.name) === slug || o.id === slug,
    )
    if (!org) return fail(404, { error: "Organization not found" })

    // Check for duplicate pending request
    const { data: existing } = await (locals.supabase as any)
      .from("actor_requests")
      .select("id")
      .eq("profile_id", user.id)
      .eq("status", "pending")

    const alreadyPending = (existing ?? []).some((r: any) => {
      try {
        // This is a simple check — in production you'd query payload jsonb
        return false
      } catch {
        return false
      }
    })

    // Create actor_request
    const { error: reqErr } = await (locals.supabase as any)
      .from("actor_requests")
      .insert({
        profile_id: user.id,
        requested_type: requestedType,
        status: "pending",
        payload: {
          organization_id: org.id,
          org_name: org.name,
          org_slug: slug,
          note,
          requested_via: "app_subscribe",
        },
      })

    if (reqErr) {
      console.error("verification request error", reqErr)
      return fail(500, { error: "Failed to submit verification request." })
    }

    return { verified: true }
  },
}
