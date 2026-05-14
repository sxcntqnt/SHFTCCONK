// src/routes/api/map/health/+server.ts
import { json, error } from '@sveltejs/kit';
import { getMapService } from '$lib/map/index.server';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
  const service = getMapService();
  if (!service) throw error(503, 'Service unavailable');

  const health = await service.getHealth();
  return json(health);
};