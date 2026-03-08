import type { PageServerLoad, Actions } from './$types'
import { fail } from '@sveltejs/kit'

export const load: PageServerLoad = async ({ locals }) => {
  // Fetch jurisdictions with actor info
  const { data: jurisdictions, error: jErr } = await (locals.supabase as any)
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
        profiles ( full_name )
      )
    `)
    .order('created_at', { ascending: false })
    .limit(200)

  if (jErr) console.error('actor_jurisdictions list error', jErr)

  // Fetch actors for create dropdown
  let actors: any[] = []
  try {
    const { data: aData, error: aErr } = await (locals.supabase as any)
      .from('actors')
      .select('id, type, profile_id, profiles ( full_name )')
      .limit(300)
    if (!aErr && aData) actors = aData
  } catch (e) { /* ignore */ }

  // Fetch organizations for scope dropdown
  let organizations: any[] = []
  try {
    const { data: oData, error: oErr } = await (locals.supabase as any)
      .from('organizations')
      .select('id, name')
      .limit(200)
    if (!oErr && oData) organizations = oData
  } catch (e) { /* ignore */ }

  // Fetch branches
  let branches: any[] = []
  try {
    const { data: bData, error: bErr } = await (locals.supabase as any)
      .from('branches')
      .select('id, name, organization_id')
      .limit(200)
    if (!bErr && bData) branches = bData
  } catch (e) { /* ignore */ }

  return {
    session: locals.session ?? null,
    jurisdictions: jurisdictions ?? [],
    actors,
    organizations,
    branches
  }
}

export const actions: Actions = {
  create: async ({ request, locals }) => {
    const form = await request.formData()
    const actor_id = (form.get('actor_id') as string)?.trim()
    const level = (form.get('level') as string)?.trim()
    const scope_id = (form.get('scope_id') as string)?.trim() || null

    if (!actor_id) return fail(400, { error: 'Actor is required' })
    if (!level) return fail(400, { error: 'Level is required' })

    const { error } = await (locals.supabase as any)
      .from('actor_jurisdictions')
      .insert({ actor_id, level, scope_id })

    if (error) {
      console.error('create jurisdiction error', error)
      return fail(500, { error: error.message })
    }

    return { success: true }
  },

  delete: async ({ request, locals }) => {
    const form = await request.formData()
    const id = form.get('id') as string
    if (!id) return fail(400, { error: 'Missing jurisdiction id' })

    const { error } = await (locals.supabase as any)
      .from('actor_jurisdictions')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('delete jurisdiction error', error)
      return fail(500, { error: error.message })
    }

    return { success: true }
  }
}