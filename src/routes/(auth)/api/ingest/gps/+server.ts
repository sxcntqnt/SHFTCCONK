import { json } from '@sveltejs/kit';
import { gpsStore, GPSData } from '$lib/features/vehicles/stores/gps.store';
import { enforceTenant } from '$lib/stores/user';
import { publishPosition } from '$lib/realtime/publisher';
import { queueGPSForBatchInsert } from '$lib/queues/gpsQueue';
import { get } from 'svelte/store';

export async function POST({ request }) {
  try {
    const payload: GPSData = await request.json();

    // Validate required fields
    if (!payload.vehicleId || !payload.lat || !payload.lng || !payload.timestamp) {
      return json(
        { error: 'vehicleId, lat, lng, and timestamp are required' },
        { status: 400 }
      );
    }

    // Enforce tenant context if provided
    if (payload.organizationId) {
      enforceTenant(payload.organizationId);
    }

    // 1️⃣ Update local reactive store for real-time dashboards
    gpsStore.update(vehicles => {
      const index = vehicles.findIndex(v => v.vehicleId === payload.vehicleId);
      if (index >= 0) {
        vehicles[index] = { ...vehicles[index], ...payload };
        return [...vehicles];
      }
      return [...vehicles, payload];
    });

    // 2️⃣ Publish to real-time channel immediately (HOT PATH)
    if (payload.organizationId) {
      await publishPosition(
        payload.organizationId,
        payload.vehicleId,
        payload.lat,
        payload.lng,
        payload // optional full GPSData payload for rich sensors
      );
    }

    // 3️⃣ Queue for batch insert / cold path
    await queueGPSForBatchInsert(payload);

    return json({ status: 'OK', vehicleId: payload.vehicleId });
  } catch (err) {
    console.error('GPS ingest error:', err);
    return json({ error: 'Internal Server Error' }, { status: 500 });
  }
}