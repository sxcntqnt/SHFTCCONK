/**
 * src/hooks-server/UserState.ts
 *
 * THE BRAIN — resolves domain state for authenticated users.
 *
 * Responsibilities:
 *   - resolveUserState   → full profile + role membership
 *   - Guest trap         → redirect guests to /onboarding
 *   - KYC pending trap   → redirect to /onboarding/:intent while KYC is open
 *   - KYC rejected trap  → redirect to /onboarding/:intent?retry=true
 *   - activateXContext   → picks the correct active context (passenger, crew…)
 *                          with cookie preference + org-id binding
 *   - Context fallback   → always sets activeContext, never leaves it null
 *
 * Identity source: event.locals.auth.user (set by authHandle — provider-agnostic).
 *
 * Profile query ID: event.locals.supabaseUserId ?? user.id
 *   When AUTH_PROVIDER=internal, sessionSyncHandle resolves the Supabase row UUID
 *   and writes it to supabaseUserId. All profile queries and RLS policies anchor
 *   on that UUID. For the Supabase provider, user.id is already the Supabase UUID.
 *
 * This handle knows NOTHING about requestContext / location / geo / auth providers.
 * It only runs for authenticated users on non-public paths.
 *
 * Placement: LAST in the sequence, after authGuardHandle.
 */

import { redirect, type Handle } from '@sveltejs/kit'
import type { App }               from '../../app'
import { resolveUserState }       from '$lib/features/auth/services/userState.server'
import { activateXContext }       from '$lib/features/auth/contexts/context.template'

// ─── path helpers ─────────────────────────────────────────────────────────────

const PUBLIC_PATHS      = ['/login', '/verify', '/auth/callback', '/auth/confirm']
const ONBOARDING_PREFIX = '/onboarding'

const isPublicPath     = (pathname: string) => PUBLIC_PATHS.some((p) => pathname.startsWith(p))
const isOnboardingPath = (pathname: string) => pathname.startsWith(ONBOARDING_PREFIX)

// ─── handle ───────────────────────────────────────────────────────────────────

export const userStateHandle: Handle = async ({ event, resolve }) => {
  const { pathname } = event.url
  const user          = event.locals.auth.user  // ← unified source; never locals.user directly

  if (!user || isPublicPath(pathname)) return resolve(event)

  // Resolve the Supabase row UUID to use for all profile queries.
  // Internal provider: sessionSyncHandle has already populated supabaseUserId.
  // Supabase provider: user.id is already the Supabase UUID.
  const resolveId = event.locals.supabaseUserId ?? user.id

  try {
    const state = await resolveUserState(event.locals.supabase, resolveId)
    event.locals.userState = state

    // ── guest trap ──────────────────────────────────────────────────────────
    if (state.isGuest && !isOnboardingPath(pathname)) {
      const kycIntent = (state.profile as any).kyc_intent as string | null
      if (kycIntent) throw redirect(303, `/onboarding/${kycIntent}`)
      throw redirect(303, '/onboarding')
    }

    const onboardingStatus = (state.profile as any).onboarding_status as string | null
    const kycIntent        = (state.profile as any).kyc_intent        as string | null
    const kycStatus        = (state.profile as any).kyc_status        as string | null

    // ── KYC pending trap ────────────────────────────────────────────────────
    if (
      onboardingStatus === 'AWAITING_KYC' &&
      kycStatus        === 'pending'      &&
      !isOnboardingPath(pathname)
    ) {
      throw redirect(303, `/onboarding/${kycIntent ?? 'passenger'}`)
    }

    // ── KYC rejected trap ───────────────────────────────────────────────────
    if (kycStatus === 'rejected' && !isOnboardingPath(pathname)) {
      throw redirect(303, `/onboarding/${kycIntent ?? 'passenger'}?retry=true`)
    }

    // ── context activation ──────────────────────────────────────────────────
    const preferredContext = (
      event.cookies.get('active_context') ?? 'passenger'
    ) as App.ContextType

    const preferredOrgId = event.cookies.get('active_org_id') ?? undefined

    let activeContext = activateXContext(state, preferredContext, { orgId: preferredOrgId })

    // Always fall back to passenger — never leave activeContext null
    if (!activeContext) activeContext = activateXContext(state, 'passenger')

    event.locals.activeContext = activeContext

  } catch (err) {
    // Re-throw SvelteKit redirects — swallow everything else so a broken
    // profile doesn't take down the whole request pipeline
    if (err instanceof Error && 'status' in err && 'location' in err) throw err
    console.error('[hooks:userStateHandle] Resolution failed:', err)
  }

  return resolve(event)
}
