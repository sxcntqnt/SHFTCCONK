import type { PageServerLoad, Actions } from './$types'
import { fail } from '@sveltejs/kit'

const UUID_RE = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/

export const load: PageServerLoad = async ({ locals }) => {
  // List pending requests (RLS will filter based on admin privileges)
  const { data: requests, error: reqErr } = await (locals.supabase as any)
    .from('actor_requests')
    .select('*')
    .eq('status', 'pending')

  if (reqErr) {
    console.error('actor_requests list error', reqErr)
  }

  // Try to fetch vehicles and organizations to populate dropdowns; if tables are absent, fallback to []
  let vehicles: any[] = []
  let organizations: any[] = []
  try {
    const { data: vData, error: vErr } = await (locals.supabase as any).from('vehicles').select('id,name').limit(200)
    if (!vErr && vData) vehicles = vData
  } catch (e) {
    // ignore - table may not exist
  }
  try {
    const { data: oData, error: oErr } = await (locals.supabase as any).from('organizations').select('id,name').limit(200)
    if (!oErr && oData) organizations = oData
  } catch (e) {
    // ignore - table may not exist
  }

  return { session: locals.session ?? null, requests: requests ?? [], vehicles, organizations }
}

export const actions: Actions = {
  approve: async ({ request, locals }) => {
    const form = await request.formData()
    const id = form.get('request_id') as string
    const bindingType = (form.get('binding_type') as string) || null
    const bindingTarget = (form.get('binding_target') as string) || null

    if (!id) return fail(400, { error: 'missing_request_id' })

    // if admin selected a binding type that requires a target, validate target exists and is a UUID
    const bindingTypesRequireTarget = ['driver_assignment', 'conductor_assignment', 'fleet_ownership', 'organization_member']
    if (bindingType && bindingTypesRequireTarget.includes(bindingType)) {
      if (!bindingTarget) return fail(400, { error: 'binding_target_required' })
      if (!UUID_RE.test(bindingTarget)) return fail(400, { error: 'binding_target_invalid' })
    }

    const { data, error } = await (locals.supabase as any).rpc('approve_actor_request', { request_id: id, binding_type: bindingType || null, binding_target: bindingTarget || null })
    if (error) {
      console.error('approve_actor_request rpc error', error)
      return fail(500, { error: error.message })
    }
    return { status: 303, headers: { location: '/admin/actor_requests' } }
  }
}
