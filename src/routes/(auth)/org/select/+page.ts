/**
 * src/routes/(auth)/org/select/+page.ts
 *
 * FIXES:
 *   BUG 1 — Wrong $types import path:
 *     Before: import type { PageLoad } from "../../../$types"
 *     After:  import type { PageLoad } from './$types'
 *     SvelteKit generates $types per-route. The relative path was wrong.
 *
 *   BUG 2 — redirect() not thrown:
 *     Before: redirect(303, '/login/sign_in')  ← plain call, ignored
 *     After:  throw redirect(303, '/login/sign_in')
 *     SvelteKit redirects MUST be thrown to work in load functions.
 *
 * BEHAVIOUR:
 *   - No orgs → /dashboard (new user, nothing to pick)
 *   - 1 org    → /org/[orgId]/dashboard (skip picker)
 *   - 2+ orgs  → show picker (this page)
 *
 * NOTE: This is a client-side load (PageLoad, not PageServerLoad).
 *   It reads from the client-side sessionStore which is populated by
 *   bootstrap_session() on app mount. This is intentional — the store
 *   is the source of truth for org access on the client.
 *   The [orgId] layout server load re-validates on every org-scoped
 *   navigation, so there is no security gap.
 */

import type { PageLoad }     from './$types'
import { redirect }          from '@sveltejs/kit'
import { get }               from 'svelte/store'
import {
  sessionStore,
  getJurisdictionOrgIds,
}                            from '$lib/features/auth/stores/auth.store'

export const load: PageLoad = async ({ parent, url }) => {
  const { session } = await parent()

  if (!session) {
    throw redirect(303, '/login/sign_in')
  }

  const s      = get(sessionStore)
  const orgIds = getJurisdictionOrgIds()

  // No orgs → send to generic dashboard (they may need to join one first)
  if (orgIds.length === 0) {
    throw redirect(303, '/dashboard')
  }

  // Exactly one org → skip picker, go directly
  if (orgIds.length === 1) {
    throw redirect(303, `/org/${orgIds[0]}/dashboard`)
  }

  // Multiple orgs → show the picker
  // reason param is used to show context-aware messaging:
  //   e.g. ?reason=insufficient_permissions → "You need to switch orgs"
  return {
    orgs:   s.orgMemberships,
    reason: url.searchParams.get('reason') ?? null,
  }
}