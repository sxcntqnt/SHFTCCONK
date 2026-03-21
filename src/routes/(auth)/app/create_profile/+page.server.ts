// src/routes/(auth)/app/create_profile/+page.server.ts
//
// Schema facts used here:
//
//   profiles           id, full_name, company_name, avatar_url, website,
//                      phone (added via migration), updated_at
//
//   organizations      id, name, status, metadata (jsonb)
//                      ↳ type/county come from metadata if your seed sets them
//
//   organization_members  actor_id ↔ organization_id
//                      ↳ actor doesn't exist yet at profile-creation time,
//                        so we store desired org IDs in actor_requests.payload
//                        and wire them up when the request is approved.
//
//   actor_requests     profile_id, requested_type, payload (jsonb), status
//                      payload shape: { phone, desired_org_ids: string[] }
//
// ─────────────────────────────────────────────────────────────────────────────

import { fail, redirect } from "@sveltejs/kit"
import type { Actions, PageServerLoad } from "./$types"

// ── Types ─────────────────────────────────────────────────────────────────────

export interface Organization {
  id:     string
  name:   string
  status: string
  type:   string | null   // from metadata.type
  county: string | null   // from metadata.county
}

// ── Load ──────────────────────────────────────────────────────────────────────

export const load: PageServerLoad = async ({ locals }) => {
  const { session } = await locals.safeGetSession()
  if (!session) redirect(303, "/login/sign_in")

  const supabase = locals.supabase
  const userId   = session.user.id

  // ── Current profile ────────────────────────────────────────────────────────
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, phone, company_name, website")
    .eq("id", userId)
    .maybeSingle()

  // ── All active organizations ───────────────────────────────────────────────
  const { data: orgsRaw, error: orgError } = await supabase
    .from("organizations")
    .select("id, name, status, metadata")
    .eq("status", "active")
    .order("name", { ascending: true })

  if (orgError) console.error("organizations load error", orgError)

  const organizations: Organization[] = (orgsRaw ?? []).map((o) => ({
    id:     o.id,
    name:   o.name,
    status: o.status,
    type:   (o.metadata as any)?.type   ?? null,
    county: (o.metadata as any)?.county ?? null,
  }))

  // ── Org IDs from any existing pending actor_request ────────────────────────
  const { data: existingRequests } = await supabase
    .from("actor_requests")
    .select("payload")
    .eq("profile_id", userId)
    .eq("status", "pending")

  const linkedOrgIds: string[] = (existingRequests ?? []).flatMap(
    (r) => (r.payload as any)?.desired_org_ids ?? [],
  )

  return {
    profile:       profile ?? null,
    organizations,
    linkedOrgIds,
    user: { email: session.user.email ?? "" },
  }
}

// ── Actions ───────────────────────────────────────────────────────────────────

export const actions: Actions = {
  updateProfile: async ({ request, locals }) => {
    const { session } = await locals.safeGetSession()
    if (!session) redirect(303, "/login/sign_in")

    const supabase  = locals.supabase
    const userId    = session.user.id
    const formData  = await request.formData()

    // ── Parse ────────────────────────────────────────────────────────────────
    const fullName    = (formData.get("fullName")    as string | null)?.trim() ?? ""
    const phone       = (formData.get("phone")       as string | null)?.trim() ?? ""
    const companyName = (formData.get("companyName") as string | null)?.trim() ?? ""
    const website     = (formData.get("website")     as string | null)?.trim() ?? ""
    const orgIds      = formData.getAll("org_ids")   as string[]

    // ── Validate ─────────────────────────────────────────────────────────────
    const errorFields: string[] = []

    if (!fullName) errorFields.push("fullName")

    const phoneDigits = phone.replace(/\D/g, "")
    if (!phoneDigits || phoneDigits.length < 9) errorFields.push("phone")

    if (errorFields.length > 0) {
      return fail(400, {
        errorFields,
        errorMessage: "Please fix the highlighted fields.",
        fullName, phone, companyName, website,
      })
    }

    // ── Normalise phone → +2547XXXXXXXX ──────────────────────────────────────
    let normalisedPhone = phoneDigits
    if (normalisedPhone.startsWith("0")) {
      normalisedPhone = "254" + normalisedPhone.slice(1)
    }
    if (!normalisedPhone.startsWith("+")) {
      normalisedPhone = "+" + normalisedPhone
    }

    // ── Upsert profile ────────────────────────────────────────────────────────
    const { error: profileError } = await supabase
      .from("profiles")
      .upsert(
        {
          id:           userId,
          full_name:    fullName,
          phone:        normalisedPhone,
          company_name: companyName || null,
          website:      website     || null,
          updated_at:   new Date().toISOString(),
        },
        { onConflict: "id" },
      )

    if (profileError) {
      console.error("profile upsert error", profileError)
      return fail(500, {
        errorFields:  [],
        errorMessage: "Failed to save your profile. Please try again.",
        fullName, phone, companyName, website,
      })
    }

    // ── Store desired org associations in actor_requests.payload ──────────────
    //
    // organization_members requires an actor_id which doesn't exist yet.
    // We embed desired_org_ids in the pending actor_request payload so the
    // approval handler (or admin trigger) can create the memberships then.
    //
    if (orgIds.length > 0) {
      const { data: existing } = await supabase
        .from("actor_requests")
        .select("id, payload")
        .eq("profile_id", userId)
        .eq("status", "pending")
        .maybeSingle()

      if (existing) {
        // Merge — don't wipe previously requested orgs
        const merged = Array.from(
          new Set([
            ...((existing.payload as any)?.desired_org_ids ?? []),
            ...orgIds,
          ]),
        )
        const { error } = await supabase
          .from("actor_requests")
          .update({
            payload: {
              ...(existing.payload as object),
              desired_org_ids: merged,
              phone: normalisedPhone,
            },
          })
          .eq("id", existing.id)

        if (error) console.error("actor_request update error", error)
      } else {
        const { error } = await supabase
          .from("actor_requests")
          .insert({
            profile_id:     userId,
            requested_type: "GUEST", // ← change to your default onboarding role
            status:         "pending",
            payload: {
              desired_org_ids: orgIds,
              phone:           normalisedPhone,
            },
          })

        if (error) console.error("actor_request insert error", error)
      }
    }

    redirect(303, "/app/select_plan")
  },
}