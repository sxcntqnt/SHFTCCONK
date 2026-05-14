// src/routes/api/map/nodes/[id]/+server.ts
import { json, error } from '@sveltejs/kit';
import { getMapService } from '$lib/map/index.server';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params }) => {
  const service = getMapService();
  if (!service) throw error(503, 'Service unavailable');

  try {
    const node = await service.getNodeById(params.id);
    if (!node) throw error(404, 'Node not found');

    return json(node);
  } catch (err: any) {
    throw error(500, err.message || 'Failed to fetch node');
  }
};