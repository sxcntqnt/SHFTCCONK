// src/routes/(auth)/onboarding/[intent]/pending/+page.server.ts
//
// gatebill is poll-only — there's no webhook pushing status changes into
// the DB anymore, so this load function is now the thing that does the
// polling: it asks gatebill for the job's current status, mirrors it onto
// profiles.kyc_status so the rest of the app still reads from one place,
// and redirects once the job is terminal.
//
// This still only runs once per request/navigation. Have +page.svelte
// re-invalidate this load on an interval (e.g. `setInterval(() =>
// invalidate('app:kyc-status'), 3000)` paired with `depends('app:kyc-status')`
// here) while status is pending/processing, so the page actually advances
// without the user manually refreshing.
//
// DB ACCESS: via pg.ts's withProfileContext (no Supabase client) — see
// +page.server.ts one level up for the full rationale.

import type { PageServerLoad } from "./$types"
import { redirect, error } from "@sveltejs/kit"
import { PRIVATE_GATEBILL_API_URL } from "$env/static/private"
import { withProfileContext } from "$lib/server/pg"

type GatebillStatus =
  | "pending"
  | "processing"
  | "approved"
  | "rejected"
  | "failed"

export const load: PageServerLoad = async ({ locals, params, depends }) => {
  depends("app:kyc-status")

  const { user, profileId } = locals
  const intent = params.intent

  if (!user) throw redirect(303, "/login")

  const [profile] = await withProfileContext(profileId, (tx) =>
    tx`
      SELECT kyc_status, kyc_intent, onboarding_status, gatebill_job_id
      FROM profiles
      WHERE id = ${profileId}
    `,
  )

  // No job on file yet (e.g. direct nav here before submitting) — send
  // them back to the KYC page rather than polling nothing.
  if (!profile?.gatebill_job_id) {
    throw redirect(303, `/onboarding/${intent}`)
  }

  // Already resolved on a previous poll — no need to hit gatebill again,
  // just act on what's stored.
  let kycStatus = profile.kyc_status as GatebillStatus | null | undefined

  if (kycStatus === "pending" || kycStatus === "processing" || !kycStatus) {
    try {
      const response = await fetch(
        `${PRIVATE_GATEBILL_API_URL}/api/v1/kyc/status/${profile.gatebill_job_id}`,
      )

      if (!response.ok) {
        throw new Error(`gatebill status check failed: ${response.status}`)
      }

      const data = await response.json()
      const gatebillStatus = data.status as GatebillStatus

      if (gatebillStatus !== kycStatus) {
        try {
          await withProfileContext(profileId, (tx) =>
            tx`
              UPDATE profiles
              SET kyc_status = ${gatebillStatus}
              WHERE id = ${profileId}
            `,
          )
        } catch (updateError) {
          console.error(
            "[onboarding/[intent]/pending] Failed to sync kyc_status:",
            updateError,
          )
        }
      }

      kycStatus = gatebillStatus
    } catch (err) {
      console.error(
        "[onboarding/[intent]/pending] gatebill status poll failed:",
        err,
      )
      throw error(
        503,
        "Verification service unavailable. Please try again shortly.",
      )
    }
  }

  // Approved — redirect to create_profile so the user can complete their
  // profile before entering the role dashboard.
  // ?rebootstrap=1 forces +layout.ts to re-run bootstrap_session()
  // so the new actor appears in userState on the next request
  if (kycStatus === "approved") {
    throw redirect(303, `/onboarding/${intent}/create_profile?rebootstrap=1`)
  }

  // Rejected or failed — back to KYC page with retry flag. gatebill
  // doesn't have a separate "expired" status like the old Ballerine flow
  // did; failed jobs (e.g. exhausted retries) land here too rather than
  // in a dedicated expired branch.
  if (kycStatus === "rejected" || kycStatus === "failed") {
    throw redirect(303, `/onboarding/${intent}?retry=true`)
  }

  return {
    intent,
    kycStatus: kycStatus ?? "pending",
    isPassenger: intent === "passenger",
  }
}
