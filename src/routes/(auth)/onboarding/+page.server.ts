// src/routes/(auth)/app/onboarding/+page.server.ts
//
// Onboarding form action — step 1 of the new user flow.
//
// Flow:
//   /app/onboarding      → role selection + PRO verification acknowledgement
//   /app/create_profile  → name, phone, org associations  (← we redirect here)
//   /app/select_plan     → plan selection
//   /app/dashboard       → done
//
// What this action does:
//   1. Validates the submitted role against your `roles` table values
//   2. For PASSENGER: redirects straight to create_profile (no actor_request yet)
//   3. For PRO/org roles: creates a pending actor_request so admins can approve
//      while the user continues onboarding as a passenger
//   4. Passes `role` forward as a URL param so create_profile can store it
//
// What this does NOT do:
//   - Collect name/phone (that's create_profile's job)
//   - Handle SACCO/org associations (that's create_profile's job — DB-driven)
//   - Create actors directly (admin approval or redeem_invite does that)
//
// Schema used:
//   actor_requests: profile_id, requested_type, payload (jsonb), status
//   The handle_new_user trigger already created a PASSENGER actor on signup.

import { fail, redirect } from "@sveltejs/kit"
import type { Actions, PageServerLoad } from "./$types"

// ── Load ──────────────────────────────────────────────────────────────────────
// Redirect away if the user already completed onboarding
// (has a non-empty full_name and phone set by create_profile)

export const load: PageServerLoad = async ({ locals }) => {
  const { session } = await locals.safeGetSession()
  if (!session) redirect(303, "/login/sign_in")

  const { data: profile } = await locals.supabase
    .from("profiles")
    .select("full_name, phone")
    .eq("id", session.user.id)
    .maybeSingle()

  // If they already finished create_profile, push them forward
  if (profile?.full_name?.trim() && profile?.phone?.trim()) {
    redirect(303, "/app/select_plan")
  }

  return {}
}

// ── Valid roles (must match your `roles` table) ───────────────────────────────
const VALID_ROLES = new Set([
  "PASSENGER",
  "DRIVER",
  "CONDUCTOR",
  "OWNER",
  "ORGANIZATION",
  "STAGE_OPERATOR",
  "PLANNER",
  "REGULATOR",
])

const PRO_ROLES = new Set(["DRIVER", "CONDUCTOR", "STAGE_OPERATOR"])

// ── Actions ───────────────────────────────────────────────────────────────────

export const actions: Actions = {
  completeOnboarding: async ({ request, locals }) => {
    const { session } = await locals.safeGetSession()
    if (!session) redirect(303, "/login/sign_in")

    const supabase = locals.supabase
    const userId   = session.user.id
    const formData = await request.formData()

    const role = formData.get("role")?.toString()?.trim()

    // ── Validate role ─────────────────────────────────────────────────────────
    if (!role || !VALID_ROLES.has(role)) {
      return fail(400, { message: "Please select a valid role to continue." })
    }

    // ── PASSENGER — no actor_request needed ───────────────────────────────────
    // handle_new_user trigger already created a PASSENGER actor on signup.
    // Skip straight to create_profile to collect name + phone.
    if (role === "PASSENGER") {
      redirect(303, `/app/create_profile?role=PASSENGER`)
    }

    // ── PRO / org roles — create pending actor_request ────────────────────────
    // The user still only has PASSENGER access until an admin approves.
    // We log the request now so approval can happen in parallel while
    // the user completes the rest of onboarding.
    const { error: requestError } = await supabase
      .from("actor_requests")
      .insert({
        profile_id:     userId,
        requested_type: role,
        payload: {
          // PRO roles need NTSA verification — flag it in the payload
          // so the admin panel can surface the right approval workflow
          requires_verification: PRO_ROLES.has(role),
        },
        status: "pending",
      })

    if (requestError) {
      // 23505 = unique constraint violation — duplicate pending request
      if (requestError.code === "23505") {
        // Not a hard error — just continue to create_profile
        // They may have refreshed or gone back
        redirect(303, `/app/create_profile?role=${role}`)
      }

      console.error("[onboarding] actor_request insert failed:", requestError)
      return fail(500, {
        message: "Something went wrong submitting your role request. Please try again.",
      })
    }

    // ── Forward role to create_profile ────────────────────────────────────────
    // create_profile will read ?role from the URL and include it in
    // the actor_requests.payload when saving org associations + phone.
    redirect(303, `/app/create_profile?role=${role}`)
  },
}