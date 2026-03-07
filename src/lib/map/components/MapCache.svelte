<script lang="ts">
  /**
   * DuckDBTileProvider
   *
   * Registers a custom MapLibre protocol  "duckdb://<layer>?z={z}&x={x}&y={y}"
   * backed by DuckDB-WASM + the spatial and h3 extensions.
   *
   * Drop this component inside (or alongside) <MapView> once. It renders
   * nothing — it's a pure side-effect component.
   *
   * Usage:
   *   <DuckDBTileProvider
   *     parquetUrl="https://data.example.com/nairobi_h3.parquet"
   *     on:ready={() => console.log("DuckDB ready")}
   *   />
   *
   * The registered protocol can then be referenced in a MapLibre source:
   *   type: "vector"
   *   tiles: ["duckdb://nairobi?z={z}&x={x}&y={y}"]
   */

  import { onMount, onDestroy } from "svelte"
  import type { DuckDBLayerConfig } from "$lib/map/types/MapTypes"

  // ── Props ─────────────────────────────────────────────────────────────────
  interface Props {
    parquetUrl: string
    /** Override DuckDB extension base URL. Defaults to duckdb.org CDN. */
    extensionBaseUrl?: string
    /** Fired when DuckDB is fully initialised and the protocol is registered. */
    onReady?: () => void
    /** Fired if initialisation fails. */
    onError?: (err: Error) => void
  }

  let {
    parquetUrl,
    extensionBaseUrl = "https://extensions.duckdb.org/v1.1.1/linux_amd64",
    onReady,
    onError,
  }: Props = $props()

  // ── Internal state ────────────────────────────────────────────────────────
  let initialised = $state(false)
  let error = $state<string | null>(null)

  // Hold references for cleanup
  let db: any
  let conn: any
  const PROTOCOL_PREFIX = "duckdb."

  // ── Init ──────────────────────────────────────────────────────────────────
  onMount(async () => {
    if (typeof window === "undefined") return

    try {
      const [maplibreModule, duckdbModule] = await Promise.all([
        import("maplibre-gl"),
        import("@duckdb/duckdb-wasm"),
      ])

      const maplibregl = maplibreModule.default
      const duckdb = duckdbModule

      // ── Boot DuckDB ───────────────────────────────────────────────────────
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

      // ── IndexedDB persistence (speeds up repeat visits) ──────────────────
      try {
        await db.registerFileHandler(
          "idb://",
          new (await import("@duckdb/duckdb-wasm")).IdbFileHandler(),
          duckdb.DuckDBAccessMode.READ_WRITE,
          false,
        )
      } catch {
        // IDB not critical — silently skip
      }

      // ── Spatial + H3 extensions ───────────────────────────────────────────
      await conn.query(`
        INSTALL spatial FROM '${extensionBaseUrl}/spatial.duckdb_extension.gz';
        LOAD spatial;
        INSTALL h3 FROM '${extensionBaseUrl}/h3.duckdb_extension.gz';
        LOAD h3;
      `)

      // ── Cache Parquet into DuckDB table ───────────────────────────────────
      await conn.query(`
        CREATE TABLE IF NOT EXISTS tile_cache AS
        SELECT * FROM read_parquet('${parquetUrl}');
        CREATE INDEX IF NOT EXISTS h3_idx ON tile_cache (h3_index);
      `)

      // ── Register MapLibre protocol ────────────────────────────────────────
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

            // Approximate tile centre in lat/lng
            const n = 1 << z
            const lng = (x / n) * 360 - 180
            const latRad = Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / n)))
            const lat = (latRad * 180) / Math.PI

            // H3 resolution: roughly zoom / 2, clamped 3–9
            const res = Math.min(9, Math.max(3, Math.round(z / 2)))

            const result = await conn.query(`
              WITH tile_h3 AS (
                SELECT unnest(
                  h3_grid_disk(h3_latlng_to_cell(${lat}, ${lng}, ${res}), 2)
                ) AS h3_cell
              ),
              geoms AS (
                SELECT
                  ST_AsMVTGeom(
                    ST_GeomFromWKB(wkb_geom),
                    ST_TileEnvelope(${z}, ${x}, ${y}),
                    4096, 256, false
                  ) AS mvt_geom,
                  name
                FROM tile_cache tc
                JOIN tile_h3 th ON tc.h3_index = th.h3_cell
                WHERE ST_Intersects(
                  ST_GeomFromWKB(wkb_geom),
                  ST_TileEnvelope(${z}, ${x}, ${y})
                )
              )
              SELECT encode(ST_AsMVT(geoms, 'default'), 'binary') AS mvt
              FROM geoms
            `)

            const row = result.toArray()[0]
            const data = row?.mvt ?? new Uint8Array()

            return {
              data: data instanceof Uint8Array ? data.buffer : data,
              cacheControl: "max-age=3600",
            }
          } catch (err) {
            console.error("[DuckDBTileProvider] tile error:", err)
            return { data: new ArrayBuffer(0) }
          }
        },
      )

      initialised = true
      onReady?.()
    } catch (err: any) {
      console.error("[DuckDBTileProvider] init error:", err)
      error = err?.message ?? String(err)
      onError?.(err instanceof Error ? err : new Error(String(err)))
    }
  })

  onDestroy(() => {
    // Remove protocol so HMR / re-mount doesn't double-register
    try {
      const maplibregl = (window as any).__maplibre_gl__
      maplibregl?.removeProtocol?.(PROTOCOL_PREFIX)
    } catch {}
    conn?.close?.()
    db?.terminate?.()
  })
</script>

<!--
  Intentionally renders nothing.
  Place inside your map layout, e.g.:

    <DuckDBTileProvider parquetUrl={PARQUET_URL} onReady={() => dbReady = true} />
    <MapView {routes} {dbReady} />
-->
{#if error}
  <!-- Optional: surface errors during development -->
  <div style="display:none" data-duckdb-error={error}></div>
{/if}
