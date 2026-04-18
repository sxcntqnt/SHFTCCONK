// src/routes/(auth)/onboarding/[intent]/create_profile/+page.server.ts
//
// One-time profile completion after KYC approval.
//
// FLOW:
//   KYC approved → webhook creates actor → pending page detects →
//   intentToDashboard()→ if profile incomplete → /onboarding/[intent]/create_profile →
//   save → intentToDashboard(kyc_intent)?rebootstrap=1
//
// MIGRATION:
//   locals.safeGetSession() → locals.user (hooks already validated)
//   local hasFullProfile    → _hasFullProfile from profile.service
//   redirect /app/select_plan → intentToDashboard(kyc_intent)
//   role URL param          → removed (intent lives on profile now)

import { fail, redirect } from "@sveltejs/kit"
import type { Actions, PageServerLoad } from "./$types"
import {
  loadProfileFormData,
  saveProfile,
  _hasFullProfile,
  type Organization,
  profileCreateSchema,
} from "$lib/features/profile/profile.service"
import { intentToDashboard } from "$lib/features/onboarding/intents"
export type { Organization }

// ── Load ──────────────────────────────────────────────────────────────────────

export const load: PageServerLoad = async ({ locals, url, params }) => {
  const { user, userState, supabase } = locals
  if (!user) throw redirect(303, "/login")

  // Already complete — go to role dashboard
  if (userState && _hasFullProfile(userState.profile)) {
    const next = url.searchParams.get("next")
    const intent =
      ((userState.profile as any).kyc_intent as string | null) ?? params.intent
    throw redirect(
      303,
      next
        ? decodeURIComponent(next)
        : intentToDashboard(intent ?? "passenger"),
    )
  }

  const { profile, organizations, linkedOrgIds } = await loadProfileFormData(
    supabase,
    user.id,
  )

  return {
    profile,
    organizations,
    linkedOrgIds,
    returnTo: url.searchParams.get("next") ?? null,
    user: { email: user.email ?? "" },
  }
}

// ── Actions ───────────────────────────────────────────────────────────────────

export const actions: Actions = {
  updateProfile: async ({ request, locals, params }) => {
    const { user, supabase } = locals
    if (!user) throw redirect(303, "/login")

    const formData = await request.formData()
    const returnTo = (formData.get("returnTo") as string | null) ?? null

    const raw = {
      fullName: (formData.get("fullName") as string | null)?.trim() ?? "",
      phone: (formData.get("phone") as string | null)?.trim() ?? "",
      companyName: (formData.get("companyName") as string | null)?.trim() ?? "",
      website: (formData.get("website") as string | null)?.trim() ?? "",
      startingLocations:
        (formData.get("startingLocations") as string | null)?.trim() ?? "",
      destinations:
        (formData.get("destinations") as string | null)?.trim() ?? "",
      highwayCorridors: formData.getAll("highwayCorridors") as string[],
      routesToTrack: formData.getAll("routesToTrack") as string[],
      preferredVehicleType: formData.getAll("preferredVehicleType") as string[],
      socialMediaLinks:
        (formData.get("socialMediaLinks") as string | null)?.trim() ?? "",
      emergencyContacts:
        (formData.get("emergencyContacts") as string | null)?.trim() ?? "",
      languagesSpoken: formData.getAll("languagesSpoken") as string[],
      timeZone: (formData.get("timeZone") as string | null)?.trim() ?? "",
      workingHoursStart:
        (formData.get("workingHoursStart") as string | null)?.trim() ?? "",
      workingHoursEnd:
        (formData.get("workingHoursEnd") as string | null)?.trim() ?? "",
      orgIds: formData.getAll("org_ids") as string[],
    }

    const parsed = profileCreateSchema.safeParse(raw)
    if (!parsed.success) {
      return fail(400, { errorFields: parsed.error.flatten().fieldErrors, errorMessage: "Validation failed", returnTo, ...raw })
    }

    const input = parsed.data

    const result = await saveProfile(supabase, user.id, input)

    if (result && "fields" in result) {
      return fail(400, {
        errorFields: result.fields,
        errorMessage: result.message,
        returnTo,
        ...input,
      })
    }
    if (result && "serverError" in result) {
      return fail(500, {
        errorFields: [],
        errorMessage: result.serverError,
        returnTo,
        ...input,
      })
    }

    // ── Post-save redirect ─────────────────────────────────────────────────
    if (returnTo) {
      throw redirect(303, `${decodeURIComponent(returnTo)}?rebootstrap=1`)
    }

    // Re-read intent — userState was resolved before this save
    const { data: fresh } = await supabase
      .from("profiles")
      .select("kyc_intent")
      .eq("id", user.id)
      .single()

    const intent = (fresh?.kyc_intent as string | null) ?? params.intent
    throw redirect(
      303,
      `${intentToDashboard(intent ?? "passenger")}?rebootstrap=1`,
    )
  },
}
