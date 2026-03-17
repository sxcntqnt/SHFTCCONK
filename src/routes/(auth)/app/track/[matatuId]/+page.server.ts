// src/routes/app/track/[matatuId]/+page.server.ts
import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { latLngToCell } from 'h3-js';

export const load: PageServerLoad = async ({ params, locals }) => {
  const { matatuId } = params;

  if (!matatuId) {
    throw error(400, 'Missing matatuId');
  }

  const { data: vehicle, error: dbError } = await locals.supabase
    .from('vehicles')
    .select('*')
    .eq('reg_number', matatuId)
    .single();

  if (dbError || !vehicle) {
    throw error(404, 'Matatu not found');
  }

  const session = await locals.getSession();
  if (session?.user?.app_metadata?.organizationId !== vehicle.organization_id) {
    throw error(403, 'Forbidden');
  }

  const lat: number = vehicle.gps_lat;
  const lng: number = vehicle.gps_lng;

  if (typeof lat !== 'number' || typeof lng !== 'number') {
    throw error(422, 'Invalid vehicle GPS coordinates');
  }

  const hex = latLngToCell(lat, lng, 9);

  return {
    matatuId,
    hex,
    lat,
    lng,
  };
};