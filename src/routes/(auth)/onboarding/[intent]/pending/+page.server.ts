// src/routes/(auth)/onboarding/[intent]/pending/+page.server.ts
//
// Pending verification page — shown while Ballerine reviews the KYC case.
// Polls profile.kyc_status on each page load. When the webhook updates
// it to 'approved', this page redirects to the appropriate dashboard.
//
// POLLING:
//   Client-side polling via <meta refresh> or a JS interval is acceptable.
//   Server load runs on each navigation — no WebSocket needed.

import type { PageServerLoad } from './$types'
import { redirect }            from '@sveltejs/kit'

export const load: PageServerLoad = async ({ locals, params }) => {
  const { supabase, user } = locals
  const intent = params.intent

  if (!user) throw redirect(303, '/login')

  // Fetch fresh kyc_status directly — not from userState (may be stale)
  const { data: profile } = await supabase
    .from('profiles')
    .select('kyc_status, kyc_intent, onboarding_status')
    .eq('id', user.id)
    .single()

  const kycStatus = profile?.kyc_status

  // Webhook has approved — redirect to the right dashboard
  if (kycStatus === 'approved') {
    const destination = intentToDashboard(intent)
    throw redirect(303, `${destination}?rebootstrap=1`)
  }

  // Rejected — back to the KYC page with retry flag
  if (kycStatus === 'rejected') {
    throw redirect(303, `/onboarding/${intent}?retry=true`)
  }

  // Expired — back to intent picker
  if (kycStatus === 'expired') {
    throw redirect(303, '/onboarding?expired=true')
  }

  return {
    intent,
    kycStatus: kycStatus ?? 'pending',
  }
}

function intentToDashboard(intent: string): string {
  switch (intent) {
    case 'crew':     return '/crew/dashboard'
    case 'operator': return '/operator/dashboard'
    case 'owner':
    case 'org':      return '/org/select'
    default:         return '/app/dashboard'
  }
}