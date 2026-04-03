/**
 * src/routes/(auth)/org/join-sacco/+page.server.ts
 *
 * SACCO JOIN FLOW — entry point for any user wanting to become
 * ORG_CHAIR of a registered organization on the sxcntqnt network.
 *
 * WHO CAN JOIN:
 *   Anyone — verified or unverified actors.
 *   Unverified users submit the request, then visit the org office
 *   in person for physical verification. The ORG_CHAIR or sxcntqnt
 *   admin approves the request after that verification.
 *
 * WHAT SHOWS IN THE LIST:
 *   Organizations with status = 'pending_activation'.
 *   These are SACCOs sxcntqnt has seeded but not yet activated —
 *   waiting for their ORG_CHAIR to claim them.
 *
 * AFTER SUBMISSION:
 *   → actor_requests row (status = pending)
 *   → User lands on /org/join-success
 *   → sxcntqnt admin reviews in /admin/actor_requests
 *   → Admin sets binding_type = 'sacco_chair' + target org
 *   → admin_activate_org_member RPC:
 *       org.status → 'active'
 *       user → ORG_CHAIR + org jurisdiction wired
 *   → Next bootstrap_session() returns full ORG_CHAIR powers
 */

import type { PageServerLoad, Actions } from "./$types"
import { fail, redirect } from "@sveltejs/kit"

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export const load: PageServerLoad = async ({ locals, url }) => {
  const { supabase, session } = locals

  const preselectedOrgId = url.searchParams.get("org_id") ?? null

  // Available SACCOs waiting for a chair
  const { data: orgs, error: orgsErr } = await supabase
    .from("organizations")
    .select("id, name, metadata, created_at")
    .eq("status", "pending_activation")
    .order("name")

  if (orgsErr) console.error("[join-sacco] orgs load error:", orgsErr)

  let existingRequestOrgIds: string[] = []
  let isAlreadyChair = false

  if (session?.user?.id) {
    const [{ data: pendingReqs }, { data: chairActors }] = await Promise.all([
      supabase
        .from("actor_requests")
        .select("payload")
        .eq("profile_id", session.user.id)
        .eq("requested_type", "org_member")
        .eq("status", "pending"),
      supabase
        .from("actors")
        .select("id")
        .eq("profile_id", session.user.id)
        .eq("type", "ORG_CHAIR")
        .eq("status", "active")
        .limit(1),
    ])

    existingRequestOrgIds = (pendingReqs ?? [])
      .map((r) => r.payload?.organization_id as string)
      .filter(Boolean)

    isAlreadyChair = !!chairActors?.length
  }

  return {
    orgs: orgs ?? [],
    existingRequestOrgIds,
    isAlreadyChair,
    preselectedOrgId,
    isLoggedIn: !!session?.user?.id,
  }
}

export const actions: Actions = {
  join: async ({ request, locals }) => {
    const { supabase, session } = locals

    if (!session?.user?.id) {
      return fail(401, {
        error: "You must be logged in to request membership.",
      })
    }

    const form = await request.formData()
    const org_id = (form.get("org_id") as string)?.trim()

    if (!org_id || !UUID_RE.test(org_id)) {
      return fail(400, { error: "Please select a valid organization." })
    }

    const { data: org } = await supabase
      .from("organizations")
      .select("id, name, status")
      .eq("id", org_id)
      .single()

    if (!org) return fail(404, { error: "Organization not found." })
    if (org.status === "active")
      return fail(409, { error: "This SACCO already has an active chair." })
    if (org.status !== "pending_activation")
      return fail(409, {
        error: "This SACCO is not currently accepting requests.",
      })

    // Duplicate guard
    const { data: existing } = await supabase
      .from("actor_requests")
      .select("id")
      .eq("profile_id", session.user.id)
      .eq("requested_type", "org_member")
      .eq("status", "pending")
      .filter("payload->>organization_id", "eq", org_id)
      .limit(1)

    if (existing?.length) {
      return fail(409, {
        error: `You already have a pending request for ${org.name}.`,
      })
    }

    // Get or create actor
    let actorId: string | null = null
    const { data: existingActors } = await supabase
      .from("actors")
      .select("id")
      .eq("profile_id", session.user.id)
      .order("created_at", { ascending: true })
      .limit(1)

    if (existingActors?.length) {
      actorId = existingActors[0].id
    } else {
      const { data: newActor, error: actorErr } = await supabase
        .from("actors")
        .insert({
          profile_id: session.user.id,
          type: "GUEST",
          status: "unverified",
        })
        .select("id")
        .single()

      if (actorErr || !newActor)
        return fail(500, { error: "Could not create actor record." })
      actorId = newActor.id
    }

    // Create join request
    const { error: reqErr } = await supabase.from("actor_requests").insert({
      profile_id: session.user.id,
      requested_type: "org_member",
      status: "pending",
      payload: {
        organization_id: org_id,
        org_name: org.name,
        role_requested: "ORG_CHAIR",
      },
    })

    if (reqErr)
      return fail(500, {
        error: "Could not submit your request. Please try again.",
      })

    await supabase
      .from("audit_logs")
      .insert({
        event_type: "org_join_requested",
        actor_id: actorId,
        profile_id: session.user.id,
        details: {
          organization_id: org_id,
          org_name: org.name,
          role: "ORG_CHAIR",
        },
      })
      .then(({ error: e }) => {
        if (e) console.warn("[join-sacco] audit non-fatal:", e)
      })

    throw redirect(303, `/org/join-success?org=${encodeURIComponent(org.name)}`)
  },
}
