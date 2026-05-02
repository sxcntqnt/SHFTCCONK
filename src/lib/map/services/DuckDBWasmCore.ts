// ============================================
// DuckDB WASM Core (Client-side)
// Lean execution engine for browser
// ============================================
import { browser } from '$app/environment'

import * as duckdb from '@duckdb/duckdb-wasm'
import type { H3Seed, StorageHints } from './bootstrap-manifest.service'

export interface DuckDBWasmConfig {
  dbName: string     // e.g. 'nairobi.duckdb'
  dbUrl?: string     // e.g. '/data/nairobi.duckdb' (optional snapshot)
  useOPFS?: boolean  // persist across sessions via Origin Private File System
}

export class DuckDBWasmCore {
  private db: duckdb.AsyncDuckDB | null = null
  private conn: duckdb.AsyncDuckDBConnection | null = null
  private ready = false

  constructor(private config: DuckDBWasmConfig) {}

  // ============================================
  // Boot
  // ============================================

async init() {
  if (!browser) {
    throw new Error('[DuckDB WASM] Cannot initialize on server')
  }

  if (this.ready) return

  const bundles = duckdb.getJsDelivrBundles()
  const bundle = await duckdb.selectBundle(bundles)

  const worker = new Worker(bundle.mainWorker!, { type: 'module' })

  this.db = new duckdb.AsyncDuckDB(
    new duckdb.ConsoleLogger(),
    worker
  )

  await this.db.instantiate(bundle.mainModule, bundle.pthreadWorker)

  if (this.config.useOPFS) {
    await this.db.open({ path: `opfs://${this.config.dbName}` })
  }

  this.conn = await this.db.connect()

  if (this.config.dbUrl) {
    await this.loadSnapshot(this.config.dbUrl)
  }

  this.ready = true
    console.log('[DuckDB WASM] Ready')
  }

  // ============================================
  // Snapshot Loader
  // ============================================
  private async loadSnapshot(url: string) {
    if (!this.db || !this.conn) return

    const res = await fetch(url)
    const buffer = new Uint8Array(await res.arrayBuffer())

    await this.db.registerFileBuffer(this.config.dbName, buffer)
    await this.conn.query(`
      ATTACH '${this.config.dbName}' AS db;
      USE db;
    `)

    console.log('[DuckDB WASM] Snapshot loaded')
  }

  // ============================================
  // Query
  // ============================================
  async query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    if (!this.conn) throw new Error('[DuckDB WASM] Not initialized')
    // duckdb-wasm doesn't support positional params in the same way as node-duckdb;
    // params are inlined for WASM — caller is responsible for sanitizing values.
    const result = await this.conn.query(sql)
    return result.toArray() as T[]
  }

  // ============================================
  // Exec (mutations / DDL)
  // ============================================
  async exec(sql: string) {
    if (!this.conn) throw new Error('[DuckDB WASM] Not initialized')
    await this.conn.query(sql)
  }

  // ============================================
  // Register Parquet Buffer (from fetch → ArrayBuffer)
  //
  // Called by MapService.hydrateDuckDBFromManifest for each QuadTile.
  // Registers the raw bytes under a virtual filename, then creates
  // a view in tile_cache so MapQueries can SELECT across all shards.
  // ============================================
  async registerParquetBuffer(name: string, buffer: ArrayBuffer) {
    if (!this.db || !this.conn) throw new Error('[DuckDB WASM] Not initialized')

    // Register the raw bytes under a virtual path
    await this.db.registerFileBuffer(name, new Uint8Array(buffer))

    // Ensure the unified tile_cache table exists
    await this.conn.query(`
      CREATE TABLE IF NOT EXISTS tile_cache (
        h3_index     VARCHAR,
        h3_7         VARCHAR,
        h3_8         VARCHAR,
        h3_9         VARCHAR,
        h3_10        VARCHAR,
        wkb_geom     BLOB,
        name         VARCHAR,
        feature_type VARCHAR,
        country_code VARCHAR
      );
    `)

    // Insert the shard data — skip rows with null h3_7 (malformed shards)
    await this.conn.query(`
      INSERT INTO tile_cache
      SELECT * FROM read_parquet('${name}')
      WHERE h3_7 IS NOT NULL;
    `)

    console.log(`[DuckDB WASM] Registered shard: ${name}`)
  }

  // ============================================
  // Warm H3 Index
  //
  // Called after all Parquet shards are loaded.
  // Creates covering indexes on the H3 columns used by tile queries,
  // and pre-materialises the seed cells at the manifest resolution
  // into a small lookup table for sub-millisecond viewport hits.
  // ============================================
  async warmH3Index(seeds: H3Seed) {
    if (!this.conn) throw new Error('[DuckDB WASM] Not initialized')

    // Idempotent index creation
    await this.conn.query(`
      CREATE INDEX IF NOT EXISTS idx_h3_7  ON tile_cache (h3_7);
      CREATE INDEX IF NOT EXISTS idx_h3_8  ON tile_cache (h3_8);
      CREATE INDEX IF NOT EXISTS idx_h3_9  ON tile_cache (h3_9);
      CREATE INDEX IF NOT EXISTS idx_h3_10 ON tile_cache (h3_10);
    `)

    // Materialise seed cells into a warm lookup table
    if (seeds.cells.length > 0) {
      const cellList = seeds.cells.map(c => `'${c}'`).join(', ')
      await this.conn.query(`
        CREATE TABLE IF NOT EXISTS h3_seed_cache AS
        SELECT DISTINCT h3_${seeds.resolution} AS cell_id
        FROM tile_cache
        WHERE h3_${seeds.resolution} IN (${cellList});
      `)
    }

    console.log(`[DuckDB WASM] H3 index warmed (res ${seeds.resolution}, ${seeds.cells.length} seeds)`)
  }

  // ============================================
  // Set Storage Hints
  //
  // Applies z-order and scan-strategy hints from the manifest.
  // DuckDB WASM does not expose full PRAGMA support, so we record
  // the hints in a metadata table that MapQueries can read at query time
  // to decide scan strategy (sequential vs random access).
  // ============================================
  async setStorageHints(hints: StorageHints) {
    if (!this.conn) throw new Error('[DuckDB WASM] Not initialized')

    await this.conn.query(`
      CREATE TABLE IF NOT EXISTS _storage_hints (
        prefer_sequential BOOLEAN,
        zorder_min        BIGINT,
        zorder_max        BIGINT
      );
      DELETE FROM _storage_hints;
      INSERT INTO _storage_hints VALUES (
        ${hints.preferSequentialScan},
        ${hints.zorderRange?.[0] ?? 'NULL'},
        ${hints.zorderRange?.[1] ?? 'NULL'}
      );
    `)

    console.log('[DuckDB WASM] Storage hints applied', hints)
  }

  // ============================================
  // Load Parquet via URL (convenience — used by DuckDBTileProvider)
  // ============================================
  async loadParquet(url: string, table: string) {
    await this.exec(`
      CREATE TABLE IF NOT EXISTS ${table} AS
      SELECT * FROM read_parquet('${url}')
    `)
  }

  // ============================================
  // Health
  // ============================================
  async healthCheck() {
    const start = performance.now()
    try {
      await this.query(`SELECT 1`)
      return { healthy: true, latency: performance.now() - start }
    } catch {
      return { healthy: false, latency: performance.now() - start }
    }
  }

  // ============================================
  // Close
  // ============================================
  async close() {
    if (this.conn) await this.conn.close()
    if (this.db) await this.db.terminate()
    this.conn = null
    this.db = null
    this.ready = false
    console.log('[DuckDB WASM] Closed')
  }
}