// src/routes/(auth)/onboarding/[intent]/+page.server.ts
//
// Ballerine KYC page — renders the Ballerine SDK for the chosen intent.
//
// FLOW:
//   1. load()   → validates intent, generates Ballerine token, returns workflowId
//   2. SDK      → user completes KYC in the browser (Ballerine handles UI)
//   3. submitKyc action → receives caseId from SDK → writes to profile
//   4. Ballerine webhook → /api/webhooks/ballerine → creates actor + redirects
//
// INTENT → WORKFLOW MAPPING:
//   passenger → kyc_light    (basic ID verification)
//   crew      → kyc_full_ntsa (NTSA PSV licence + ID)
//   operator  → kyc_full_ntsa (NTSA operator licence + ID)
//   owner     → kyc_full_ntsa (NTSA + vehicle ownership docs)
//   org       → kyc_full_ntsa (NTSA + company registration)
//
// NOTE:
//   This page does NOT create actors — that is done by the Ballerine webhook.
//   Profile is identity. Actors are capabilities. Onboarding = identity completion.

import type { PageServerLoad, Actions } from './$types'
import { redirect, error }              from '@sveltejs/kit'
import { PRIVATE_BALLERINE_SECRET }     from '$env/static/private'
import { VALID_INTENTS }                from '../+page.server'
import type { OnboardingIntent }        from '../+page.server'

// Ballerine workflow IDs per intent
const WORKFLOW_MAP: Record<OnboardingIntent, string> = {
  passenger: 'kyc_light',
  crew:      'kyc_full_ntsa',
  operator:  'kyc_full_ntsa',
  owner:     'kyc_full_ntsa',
  org:       'kyc_full_ntsa',
}

// Whether the intent requires a retry-friendly UI (for rejected cases)
const RETRYABLE_INTENTS = new Set<OnboardingIntent>(['crew', 'operator', 'owner', 'org'])

async function generateBallerineToken(userId: string, workflowId: string): Promise<string> {
  // Call Ballerine API to generate a session token for the SDK
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

  // If user is already verified, skip onboarding entirely
  if (userState && !userState.isGuest) {
    throw redirect(303, '/app/dashboard')
  }

  const isRetry        = url.searchParams.get('retry') === 'true'
  const workflowId     = WORKFLOW_MAP[intent]
  const isProWorkflow  = workflowId === 'kyc_full_ntsa'

  let ballerineToken: string
  try {
    ballerineToken = await generateBallerineToken(user.id, workflowId)
  } catch (err) {
    console.error('[onboarding] Ballerine token generation failed:', err)
    throw error(503, 'Verification service unavailable. Please try again shortly.')
  }

  return {
    intent,
    workflowId,
    isProWorkflow,
    isRetry,
    ballerine: {
      workflowId,
      token: ballerineToken,
    },
  }
}

export const actions: Actions = {
  // Called by the Ballerine SDK after the user completes the flow
  // SDK posts the caseId back to this action via a hidden form
  submitKyc: async ({ request, locals, params }) => {
    const { supabase, user } = locals
    const intent = params.intent as OnboardingIntent

    if (!user) throw redirect(303, '/login')

    const formData      = await request.formData()
    const caseId        = formData.get('ballerineCaseId') as string | null
    const workflowRunId = formData.get('workflowRunId')  as string | null

    if (!caseId) {
      throw error(400, 'Missing Ballerine case ID.')
    }

    // Write caseId + pending status to profile.
    // Actor creation happens in the Ballerine webhook — NOT here.
    // Profile = identity. Actors = capabilities.
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
      console.error('[onboarding] Profile update failed:', updateError)
      throw error(500, 'Failed to record verification. Please try again.')
    }

    // Redirect to a pending/waiting page while Ballerine reviews
    throw redirect(303, `/onboarding/${intent}/pending`)
  },
}