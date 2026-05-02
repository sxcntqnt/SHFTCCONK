// ============================================
// DuckDB WASM Core (Client-side)
// Lean execution engine for browser
// ============================================

import * as duckdb from '@duckdb/duckdb-wasm';

export interface DuckDBWasmConfig {
  dbName: string;        // e.g. 'nairobi.duckdb'
  dbUrl?: string;        // e.g. '/data/nairobi.duckdb'
  useOPFS?: boolean;     // persistence
}

export class DuckDBWasmCore {
  private db: duckdb.AsyncDuckDB | null = null;
  private conn: duckdb.AsyncDuckDBConnection | null = null;
  private ready = false;

  constructor(private config: DuckDBWasmConfig) {}

  // ============================================
  // Boot
  // ============================================
  async init() {
    if (this.ready) return;

    const bundles = duckdb.getJsDelivrBundles();
    const bundle = await duckdb.selectBundle(bundles);

    const worker = new Worker(bundle.mainWorker!, {
      type: 'module',
    });

    this.db = new duckdb.AsyncDuckDB(
      new duckdb.ConsoleLogger(),
      worker
    );

    await this.db.instantiate(
      bundle.mainModule,
      bundle.pthreadWorker
    );

    // ============================================
    // Persistence (OPFS)
    // ============================================
    if (this.config.useOPFS) {
      await this.db.open({
        path: `opfs://${this.config.dbName}`,
      });
    }

    this.conn = await this.db.connect();

    // ============================================
    // Load snapshot (optional)
    // ============================================
    if (this.config.dbUrl) {
      await this.loadSnapshot(this.config.dbUrl);
    }

    this.ready = true;
    console.log('[DuckDB WASM] Ready');
  }

  // ============================================
  // Snapshot Loader
  // ============================================
  private async loadSnapshot(url: string) {
    if (!this.db || !this.conn) return;

    const res = await fetch(url);
    const buffer = new Uint8Array(await res.arrayBuffer());

    await this.db.registerFileBuffer(
      this.config.dbName,
      buffer
    );

    await this.conn.query(`
      ATTACH '${this.config.dbName}' AS db;
      USE db;
    `);

    console.log('[DuckDB WASM] Snapshot loaded');
  }

  // ============================================
  // Query
  // ============================================
  async query<T = any>(
    sql: string,
    params: any[] = []
  ): Promise<T[]> {
    if (!this.conn) {
      throw new Error('[DuckDB WASM] Not initialized');
    }

    const result = await this.conn.query(sql, params);
    return result.toArray() as T[];
  }

  // ============================================
  // Exec (mutations)
  // ============================================
  async exec(sql: string) {
    if (!this.conn) {
      throw new Error('[DuckDB WASM] Not initialized');
    }

    await this.conn.query(sql);
  }

  // ============================================
  // Load Parquet Tile (for SW ingestion)
  // ============================================
  async loadParquet(url: string, table: string) {
    await this.exec(`
      CREATE TABLE IF NOT EXISTS ${table} AS
      SELECT * FROM read_parquet('${url}')
    `);
  }

  // ============================================
  // Health
  // ============================================
  async healthCheck() {
    const start = performance.now();

    try {
      await this.query(`SELECT 1`);
      return {
        healthy: true,
        latency: performance.now() - start,
      };
    } catch {
      return {
        healthy: false,
        latency: performance.now() - start,
      };
    }
  }

  // ============================================
  // Close
  // ============================================
  async close() {
    if (this.conn) await this.conn.close();
    if (this.db) await this.db.terminate();

    this.conn = null;
    this.db = null;
    this.ready = false;

    console.log('[DuckDB WASM] Closed');
  }
}