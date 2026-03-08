import type { PageServerLoad, Actions } from './$types'
import { fail } from '@sveltejs/kit'

export const load: PageServerLoad = async ({ locals }) => {
  const { data: organizations, error: orgErr } = await (locals.supabase as any)
    .from('organizations')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(200)

  if (orgErr) console.error('organizations list error', orgErr)

  // For each org, fetch member count
  const orgs = organizations ?? []
  const orgIds = orgs.map((o: any) => o.id)

  let memberCounts: Record<string, number> = {}
  let branchCounts: Record<string, number> = {}
  let vehicleCounts: Record<string, number> = {}

  if (orgIds.length > 0) {
    try {
      const { data: members } = await (locals.supabase as any)
        .from('organization_members')
        .select('organization_id')
        .in('organization_id', orgIds)
      if (members) {
        for (const m of members) {
          memberCounts[m.organization_id] = (memberCounts[m.organization_id] || 0) + 1
        }
      }
    } catch (e) { /* ignore */ }

    try {
      const { data: branches } = await (locals.supabase as any)
        .from('branches')
        .select('organization_id')
        .in('organization_id', orgIds)
      if (branches) {
        for (const b of branches) {
          branchCounts[b.organization_id] = (branchCounts[b.organization_id] || 0) + 1
        }
      }
    } catch (e) { /* ignore */ }

    try {
      const { data: vehicles } = await (locals.supabase as any)
        .from('vehicles')
        .select('organization_id')
        .in('organization_id', orgIds)
      if (vehicles) {
        for (const v of vehicles) {
          if (v.organization_id) {
            vehicleCounts[v.organization_id] = (vehicleCounts[v.organization_id] || 0) + 1
          }
        }
      }
    } catch (e) { /* ignore */ }
  }

  return {
    session: locals.session ?? null,
    organizations: orgs,
    memberCounts,
    branchCounts,
    vehicleCounts
  }
}

export const actions: Actions = {
  create: async ({ request, locals }) => {
    const form = await request.formData()
    const name = (form.get('name') as string)?.trim()
    const status = (form.get('status') as string) || 'active'

    if (!name) return fail(400, { error: 'Name is required' })

    const { error } = await (locals.supabase as any)
      .from('organizations')
      .insert({ name, status })

    if (error) {
      console.error('create organization error', error)
      return fail(500, { error: error.message })
    }

    return { success: true }
  },

  delete: async ({ request, locals }) => {
    const form = await request.formData()
    const id = form.get('id') as string
    if (!id) return fail(400, { error: 'Missing organization id' })

    const { error } = await (locals.supabase as any)
      .from('organizations')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('delete organization error', error)
      return fail(500, { error: error.message })
    }

    return { success: true }
  }
}