// src/routes/(auth)/onboarding/[intent]/+page.server.ts
//
// Ballerine KYC page — serves ALL intents (passenger + invited roles).
//
// EVERY ROLE GOES THROUGH KYC:
//   passenger → kyc_light    (basic ID + selfie)
//   crew      → kyc_full_ntsa (NTSA PSV licence + ID + selfie)
//   operator  → kyc_full_ntsa (NTSA operator licence + ID)
//   owner     → kyc_full_ntsa (vehicle ownership docs + ID)
//   org       → kyc_full_ntsa (company registration + director ID)
//
// WHO ARRIVES HERE:
//   passenger — redirected from /onboarding after setIntent action
//   crew/operator/owner/org — redirected here directly after invite
//     redemption (redeem_invite sets kyc_intent on profile and redirects)
//
// POST-KYC FLOW:
//   submitKyc → writes caseId → /onboarding/[intent]/pending
//   webhook fires → actor created → pending page detects → role dashboard
//
// ROLE DASHBOARD MAPPING (via intentToDashboard):
//   passenger → /app/dashboard
//   crew      → /crew/dashboard
//   operator  → /operator/dashboard
//   owner/org → /org/select

// src/routes/(auth)/onboarding/[intent]/+page.server.ts

import type { PageServerLoad, Actions } from "./$types"
import { redirect, error } from "@sveltejs/kit"
import { PRIVATE_BALLERINE_SECRET } from "$env/static/private"

import {
  VALID_INTENTS,
  intentToDashboard,
  isValidIntent,
  type OnboardingIntent,
} from "$lib/features/onboarding/intents"

// KYC workflow per intent
const WORKFLOW_MAP: Record<OnboardingIntent, string> = {
  passenger: "kyc_light",
  crew: "kyc_full_ntsa",
  operator: "kyc_full_ntsa",
  owner: "kyc_full_ntsa",
  org: "kyc_full_ntsa",
}

async function generateBallerineToken(
  userId: string,
  workflowId: string,
): Promise<string> {
  const response = await fetch(
    "https://api.ballerine.com/v1/end-user/session",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${PRIVATE_BALLERINE_SECRET}`,
      },
      body: JSON.stringify({
        end_user_id: userId,
        workflow_id: workflowId,
      }),
    },
  )

  if (!response.ok) {
    throw new Error(`Ballerine token generation failed: ${response.status}`)
  }

  const data = await response.json()
  return data.token as string
}

export const load: PageServerLoad = async ({ params, locals, url }) => {
  const { user, userState, supabase } = locals

  if (!user) throw redirect(303, "/login")

  const rawIntent = params.intent.toLowerCase()

  // ✅ Proper validation (no unsafe casts)
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
    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        kyc_intent: intent,
        onboarding_status: "AWAITING_KYC",
      })
      .eq("id", user.id)

    if (updateError) {
      console.error(
        "[onboarding/[intent]] Failed to set intent from invite:",
        updateError,
      )
      throw error(500, "Failed to initialise onboarding. Please try again.")
    }
  }

  const isRetry = url.searchParams.get("retry") === "true"
  const workflowId = WORKFLOW_MAP[intent]

  let ballerineToken: string

  try {
    ballerineToken = await generateBallerineToken(user.id, workflowId)
  } catch (err) {
    console.error(
      "[onboarding/[intent]] Ballerine token generation failed:",
      err,
    )
    throw error(
      503,
      "Verification service unavailable. Please try again shortly.",
    )
  }

  return {
    intent,
    workflowId,
    isRetry,
    isPassenger: intent === "passenger",
    isProWorkflow: workflowId === "kyc_full_ntsa",
    ballerine: {
      workflowId,
      token: ballerineToken,
    },
  }
}

export const actions: Actions = {
  submitKyc: async ({ request, locals, params }) => {
    const { supabase, user } = locals

    if (!user) throw redirect(303, "/login")

    const rawIntent = params.intent

    if (!isValidIntent(rawIntent)) {
      throw error(400, "Invalid intent.")
    }

    const intent: OnboardingIntent = rawIntent

    const formData = await request.formData()
    const caseId = formData.get("ballerineCaseId") as string | null

    if (!caseId) {
      throw error(400, "Missing Ballerine case ID.")
    }

    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        kyc_status: "pending",
        kyc_intent: intent,
        ballerine_case_id: caseId,
        onboarding_status: "AWAITING_KYC",
      })
      .eq("id", user.id)

    if (updateError) {
      console.error("[onboarding/[intent]] Profile update failed:", updateError)
      throw error(500, "Failed to record verification. Please try again.")
    }

    throw redirect(303, `/onboarding/${intent}/pending`)
  },
}
