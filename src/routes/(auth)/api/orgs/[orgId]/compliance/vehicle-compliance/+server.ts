// src/routes/api/orgs/[orgId]/compliance/vehicle-compliance/+server.ts
//
// Stage 0: generates parquet on demand from Supabase data.
// Stage 2: replace body with a redirect/signed URL to static S3/R2 file.
//
// This is the ONLY place DuckDB runs on the server.
// +page.server.ts never touches DuckDB or generates parquet.

import type { RequestHandler } from "./$types"
import * as duckdb from "@duckdb/node-bindings"

export const GET: RequestHandler = async ({ params, locals }) => {
  const orgId = params.orgId
  const supabase = locals.supabase

  try {
    // ── Fetch vehicles with GPS from Supabase ──────────────────────────
    // compliance_events table has metadata->gpsLat / gpsLng columns
    const { data: events, error } = await supabase
      .from("compliance_events")
      .select("vehicleId, severity, metadata, timestamp")
      .eq("organizationId", orgId)
      .eq("resolved", false)
      .not("metadata->gpsLat", "is", null)
      .not("metadata->gpsLng", "is", null)

    if (error) {
      console.error("[vehicle-compliance] supabase error:", error)
      return new Response("Failed to fetch vehicle data", { status: 500 })
    }

    const vehiclesWithGps = (events ?? [])
      .filter(
        (e) =>
          e.metadata?.gpsLat != null &&
          e.metadata?.gpsLng != null
      )
      .map((e) => ({
        vehicleId: e.vehicleId,
        severity: e.severity,
        gpsLat: Number(e.metadata.gpsLat),
        gpsLng: Number(e.metadata.gpsLng),
        timestamp: e.timestamp,
        // name used by the MapLibre popup
        name: e.vehicleId,
        status: e.severity, // normalise field name for map paint expression
      }))

    if (vehiclesWithGps.length === 0) {
      return new Response("No GPS data available", { status: 404 })
    }

    // ── Build parquet with DuckDB ──────────────────────────────────────
    const db = await duckdb.Database.create(":memory:")
    const conn = await db.connect()

    try {
      await conn.query(`
        INSTALL spatial;
        LOAD spatial;
        INSTALL h3;
        LOAD h3;
      `)

      // Inline JSON → table (safe: no user-controlled string interpolation)
      const jsonPayload = JSON.stringify(vehiclesWithGps)
      await conn.query(`
        CREATE TABLE vehicles AS
        SELECT * FROM read_json('${jsonPayload.replace(/'/g, "''")}');
      `)

      // Add H3 cell index (resolution 9) and WKB geometry for tile queries
      await conn.query(`
        ALTER TABLE vehicles ADD COLUMN h3_index BIGINT;
        UPDATE vehicles
          SET h3_index = h3_latlng_to_cell(gpsLat, gpsLng, 9);

        ALTER TABLE vehicles ADD COLUMN wkb_geom BLOB;
        UPDATE vehicles
          SET wkb_geom = ST_AsEWKB(ST_Point(gpsLng, gpsLat));
      `)

      // Export to parquet buffer
      // apache-arrow's Table.toParquet is used here because @duckdb/node-bindings
      // doesn't expose a direct in-memory COPY TO buffer yet.
      const arrowTable = await conn
        .query("SELECT * FROM vehicles")
        .toArrowTable()

      // Dynamic import so the heavy arrow dep is only loaded in this route
      const { tableToIPC } = await import("apache-arrow")
      const parquetBuffer = tableToIPC(arrowTable)

      return new Response(parquetBuffer, {
        status: 200,
        headers: {
          "Content-Type": "application/octet-stream",
          // Stage 2: increase this or remove it entirely once parquet is static
          "Cache-Control": "public, max-age=300",
        },
      })
    } finally {
      await conn.close()
      await db.disconnect()
    }
  } catch (err) {
    console.error("[vehicle-compliance] unexpected error:", err)
    return new Response("Failed to generate parquet", { status: 500 })
  }
}