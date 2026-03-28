// src/routes/(auth)/onboarding/+page.server.ts
//
// Intent picker — shown ONLY to self-registering passengers.
//
// WHO LANDS HERE:
//   - New users who signed up directly (no invite)
//   - They see one selectable intent: passenger
//   - ALL other roles (crew, operator, owner, org staff) arrive via
//     invite token which pre-sets kyc_intent — they skip this page
//     entirely and land on /onboarding/[intent] directly
//
// FLOW:
//   New signup → /onboarding (this page, passenger only)
//             → setIntent action → profile.kyc_intent = 'passenger'
//             → /onboarding/passenger (Ballerine kyc_light)
//             → /onboarding/passenger/pending
//             → webhook fires → actor created
//             → /app/create_profile?rebootstrap=1
//
//   Invite flow → redeem_invite sets kyc_intent on profile
//              → /onboarding/[intent] (skips this page)
//              → Ballerine kyc_full_ntsa
//              → webhook fires → actor created (pending, org approves)
//              → /[role]/create_profile?rebootstrap=1
//
// WHY PASSENGER ONLY FOR SELF-REGISTRATION:
//   Roles (except PASSENGER) are organization-assigned — not user-selected.
//   An operator cannot self-declare as DRIVER. Only an org inviting them
//   can grant that capability. Onboarding = identity completion, not
//   role assignment.

import type { PageServerLoad, Actions } from './$types'
import { redirect, error }              from '@sveltejs/kit'

// Only passenger is self-selectable.
// All other intents are set by the invite redemption flow.
const SELF_SELECTABLE_INTENTS = ['passenger'] as const
export type SelfSelectIntent = typeof SELF_SELECTABLE_INTENTS[number]

// All valid intents — used to validate invite-set intents in [intent]/+page.server.ts
export const VALID_INTENTS = ['passenger', 'crew', 'operator', 'owner', 'org'] as const
export type OnboardingIntent = typeof VALID_INTENTS[number]

// ── Intent → dashboard mapping ─────────────────────────────────────────────
// Single source of truth — used here AND in pending/+page.server.ts
export function intentToDashboard(intent: string): string {
  switch (intent) {
    case 'crew':     return '/crew/dashboard'
    case 'operator': return '/operator/dashboard'
    case 'owner':
    case 'org':      return '/org/select'
    default:         return '/app/dashboard'   // passenger + unknown
  }
}

export const load: PageServerLoad = async ({ locals }) => {
  const { userState } = locals

  // ── Already verified → send to the right dashboard ─────────────────────
  // Uses intentToDashboard so a crew member doesn't land on /app/dashboard
  if (userState && !userState.isGuest) {
    const intent = (userState.profile as any).kyc_intent as string | null
    throw redirect(303, intentToDashboard(intent ?? 'passenger'))
  }

  // ── Mid-flow (kyc_intent already set) → resume at [intent] ────────────
  // Handles: user set intent then navigated away, or arrived via invite
  const kycIntent = (userState?.profile as any)?.kyc_intent as string | null
  if (kycIntent) {
    throw redirect(303, `/onboarding/${kycIntent}`)
  }

  // ── Fresh user — show passenger intent picker ──────────────────────────
  return {}
}

export const actions: Actions = {
  // Passenger self-registration intent selection
  setIntent: async ({ request, locals }) => {
    const { supabase, user } = locals

    if (!user) throw redirect(303, '/login')

    const formData = await request.formData()
    const intent   = formData.get('intent') as string

    // Only passengers can self-select — all others arrive via invite
    if (!SELF_SELECTABLE_INTENTS.includes(intent as SelfSelectIntent)) {
      throw error(400,
        'Only passenger registration is available here. ' +
        'Other roles require an invite from a registered organisation.'
      )
    }

    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        kyc_intent:        intent,
        onboarding_status: 'AWAITING_KYC',
      })
      .eq('id', user.id)

    if (updateError) {
      throw error(500, 'Failed to save intent. Please try again.')
    }

    throw redirect(303, `/onboarding/${intent}`)
  },
}