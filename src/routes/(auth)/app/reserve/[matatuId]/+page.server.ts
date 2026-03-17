// src/routes/app/reserve/[matatuId]/+page.server.ts
import type { PageServerLoad } from './$types'
import { error } from '@sveltejs/kit'

export const load: PageServerLoad = async ({ params, locals }) => {
  const { matatuId } = params

  if (!matatuId) throw error(400, 'Missing matatu ID')

  const session = await locals.safeGetSession()
  if (!session?.user) throw error(401, 'Not authenticated')

  // ── Fetch vehicle ──
  const { data: vehicle, error: vehicleError } = await locals.supabase
    .from('vehicles')
    .select('id, organization_id, branch_id, capacity, gps_lat, gps_lng, active, compliance_status')
    .eq('reg_number', matatuId)
    .single()

  if (vehicleError || !vehicle) throw error(404, `Matatu "${matatuId}" not found`)
  if (!vehicle.active)          throw error(410, 'This matatu is no longer active')

  // ── Tenant check ──
  if (session.user.app_metadata?.organizationId !== vehicle.organization_id) {
    throw error(403, 'Forbidden')
  }

  // ── Fetch existing reservation for this user + vehicle if any ──
  const { data: reservation } = await locals.supabase
    .from('bookings')
    .select('id, status, fare, route_from, route_to, created_at')
    .eq('vehicle_id', vehicle.id)
    .eq('passenger_actor_id', session.user.id)
    .in('status', ['pending', 'confirmed'])
    .maybeSingle()

  // ── Seat occupancy (confirmed reservations on this vehicle) ──
  const { count: occupancy } = await locals.supabase
    .from('bookings')
    .select('id', { count: 'exact', head: true })
    .eq('vehicle_id', vehicle.id)
    .in('status', ['pending', 'confirmed'])

  return {
    vehicleId:        vehicle.id,
    regNumber:        matatuId,
    organizationId:   vehicle.organization_id,
    branchId:         vehicle.branch_id,
    capacity:         String(vehicle.capacity),
    complianceStatus: vehicle.compliance_status,
    occupancy:        occupancy ?? 0,
    existingReservation: reservation ?? null,
  }
}