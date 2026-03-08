// src/routes/(auth)/onboarding/+page.server.ts
import { fail, redirect } from '@sveltejs/kit';
import type { Actions } from './$types';
import { ROLES } from '$lib/features/auth/stores/roles';

// src/routes/(auth)/onboarding/+page.server.ts
//
// Onboarding form action — handles the final "Enter Dashboard" submit.
//
// What this does:
//   1. Updates the user's profile (full_name) if provided
//   2. If role ≠ PASSENGER, creates an actor_request for admin approval
//   3. If a SACCO was selected, stores it in the request payload
//   4. Redirects to the appropriate dashboard
//
// What it does NOT do:
//   - Create actors directly (that's admin approval or redeem_invite)
//   - Update profiles.role or profiles.sacco_id (these columns don't exist)
//   - The handle_new_user trigger already created a PASSENGER actor
//
// Schema alignment:
//   - profiles: id, full_name, company_name, avatar_url, website, unsubscribed, permissions_version
//   - actor_requests: profile_id, requested_type, payload, status ('pending')
//   - actors: created by admin approval or redeem_invite, NOT by onboarding



export const actions: Actions = {
  completeOnboarding: async ({ request, locals }) => {
    const { supabase, user } = locals

    if (!user) {
      redirect(303, "/login/sign_in")
    }

    const formData = await request.formData()
    const role = formData.get("role")?.toString()
    const sacco = formData.get("sacco")?.toString() || null
    const fullName = formData.get("full_name")?.toString() || null

    if (!role) {
      return fail(400, { message: "Role is required" })
    }

    // ─── Update profile name if provided ────────────────────
    // The profile was created by handle_new_user with the name
    // from the OAuth provider (or null). Onboarding lets them
    // set/correct it.
    if (fullName && fullName.trim() !== "User") {
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ full_name: fullName.trim() })
        .eq("id", user.id)

      if (profileError) {
        console.error("[onboarding] Profile update failed:", profileError)
        return fail(500, { message: "Failed to update profile" })
      }
    }

    // ─── PASSENGER: no actor request needed ─────────────────
    // handle_new_user already created a PASSENGER actor.
    // Just redirect to the main app.
    if (role === "PASSENGER") {
      redirect(303, "/app/dashboard")
    }

    // ─── Other roles: create an actor_request ───────────────
    // PRO roles (DRIVER, CONDUCTOR, STAGE_OPERATOR) and org roles
    // (OWNER, ORGANIZATION) require admin approval. The request
    // goes into actor_requests with status 'pending'.
    //
    // An admin in /admin/actor_requests can approve → which creates
    // the actor + jurisdiction + policy group binding.
    const payload: Record<string, unknown> = {}
    if (sacco) {
      payload.requested_sacco = sacco
    }

    const { error: requestError } = await supabase
      .from("actor_requests")
      .insert({
        profile_id: user.id,
        requested_type: role,
        payload,
        status: "pending",
      })

    if (requestError) {
      // Duplicate request check (unique constraint or existing pending)
      if (requestError.code === "23505") {
        return fail(409, {
          message: "You already have a pending request for this role",
        })
      }
      console.error("[onboarding] Actor request failed:", requestError)
      return fail(500, { message: "Failed to submit role request" })
    }

    // ─── Redirect based on what happens next ────────────────
    // The user still only has PASSENGER access until approved.
    // Redirect to the app with a success message.
    redirect(303, "/app/dashboard?onboarding=complete&requested_role=" + role)
  },
}