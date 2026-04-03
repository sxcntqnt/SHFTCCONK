// src/routes/(auth)/onboarding/[intent]/pending/+page.server.ts
//
// Polls kyc_status. On approval, redirects to the CORRECT role dashboard.
// crew → /crew/dashboard, not /app/dashboard.

import type { PageServerLoad } from "./$types"
import { redirect } from "@sveltejs/kit"
import { intentToDashboard } from "$lib/features/onboarding/intents"

export const load: PageServerLoad = async ({ locals, params }) => {
  const { supabase, user } = locals
  const intent = params.intent

  if (!user) throw redirect(303, "/login")

  const { data: profile } = await supabase
    .from("profiles")
    .select("kyc_status, kyc_intent, onboarding_status")
    .eq("id", user.id)
    .single()

  const kycStatus = profile?.kyc_status

  // Webhook approved — redirect to the CORRECT dashboard for this role
  // ?rebootstrap=1 forces +layout.ts to re-run bootstrap_session()
  // so the new actor appears in userState on the next request
  if (kycStatus === "approved") {
    const destination = intentToDashboard(intent)
    throw redirect(303, `${destination}?rebootstrap=1`)
  }

  // Rejected — back to KYC page with retry flag
  if (kycStatus === "rejected") {
    throw redirect(303, `/onboarding/${intent}?retry=true`)
  }

  // Expired — full restart (intent picker for passenger, or contact org for invited)
  if (kycStatus === "expired") {
    const isInvitedRole = intent !== "passenger"
    throw redirect(
      303,
      isInvitedRole
        ? `/onboarding/${intent}?expired=true` // invited roles restart at their intent
        : "/onboarding?expired=true", // passengers restart at picker
    )
  }

  return {
    intent,
    kycStatus: kycStatus ?? "pending",
    isPassenger: intent === "passenger",
  }
}
