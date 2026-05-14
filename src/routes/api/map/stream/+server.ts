// src/routes/api/map/stream/+server.ts
import { error } from '@sveltejs/kit';
import { getMapService } from '$lib/map/index.server';
import {parseBounds} from '$lib/map/index.server';

import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url, request }) => {
  const clientId =
    url.searchParams.get('clientId') ||
    `client_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;

  const boundsStr = url.searchParams.get('bounds');
  const includeHeartbeat = url.searchParams.get('heartbeat') !== 'false';

  const bounds = boundsStr ? parseBounds(boundsStr) : undefined;

  // Get the map service (DuckDB)
  const service = getMapService();
  if (!service) {
    throw error(503, 'Map service not available');
  }

  const stream = new ReadableStream({
    async start(controller) {
      try {
        // Register client with SSE manager
        const result = sseStreamManager.registerClient(clientId, controller, {
          bounds,
          includeHeartbeat
        });

        if (!result.success) {
          controller.error(new Error(result.error || 'Failed to register client'));
          return;
        }

        // Send initial connection confirmation
        controller.enqueue(
          `event: connected\ndata: ${JSON.stringify({
            type: 'connected',
            data: { clientId, status: 'ok' }
          })}\n\n`
        );

        // Send initial vehicle data immediately
        try {
          const initialBounds = bounds || {
            northEast: { lat: -1.15, lng: 36.95 },
            southWest: { lat: -1.45, lng: 36.65 }
          };

          const vehicles = await service.getVehicles(initialBounds);

          controller.enqueue(
            `event: vehicle_update\ndata: ${JSON.stringify({
              type: 'vehicle_update',
              data: { vehicles }
            })}\n\n`
          );
        } catch (err) {
          console.warn('Failed to send initial vehicle data:', err);
        }

        // Cleanup on client disconnect
        request.signal.addEventListener('abort', () => {
          sseStreamManager.removeClient(clientId);
          controller.close();
        });
      } catch (err) {
        console.error('SSE stream error:', err);
        controller.error(err);
      }
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'X-Accel-Buffering': 'no'
    }
  });
};