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

    // Server-side existence & ownership checks
    try {
      if (bindingType === 'driver_assignment' || bindingType === 'conductor_assignment' || bindingType === 'fleet_ownership') {
        // bindingTarget should be a vehicle id
        const { data: vehicle, error: vErr } = await (locals.supabase as any)
          .from('vehicles')
          .select('id,organization_id')
          .eq('id', bindingTarget)
          .maybeSingle()

        if (vErr) {
          // fallback: try selecting just id
          const { data: v2, error: v2Err } = await (locals.supabase as any).from('vehicles').select('id').eq('id', bindingTarget).maybeSingle()
          if (v2Err || !v2) return fail(400, { error: 'vehicle_not_found' })
        } else if (!vehicle) {
          return fail(400, { error: 'vehicle_not_found' })
        } else if (vehicle.organization_id) {
          // if vehicle belongs to an organization, ensure current user is an org admin or platform admin
          const userId = locals.user?.id
          if (!userId) return fail(403, { error: 'not_authenticated' })

          // find actor id(s) for the current user
          const { data: actors, error: aErr } = await (locals.supabase as any)
            .from('actors')
            .select('id')
            .eq('profile_id', userId)

          if (aErr) return fail(500, { error: 'actor_lookup_failed' })
          const actorIds = (actors || []).map((a: any) => a.id)
          if (actorIds.length === 0) return fail(403, { error: 'no_actor_for_user' })

          const { data: om, error: omErr } = await (locals.supabase as any)
            .from('organization_members')
            .select('actor_id')
            .in('actor_id', actorIds)
            .eq('organization_id', vehicle.organization_id)
            .eq('role', 'admin')
            .limit(1)

          if (omErr) return fail(500, { error: 'org_membership_check_failed' })
          if (!om || (Array.isArray(om) && om.length === 0)) {
            return fail(403, { error: 'not_org_admin' })
          }
        }
      }

      if (bindingType === 'organization_member' || bindingType === 'fleet_ownership') {
        // bindingTarget is an organization id; ensure it exists
        const { data: org, error: oErr } = await (locals.supabase as any).from('organizations').select('id').eq('id', bindingTarget).maybeSingle()
        if (oErr || !org) return fail(400, { error: 'organization_not_found' })

        // ensure current user is admin of that organization unless they are platform admin
        const userId = locals.user?.id
        if (!userId) return fail(403, { error: 'not_authenticated' })
        const { data: actors, error: aErr } = await (locals.supabase as any)
          .from('actors')
          .select('id')
          .eq('profile_id', userId)

        if (aErr) return fail(500, { error: 'actor_lookup_failed' })
        const actorIds = (actors || []).map((a: any) => a.id)
        if (actorIds.length === 0) return fail(403, { error: 'no_actor_for_user' })

        const { data: om, error: omErr } = await (locals.supabase as any)
          .from('organization_members')
          .select('actor_id')
          .in('actor_id', actorIds)
          .eq('organization_id', bindingTarget)
          .eq('role', 'admin')
          .limit(1)

        if (omErr) return fail(500, { error: 'org_membership_check_failed' })
        if (!om || (Array.isArray(om) && om.length === 0)) {
          return fail(403, { error: 'not_org_admin' })
        }
      }
    } catch (e) {
      console.error('binding target validation error', e)
      return fail(500, { error: 'binding_validation_failed' })
    }

    const { data, error } = await (locals.supabase as any).rpc('approve_actor_request', { request_id: id, binding_type: bindingType || null, binding_target: bindingTarget || null })
    if (error) {
      console.error('approve_actor_request rpc error', error)
      return fail(500, { error: error.message })
    }
    return { status: 303, headers: { location: '/admin/actor_requests' } }
  }
}
