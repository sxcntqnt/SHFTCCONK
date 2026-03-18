/**
 * src/routes/(auth)/admin/jurisdictions/+page.server.ts
 *
 * FIXES FROM PREVIOUS VERSION:
 *
 *   BUG 1 — (locals.supabase as any) everywhere:
 *     Removed. Using typed supabase from locals throughout.
 *
 *   BUG 2 — No auth guard on actions:
 *     The layout guards the /admin route for page loads, but form
 *     actions bypass the layout load. A crafted POST to ?/create or
 *     ?/delete would succeed for any authenticated user.
 *     Added _requireAdmin() check at the top of both actions.
 *
 *   BUG 3 — return { success: true } after mutations:
 *     SvelteKit invalidates the load on action success, but the form
 *     stays open and there's a visible flash. Using throw redirect(303)
 *     for a clean full reload. Success feedback is handled via URL
 *     search param (?created=1, ?deleted=1) read in load().
 *
 *   BUG 4 — Silent try/catch on dropdown queries:
 *     Removed blanket try/catch. Errors now surface via console.error
 *     and return empty arrays with an error flag the UI can show.
 *
 *   CRITICAL DATA FIX — Level value "organization" vs "org":
 *     The form was inserting level = "organization" into the DB.
 *     auth.store.ts JURISDICTION_LEVELS defines:
 *       ORG: "org"   ← NOT "organization"
 *     If "organization" is stored, hasJurisdictionAt(), findActorForOrg(),
 *     and all derived permission checks silently break — the actor has
 *     a jurisdiction row but it never matches.
 *     Fixed: all level values now use "org" to match the store constant.
 *     The UI still displays "Organization" as the human label.
 */

import type { PageServerLoad, Actions } from './$types'
import { fail, redirect }               from '@sveltejs/kit'

/* ============================================================
   LOAD
============================================================ */
export const load: PageServerLoad = async ({ locals, url }) => {
  const { supabase } = locals

  // Surface success feedback via URL params (set by redirect after action)
  const justCreated = url.searchParams.get('created') === '1'
  const justDeleted = url.searchParams.get('deleted') === '1'

  // ── Jurisdictions with actor + profile join ──────────────────
  const { data: jurisdictions, error: jErr } = await supabase
    .from('actor_jurisdictions')
    .select(`
      id,
      actor_id,
      level,
      scope_id,
      created_at,
      actors (
        id,
        type,
        profile_id,
        profiles ( full_name, avatar_url )
      )
    `)
    .order('created_at', { ascending: false })
    .limit(300)

  if (jErr) console.error('[jurisdictions] list error:', jErr)

  // ── Actors dropdown ──────────────────────────────────────────
  const { data: actors, error: aErr } = await supabase
    .from('actors')
    .select('id, type, profile_id, status, profiles ( full_name )')
    .eq('status', 'active')  // only show active actors in dropdown
    .order('type')
    .limit(300)

  if (aErr) console.error('[jurisdictions] actors load error:', aErr)

  // ── Organizations dropdown ───────────────────────────────────
  const { data: organizations, error: oErr } = await supabase
    .from('organizations')
    .select('id, name, status')
    .order('name')
    .limit(200)

  if (oErr) console.error('[jurisdictions] organizations load error:', oErr)

  // ── Branches dropdown ────────────────────────────────────────
  const { data: branches, error: bErr } = await supabase
    .from('branches')
    .select('id, name, organization_id')
    .order('name')
    .limit(200)

  if (bErr) console.error('[jurisdictions] branches load error:', bErr)

  return {
    jurisdictions: jurisdictions ?? [],
    actors:        actors        ?? [],
    organizations: organizations ?? [],
    branches:      branches      ?? [],
    justCreated,
    justDeleted,
    // Surface load errors to UI (non-fatal — page still renders)
    loadWarnings: [
      jErr && 'Could not load jurisdictions',
      aErr && 'Could not load actors dropdown',
      oErr && 'Could not load organizations dropdown',
      bErr && 'Could not load branches dropdown',
    ].filter(Boolean) as string[],
  }
}

/* ============================================================
   ACTIONS
============================================================ */

/**
 * Verify the calling user has an ADMIN or SUPER_ADMIN actor.
 * The layout guard protects GET loads but actions receive direct POSTs.
 */
async function _requireAdmin(locals: App.Locals): Promise<boolean> {
  const { supabase, user } = locals
  if (!user) return false

  const { data } = await supabase
    .from('actors')
    .select('id')
    .eq('profile_id', user.id)
    .in('type', ['ADMIN', 'SUPER_ADMIN'])
    .eq('status', 'active')
    .limit(1)

  return !!(data?.length)
}

/** Valid level values — must match JURISDICTION_LEVELS in auth.store.ts */
const VALID_LEVELS = ['federal', 'org', 'branch', 'department'] as const
type Level = (typeof VALID_LEVELS)[number]

export const actions: Actions = {
  /* ── Create ─────────────────────────────────────────────── */
  create: async ({ request, locals }) => {
    const { supabase } = locals

    if (!(await _requireAdmin(locals))) {
      return fail(403, { error: 'Admin access required' })
    }

    const form     = await request.formData()
    const actor_id = (form.get('actor_id') as string)?.trim()
    const level    = (form.get('level')    as string)?.trim() as Level
    const scope_id = (form.get('scope_id') as string)?.trim() || null

    // Validate
    if (!actor_id)                       return fail(400, { error: 'Actor is required' })
    if (!VALID_LEVELS.includes(level))   return fail(400, { error: `Invalid level. Must be one of: ${VALID_LEVELS.join(', ')}` })
    if (level !== 'federal' && !scope_id) return fail(400, { error: 'Scope is required for non-federal jurisdictions' })
    if (level === 'federal' && scope_id)  return fail(400, { error: 'Federal jurisdictions must not have a scope_id' })

    // Prevent duplicates — same actor + level + scope already exists
    const { data: existing } = await supabase
      .from('actor_jurisdictions')
      .select('id')
      .eq('actor_id', actor_id)
      .eq('level', level)
      .eq('scope_id', scope_id ?? '')
      .limit(1)

    if (existing?.length) {
      return fail(409, { error: 'This actor already has this jurisdiction assigned' })
    }

    const { error } = await supabase
      .from('actor_jurisdictions')
      .insert({ actor_id, level, scope_id })

    if (error) {
      console.error('[jurisdictions] create error:', error)
      return fail(500, { error: error.message })
    }

    throw redirect(303, '/admin/jurisdictions?created=1')
  },

  /* ── Delete ─────────────────────────────────────────────── */
  delete: async ({ request, locals }) => {
    const { supabase } = locals

    if (!(await _requireAdmin(locals))) {
      return fail(403, { error: 'Admin access required' })
    }

    const form = await request.formData()
    const id   = (form.get('id') as string)?.trim()

    if (!id) return fail(400, { error: 'Missing jurisdiction id' })

    const { error } = await supabase
      .from('actor_jurisdictions')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('[jurisdictions] delete error:', error)
      return fail(500, { error: error.message })
    }

    throw redirect(303, '/admin/jurisdictions?deleted=1')
  },
}