<script lang="ts">
  import { onMount, onDestroy } from "svelte"

  interface Props {
    parquetUrl: string
    extensionBaseUrl?: string
    onReady?: () => void
    onError?: (err: Error) => void
  }

  let {
    parquetUrl,
    extensionBaseUrl = "https://extensions.duckdb.org/v1.1.1/linux_amd64",
    onReady,
    onError,
  }: Props = $props()

  let initialised = $state(false)
  let error = $state<string | null>(null)

  let db: any
  let conn: any
  const PROTOCOL_PREFIX = "duckdb."

  // ── Init ──────────────────────────────────────────────────────────────────
  // onMount must NOT be async if you need a cleanup return value — Svelte drops
  // the cleanup from Promise<() => void>. Boot DuckDB inside, clean up in onDestroy.
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

        // ── Boot DuckDB ─────────────────────────────────────────────────
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

        // IdbFileHandler was removed — it does not exist on @duckdb/duckdb-wasm
        // 1.33.x. IndexedDB persistence can be revisited once the API stabilises.

        // ── Spatial + H3 extensions ──────────────────────────────────────
        await conn.query(`
          INSTALL spatial FROM '${extensionBaseUrl}/spatial.duckdb_extension.gz';
          LOAD spatial;
          INSTALL h3 FROM '${extensionBaseUrl}/h3.duckdb_extension.gz';
          LOAD h3;
        `)

        // ── Cache Parquet ────────────────────────────────────────────────
        await conn.query(`
          CREATE TABLE IF NOT EXISTS tile_cache AS
          SELECT * FROM read_parquet('${parquetUrl}');
          CREATE INDEX IF NOT EXISTS h3_idx ON tile_cache (h3_index);
        `)

        // ── Register MapLibre protocol ───────────────────────────────────
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

              const n = 1 << z
              const lng = (x / n) * 360 - 180
              const latRad = Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / n)))
              const lat = (latRad * 180) / Math.PI

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
    })()

    // onMount cleanup is synchronous — return it directly (not from the async IIFE)
    // Heavy teardown (conn/db) is handled in onDestroy below.
  })

  onDestroy(() => {
    try {
      const maplibregl = (window as any).__maplibre_gl__
      maplibregl?.removeProtocol?.(PROTOCOL_PREFIX)
    } catch {}
    conn?.close?.()
    db?.terminate?.()
  })
</script>

{#if error}
  <div style="display:none" data-duckdb-error={error}></div>
{/if}
