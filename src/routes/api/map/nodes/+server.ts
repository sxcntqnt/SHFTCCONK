// src/routes/api/map/nodes/+server.ts
import { error } from '@sveltejs/kit';
import { getMapService } from '$lib/map';
import { compressedJsonResponse, parseBounds } from '$lib/map/index.server';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url, request }) => {
  const service = getMapService();
  if (!service) throw error(503, 'Map service unavailable');

  const boundsStr = url.searchParams.get('bounds');
  const types = url.searchParams.get('types')?.split(',') || undefined;
  const minSaturation = url.searchParams.get('minSaturation') 
    ? parseFloat(url.searchParams.get('minSaturation')!) 
    : undefined;

  const forceCompress = url.searchParams.get('compress') !== 'false';

  try {
    const bounds = parseBounds(boundsStr);
    if (!bounds) throw error(400, 'Invalid bounds parameter');

    const nodes = await service.getTrafficNodes(bounds, { 
      nodeTypes: types as any, 
      minSaturation 
    });

    return compressedJsonResponse(
      { data: nodes, count: nodes.length },
      { 
        contentType: 'application/json',
        cacheSeconds: 30,
        compress: forceCompress
      }
    );
  } catch (err: any) {
    console.error('Error fetching nodes:', err);
    throw error(500, err.message || 'Failed to fetch nodes');
  }
};