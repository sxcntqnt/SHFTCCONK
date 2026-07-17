// src/routes/(auth)/onboarding/[intent]/+page.server.ts
//
// KYC page — serves ALL intents (passenger + invited roles).
//
// EVERY ROLE GOES THROUGH KYC:
//   passenger → kyc_light  (face verification only)
//   crew      → kyc_full   (face verification + liveness, NTSA-grade)
//   operator  → kyc_full
//   owner     → kyc_full
//   org       → kyc_full
//
// CAPTURE UI: still the Ballerine SDK components (open-source, client-side
// only — no calls to Ballerine's cloud). They capture the ID card photo,
// the selfie, and the liveness challenge frame(s) in-browser and hand them
// back to us as Files. We submit those, plus the applicant's declared ID
// details, straight to our own gatebill Go service.
//
// WHO ARRIVES HERE:
//   passenger — redirected from /onboarding after setIntent action
//   crew/operator/owner/org — redirected here directly after invite
//     redemption (redeem_invite sets kyc_intent on profile and redirects)
//
// POST-KYC FLOW (changed from Ballerine):
//   submitKyc → uploads selfie + ID card image to object storage (TODO —
//               see uploadKycDocument below, not yet decided/wired)
//             → JSON POST to gatebill /api/v1/kyc/submit with the
//               resulting URLs (its handler decodes a JSON body only —
//               there is no multipart/image route on the Go service;
//               see internal/handler/http.go handleSubmit)
//             → gatebill returns job_id immediately (202, async job)
//             → we store job_id on the profile, redirect to /pending
//   pending page polls GET /api/v1/kyc/status/{job_id} until status is
//   approved/rejected (no webhook in this setup — gatebill is poll-only)
//
// DB ACCESS: no Supabase client here anymore — profiles are read/written
// via pg.ts's withProfileContext, which sets app.current_profile_id for
// RLS under a SET LOCAL scoped to one transaction. locals.profileId is
// resolved and verified upstream by sessionSyncHandle; this file just
// uses it, never re-derives it. See pg.ts's header comment for why.
//
// AUTH ACCESS: the resolved user lives at locals.auth.user (populated by
// authHandle — see onboarding/+layout.server.ts's pipeline comment), NOT
// locals.user. locals.user is a separate/legacy shape used by the
// hyperledger admin routes and a handful of older (auth)/app + (auth)/org
// pages — mixing the two here was the root cause of the /onboarding ↔
// /onboarding/[intent] ↔ /login redirect loop (locals.user was always
// undefined on this route, so the `if (!user)` guard fired unconditionally
// and no other logic below it ever ran).
//
// ROLE DASHBOARD MAPPING (via intentToDashboard):
//   passenger → /app/dashboard
//   crew      → /crew/dashboard
//   operator  → /operator/dashboard
//   owner/org → /org/select

import type { PageServerLoad, Actions } from "./$types"
import { redirect, error } from "@sveltejs/kit"
import { PRIVATE_GATEBILL_API_URL } from "$env/static/private"
import { withProfileContext } from "$lib/server/pg"

import {
  VALID_INTENTS,
  intentToDashboard,
  isValidIntent,
  type OnboardingIntent,
} from "$lib/features/onboarding/intents"

// gatebill only knows two tiers — kyc_light and kyc_full.
// (Ballerine's kyc_full_ntsa distinction doesn't exist server-side anymore;
// "NTSA-grade" is just kyc_full + the liveness challenge the SDK runs.)
const TIER_MAP: Record<OnboardingIntent, "kyc_light" | "kyc_full"> = {
  passenger: "kyc_light",
  crew: "kyc_full",
  operator: "kyc_full",
  owner: "kyc_full",
  org: "kyc_full",
}

// TODO: storage destination for KYC photos not decided yet. Wire this up
// to whatever you land on (MinIO/S3 client, presigned PUT flow, etc.) and
// have it return a URL gatebill's worker can actually fetch. Left as an
// explicit failure rather than a silent fake URL so this can't accidentally
// ship half-wired.
async function uploadKycDocument(_file: File, _key: string): Promise<string> {
  throw new Error(
    "uploadKycDocument not implemented — decide on object storage (MinIO/S3?) and wire it here",
  )
}

export const load: PageServerLoad = async ({ params, locals }) => {
  const { auth, userState, profileId } = locals

  if (!auth.user) throw redirect(303, "/login")

  const rawIntent = params.intent.toLowerCase()

  if (!isValidIntent(rawIntent)) {
    throw error(404, "Invalid onboarding path.")
  }

  const intent: OnboardingIntent = rawIntent

  // ── Already verified → correct dashboard ──────────────────────────────
  if (userState && !userState.isGuest) {
    const rawProfileIntent = (userState.profile as any).kyc_intent

    const profileIntent = isValidIntent(rawProfileIntent)
      ? rawProfileIntent
      : intent

    throw redirect(303, intentToDashboard(profileIntent))
  }

  // ── Guard: prevent manual intent switching ────────────────────────────
  const rawProfileKycIntent = (userState?.profile as any)?.kyc_intent

  if (rawProfileKycIntent && rawProfileKycIntent !== intent) {
    throw redirect(303, `/onboarding/${rawProfileKycIntent}`)
  }

  // ── Invite flow: set intent if missing ─────────────────────────────────
  if (!rawProfileKycIntent) {
    try {
      await withProfileContext(profileId, (tx) =>
        tx`
          UPDATE profiles
          SET kyc_intent = ${intent}, onboarding_status = 'AWAITING_KYC'
          WHERE id = ${profileId}
        `,
      )
    } catch (updateError) {
      console.error(
        "[onboarding/[intent]] Failed to set intent from invite:",
        updateError,
      )
      throw error(500, "Failed to initialise onboarding. Please try again.")
    }
  }

  const tier = TIER_MAP[intent]

  // No token/session call here anymore — the Ballerine SDK components run
  // entirely client-side and don't need a backend handshake. We just tell
  // the client which tier it's capturing for (kyc_full turns on the
  // liveness challenge step in the SDK UI).
  return {
    intent,
    tier,
    isPassenger: intent === "passenger",
    isProWorkflow: tier === "kyc_full",
  }
}

export const actions: Actions = {
  submitKyc: async ({ request, locals, params }) => {
    const { auth, profileId } = locals

    if (!auth.user) throw redirect(303, "/login")

    const rawIntent = params.intent

    if (!isValidIntent(rawIntent)) {
      throw error(400, "Invalid intent.")
    }

    const intent: OnboardingIntent = rawIntent
    const tier = TIER_MAP[intent]

    const formData = await request.formData()

    // ASSUMPTION: the SDK capture step hands back files under these field
    // names, and the applicant's ID details are collected in a form
    // alongside the capture widget. Adjust field names to match whatever
    // your capture component actually posts.
    const { submitKycSchema } = await import("$lib/security/onboarding.schema")
    const parsed = submitKycSchema.safeParse({
      idNumber: formData.get("idNumber"),
      firstName: formData.get("firstName"),
      lastName: formData.get("lastName"),
      idType: formData.get("idType"),
      countryCode: formData.get("countryCode"),
      selfie: formData.get("selfie"),
      idImage: formData.get("idImage"),
    })

    if (!parsed.success) {
      throw error(400, "Missing or invalid KYC submission fields.")
    }

    const {
      idNumber,
      firstName,
      lastName,
      idType,
      countryCode,
      selfie,
      idImage,
    } = parsed.data

    // gatebill's handleSubmit does `json.NewDecoder(r.Body).Decode(&req)` —
    // JSON body only, no multipart route on the Go service at all. Its
    // SubmitRequest struct already has SelfieURL/IDCardURL fields (per the
    // README's near-term roadmap for object storage), so the images have
    // to land in storage first and we pass URLs, not bytes.
    let selfieUrl: string
    let idImageUrl: string

    try {
      ;[selfieUrl, idImageUrl] = await Promise.all([
        uploadKycDocument(selfie, `${profileId}/${intent}/selfie`),
        uploadKycDocument(idImage, `${profileId}/${intent}/id-card`),
      ])
    } catch (err) {
      console.error("[onboarding/[intent]] KYC document upload failed:", err)
      throw error(500, "Failed to upload verification photos. Please try again.")
    }

    const idempotencyKey = crypto.randomUUID()

    let jobId: string

    try {
      const response = await fetch(
        `${PRIVATE_GATEBILL_API_URL}/api/v1/kyc/submit`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Idempotency-Key": idempotencyKey,
          },
          body: JSON.stringify({
            user_id: auth.user.id,
            country_code: countryCode,
            id_type: idType,
            id_number: idNumber,
            first_name: firstName,
            last_name: lastName,
            tier,
            selfie_url: selfieUrl,
            id_card_url: idImageUrl,
          }),
        },
      )

      // handleSubmit's error mapping: 409 duplicate job, 422 invalid ID
      // type, 503 (+Retry-After) queue full or inference backpressure,
      // 504 inference timeout. Surface something more specific than a
      // flat 503 where it's cheap to.
      if (!response.ok && response.status !== 200) {
        if (response.status === 409) {
          throw error(409, "A verification is already in progress for this account.")
        }
        if (response.status === 422) {
          const body = await response.json().catch(() => null)
          throw error(422, body?.error ?? "Invalid ID details.")
        }
        throw new Error(`gatebill submit failed: ${response.status}`)
      }

      const data = await response.json()
      jobId = data.job_id as string
    } catch (err) {
      console.error("[onboarding/[intent]] gatebill submit failed:", err)
      throw error(
        503,
        "Verification service unavailable. Please try again shortly.",
      )
    }

    try {
      await withProfileContext(profileId, (tx) =>
        tx`
          UPDATE profiles
          SET kyc_status = 'pending',
              kyc_intent = ${intent},
              gatebill_job_id = ${jobId},
              onboarding_status = 'AWAITING_KYC'
          WHERE id = ${profileId}
        `,
      )
    } catch (updateError) {
      console.error("[onboarding/[intent]] Profile update failed:", updateError)
      throw error(500, "Failed to record verification. Please try again.")
    }

    throw redirect(303, `/onboarding/${intent}/pending`)
  },
}
