<script>
  import { onMount } from "svelte"
  import * as duckdb from "@duckdb/duckdb-wasm"
  import maplibregl from "maplibre-gl"
  import "maplibre-gl/dist/maplibre-gl.css"
  import { Map } from "svelte-maplibre-gl"

  let map
  let db, conn
  const PARQUET_URL = "http://your-postgis-container:8000/nairobi_h3.parquet" // Expose via nginx/etc
  const BUNDLE_URLS = {
    cosmiconfig:
      "https://cdn.skypack.dev/pin/@duckdb/duckdb-wasm@v1.28.1-Linux-x86_64/cosmiconfig.js",
    // Add full bundle URLs from duckdb-wasm shell.duckdb.org or docs
  }

  // H3 helpers (DuckDB provides h3_latlng_to_cell, etc.)
  async function h3GridDisk(center_h3, k, conn) {
    const res = await conn.query(`SELECT h3_grid_disk(${center_h3}, ${k})`)
    return res.toArray()[0][0]
  }

  async function initDuckDB() {
    const worker = new Worker(new URL("@duckdb/duckdb-wasm/worker.js"))
    db = new duckdb.AsyncDuckDB(null, worker)
    await db.instantiate(BUNDLE_URLS)
    conn = await db.connect()

    // IndexedDB persistence
    await db.registerFileHandler("idb", new duckdb.IdbFileHandler())

    // Extensions
    await conn.installExtension(
      "https://extensions.duckdb.org/v1.1.1/linux_amd64/spatial.duckdb_extension.gz",
    )
    await conn.installExtension(
      "https://extensions.duckdb.org/v1.1.1/linux_amd64/h3.duckdb_extension.gz",
    )
    await conn.loadExtension("spatial")
    await conn.loadExtension("h3")

    // Cache data
    try {
      await conn.execute(
        `CREATE TABLE IF NOT EXISTS cache (wkb_geom BLOB, name VARCHAR, h3_index BIGINT) USING PARQUET FROM '${PARQUET_URL}';`,
      )
      await conn.execute(
        "CREATE INDEX IF NOT EXISTS h3_idx ON cache (h3_index);",
      )
    } catch (e) {
      console.error("Cache failed:", e)
    }
  }

  // Custom protocol: duckdb://{layer}?z={z}&x={x}&y={y}
  maplibregl.addProtocol("duckdb.", (req, callback, _sourceTileId, _params) => {
    const url = new URL(req.url)
    const z = parseInt(url.searchParams.get("z")),
      x = parseInt(url.searchParams.get("x")),
      y = parseInt(url.searchParams.get("y"))
    const res = Math.floor(z / 4) // H3 res ~ zoom/4
    const tile_env = `ST_TileEnvelope(${z}, ${x}, ${y})`

    // Tile center lat/lng approx
    const n = 1 << (z - 1)
    const center_lat = ((y + 0.5) / n) * 2 - 1
    const center_lng = ((x + 0.5) / n) * 2 - 1

    conn
      .query(
        `
      WITH tile_h3 AS (
        SELECT unnest(h3_grid_disk(h3_latlng_to_cell(${center_lat}, ${center_lng}, ${res}), 1)) AS h3
      )
      SELECT encode(ST_AsMVT(mvt_row, 'default'), 'binary') AS mvt
      FROM (
        SELECT ST_AsMVTGeom(
          ST_GeomFromWKB(wkb_geom),
          ${tile_env},
          4096, 256, false
        ) AS mvt_geom,
        name
        FROM cache c
        JOIN tile_h3 t ON c.h3_index = t.h3
        WHERE ST_Intersects(ST_GeomFromWKB(wkb_geom), ${tile_env})
      ) mvt_row
    `,
      )
      .then((result) => {
        const mvt = result.fetchChunk().toArray()[0]?.[0] || new Uint8Array()
        callback(null, { data: mvt.buffer, cacheControl: { "max-age": 3600 } })
      })
      .catch((err) => callback(err))
  })

  onMount(async () => {
    await initDuckDB()
  })
</script>

<Map
  bind:this={map}
  style="https://demotiles.maplibre.org/style.json"
  zoom={10}
  center={[36.817, -1.286]}
  <!--
  Nairobi
  --
>
  hash="map">
  <svelte:fragment slot="before">
    <source
      id="h3-layer"
      type="vector"
      tiles={["duckdb://nairobi?z={z}&x={x}&y={y}"]}
      scheme="xyz"
    />
  </svelte:fragment>
</Map>

<style>
  :global(#map) {
    height: 100vh;
    width: 100%;
  }
</style>
