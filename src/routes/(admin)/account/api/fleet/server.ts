import { json } from '@sveltejs/kit';
import { fleet, getActiveVehicles, requireVehicleAccess } from '$lib/stores/fleet.store';
import { get } from 'svelte/store';

export async function POST({ request }) {
  try {
    const { vehicleId } = await request.json();

    let responseData;

    if (vehicleId) {
      const vehicle = get(fleet).find(v => v.id === vehicleId);
      if (!vehicle) return json({ error: 'Vehicle not found' }, { status: 404 });
      requireVehicleAccess(vehicle);
      responseData = vehicle;
    } else {
      responseData = getActiveVehicles();
    }

    return json({
      status: 'OK',
      fleet: responseData
    });
  } catch (err) {
    console.error('Fleet API error:', err);
    return json({ error: 'Internal Server Error' }, { status: 500 });
  }
}