/**
 * src/routes/(auth)/org/select/+page.ts
 *
 * Org picker — shown when a user has access to more than one org.
 *
 * CONTEXT SHIFT:
 *   Old: reads sessionStore + getJurisdictionOrgIds() directly.
 *   New: reads from orgChairCtx / orgCtx after requireOrgMemberAccess,
 *        but since we don't have a specific orgId yet (that's what we're
 *        picking), we read from sessionStore.orgMemberships which is
 *        already populated by bootstrap_session at app mount.
 *        The context stores are intentionally NOT activated here —
 *        they activate once the user picks an org and navigates to
 *        /org/[orgId]/*, where the layout calls requireOrgMemberAccess.
 *
 * BEHAVIOUR:
 *   - Not logged in  → /login/sign_in
 *   - 0 orgs         → /app/dashboard  (new user, needs to join first)
 *   - 1 org          → /org/[orgId]/dashboard (skip picker)
 *   - 2+ orgs        → show picker (this page)
 *
 * REASON PARAM:
 *   ?reason=no_access         → "You don't have access to that org"
 *   ?reason=insufficient_permissions → "Switch orgs to continue"
 */

import type { PageLoad }  from '$lib/types'
import { redirect }       from '@sveltejs/kit'
import { get }            from 'svelte/store'
import { sessionStore }   from '$lib/features/auth/stores/auth'

export const load: PageLoad = async ({ parent, url }) => {
  const { session } = await parent()

  if (!session) {
    throw redirect(303, '/login/sign_in')
  }

  const s = get(sessionStore)

  // orgMemberships is populated by bootstrap_session at app mount.
  // Each entry has: organization_id, org_name, role, status.
  const memberships = s.orgMemberships ?? []

  // No orgs — user needs to request access or join a SACCO first
  if (memberships.length === 0) {
    throw redirect(303, '/app/dashboard?reason=no_orgs')
  }

  // Single org — skip the picker entirely
  if (memberships.length === 1) {
    throw redirect(303, `/org/${memberships[0].organization_id}/dashboard`)
  }

  // Multiple orgs — show picker
  // Enrich with jurisdiction level so UI can show role labels per org
  const jurisdictions = s.jurisdictions ?? []

  const orgs = memberships.map((m) => {
    const orgJurisdictions = jurisdictions.filter(
      (j) => j.scope_id === m.organization_id,
    )
    // Determine the highest role this user holds in this org
    const actors = s.actors ?? []
    const orgActors = actors.filter((a) =>
      orgJurisdictions.some((j) => j.actor_id === a.id),
    )
    const topRole = orgActors[0]?.type ?? null

    return {
      organizationId: m.organization_id,
      orgName:        m.org_name ?? 'Unknown SACCO',
      role:           topRole,
      memberRole:     m.role ?? null,
    }
  })

  return {
    orgs,
    reason: url.searchParams.get('reason') ?? null,
  }
}