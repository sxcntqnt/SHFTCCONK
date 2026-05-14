// src/routes/api/map/+server.ts
import { json, error } from '@sveltejs/kit';
import { getMapService } from '$lib/map/index.server';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
  const service = getMapService();
  if (!service) {
    throw error(503, 'Map service not initialized');
  }

  return json({
    status: 'ok',
    backend: 'duckdb',
    message: 'Nairobi Transit Map API (SvelteKit + DuckDB)'
  });
};