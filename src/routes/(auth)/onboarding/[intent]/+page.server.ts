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

import type { PageServerLoad, Actions } from './$types'
import { redirect, error }              from '@sveltejs/kit'
import { PRIVATE_BALLERINE_SECRET }     from '$env/static/private'
import {
  VALID_INTENTS,
  intentToDashboard,
}                                       from '../+page.server'
import type { OnboardingIntent }        from '../+page.server'

// KYC workflow per intent — passenger gets light, everyone else gets full
const WORKFLOW_MAP: Record<OnboardingIntent, string> = {
  passenger: 'kyc_light',
  crew:      'kyc_full_ntsa',
  operator:  'kyc_full_ntsa',
  owner:     'kyc_full_ntsa',
  org:       'kyc_full_ntsa',
}

async function generateBallerineToken(
  userId:     string,
  workflowId: string,
): Promise<string> {
  const response = await fetch('https://api.ballerine.com/v1/end-user/session', {
    method:  'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${PRIVATE_BALLERINE_SECRET}`,
    },
    body: JSON.stringify({
      end_user_id: userId,
      workflow_id: workflowId,
    }),
  })

  if (!response.ok) {
    throw new Error(`Ballerine token generation failed: ${response.status}`)
  }

  const data = await response.json()
  return data.token as string
}

export const load: PageServerLoad = async ({ params, locals, url }) => {
  const { user, userState, supabase } = locals
  const intent = params.intent.toLowerCase() as OnboardingIntent

  if (!user) throw redirect(303, '/login')

  // Validate intent
  if (!VALID_INTENTS.includes(intent)) {
    throw error(404, 'Invalid onboarding path.')
  }

  // ── Already verified → send to the CORRECT dashboard ─────────────────
  // A verified crew member should land on /crew/dashboard, not /app/dashboard
  if (userState && !userState.isGuest) {
    const profileIntent = (userState.profile as any).kyc_intent as string | null
    throw redirect(303, intentToDashboard(profileIntent ?? intent))
  }

  // ── Guard: intent must match what's on the profile ────────────────────
  // Prevents a passenger from navigating to /onboarding/crew manually
  const profileKycIntent = (userState?.profile as any)?.kyc_intent as string | null
  if (profileKycIntent && profileKycIntent !== intent) {
    // They have a different intent set — redirect to their actual flow
    throw redirect(303, `/onboarding/${profileKycIntent}`)
  }

  // ── If no intent set yet, this must be an invite arriving directly ────
  // Invite redemption redirects to /onboarding/[intent] without going
  // through the picker. Set the intent on the profile now.
  if (!profileKycIntent) {
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        kyc_intent:        intent,
        onboarding_status: 'AWAITING_KYC',
      })
      .eq('id', user.id)

    if (updateError) {
      console.error('[onboarding/[intent]] Failed to set intent from invite:', updateError)
      throw error(500, 'Failed to initialise onboarding. Please try again.')
    }
  }

  const isRetry    = url.searchParams.get('retry') === 'true'
  const workflowId = WORKFLOW_MAP[intent]

  let ballerineToken: string
  try {
    ballerineToken = await generateBallerineToken(user.id, workflowId)
  } catch (err) {
    console.error('[onboarding/[intent]] Ballerine token generation failed:', err)
    throw error(503, 'Verification service unavailable. Please try again shortly.')
  }

  return {
    intent,
    workflowId,
    isRetry,
    isPassenger:   intent === 'passenger',
    isProWorkflow: workflowId === 'kyc_full_ntsa',
    ballerine: {
      workflowId,
      token: ballerineToken,
    },
  }
}

export const actions: Actions = {
  submitKyc: async ({ request, locals, params }) => {
    const { supabase, user } = locals
    const intent = params.intent as OnboardingIntent

    if (!user) throw redirect(303, '/login')

    const formData      = await request.formData()
    const caseId        = formData.get('ballerineCaseId') as string | null

    if (!caseId) {
      throw error(400, 'Missing Ballerine case ID.')
    }

    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        kyc_status:        'pending',
        kyc_intent:        intent,
        ballerine_case_id: caseId,
        onboarding_status: 'AWAITING_KYC',
      })
      .eq('id', user.id)

    if (updateError) {
      console.error('[onboarding/[intent]] Profile update failed:', updateError)
      throw error(500, 'Failed to record verification. Please try again.')
    }

    throw redirect(303, `/onboarding/${intent}/pending`)
  },
}