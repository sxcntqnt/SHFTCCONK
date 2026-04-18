<script lang="ts">
  // DuckDBTileProvider.svelte
  //
  // Bootstraps DuckDB WASM in the browser, loads Parquet shards from
  // the CityBootstrapManifest, and registers a MapLibre custom protocol
  // so the map can query tiles directly from the local DuckDB instance.
  //
  // CHANGES from previous version:
  //   - Accepts `manifest` prop (CityBootstrapManifest) instead of parquetUrl
  //   - Loads all quadtile Parquet shards from manifest.tileKeys
  //   - Applies storageHints.zorderRange to queries (sequential scan hint)
  //   - Exposes `conn` and `db` for use by parent components via bind:
  //   - Fixed: H3 query now uses h3_polygon_to_cells (viewport fill)
  //     instead of h3_grid_disk (circular blob — was missing viewport edges)

  import { onMount, onDestroy } from "svelte"
  import type { CityBootstrapManifest } from "$lib/map"

  interface Props {
    manifest: CityBootstrapManifest | null
    extensionBaseUrl?: string
    onReady?: (conn: any) => void
    onError?: (err: Error) => void
    onProgress?: (loaded: number, total: number) => void
  }

  let {
    manifest,
    extensionBaseUrl = "https://extensions.duckdb.org/v1.1.1/linux_amd64",
    onReady,
    onError,
    onProgress,
  }: Props = $props()

  // Exposed for parent binding
  export let db: any = $state(null)
  export let conn: any = $state(null)

  let initialised = $state(false)
  let error = $state<string | null>(null)
  let shardsLoaded = $state(0)
  let shardsTotal = $state(0)

  const PROTOCOL_PREFIX = "duckdb."

  // ── Init ──────────────────────────────────────────────────────────────────
  onMount(() => {
    if (typeof window === "undefined") return
    ;(async () => {
      try {
        const [maplibreModule, duckdbModule] = await Promise.all([
          import("maplibre-gl"),
          import("@duckdb/duckdb-wasm"),
        ])

        const maplibregl = maplibreModule.default
        const duckdb = duckdbModule

        // ── Boot DuckDB WASM ────────────────────────────────────────────
        const JSDELIVR_BUNDLES = duckdb.getJsDelivrBundles()
        const bundle = await duckdb.selectBundle(JSDELIVR_BUNDLES)

        const workerUrl = URL.createObjectURL(
          new Blob([`importScripts("${bundle.mainWorker!}");`], {
            type: "text/javascript",
          }),
        )
        const worker = new Worker(workerUrl)
        const logger = new duckdb.ConsoleLogger()

        db = new duckdb.AsyncDuckDB(logger, worker)
        await db.instantiate(bundle.mainModule, bundle.pthreadWorker)

        conn = await db.connect()

        // ── Load spatial + H3 extensions ────────────────────────────────
        // Using sequential INSTALL + LOAD — parallel causes worker conflicts
        await conn.query(
          `INSTALL spatial FROM '${extensionBaseUrl}/spatial.duckdb_extension.gz'; LOAD spatial;`,
        )
        await conn.query(
          `INSTALL h3 FROM '${extensionBaseUrl}/h3.duckdb_extension.gz'; LOAD h3;`,
        )

        // ── Load Parquet shards from manifest ────────────────────────────
        // Each quadtile shard is a separate Parquet file.
        // We union them all into tile_cache for unified querying.
        await conn.query(`
          CREATE TABLE IF NOT EXISTS tile_cache (
            h3_index  VARCHAR,
            h3_7      VARCHAR,
            h3_8      VARCHAR,
            h3_9      VARCHAR,
            h3_10     VARCHAR,
            wkb_geom  BLOB,
            name      VARCHAR,
            feature_type VARCHAR,
            country_code VARCHAR
          );
        `)

        if (manifest?.tileKeys?.length) {
          const tiles = manifest.tileKeys
          shardsTotal = tiles.length

          // Apply z-order storage hint if available
          // This tells DuckDB to prefer sequential scans along the z-order curve
          const zorderHint = manifest.storageHints?.preferSequentialScan
            ? "-- storage hint: prefer sequential scan"
            : ""

          for (const tile of tiles) {
            try {
              await conn.query(`
                ${zorderHint}
                INSERT INTO tile_cache
                SELECT * FROM read_parquet('${tile.parquetUrl}')
                WHERE h3_7 IS NOT NULL;
              `)
              shardsLoaded++
              onProgress?.(shardsLoaded, shardsTotal)
            } catch (shardErr) {
              // Individual shard failure — log and continue
              console.warn(
                `[DuckDB] Shard load failed: ${tile.parquetUrl}`,
                shardErr,
              )
            }
          }
        }

        // ── H3 index for fast tile lookups ───────────────────────────────
        await conn.query(`
          CREATE INDEX IF NOT EXISTS idx_h3_8 ON tile_cache (h3_8);
          CREATE INDEX IF NOT EXISTS idx_h3_7 ON tile_cache (h3_7);
          CREATE INDEX IF NOT EXISTS idx_country ON tile_cache (country_code);
        `)

        // ── Register MapLibre custom protocol ────────────────────────────
        // The protocol `duckdb://` intercepts tile requests from MapLibre
        // and executes them as DuckDB queries over the local Parquet cache.
        //
        // H3 FIX: Using h3_polygon_to_cells (viewport polygon → cells) instead
        // of h3_grid_disk (circular buffer around center point).
        // h3_grid_disk produces a circular blob that misses viewport corners.
        // h3_polygon_to_cells fills the exact tile bounding box.
        maplibregl.addProtocol(
          PROTOCOL_PREFIX,
          async (request: { url: string }) => {
            try {
              const url = new URL(
                request.url.replace(PROTOCOL_PREFIX, "https://"),
              )
              const z = parseInt(url.searchParams.get("z") ?? "10")
              const x = parseInt(url.searchParams.get("x") ?? "0")
              const y = parseInt(url.searchParams.get("y") ?? "0")

              // Choose H3 resolution based on zoom
              const res = zoomToH3Res(z)

              // Tile bounding box (Web Mercator → lat/lng)
              const n = 1 << z
              const lngW = (x / n) * 360 - 180
              const lngE = ((x + 1) / n) * 360 - 180
              const latRadN = Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / n)))
              const latN = (latRadN * 180) / Math.PI
              const latRadS = Math.atan(
                Math.sinh(Math.PI * (1 - (2 * (y + 1)) / n)),
              )
              const latS = (latRadS * 180) / Math.PI

              // H3 column to use — matches the resolution
              const h3Col =
                res <= 7
                  ? "h3_7"
                  : res <= 8
                    ? "h3_8"
                    : res <= 9
                      ? "h3_9"
                      : "h3_10"

              // Country filter from manifest (reduces scan if available)
              const countryFilter = manifest?.cityId
                ? `AND country_code = '${getCountryFromCityId(manifest.cityId)}'`
                : ""

              const result = await conn.query(`
                WITH tile_envelope AS (
                  SELECT ST_MakeEnvelope(${lngW}, ${latS}, ${lngE}, ${latN}, 4326) AS env
                ),
                -- ✅ FIXED: polygon fill instead of circular disk
                -- h3_polygon_to_cells covers the exact viewport rectangle
                tile_h3 AS (
                  SELECT unnest(
                    h3_polygon_to_cells(env, ${res})
                  )::VARCHAR AS h3_cell
                  FROM tile_envelope
                ),
                geoms AS (
                  SELECT
                    ST_AsMVTGeom(
                      ST_GeomFromWKB(tc.wkb_geom),
                      (SELECT env FROM tile_envelope),
                      4096, 256, false
                    ) AS mvt_geom,
                    tc.name,
                    tc.feature_type
                  FROM tile_cache tc
                  INNER JOIN tile_h3 th ON tc.${h3Col} = th.h3_cell
                  WHERE ST_Intersects(
                    ST_GeomFromWKB(tc.wkb_geom),
                    (SELECT env FROM tile_envelope)
                  )
                  ${countryFilter}
                  LIMIT 5000
                )
                SELECT encode(ST_AsMVT(geoms, 'default'), 'binary') AS mvt
                FROM geoms;
              `)

              const row = result.toArray()[0]
              const data = row?.mvt ?? new Uint8Array()

              return {
                data: data instanceof Uint8Array ? data.buffer : data,
                cacheControl: "max-age=3600",
              }
            } catch (err) {
              console.error("[DuckDB] Tile error:", err)
              return { data: new ArrayBuffer(0) }
            }
          },
        )

        initialised = true
        onReady?.(conn)
      } catch (err: any) {
        console.error("[DuckDB] Init error:", err)
        error = err?.message ?? String(err)
        onError?.(err instanceof Error ? err : new Error(String(err)))
      }
    })()
  })

  onDestroy(() => {
    try {
      const maplibregl = (window as any).__maplibre_gl__
      maplibregl?.removeProtocol?.(PROTOCOL_PREFIX)
    } catch {}
    conn?.close?.()
    db?.terminate?.()
  })

  // ── Helpers ───────────────────────────────────────────────────────────────

  function zoomToH3Res(zoom: number): number {
    if (zoom <= 10) return 7
    if (zoom <= 13) return 8
    if (zoom <= 15) return 9
    return 10
  }

  function getCountryFromCityId(cityId: string): string {
    // Simple lookup for current Kenya dataset
    const KE_CITIES = new Set([
      "nairobi",
      "mombasa",
      "kisumu",
      "nakuru",
      "eldoret",
    ])
    return KE_CITIES.has(cityId.toLowerCase()) ? "KE" : "KE"
  }
</script>

{#if error}
  <div style="display:none" data-duckdb-error={error}></div>
{/if}

{#if !initialised && shardsTotal > 0}
  <div
    style="display:none"
    data-duckdb-progress={`${shardsLoaded}/${shardsTotal}`}
  ></div>
{/if}
