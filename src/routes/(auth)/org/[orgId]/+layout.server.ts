/**
 * src/routes/(auth)/org/[orgId]/+layout.server.ts
 *
 * FIX — Critical: subquery passed to .in() doesn't work in Supabase JS.
 *
 *   BEFORE (broken):
 *     .in('actor_id', supabase.from('actors').select('id').eq(...))
 *
 *   `.in()` expects a plain `string[]`. Passing a PostgrestFilterBuilder
 *   object silently evaluates to zero results — every user fails the
 *   access check and gets redirected to /org/select regardless of their
 *   actual permissions.
 *
 *   AFTER (fixed):
 *     Step 1 — fetch actor IDs for this user (awaited, returns string[])
 *     Step 2 — use those IDs in the membership + jurisdiction queries
 *
 * Everything else unchanged.
 */

import type { LayoutServerLoad } from './$types'
import { redirect }              from '@sveltejs/kit'

export const load: LayoutServerLoad = async ({ params, locals }) => {
  const { supabase, session } = locals
  const { orgId }             = params

  if (!session?.user?.id) throw redirect(303, '/login/sign_in')

  // ── Step 1: get this user's active actor IDs ─────────────────
  // Must be awaited before use — .in() requires a plain string[].
  const { data: actorRows } = await supabase
    .from('actors')
    .select('id, type')
    .eq('profile_id', session.user.id)
    .eq('status', 'active')

  const actorIds      = (actorRows ?? []).map((a) => a.id)
  const adminActorIds = (actorRows ?? [])
    .filter((a) => ['ADMIN', 'SUPER_ADMIN', 'ORG_CHAIR'].includes(a.type))
    .map((a) => a.id)

  // ── Step 2: access check with real arrays ────────────────────
  // User must either:
  //   (a) be a member of this org via any of their active actors, OR
  //   (b) have federal/org jurisdiction via an admin-type actor
  const [{ data: membership }, { data: jurisdictions }] = await Promise.all([
    actorIds.length > 0
      ? supabase
          .from('organization_members')
          .select('actor_id, role')
          .eq('organization_id', orgId)
          .in('actor_id', actorIds)          // ← now a real string[]
          .limit(1)
      : Promise.resolve({ data: [] }),

    adminActorIds.length > 0
      ? supabase
          .from('actor_jurisdictions')
          .select('level, scope_id')
          .in('actor_id', adminActorIds)     // ← now a real string[]
          .or(`level.eq.federal,and(level.eq.org,scope_id.eq.${orgId})`)
      : Promise.resolve({ data: [] }),
  ])

  const hasAccess =
    (membership  && membership.length  > 0) ||
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

  // Find this user's role in the org from membership data
  const userActorIds  = new Set(actorIds)
  const userMembership = (members ?? []).find((m) =>
    userActorIds.has(m.actor_id),
  ) ?? null

  return {
    orgId,
    organization,
    branches:    branches    ?? [],
    members:     members     ?? [],
    vehicleCount: vehicleCount ?? 0,
    memberCount:  members?.length ?? 0,
    userOrgRole:  userMembership?.role ?? null,
  }
}