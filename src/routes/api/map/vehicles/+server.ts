// src/routes/api/map/vehicles/+server.ts
import { error } from '@sveltejs/kit';
import { getMapService, distanceBetween, formatDistance} from '$lib/map/index.server';
import {compressedJsonResponse, parseBounds } from '$lib/map/index.server';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url, request }) => {
  const service = getMapService();
  if (!service) throw error(503, 'Service unavailable');

  const boundsStr = url.searchParams.get('bounds');
  const lat = url.searchParams.get('lat');
  const lng = url.searchParams.get('lng');
  const limit = parseInt(url.searchParams.get('limit') || '10');
  const maxDistance = parseInt(url.searchParams.get('maxDistance') || '5000');
  const forceCompress = url.searchParams.get('compress') !== 'false';

  try {
    if (lat && lng) {
      const point = { lat: parseFloat(lat), lng: parseFloat(lng) };
      if (isNaN(point.lat) || isNaN(point.lng)) throw error(400, 'Invalid lat/lng');

      const vehicles = await service.getNearestVehicles(point, limit, maxDistance);

      const vehiclesWithDistance = vehicles.map(v => ({
        ...v,
        distanceFromQuery: distanceBetween(v.currentPosition, point),
        distanceFormatted: formatDistance(distanceBetween(v.currentPosition, point))
      }));

      return compressedJsonResponse(
        { data: vehiclesWithDistance, count: vehicles.length },
        { cacheSeconds: 15, compress: forceCompress }
      );
    }

    const bounds = parseBounds(boundsStr) || NAIROBI_BOUNDS; // Use constant if available
    const vehicles = await service.getVehicles(bounds);

    return compressedJsonResponse(
      { data: vehicles, count: vehicles.length },
      { cacheSeconds: 30, compress: forceCompress }
    );
  } catch (err: any) {
    throw error(500, err.message || 'Failed to fetch vehicles');
  }
};