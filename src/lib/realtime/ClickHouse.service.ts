// ============================================
// ClickHouse Client – Enterprise Production Service
// State‑machine‑driven lifecycle, single‑flight reconnect,
// safe streaming, injection‑hardened identifiers,
// concurrency‑safe design.
// ============================================

import clickhousePkg from '@clickhouse/client';

const { createClient } = clickhousePkg;

import type {
  ClickHouseClient,
  ClickHouseSettings,
  QueryParams,
} from '@clickhouse/client';

import { Readable } from 'stream';
import { env } from './clientenv';

// ============================================
// Configuration
// ============================================

export interface ClickHouseConfig {
  host: string;
  port?: number;
  username?: string;
  password?: string;
  database?: string;
  protocol?: 'http' | 'https';
  maxOpenConnections?: number;
  connectionTimeout?: number;
  requestTimeout?: number;
  queryTimeout?: number;
  compression?: boolean;
  retryAttempts?: number;
  retryDelay?: number;
}

export interface QueryOptions {
  format?: string;
  clickhouseSettings?: Partial<ClickHouseSettings>;
  abortSignal?: AbortSignal;
  timeout?: number;
}

const defaultConfig: ClickHouseConfig = {
  host: env.CLICKHOUSE_HOST,
  port: env.CLICKHOUSE_PORT,
  username: env.CLICKHOUSE_USER,
  password: env.CLICKHOUSE_PASSWORD,
  database: env.CLICKHOUSE_DATABASE,
  protocol: env.CLICKHOUSE_PROTOCOL,

  maxOpenConnections: env.CLICKHOUSE_POOL_SIZE,
  connectionTimeout: env.CLICKHOUSE_CONNECTION_TIMEOUT,
  requestTimeout: env.CLICKHOUSE_REQUEST_TIMEOUT,
  queryTimeout: env.CLICKHOUSE_QUERY_TIMEOUT,

  compression: env.CLICKHOUSE_COMPRESSION,
  retryAttempts: env.CLICKHOUSE_RETRY_ATTEMPTS,
  retryDelay: env.CLICKHOUSE_RETRY_DELAY,
};

// ============================================
// Query result wrapper
// ============================================

export class ClickHouseResult<T = any> {
  constructor(
    public data: T[],
    public rows: number,
    public statistics: {
      elapsed: number;
      rowsRead: number;
      bytesRead: number;
    },
    public queryId: string,
  ) {}

  toJSON() {
    return {
      data: this.data,
      rows: this.rows,
      statistics: this.statistics,
      queryId: this.queryId,
    };
  }

  first(): T | null {
    return this.data[0] ?? null;
  }

  map<U>(fn: (item: T) => U): U[] {
    return this.data.map(fn);
  }
}

// ============================================
// Connection state machine
// ============================================

enum ConnectionState {
  DISCONNECTED = 'DISCONNECTED',
  CONNECTING = 'CONNECTING',
  CONNECTED = 'CONNECTED',
  RECONNECTING = 'RECONNECTING',
}

/**
 * Deterministic, observable state machine.
 * All waiters are always attached to the *current* connection attempt.
 */
class ConnectionFsm {
  private _state: ConnectionState = ConnectionState.DISCONNECTED;
  private waitPromise: Promise<void> | null = null;
  private resolveWait: (() => void) | null = null;
  private rejectWait: ((err: Error) => void) | null = null;

  get state(): ConnectionState {
    return this._state;
  }

  isConnected(): boolean {
    return this._state === ConnectionState.CONNECTED;
  }

  transition(newState: ConnectionState): void {
    const allowed = this.getAllowedTransitions();
    if (!allowed.includes(newState)) {
      throw new Error(`Invalid state transition from ${this._state} to ${newState}`);
    }
    this._state = newState;

    // If we enter DISCONNECTED, reject any waiting callers
    if (newState === ConnectionState.DISCONNECTED) {
      this.rejectWaiters(new Error('Disconnected'));
    }
  }

  private getAllowedTransitions(): ConnectionState[] {
    switch (this._state) {
      case ConnectionState.DISCONNECTED:
        return [ConnectionState.CONNECTING];
      case ConnectionState.CONNECTING:
        return [ConnectionState.CONNECTED, ConnectionState.DISCONNECTED];
      case ConnectionState.CONNECTED:
        return [ConnectionState.DISCONNECTED, ConnectionState.RECONNECTING];
      case ConnectionState.RECONNECTING:
        return [ConnectionState.CONNECTING, ConnectionState.DISCONNECTED];
      default:
        return [];
    }
  }

  /**
   * Returns a promise that resolves when CONNECTED, rejects on DISCONNECTED.
   * Always tied to the most recent transition into CONNECTING.
   */
  waitForConnection(timeoutMs: number): Promise<void> {
    if (this._state === ConnectionState.CONNECTED) return Promise.resolve();

    if (!this.waitPromise) {
      this.waitPromise = new Promise<void>((resolve, reject) => {
        this.resolveWait = resolve;
        this.rejectWait = reject;
      });
    }

    const timeout = new Promise<void>((_, reject) =>
      setTimeout(
        () => reject(new Error('Timed out waiting for ClickHouse connection')),
        timeoutMs,
      ),
    );

    return Promise.race([this.waitPromise, timeout]);
  }

  /**
   * Called when entering CONNECTED. Resolves all waiters.
   */
  notifyConnected(): void {
    this.resolveWait?.();
    this.waitPromise = null;
    this.resolveWait = null;
    this.rejectWait = null;
  }

  /**
   * Called when entering CONNECTING. Discard old waiters and prepare a new promise.
   */
  notifyConnecting(): void {
    this.rejectWaiters(new Error('New connection attempt started'));
    this.waitPromise = null;
    this.resolveWait = null;
    this.rejectWait = null;
  }

  private rejectWaiters(err: Error): void {
    this.rejectWait?.(err);
    this.waitPromise = null;
    this.resolveWait = null;
    this.rejectWait = null;
  }
}

// ============================================
// Main ClickHouse service
// ============================================

export class ClickHouseService {
  private client: ClickHouseClient | null = null;
  private config: ClickHouseConfig;
  private fsm = new ConnectionFsm();
  private reconnectPromise: Promise<void> | null = null; // single-flight reconnect

  private metrics = {
    queriesExecuted: 0,
    totalQueries: 0,
    failedQueries: 0,
    totalQueryTime: 0,
    lastQueryTime: null as Date | null,
  };

  constructor(config: Partial<ClickHouseConfig> = {}) {
    this.config = { ...defaultConfig, ...config };
  }

  // ============================================
  // Public lifecycle
  // ============================================

  async connect(): Promise<void> {
    if (this.fsm.isConnected()) return;

    this.fsm.transition(ConnectionState.CONNECTING);
    this.fsm.notifyConnecting();

    console.log(
      '[ClickHouse] Connecting...',
      `${this.config.protocol}://${this.config.host}:${this.config.port}`,
    );

    this.client = createClient({
      url: `${this.config.protocol}://${this.config.host}:${this.config.port}`,
      username: this.config.username,
      password: this.config.password,
      database: this.config.database,
      application: 'map_service',
      compression: {
        response: this.config.compression,
        request: this.config.compression,
      },
      clickhouse_settings: {
        max_execution_time: 60,
        max_memory_usage: 10000000000,
        allow_experimental_object_type: 1,
      },
      request_timeout: this.config.requestTimeout,
      connections: {
        max_open: this.config.maxOpenConnections,
      },
    });

    try {
      const alive = await this.ping();
      if (!alive) throw new Error('Ping failed');

      this.fsm.transition(ConnectionState.CONNECTED);
      this.fsm.notifyConnected();
      console.log('[ClickHouse] Connected successfully');
    } catch (err) {
      this.client = null;
      this.fsm.transition(ConnectionState.DISCONNECTED);
      throw err;
    }
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      try {
        await this.client.close();
      } catch (err) {
        console.error('[ClickHouse] Disconnect error:', err);
      } finally {
        this.client = null;
      }
    }
    // FSM will automatically reject any waiters
    this.fsm.transition(ConnectionState.DISCONNECTED);
  }

  /**
   * Wait until the service is ready (CONNECTED) up to timeoutMs.
   * Automatically used by execute / insert / streamQuery.
   */
  async waitUntilReady(timeoutMs = 10000): Promise<void> {
    if (this.fsm.isConnected()) return;
    await this.fsm.waitForConnection(timeoutMs);
  }

  // ============================================
  // Single‑flight reconnect
  // ============================================

  private async reconnect(): Promise<void> {
    if (this.reconnectPromise) {
      return this.reconnectPromise;
    }

    this.fsm.transition(ConnectionState.RECONNECTING);
    this.reconnectPromise = (async () => {
      let backoff = 2000;
      while (true) {
        try {
          await this.connect(); // transitions CONNECTING → CONNECTED
          console.log('[ClickHouse] Reconnected');
          return;
        } catch (err) {
          console.warn('[ClickHouse] Reconnect attempt failed, retrying...');
          const jitter = Math.random() * 500;
          await new Promise((r) => setTimeout(r, backoff + jitter));
          backoff = Math.min(backoff * 2, 30000);
        }
      }
    })();

    try {
      await this.reconnectPromise;
    } finally {
      this.reconnectPromise = null;
    }
  }

  // ============================================
  // Query execution
  // ============================================

  async execute<T = any>(
    query: string,
    params?: Record<string, any>,
    options?: QueryOptions,
  ): Promise<ClickHouseResult<T>> {
    await this.waitUntilReady();

    const client = this.client!; // safe – guarded by FSM
    const start = Date.now();
    const queryId = this.generateQueryId();
    const timeoutMs = options?.timeout ?? this.config.queryTimeout ?? 5000;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    if (options?.abortSignal) {
      options.abortSignal.addEventListener('abort', () => controller.abort(), { once: true });
    }

    try {
      const rs = await client.query({
        query,
        ...(params ? { query_params: params } : {}),
        format: options?.format || 'JSONEachRow',
        clickhouse_settings: {
          query_id: queryId,
          ...options?.clickhouseSettings,
        },
        abort_signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const data = await this.withTimeout(rs.json<T>(), timeoutMs);
      const stats = await rs.statistics;

      const elapsed = Date.now() - start;
      this.updateMetrics(true, elapsed);

      return new ClickHouseResult(
        data,
        data.length,
        {
          elapsed,
          rowsRead: stats?.rows_read || 0,
          bytesRead: stats?.bytes_read || 0,
        },
        queryId,
      );
    } catch (error) {
      clearTimeout(timeoutId);
      this.updateMetrics(false, Date.now() - start);

      if (this.shouldReconnect(error)) {
        this.reconnect().catch(() => {});
      }

      throw error;
    }
  }

  async query<T = any>(
    query: string,
    params?: Record<string, any>,
    options?: QueryOptions,
  ): Promise<T[]> {
    return (await this.execute<T>(query, params, options)).data;
  }

  async queryOne<T = any>(
    query: string,
    params?: Record<string, any>,
    options?: QueryOptions,
  ): Promise<T | null> {
    return (await this.execute<T>(query, params, options)).first();
  }

  // ============================================
  // Safe insert (retried)
  // ============================================

  async insert(
    table: string,
    data: Record<string, any> | Record<string, any>[],
    options?: { format?: string },
  ): Promise<void> {
    const rows = Array.isArray(data) ? data : [data];
    if (rows.length === 0) return;

    await this.waitUntilReady();

    await this.withRetry(
      async () => {
        await this.client!.insert({
          table,
          values: rows,
          format: options?.format || 'JSONEachRow',
        });
      },
      2,
    );
  }

  async batchInsert(
    table: string,
    data: Record<string, any>[],
    batchSize = 1000,
  ): Promise<{ inserted: number; failed: number }> {
    let inserted = 0;
    let failed = 0;
    for (let i = 0; i < data.length; i += batchSize) {
      const batch = data.slice(i, i + batchSize);
      try {
        await this.insert(table, batch);
        inserted += batch.length;
      } catch (error) {
        console.error(`Batch insert failed for rows ${i}–${i + batch.length}:`, error);
        failed += batch.length;
      }
    }
    return { inserted, failed };
  }

  // ============================================
  // True streaming
  // ============================================

  async *streamQuery<T = any>(
    query: string,
    params?: Record<string, any>,
    options?: QueryOptions,
  ): AsyncGenerator<T[], void, undefined> {
    await this.waitUntilReady();

    const client = this.client!;
    const timeoutMs = options?.timeout ?? this.config.queryTimeout ?? 30000;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    if (options?.abortSignal) {
      options.abortSignal.addEventListener('abort', () => controller.abort(), { once: true });
    }

    try {
      const rs = await client.query({
        query,
        ...(params ? { query_params: params } : {}),
        format: options?.format || 'JSONEachRow',
        clickhouse_settings: {
          ...options?.clickhouseSettings,
        },
        abort_signal: controller.signal,
      });
      clearTimeout(timeoutId);

      const rawStream = rs.stream();
      const rowIterator = normalizeStream(rawStream);
      const CHUNK_SIZE = 1000;
      let buffer: T[] = [];
      for await (const row of rowIterator) {
        if (!row || typeof row !== 'object') continue;
        buffer.push(row as T);
        if (buffer.length >= CHUNK_SIZE) {
          yield buffer;
          buffer = [];
        }
      }
      if (buffer.length) yield buffer;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  // ============================================
  // Schema management (validated identifiers)
  // ============================================

  async tableExists(tableName: string): Promise<boolean> {
    const result = await this.execute(
      `SELECT 1 FROM system.tables WHERE database = {database: String} AND name = {table: String}`,
      { database: this.config.database, table: tableName },
    );
    return result.rows > 0;
  }

  async getTableSchema(tableName: string): Promise<any[]> {
    const result = await this.execute(
      `SELECT name, type, default_type, default_expression, comment
       FROM system.columns
       WHERE database = {database: String} AND table = {table: String}
       ORDER BY position`,
      { database: this.config.database, table: tableName },
    );
    return result.data;
  }

  async getTableCount(tableName: string): Promise<number> {
    this.validateIdentifier(tableName);
    const safe = `\`${tableName}\``;
    const row = await this.queryOne<{ count: number }>(
      `SELECT COUNT(*) as count FROM ${safe}`,
    );
    return row?.count ?? 0;
  }

  async createDatabaseIfNotExists(databaseName: string): Promise<void> {
    this.validateIdentifier(databaseName);
    await this.execute(`CREATE DATABASE IF NOT EXISTS \`${databaseName}\``);
  }

  async optimizeTable(tableName: string): Promise<void> {
    this.validateIdentifier(tableName);
    await this.execute(`OPTIMIZE TABLE \`${tableName}\` FINAL`);
  }

  async getTablePartitions(tableName: string): Promise<any[]> {
    const result = await this.execute(
      `SELECT partition, name, rows, bytes_on_disk, modification_time
       FROM system.parts
       WHERE database = {database: String} AND table = {table: String} AND active = 1
       ORDER BY partition`,
      { database: this.config.database, table: tableName },
    );
    return result.data;
  }

  async recreateMaterializedView(viewName: string, createScript: string): Promise<void> {
    this.validateIdentifier(viewName);
    await this.execute(`DROP TABLE IF EXISTS \`${viewName}\``);
    await this.execute(createScript);
  }

  async getMaterializedViewStatus(viewName: string): Promise<any> {
    const result = await this.queryOne(
      `SELECT name, total_rows, total_bytes, modification_time
       FROM system.tables
       WHERE database = {database: String} AND name = {view: String} AND engine = 'MaterializedView'`,
      { database: this.config.database, view: viewName },
    );
    return result ?? { exists: false };
  }

  // ============================================
  // Health & metrics
  // ============================================

  async healthCheck() {
    const start = Date.now();
    const ok = await this.ping();
    return {
      healthy: ok,
      connected: this.fsm.isConnected(),
      activeConnections: this.fsm.isConnected() ? 1 : 0,
      queryLatency: ok ? Date.now() - start : undefined,
    };
  }

  getMetrics() {
    return {
      ...this.metrics,
      averageQueryTime:
        this.metrics.totalQueries > 0
          ? this.metrics.totalQueryTime / this.metrics.totalQueries
          : 0,
      successRate:
        this.metrics.totalQueries > 0
          ? ((this.metrics.totalQueries - this.metrics.failedQueries) /
              this.metrics.totalQueries) *
            100
          : 100,
    };
  }

  // ============================================
  // Private helpers
  // ============================================

  private async ping(): Promise<boolean> {
    if (!this.client) return false;
    try {
      const rs = await this.client.query({
        query: 'SELECT 1',
        format: 'JSONEachRow',
      });
      const data = await rs.json<{ 1: number }>();
      return data.length > 0;
    } catch {
      return false;
    }
  }

  private generateQueryId(): string {
    return `q_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
  }

  private validateIdentifier(name: string): void {
    if (!/^[a-zA-Z0-9_]+$/.test(name)) {
      throw new Error(`Invalid ClickHouse identifier: "${name}"`);
    }
  }

  private shouldReconnect(error: any): boolean {
    if (error?.code) {
      return ['ECONNREFUSED', 'ECONNRESET', 'ETIMEDOUT'].includes(error.code);
    }
    const msg = error?.message?.toLowerCase() || '';
    const triggers = [
      'connection refused',
      'connection timeout',
      'socket hang up',
    ];
    return triggers.some((t) => msg.includes(t));
  }

  private updateMetrics(success: boolean, queryTime: number): void {
    this.metrics.totalQueries++;
    this.metrics.totalQueryTime += queryTime;
    this.metrics.lastQueryTime = new Date();
    if (success) {
      this.metrics.queriesExecuted++;
    } else {
      this.metrics.failedQueries++;
    }
  }

  private withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error(`Timed out after ${ms}ms`)), ms),
      ),
    ]);
  }

  private async withRetry<T>(fn: () => Promise<T>, retries: number): Promise<T> {
    let lastError: Error | undefined;
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;
        if (attempt < retries) {
          const jitter = Math.random() * 200;
          await new Promise((r) =>
            setTimeout(r, 500 * Math.pow(2, attempt) + jitter),
          );
        }
      }
    }
    throw lastError;
  }
}

// ============================================
// Stream normalisation – safe for Node & Web streams
// ============================================

function normalizeStream(stream: any): AsyncIterable<any> {
  // Web ReadableStream
  if (stream && typeof stream.getReader === 'function') {
    const reader = stream.getReader();
    return {
      [Symbol.asyncIterator]() {
        return {
          async next() {
            const { done, value } = await reader.read();
            if (done) return { done: true, value: undefined };
            return { done: false, value };
          },
          async return() {
            reader.releaseLock();
            return { done: true, value: undefined };
          },
        };
      },
    };
  }

  // Node.js Readable
  if (stream instanceof Readable) {
    return {
      async *[Symbol.asyncIterator]() {
        for await (const chunk of stream) {
          yield chunk;
        }
      },
    };
  }

  throw new Error('Unsupported stream type from ClickHouse client');
}

// ============================================
// Singleton lifecycle (exponential backoff + jitter)
// ============================================

let clickhouseInstance: ClickHouseService | null = null;

export function getClickHouseInstance(
  config?: Partial<ClickHouseConfig>,
): ClickHouseService {
  if (!clickhouseInstance) {
    clickhouseInstance = new ClickHouseService(config);
  }
  return clickhouseInstance;
}

export async function destroyClickHouseInstance(): Promise<void> {
  if (clickhouseInstance) {
    await clickhouseInstance.disconnect();
    clickhouseInstance = null;
  }
}

export function initClickHouse(config?: Partial<ClickHouseConfig>): void {
  const instance = getClickHouseInstance(config);
  (async () => {
    let delay = 2000;
    while (true) {
      try {
        await instance.connect();
        console.log('[ClickHouse] Initialisation successful');
        break;
      } catch (err) {
        console.error('[ClickHouse] Init failed, retrying...', err);
        const jitter = Math.random() * 500;
        await new Promise((r) => setTimeout(r, delay + jitter));
        delay = Math.min(delay * 2, 30000);
      }
    }
  })();
}

// Default export (lazy singleton)
const clickhouse = getClickHouseInstance();
export default clickhouse;

// ============================================
// Table creation scripts (complete SQL)
// ============================================

export const createTablesScripts = {
  vehicles: `
    CREATE TABLE IF NOT EXISTS vehicles (
      id String,
      lat Float64,
      lng Float64,
      heading UInt16,
      speed Float32,
      route_id String,
      updated_at DateTime,
      updated_date Date DEFAULT toDate(updated_at)
    ) ENGINE = MergeTree()
    PARTITION BY updated_date
    ORDER BY (updated_at, route_id)
    SETTINGS index_granularity = 8192
  `,

  traffic_nodes: `
    CREATE TABLE IF NOT EXISTS traffic_nodes (
      id String,
      lat Float64,
      lng Float64,
      type String,
      saturation Float32,
      passenger_throughput UInt32,
      average_dwell_time Float32,
      updated_at DateTime,
      updated_date Date DEFAULT toDate(updated_at)
    ) ENGINE = MergeTree()
    PARTITION BY updated_date
    ORDER BY (updated_at, id)
  `,

  traffic_edges: `
    CREATE TABLE IF NOT EXISTS traffic_edges (
      corridor_id String,
      lat Float64,
      lng Float64,
      speed Float32,
      congestion Float32,
      updated_at DateTime,
      updated_date Date DEFAULT toDate(updated_at)
    ) ENGINE = MergeTree()
    PARTITION BY updated_date
    ORDER BY (updated_at, corridor_id)
  `,

  traffic_aggregations_5min: `
    CREATE MATERIALIZED VIEW IF NOT EXISTS traffic_aggregations_5min
    ENGINE = SummingMergeTree()
    PARTITION BY toYYYYMM(interval_start)
    ORDER BY (interval_start, node_id)
    AS SELECT
      toStartOfFiveMinute(updated_at) as interval_start,
      id as node_id,
      avg(saturation) as avg_saturation,
      sum(passenger_throughput) as total_throughput,
      count() as sample_count,
      max(updated_at) as last_update
    FROM traffic_nodes
    GROUP BY interval_start, node_id
  `,
};

export async function initializeClickHouseTables(
  clickhouseService: ClickHouseService,
): Promise<void> {
  console.log('[ClickHouse] Initializing tables and materialized views...');
  for (const [name, script] of Object.entries(createTablesScripts)) {
    try {
      await clickhouseService.execute(script);
      console.log(`[ClickHouse] Table/view '${name}' created/verified`);
    } catch (error) {
      console.error(`[ClickHouse] Failed to create '${name}':`, error);
      throw error;
    }
  }
  console.log('[ClickHouse] Schema initialization complete');
}