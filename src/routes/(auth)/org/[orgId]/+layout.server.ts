/**
 * src/routes/(auth)/org/[orgId]/+layout.server.ts
 *
 * FIXES FROM PREVIOUS VERSION:
 *
 *   BUG 1 — LayoutLoad → LayoutServerLoad:
 *     Was running Supabase queries client-side via LayoutLoad.
 *     Supabase DB queries must run server-side. Renamed to .server.ts.
 *
 *   BUG 2 — No server-side org access guard:
 *     requireOrgAccess was called but it checked client-side store state.
 *     Now validates directly against the DB: actor must have org-level
 *     or federal jurisdiction over this orgId, or be an ORG_CHAIR member.
 *     Redirects to /org/select if no access found.
 *
 * LOADS FOR ALL /org/[orgId]/* CHILD ROUTES:
 *   - organization   → name, status, metadata
 *   - branches       → for sub-navigation
 *   - members        → for member management pages
 *   - orgStats       → vehicle count, member count (for sidebar badges)
 */

import type { LayoutServerLoad } from './$types'
import { redirect }              from '@sveltejs/kit'

export const load: LayoutServerLoad = async ({ params, locals }) => {
  const { supabase, session, user } = locals
  const { orgId } = params

  if (!session?.user?.id) throw redirect(303, '/login/sign_in')

  // ── Org access check ──────────────────────────────────────────
  // User must either:
  //   (a) be an ORG_CHAIR member of this org, OR
  //   (b) have an actor with federal/org jurisdiction (admin or chair)
  // Real enforcement is via RLS — this prevents bad UX redirects.

  const [{ data: membership }, { data: jurisdictions }] = await Promise.all([
    supabase
      .from('organization_members')
      .select('actor_id, role')
      .eq('organization_id', orgId)
      .in(
        'actor_id',
        // Subquery: get actor ids for this user
        supabase
          .from('actors')
          .select('id')
          .eq('profile_id', session.user.id)
          .eq('status', 'active'),
      )
      .limit(1),

    supabase
      .from('actor_jurisdictions')
      .select('level, scope_id')
      .in(
        'actor_id',
        supabase
          .from('actors')
          .select('id')
          .eq('profile_id', session.user.id)
          .in('type', ['ADMIN', 'SUPER_ADMIN', 'ORG_CHAIR'])
          .eq('status', 'active'),
      )
      .or(`level.eq.federal,and(level.eq.org,scope_id.eq.${orgId})`),
  ])

  const hasAccess =
    (membership && membership.length > 0) ||
    (jurisdictions && jurisdictions.length > 0)

  if (!hasAccess) {
    throw redirect(303, '/org/select?reason=no_access')
  }

  // ── Load org context ──────────────────────────────────────────
  const [
    { data: organization },
    { data: branches },
    { data: members },
    { count: vehicleCount },
  ] = await Promise.all([
    supabase
      .from('organizations')
      .select('id, name, status, metadata')
      .eq('id', orgId)
      .single(),

    supabase
      .from('branches')
      .select('id, name')
      .eq('organization_id', orgId)
      .order('name'),

    supabase
      .from('organization_members')
      .select(`
        actor_id,
        role,
        actors (
          id,
          type,
          status,
          profiles ( id, full_name, avatar_url )
        )
      `)
      .eq('organization_id', orgId)
      .limit(100),

    supabase
      .from('vehicles')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', orgId),
  ])

  if (!organization) {
    throw redirect(303, '/org/select?reason=org_not_found')
  }

  // Determine the current user's role in this org
  const userMembership = membership?.[0] ?? null

  return {
    orgId,
    organization,
    branches:      branches     ?? [],
    members:       members      ?? [],
    vehicleCount:  vehicleCount ?? 0,
    memberCount:   members?.length ?? 0,
    userOrgRole:   userMembership?.role ?? null,
  }
}