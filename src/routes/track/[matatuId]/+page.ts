// src/routes/track/[matatuId]/+page.ts

import type { PageLoad } from './$types';
import { supabase } from '$lib/supabaseClient';
import { enforceTenant } from '$lib/auth';
import { latLngToCell } from 'h3-js';

export const load: PageLoad = async ({ params }) => {
  const { matatuId } = params;

  if (!matatuId) {
    throw new Error('Missing matatuId');
  }

  /* --------------------------------------
     Fetch vehicle from database directly
     (Do NOT rely on client store in SSR)
  --------------------------------------- */

  const { data: vehicle, error } = await supabase
    .from('vehicles')
    .select('*')
    .eq('id', matatuId)
    .single();

  if (error || !vehicle) {
    throw new Error('Matatu not found');
  }

  /* --------------------------------------
     Hard tenant enforcement
  --------------------------------------- */

  enforceTenant(vehicle.organizationId);

  const lat = vehicle.gpsLat;
  const lng = vehicle.gpsLng;

  if (
    typeof lat !== 'number' ||
    typeof lng !== 'number'
  ) {
    throw new Error('Invalid vehicle GPS coordinates');
  }

  /* --------------------------------------
     H3 Resolution Strategy
     Nairobi sweet spot → res 9
  --------------------------------------- */

  const hex = latLngToCell(lat, lng, 9);

  return {
    matatuId,
    hex,
    lat,
    lng
  };
};