// ============================================
// Map Query Layer (DuckDB WASM-safe)
// Pure query builders + domain mappers
// ============================================

import type { DuckDBWasmCore } from './DuckDBWasmCore';

// ============================================
// Types (lightweight, local copies to avoid coupling)
// ============================================

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface BoundingBox {
  southWest: Coordinates;
  northEast: Coordinates;
}

export interface TrafficNode {
  id: string;
  name: string;
  position: Coordinates;
  type: string;
  metrics: {
    passengerThroughput: number;
    averageDwellTime: number;
    peakHour: string;
    saturationLevel: number;
  };
  connectedRoutes: string[];
}

export interface CorridorAnalytics {
  id: string;
  name: string;
  startNode: string;
  endNode: string;
  geometry: Coordinates[];
  metrics: {
    fuelBurnRate: number;
    idlingHotspotScore: number;
    vehicleStressIndex: number;
    averageSpeed: number;
    peakFlowTime: string;
  };
}

export interface Vehicle {
  id: string;
  saccoId: string;
  saccoName: string;
  plateNumber: string;
  capacity: number;
  currentPosition: Coordinates;
  heading: number;
  speed: number;
  status: string;
  lastUpdated: string;
}

export interface H3Cell {
  cellId: string;
  resolution: number;
  boundary: Coordinates[];
  center: Coordinates;
  properties: Record<string, any>;
}

export interface GeoJSONFeatureCollection {
  type: 'FeatureCollection';
  features: any[];
}

// ============================================
// Helpers
// ============================================

function parsePoint(geojson: string): Coordinates {
  const geo = JSON.parse(geojson);
  const [lng, lat] = geo.coordinates;
  return { lat, lng };
}

function parseLineString(geojson: string): Coordinates[] {
  const geo = JSON.parse(geojson);
  return geo.coordinates.map((c: number[]) => ({
    lng: c[0],
    lat: c[1],
  }));
}

// ============================================
// Traffic Nodes
// ============================================

export async function getNodesInBounds(
  db: DuckDBWasmCore,
  bounds: BoundingBox,
  options?: {
    nodeTypes?: string[];
    minSaturation?: number;
  }
): Promise<TrafficNode[]> {

  let sql = `
    SELECT
      id,
      name,
      ST_AsGeoJSON(geom) AS geojson,
      node_type,
      passenger_throughput,
      average_dwell_time,
      peak_hour,
      saturation_level,
      connected_routes
    FROM traffic_nodes
    WHERE ST_Intersects(
      geom,
      ST_MakeEnvelope(?, ?, ?, ?, 4326)
    )
  `;

  const params: any[] = [
    bounds.southWest.lng,
    bounds.southWest.lat,
    bounds.northEast.lng,
    bounds.northEast.lat,
  ];

  if (options?.nodeTypes?.length) {
    sql += ` AND node_type IN (${options.nodeTypes.map(() => '?').join(',')})`;
    params.push(...options.nodeTypes);
  }

  if (options?.minSaturation !== undefined) {
    sql += ` AND saturation_level >= ?`;
    params.push(options.minSaturation);
  }

  sql += ` ORDER BY passenger_throughput DESC LIMIT 500`;

  const rows = await db.query<any>(sql, params);

  return rows.map(row => ({
    id: row.id,
    name: row.name,
    position: parsePoint(row.geojson),
    type: row.node_type,
    metrics: {
      passengerThroughput: row.passenger_throughput,
      averageDwellTime: row.average_dwell_time,
      peakHour: row.peak_hour,
      saturationLevel: row.saturation_level,
    },
    connectedRoutes: row.connected_routes ?? [],
  }));
}

export async function getNodeById(
  db: DuckDBWasmCore,
  id: string
): Promise<TrafficNode | null> {

  const rows = await db.query<any>(
    `
    SELECT
      id,
      name,
      ST_AsGeoJSON(geom) AS geojson,
      node_type,
      passenger_throughput,
      average_dwell_time,
      peak_hour,
      saturation_level,
      connected_routes
    FROM traffic_nodes
    WHERE id = ?
    `,
    [id]
  );

  if (!rows.length) return null;

  const row = rows[0];

  return {
    id: row.id,
    name: row.name,
    position: parsePoint(row.geojson),
    type: row.node_type,
    metrics: {
      passengerThroughput: row.passenger_throughput,
      averageDwellTime: row.average_dwell_time,
      peakHour: row.peak_hour,
      saturationLevel: row.saturation_level,
    },
    connectedRoutes: row.connected_routes ?? [],
  };
}

// ============================================
// Corridor Analytics
// ============================================

export async function getCorridorsInBounds(
  db: DuckDBWasmCore,
  bounds: BoundingBox
): Promise<CorridorAnalytics[]> {

  const rows = await db.query<any>(
    `
    SELECT
      id,
      name,
      start_node,
      end_node,
      ST_AsGeoJSON(geom) AS geojson,
      fuel_burn_rate,
      idling_hotspot_score,
      vehicle_stress_index,
      average_speed,
      peak_flow_time
    FROM corridor_analytics
    WHERE ST_Intersects(
      geom,
      ST_MakeEnvelope(?, ?, ?, ?, 4326)
    )
    ORDER BY idling_hotspot_score DESC
    LIMIT 200
    `,
    [
      bounds.southWest.lng,
      bounds.southWest.lat,
      bounds.northEast.lng,
      bounds.northEast.lat,
    ]
  );

  return rows.map(row => ({
    id: row.id,
    name: row.name,
    startNode: row.start_node,
    endNode: row.end_node,
    geometry: parseLineString(row.geojson),
    metrics: {
      fuelBurnRate: row.fuel_burn_rate,
      idlingHotspotScore: row.idling_hotspot_score,
      vehicleStressIndex: row.vehicle_stress_index,
      averageSpeed: row.average_speed,
      peakFlowTime: row.peak_flow_time,
    },
  }));
}

// ============================================
// H3 Cells
// ============================================

export async function getH3CellsInBounds(
  db: DuckDBWasmCore,
  bounds: BoundingBox,
  resolution: number = 9
): Promise<H3Cell[]> {

  const rows = await db.query<any>(
    `
    SELECT
      h3_cell_id,
      resolution,
      ST_AsGeoJSON(h3_boundary) AS boundary_geojson,
      ST_AsGeoJSON(h3_center) AS center_geojson,
      properties
    FROM h3_cells
    WHERE resolution = ?
      AND ST_Intersects(
        h3_boundary,
        ST_MakeEnvelope(?, ?, ?, ?, 4326)
      )
    LIMIT 5000
    `,
    [
      resolution,
      bounds.southWest.lng,
      bounds.southWest.lat,
      bounds.northEast.lng,
      bounds.northEast.lat,
    ]
  );

  return rows.map(row => ({
    cellId: row.h3_cell_id,
    resolution: row.resolution,
    boundary: parseLineString(row.boundary_geojson),
    center: parsePoint(row.center_geojson),
    properties: row.properties,
  }));
}

// ============================================
// GeoJSON Exports
// ============================================

export async function getNodesAsGeoJSON(
  db: DuckDBWasmCore,
  bounds: BoundingBox
): Promise<GeoJSONFeatureCollection> {

  const rows = await db.query<any>(
    `
    SELECT json_object(
      'type', 'FeatureCollection',
      'features', json_group_array(
        json_object(
          'type', 'Feature',
          'id', id,
          'geometry', ST_AsGeoJSON(geom),
          'properties', json_object(
            'name', name,
            'node_type', node_type,
            'passenger_throughput', passenger_throughput,
            'saturation_level', saturation_level,
            'peak_hour', peak_hour
          )
        )
      )
    ) AS geojson
    FROM traffic_nodes
    WHERE ST_Intersects(
      geom,
      ST_MakeEnvelope(?, ?, ?, ?, 4326)
    )
    `,
    [
      bounds.southWest.lng,
      bounds.southWest.lat,
      bounds.northEast.lng,
      bounds.northEast.lat,
    ]
  );

  return JSON.parse(rows[0].geojson);
}

export async function getFullMapAsGeoJSON(
  db: DuckDBWasmCore,
  bounds: BoundingBox
): Promise<GeoJSONFeatureCollection> {

  const rows = await db.query<any>(
    `
    SELECT json_object(
      'type', 'FeatureCollection',
      'features', json_group_array(feature)
    ) AS geojson
    FROM (
      SELECT json_object(
        'type', 'Feature',
        'id', 'node-' || id,
        'geometry', ST_AsGeoJSON(geom),
        'properties', json_object('layer', 'nodes', 'name', name)
      ) AS feature
      FROM traffic_nodes
      WHERE ST_Intersects(geom, ST_MakeEnvelope(?, ?, ?, ?, 4326))

      UNION ALL

      SELECT json_object(
        'type', 'Feature',
        'id', 'corridor-' || id,
        'geometry', ST_AsGeoJSON(geom),
        'properties', json_object('layer', 'corridors', 'name', name)
      ) AS feature
      FROM corridor_analytics
      WHERE ST_Intersects(geom, ST_MakeEnvelope(?, ?, ?, ?, 4326))
    )
    `,
    [
      bounds.southWest.lng,
      bounds.southWest.lat,
      bounds.northEast.lng,
      bounds.northEast.lat,
      bounds.southWest.lng,
      bounds.southWest.lat,
      bounds.northEast.lng,
      bounds.northEast.lat,
    ]
  );

  return JSON.parse(rows[0].geojson);
}