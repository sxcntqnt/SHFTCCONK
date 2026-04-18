// src/routes/api/map/export/geojson/+server.ts
import { error } from '@sveltejs/kit';
import { getMapService } from '$lib/map';
import { parseBounds, compressedJsonResponse } from '$lib/map/utils/compress';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url, request }) => {
  const service = getMapService();
  if (!service) throw error(503, 'Service unavailable');

  const boundsStr = url.searchParams.get('bounds');
  const forceCompress = url.searchParams.get('compress') !== 'false';

  const bounds = parseBounds(boundsStr) || {
    northEast: { lat: -1.15, lng: 36.95 },
    southWest: { lat: -1.45, lng: 36.65 }
  };

  try {
    const geojson = await service.exportGeoJSON(bounds);

    return compressedJsonResponse(geojson, {
      contentType: 'application/geo+json',
      cacheSeconds: 60,
      compress: forceCompress
    });
  } catch (err: any) {
    console.error('Error exporting GeoJSON:', err);
    throw error(500, 'Failed to export GeoJSON');
  }
};