// ============================================
// ClickHouse Client Configuration
// Enterprise-grade ClickHouse connection management
// ============================================

import { createClient, ClickHouseClient, ClickHouseSettings, DataFormat, ResultSet, QueryParams } from '@clickhouse/client';

// ============================================
// Configuration Types
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
  compression?: boolean;
  retryAttempts?: number;
  retryDelay?: number;
}

export interface QueryOptions {
  format?: DataFormat;
  clickhouseSettings?: Partial<ClickHouseSettings>;
  abortSignal?: AbortSignal;
}

export interface ConnectionPoolMetrics {
  activeConnections: number;
  idleConnections: number;
  totalConnections: number;
  queueSize: number;
}

// ============================================
// Default Configuration
// ============================================

const defaultConfig: ClickHouseConfig = {
  host: process.env.CLICKHOUSE_HOST || 'localhost',
  port: parseInt(process.env.CLICKHOUSE_PORT || '8123'),
  username: process.env.CLICKHOUSE_USER || 'default',
  password: process.env.CLICKHOUSE_PASSWORD || '',
  database: process.env.CLICKHOUSE_DATABASE || 'default',
  protocol: (process.env.CLICKHOUSE_PROTOCOL as 'http' | 'https') || 'http',
  maxOpenConnections: parseInt(process.env.CLICKHOUSE_POOL_SIZE || '10'),
  connectionTimeout: parseInt(process.env.CLICKHOUSE_CONNECTION_TIMEOUT || '30000'),
  requestTimeout: parseInt(process.env.CLICKHOUSE_REQUEST_TIMEOUT || '60000'),
  compression: process.env.CLICKHOUSE_COMPRESSION === 'true',
  retryAttempts: parseInt(process.env.CLICKHOUSE_RETRY_ATTEMPTS || '3'),
  retryDelay: parseInt(process.env.CLICKHOUSE_RETRY_DELAY || '1000'),
};

// ============================================
// Query Result Wrapper
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
    public queryId: string
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
    return this.data[0] || null;
  }

  map<U>(fn: (item: T) => U): U[] {
    return this.data.map(fn);
  }
}

// ============================================
// Main ClickHouse Service
// ============================================

export class ClickHouseService {
  private client: ClickHouseClient | null = null;
  private config: ClickHouseConfig;
  private isConnected: boolean = false;
  private connectionMetrics: {
    queriesExecuted: number;
    totalQueries: number;
    failedQueries: number;
    totalQueryTime: number;
    lastQueryTime: Date | null;
  };
  private reconnectTimer: NodeJS.Timeout | null = null;
  private queryQueue: Array<{
    query: string;
    params?: QueryParams;
    resolve: (value: any) => void;
    reject: (reason: any) => void;
  }> = [];

  constructor(config: Partial<ClickHouseConfig> = {}) {
    this.config = { ...defaultConfig, ...config };
    this.connectionMetrics = {
      queriesExecuted: 0,
      totalQueries: 0,
      failedQueries: 0,
      totalQueryTime: 0,
      lastQueryTime: null,
    };
  }

  // ============================================
  // Connection Management
  // ============================================

  async connect(): Promise<void> {
    if (this.isConnected && this.client) {
      console.log('[ClickHouse] Already connected');
      return;
    }

    try {
      console.log('[ClickHouse] Connecting to:', `${this.config.protocol}://${this.config.host}:${this.config.port}`);
      
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
          max_memory_usage: 10000000000, // 10GB
          allow_experimental_object_type: 1,
        },
        request_timeout: this.config.requestTimeout,
        connections: {
          max_open: this.config.maxOpenConnections,
        },
      });

      // Test connection with a simple query
      await this.ping();
      
      this.isConnected = true;
      console.log('[ClickHouse] Connected successfully');
      
      // Process queued queries
      await this.processQueryQueue();
      
    } catch (error) {
      console.error('[ClickHouse] Connection failed:', error);
      throw new Error(`ClickHouse connection failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async disconnect(): Promise<void> {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.client) {
      try {
        await this.client.close();
        console.log('[ClickHouse] Disconnected');
      } catch (error) {
        console.error('[ClickHouse] Error during disconnect:', error);
      } finally {
        this.client = null;
        this.isConnected = false;
      }
    }
  }

  async reconnect(): Promise<void> {
    console.log('[ClickHouse] Attempting reconnect...');
    await this.disconnect();
    await this.connect();
  }

  async ping(): Promise<boolean> {
    try {
      const result = await this.execute('SELECT 1 as ping');
      return result.data.length > 0 && result.data[0].ping === 1;
    } catch (error) {
      console.error('[ClickHouse] Ping failed:', error);
      return false;
    }
  }

  async healthCheck(): Promise<{
    healthy: boolean;
    connected: boolean;
    activeConnections: number;
    queryLatency?: number;
  }> {
    const startTime = Date.now();
    
    try {
      const pingResult = await this.ping();
      const latency = Date.now() - startTime;
      
      return {
        healthy: pingResult,
        connected: this.isConnected,
        activeConnections: this.getConnectionPoolSize(),
        queryLatency: latency,
      };
    } catch (error) {
      return {
        healthy: false,
        connected: this.isConnected,
        activeConnections: 0,
      };
    }
  }

  private getConnectionPoolSize(): number {
    // This is a simplified metric - actual pool metrics depend on the client
    return this.isConnected ? 1 : 0;
  }

  getConnectionMetrics() {
    return {
      ...this.connectionMetrics,
      averageQueryTime: this.connectionMetrics.totalQueries > 0
        ? this.connectionMetrics.totalQueryTime / this.connectionMetrics.totalQueries
        : 0,
      successRate: this.connectionMetrics.totalQueries > 0
        ? ((this.connectionMetrics.totalQueries - this.connectionMetrics.failedQueries) / this.connectionMetrics.totalQueries) * 100
        : 100,
    };
  }

  // ============================================
  // Query Execution
  // ============================================

  async execute<T = any>(
    query: string,
    params?: Record<string, any>,
    options?: QueryOptions
  ): Promise<ClickHouseResult<T>> {
    if (!this.isConnected || !this.client) {
      return this.queueQuery<T>(query, params, options);
    }

    const startTime = Date.now();
    const queryId = this.generateQueryId();
    
    try {
      console.log(`[ClickHouse] Executing query ${queryId}:`, query.substring(0, 200));
      
      // Build query parameters
      let finalQuery = query;
      if (params) {
        finalQuery = this.interpolateParams(query, params);
      }

      const resultSet = await this.client.query({
        query: finalQuery,
        format: options?.format || DataFormat.JSONEachRow,
        clickhouse_settings: {
          query_id: queryId,
          ...options?.clickhouseSettings,
        },
        abort_signal: options?.abortSignal,
      });

      const data = await resultSet.json<T>();
      const statistics = await resultSet.statistics;
      
      const elapsed = Date.now() - startTime;
      
      this.updateMetrics(true, elapsed);
      
      console.log(`[ClickHouse] Query ${queryId} completed in ${elapsed}ms, rows: ${data.length}`);
      
      return new ClickHouseResult<T>(
        data,
        data.length,
        {
          elapsed,
          rowsRead: statistics?.rows_read || 0,
          bytesRead: statistics?.bytes_read || 0,
        },
        queryId
      );
      
    } catch (error) {
      const elapsed = Date.now() - startTime;
      this.updateMetrics(false, elapsed);
      
      console.error(`[ClickHouse] Query ${queryId} failed:`, error);
      
      if (this.shouldReconnect(error)) {
        await this.reconnect();
      }
      
      throw new Error(`ClickHouse query failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async query<T = any>(
    query: string,
    params?: Record<string, any>,
    options?: QueryOptions
  ): Promise<T[]> {
    const result = await this.execute<T>(query, params, options);
    return result.data;
  }

  async queryOne<T = any>(
    query: string,
    params?: Record<string, any>,
    options?: QueryOptions
  ): Promise<T | null> {
    const result = await this.execute<T>(query, params, options);
    return result.first();
  }

  async insert(
    table: string,
    data: Record<string, any> | Record<string, any>[],
    options?: { format?: DataFormat }
  ): Promise<void> {
    const rows = Array.isArray(data) ? data : [data];
    
    if (rows.length === 0) {
      return;
    }

    const format = options?.format || DataFormat.JSONEachRow;
    
    await this.execute(
      `INSERT INTO ${table} FORMAT ${format}`,
      undefined,
      { format }
    );
    
    // Note: The actual insertion requires a stream interface
    // For now, we'll use a simpler approach
    for (const row of rows) {
      const columns = Object.keys(row).join(', ');
      const values = Object.values(row).map(v => this.escapeValue(v)).join(', ');
      await this.execute(`INSERT INTO ${table} (${columns}) VALUES (${values})`);
    }
  }

  async batchInsert(
    table: string,
    data: Record<string, any>[],
    batchSize: number = 1000
  ): Promise<{ inserted: number; failed: number }> {
    let inserted = 0;
    let failed = 0;
    
    for (let i = 0; i < data.length; i += batchSize) {
      const batch = data.slice(i, i + batchSize);
      try {
        await this.insert(table, batch);
        inserted += batch.length;
      } catch (error) {
        console.error(`Batch insert failed for rows ${i}-${i + batch.length}:`, error);
        failed += batch.length;
      }
    }
    
    return { inserted, failed };
  }

  // ============================================
  // Schema Management
  // ============================================

  async tableExists(tableName: string): Promise<boolean> {
    const result = await this.execute(`
      SELECT COUNT(*) as count
      FROM system.tables
      WHERE database = '${this.config.database}'
        AND name = '${tableName}'
    `);
    
    return result.first()?.count > 0;
  }

  async getTableSchema(tableName: string): Promise<any[]> {
    const result = await this.execute(`
      SELECT 
        name,
        type,
        default_type,
        default_expression,
        comment
      FROM system.columns
      WHERE database = '${this.config.database}'
        AND table = '${tableName}'
      ORDER BY position
    `);
    
    return result.data;
  }

  async getTableCount(tableName: string): Promise<number> {
    const result = await this.queryOne<{ count: number }>(
      `SELECT COUNT(*) as count FROM ${tableName}`
    );
    return result?.count || 0;
  }

  async createDatabaseIfNotExists(databaseName: string): Promise<void> {
    await this.execute(`CREATE DATABASE IF NOT EXISTS ${databaseName}`);
  }

  // ============================================
  // Performance Optimization
  // ============================================

  async analyzeQuery(query: string): Promise<{
    queryId: string;
    estimatedRows: number;
    estimatedDuration: number;
  }> {
    const result = await this.execute(`EXPLAIN ESTIMATE ${query}`);
    const estimate = result.first();
    
    return {
      queryId: this.generateQueryId(),
      estimatedRows: estimate?.rows || 0,
      estimatedDuration: estimate?.duration || 0,
    };
  }

  async optimizeTable(tableName: string): Promise<void> {
    await this.execute(`OPTIMIZE TABLE ${tableName} FINAL`);
  }

  async getTablePartitions(tableName: string): Promise<any[]> {
    const result = await this.execute(`
      SELECT 
        partition,
        name,
        rows,
        bytes_on_disk,
        modification_time
      FROM system.parts
      WHERE database = '${this.config.database}'
        AND table = '${tableName}'
        AND active = 1
      ORDER BY partition
    `);
    
    return result.data;
  }

  // ============================================
  // Materialized Views
  // ============================================

  async refreshMaterializedView(viewName: string): Promise<void> {
    await this.execute(`ALTER TABLE ${viewName} UPDATE`);
  }

  async getMaterializedViewStatus(viewName: string): Promise<any> {
    const result = await this.queryOne(`
      SELECT 
        name,
        total_rows,
        total_bytes,
        modification_time
      FROM system.tables
      WHERE database = '${this.config.database}'
        AND name = '${viewName}'
        AND engine = 'MaterializedView'
    `);
    
    return result;
  }

  // ============================================
  // Private Helper Methods
  // ============================================

  private generateQueryId(): string {
    return `query_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }

  private interpolateParams(query: string, params: Record<string, any>): string {
    let finalQuery = query;
    for (const [key, value] of Object.entries(params)) {
      const escapedValue = typeof value === 'string' ? `'${value.replace(/'/g, "''")}'` : value;
      finalQuery = finalQuery.replace(new RegExp(`{${key}}`, 'g'), escapedValue);
      finalQuery = finalQuery.replace(new RegExp(`:${key}`, 'g'), escapedValue);
    }
    return finalQuery;
  }

  private escapeValue(value: any): string {
    if (value === null || value === undefined) {
      return 'NULL';
    }
    if (typeof value === 'string') {
      return `'${value.replace(/'/g, "''")}'`;
    }
    if (typeof value === 'boolean') {
      return value ? '1' : '0';
    }
    if (value instanceof Date) {
      return `'${value.toISOString().slice(0, 19).replace('T', ' ')}'`;
    }
    if (typeof value === 'object') {
      return `'${JSON.stringify(value)}'`;
    }
    return String(value);
  }

  private shouldReconnect(error: any): boolean {
    // Check if error is connection-related
    const errorMessage = error?.message?.toLowerCase() || '';
    const reconnectTriggers = [
      'connection refused',
      'connection timeout',
      'socket hang up',
      'econnrefused',
      'econnreset',
      'etimedout',
    ];
    
    return reconnectTriggers.some(trigger => errorMessage.includes(trigger));
  }

  private updateMetrics(success: boolean, queryTime: number): void {
    this.connectionMetrics.totalQueries++;
    this.connectionMetrics.totalQueryTime += queryTime;
    this.connectionMetrics.lastQueryTime = new Date();
    
    if (success) {
      this.connectionMetrics.queriesExecuted++;
    } else {
      this.connectionMetrics.failedQueries++;
    }
  }

  private queueQuery<T>(
    query: string,
    params?: Record<string, any>,
    options?: QueryOptions
  ): Promise<ClickHouseResult<T>> {
    return new Promise((resolve, reject) => {
      this.queryQueue.push({
        query,
        params,
        resolve: (result: any) => resolve(result),
        reject,
      });
      
      console.log(`[ClickHouse] Query queued. Queue size: ${this.queryQueue.length}`);
    });
  }

  private async processQueryQueue(): Promise<void> {
    while (this.queryQueue.length > 0 && this.isConnected) {
      const queuedQuery = this.queryQueue.shift();
      if (queuedQuery) {
        try {
          const result = await this.execute(queuedQuery.query, queuedQuery.params);
          queuedQuery.resolve(result);
        } catch (error) {
          queuedQuery.reject(error);
        }
      }
    }
  }

  // ============================================
  // Streaming Support
  // ============================================

  async createStream<T = any>(
    query: string,
    chunkSize: number = 1000,
    onChunk?: (chunk: T[]) => void
  ): Promise<void> {
    const result = await this.execute<T>(query);
    
    for (let i = 0; i < result.data.length; i += chunkSize) {
      const chunk = result.data.slice(i, i + chunkSize);
      if (onChunk) {
        onChunk(chunk);
      }
    }
  }

  // ============================================
  // Transactions (ClickHouse doesn't support traditional transactions)
  // But we can simulate with idempotent operations
  // ============================================

  async withIdempotent<T>(
    operation: () => Promise<T>,
    operationId: string,
    maxRetries: number = 3
  ): Promise<T> {
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        console.warn(`Operation ${operationId} failed (attempt ${attempt + 1}/${maxRetries}):`, error);
        
        if (attempt < maxRetries - 1) {
          await this.delay(this.config.retryDelay! * Math.pow(2, attempt));
        }
      }
    }
    
    throw new Error(`Operation ${operationId} failed after ${maxRetries} attempts: ${lastError?.message}`);
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// ============================================
// Singleton Instance
// ============================================

let clickhouseInstance: ClickHouseService | null = null;

export function getClickHouseInstance(config?: Partial<ClickHouseConfig>): ClickHouseService {
  if (!clickhouseInstance) {
    clickhouseInstance = new ClickHouseService(config);
  }
  return clickhouseInstance;
}

export async function initClickHouse(config?: Partial<ClickHouseConfig>): Promise<ClickHouseService> {
  const instance = getClickHouseInstance(config);
  await instance.connect();
  return instance;
}

// ============================================
// Default Export
// ============================================

const clickhouse = getClickHouseInstance();
export default clickhouse;

// ============================================
// Table Creation Scripts
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

  // Materialized view for real-time aggregations
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

export async function initializeClickHouseTables(clickhouseService: ClickHouseService): Promise<void> {
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