// ============================================
// SSE Streamer Service - Real-time Map Data Streaming (SvelteKit + DuckDB)
// ============================================
import type {
  StreamEvent,
  StreamEventType,
  VehicleStreamData,
  TrafficStreamData,
  BoundingBox,
} from '../types';

interface SSEClient {
  id: string;
  controller: ReadableStreamDefaultController;
  filters: StreamFilters;
  subscriptions: Set<StreamEventType>;
  connectedAt: Date;
  lastEventAt: Date;
  isAlive: boolean;
}

interface StreamFilters {
  bounds?: BoundingBox;
  vehicleIds?: string[];
  nodeIds?: string[];
  includeHeartbeat: boolean;
  heartbeatInterval: number;
}

// ============================================
// SSE Stream Manager
// ============================================
export class SSEStreamManager {
  private clients: Map<string, SSEClient> = new Map();
  private heartbeatIntervals: Map<string, NodeJS.Timeout> = new Map();
  private readonly maxClients: number;
  private readonly defaultHeartbeatInterval: number;
  private readonly clientTimeout: number;

  constructor(options?: {
    maxClients?: number;
    heartbeatInterval?: number;
    clientTimeout?: number;
  }) {
    this.maxClients = options?.maxClients || 500;
    this.defaultHeartbeatInterval = options?.heartbeatInterval || 25000;
    this.clientTimeout = options?.clientTimeout || 60000;
  }

  // ============================================
  // Client Management
  // ============================================
  registerClient(
    clientId: string,
    controller: ReadableStreamDefaultController,
    filters?: Partial<StreamFilters>
  ): { success: boolean; error?: string } {
    if (this.clients.size >= this.maxClients) {
      return {
        success: false,
        error: `Maximum clients (${this.maxClients}) reached.`,
      };
    }

    // Remove existing client with same ID
    if (this.clients.has(clientId)) {
      this.removeClient(clientId);
    }

    const client: SSEClient = {
      id: clientId,
      controller,
      filters: {
        includeHeartbeat: filters?.includeHeartbeat ?? true,
        heartbeatInterval: filters?.heartbeatInterval || this.defaultHeartbeatInterval,
        bounds: filters?.bounds,
        vehicleIds: filters?.vehicleIds,
        nodeIds: filters?.nodeIds,
      },
      subscriptions: new Set(['vehicle_update', 'traffic_update']),
      connectedAt: new Date(),
      lastEventAt: new Date(),
      isAlive: true,
    };

    this.clients.set(clientId, client);

    // Start heartbeat
    this.startHeartbeat(clientId);

    // Send connection confirmation
    this.sendToClient(clientId, {
      type: 'connected',
      timestamp: new Date().toISOString(),
      data: {
        clientId,
        subscribedEvents: Array.from(client.subscriptions),
        filters: client.filters,
      },
    });

    console.log(`[SSE] Client connected: ${clientId} (Total: ${this.clients.size})`);
    return { success: true };
  }

  removeClient(clientId: string): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    // Clear heartbeat
    const heartbeat = this.heartbeatIntervals.get(clientId);
    if (heartbeat) {
      clearInterval(heartbeat);
      this.heartbeatIntervals.delete(clientId);
    }

    // Close controller
    try {
      client.controller.close();
    } catch {}

    this.clients.delete(clientId);
    console.log(`[SSE] Client disconnected: ${clientId} (Total: ${this.clients.size})`);
  }

  getClientCount(): number {
    return this.clients.size;
  }

  getClientIds(): string[] {
    return Array.from(this.clients.keys());
  }

  // ============================================
  // Broadcasting
  // ============================================
  broadcastVehicles(data: VehicleStreamData): number {
    const event: StreamEvent<VehicleStreamData> = {
      type: 'vehicle_update',
      timestamp: new Date().toISOString(),
      data,
    };
    return this.broadcast(event);
  }

  broadcastTraffic(data: TrafficStreamData): number {
    const event: StreamEvent<TrafficStreamData> = {
      type: 'traffic_update',
      timestamp: new Date().toISOString(),
      data,
    };
    return this.broadcast(event);
  }

  private broadcast<T>(event: StreamEvent<T>): number {
    let sent = 0;

    for (const [clientId, client] of this.clients) {
      if (!client.isAlive) continue;
      if (!client.subscriptions.has(event.type)) continue;

      // Filter by bounds if present
      if (client.filters.bounds && event.type === 'vehicle_update') {
        const vehicleData = event.data as VehicleStreamData;
        const shouldSend = vehicleData.vehicles.some((v) =>
          this.isVehicleInBounds(v.currentPosition, client.filters.bounds!)
        );
        if (!shouldSend) continue;
      }

      this.sendToClient(clientId, event);
      sent++;
    }

    return sent;
  }

  private sendToClient<T>(clientId: string, event: StreamEvent<T>): void {
    const client = this.clients.get(clientId);
    if (!client || !client.isAlive) return;

    try {
      const data = `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`;
      client.controller.enqueue(data);
      client.lastEventAt = new Date();
    } catch (err) {
      console.error(`[SSE] Failed to send to client ${clientId}:`, err);
      client.isAlive = false;
      this.removeClient(clientId);
    }
  }

  private isVehicleInBounds(position: { lat: number; lng: number }, bounds: BoundingBox): boolean {
    return (
      position.lat >= bounds.southWest.lat &&
      position.lat <= bounds.northEast.lat &&
      position.lng >= bounds.southWest.lng &&
      position.lng <= bounds.northEast.lng
    );
  }

  // ============================================
  // Heartbeat
  // ============================================
  private startHeartbeat(clientId: string): void {
    const interval = setInterval(() => {
      const client = this.clients.get(clientId);
      if (!client || !client.isAlive) {
        clearInterval(interval);
        return;
      }

      if (client.filters.includeHeartbeat) {
        try {
          const heartbeat = {
            type: 'heartbeat',
            timestamp: new Date().toISOString(),
            data: { ping: 'keep-alive' },
          };
          client.controller.enqueue(`event: heartbeat\ndata: ${JSON.stringify(heartbeat)}\n\n`);
        } catch {
          client.isAlive = false;
          this.removeClient(clientId);
        }
      }
    }, this.defaultHeartbeatInterval);

    this.heartbeatIntervals.set(clientId, interval);
  }

  // ============================================
  // Shutdown
  // ============================================
  async shutdown(): Promise<void> {
    console.log('[SSE] Shutting down stream manager...');

    for (const interval of this.heartbeatIntervals.values()) {
      clearInterval(interval);
    }

    const clientIds = Array.from(this.clients.keys());
    for (const clientId of clientIds) {
      this.removeClient(clientId);
    }

    this.clients.clear();
    this.heartbeatIntervals.clear();

    console.log('[SSE] Stream manager shutdown complete');
  }
}

// ============================================
// Singleton
// ============================================
export const sseStreamManager = new SSEStreamManager({
  maxClients: 500,
  heartbeatInterval: 25000,
  clientTimeout: 60000,
});