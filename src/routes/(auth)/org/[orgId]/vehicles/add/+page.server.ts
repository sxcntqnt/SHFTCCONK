// src/routes/(auth)/org/[orgId]/vehicles/add/+page.server.ts
import type { PageServerLoad, Actions } from './$types'
import { redirect, fail } from '@sveltejs/kit'

export const load: PageServerLoad = async ({ params, locals }) => {
  const { safeGetSession, supabase } = locals
  const { session } = await safeGetSession()
  if (!session) redirect(303, '/login')

  const orgId = params.orgId

  // Groups for the select dropdown
  const { data: groups } = await supabase
    .from('vehicle_groups')
    .select('id, name')
    .eq('organization_id', orgId)
    .order('name')

  // Unlinked devices available to assign (no vehicle_id yet)
  const { data: devices } = await supabase
    .from('devices')
    .select('id, identifier, api_url')
    .eq('organization_id', orgId)
    .is('vehicle_id', null)
    .order('identifier')

  return {
    orgId,
    groups: groups ?? [],
    availableDevices: devices ?? [],
  }
}

export const actions: Actions = {
  default: async ({ params, request, locals }) => {
    const { safeGetSession, supabase } = locals
    const { session } = await safeGetSession()
    if (!session) return fail(401, { message: 'Unauthorised' })

    const orgId = params.orgId
    const form  = await request.formData()

    // ── Required fields ────────────────────────────────────────────────
    const registration = form.get('registration')?.toString().trim()
    const name         = form.get('name')?.toString().trim()
    const chassis      = form.get('chassis')?.toString().trim()
    const vehicleType  = form.get('vehicle_type')?.toString().trim()
    const groupId      = form.get('group_id')?.toString() || null

    if (!registration || !name || !chassis || !vehicleType) {
      return fail(400, { message: 'Registration, name, chassis and type are required' })
    }

    // ── Optional fields ────────────────────────────────────────────────
    const model             = form.get('model')?.toString().trim()         || null
    const engine            = form.get('engine')?.toString().trim()        || null
    const manufacturedBy    = form.get('manufactured_by')?.toString().trim()|| null
    const color             = form.get('color')?.toString().trim()         || null
    const registrationExpiry= form.get('registration_expiry')?.toString()  || null

    // ── GPS / device fields ────────────────────────────────────────────
    // User can either pick an existing device OR supply raw API credentials.
    // If both, the existing device takes precedence.
    const existingDeviceId  = form.get('device_id')?.toString()            || null
    const apiUrl            = form.get('api_url')?.toString().trim()       || null
    const apiUsername       = form.get('api_username')?.toString().trim()  || null
    const apiPassword       = form.get('api_password')?.toString().trim()  || null

    // ── Insert vehicle ─────────────────────────────────────────────────
    const { data: vehicle, error: vehicleError } = await supabase
      .from('vehicles')
      .insert({
        organization_id:     orgId,
        name,
        registration,
        model,
        chassis,
        engine,
        manufactured_by:     manufacturedBy,
        vehicle_type:        vehicleType,
        color,
        registration_expiry: registrationExpiry || null,
        group_id:            groupId,
        status:              'Idle',
      })
      .select('id')
      .single()

    if (vehicleError) return fail(500, { message: vehicleError.message })

    const vehicleId = vehicle.id

    // ── Link device ────────────────────────────────────────────────────
    if (existingDeviceId) {
      // Link an existing unassigned device to this vehicle
      const { error: linkError } = await supabase
        .from('devices')
        .update({ vehicle_id: vehicleId })
        .eq('id', existingDeviceId)
        .eq('organization_id', orgId) // scope guard

      if (linkError) console.error('[add vehicle] device link error:', linkError)

    } else if (apiUrl) {
      // Create a new device record from the raw credentials
      const { error: deviceError } = await supabase
        .from('devices')
        .insert({
          organization_id: orgId,
          vehicle_id:      vehicleId,
          identifier:      registration, // default identifier = reg plate
          api_url:         apiUrl,
          api_username:    apiUsername,
          api_password:    apiPassword,
          status:          'active',
        })

      if (deviceError) console.error('[add vehicle] device create error:', deviceError)
    }

    redirect(303, `/org/${orgId}/vehicles`)
  },
}