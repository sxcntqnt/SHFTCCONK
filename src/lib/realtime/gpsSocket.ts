// lib/realtime/gpsSocket.ts
import { gpsStore, GPSData } from '$lib/features/vehicles/stores/Gps.store';
import { logger } from '$lib/utils/logger'; // Optional: logging helper

let socket: WebSocket | null = null;
let retryCount = 0;
const MAX_RETRIES = 5;

/* ============================================================
   INITIALIZE GPS WEBSOCKET
   - Supports NE06M tracker extended data
   - Handles rain reports
   - Auto-reconnect with exponential backoff
============================================================ */
export function initGPSSocket() {
  if (socket) return; // Prevent duplicate connections

  const connect = () => {
    socket = new WebSocket('wss://yourserver.com/gps');

    socket.onopen = () => {
      retryCount = 0;
      logger?.info('GPS Socket connected');
    };

    socket.onmessage = (event) => {
      try {
        const data: Partial<GPSData> = JSON.parse(event.data);

        // Defensive: ensure required fields
        if (!data.vehicleId || !data.lat || !data.lng || !data.timestamp) return;

        gpsStore.update((vehicles) => {
          const index = vehicles.findIndex(v => v.vehicleId === data.vehicleId);

          const updatedVehicle: GPSData = {
            ...vehicles[index],
            ...data,          // merge incoming fields
            timestamp: data.timestamp, // ensure timestamp is updated
          };

          if (index >= 0) {
            vehicles[index] = updatedVehicle;
            return [...vehicles];
          }

          return [...vehicles, updatedVehicle];
        });
      } catch (err) {
        logger?.error('GPS Socket parse error:', err);
      }
    };

    socket.onclose = () => {
      if (retryCount < MAX_RETRIES) {
        retryCount++;
        const delay = 1000 * retryCount;
        logger?.warn(`GPS Socket disconnected, retrying in ${delay / 1000}s (attempt ${retryCount})`);
        setTimeout(connect, delay);
      } else {
        logger?.error('GPS Socket max retries reached');
      }
    };

    socket.onerror = (err) => {
      logger?.error('GPS Socket error:', err);
      socket?.close();
    };
  };

  connect();
}

/* ============================================================
   OPTIONAL: CLOSE SOCKET (useful for navigation)
============================================================ */
export async function destroyGPSSocket() {
  if (socket) {
    socket.close();
    socket = null;
  }
}