-- Example for Nairobi bounds (lat/lng), res 7 ~ zoom 10-12
WITH nairobi_centroids AS (
SELECT
geom,
name, -- your props
h3_lat_lng_to_cell(ST_Y(ST_Centroid(geom)), ST_X(ST_Centroid(geom)), 7) AS h3_index
FROM your_h3_table
WHERE ST_Intersects(geom, ST_MakeEnvelope(36.7, -1.5, 37.1, 1.0, 4326)) -- Nairobi bbox
AND h3_indexes @> ARRAY[h3_lat_lng_to_cell(-1.286, 36.817, 7)::bigint] -- Use GIN idx
)
SELECT ST_AsBinary(geom) AS wkb_geom, name, h3_index::bigint
INTO OUTFILE '/data/nairobi_h3.parquet'
FROM nairobi_centroids;

// ============================================
// Map Service - Example Usage
// Shows how to set up and use the map service
// ============================================

import express, { type Express } from 'express'
import { createMapService, createMapRoutes, createSSERoutes, sseStreamManager } from '../index'
import type { MapServiceConfig } from './types'

// ============================================
// Example 1: Basic Server Setup
// ============================================

async function startServer() {
  const app: Express = express()
  app.use(express.json())

  // Service configuration
  const config: MapServiceConfig = {
    postgis: {
      host: process.env.POSTGIS_HOST || 'localhost',
      port: parseInt(process.env.POSTGIS_PORT || '5432'),
      database: process.env.POSTGIS_DATABASE || 'nairobi_transit',
      user: process.env.POSTGIS_USER || 'postgres',
      password: process.env.POSTGIS_PASSWORD || 'password',
      poolSize: 20,
    },
    sse: {
      heartbeatInterval: 25000,
      reconnectDelay: 1000,
      maxConnections: 1000,
    },
    upstream: {
      baseUrl: process.env.UPSTREAM_URL || 'https://maps.sxcntcnqunts.org',
      timeout: 10000,
      retryAttempts: 3,
    },
    h3: {
      defaultResolution: 9,
    },
  }

  // Create and start the map service
  const mapService = await createMapService(config)

  // Mount REST API routes
  app.use('/api/map', createMapRoutes(mapService))

  // Mount SSE streaming route
  app.use('/api/stream', createSSERoutes(sseStreamManager))

  // Start server
  const port = process.env.PORT || 3000
  app.listen(port, () => {
    console.log(`[Server] Map service running on port ${port}`)
    console.log(`[Server] REST API: http://localhost:${port}/api/map`)
    console.log(`[Server] SSE Stream: http://localhost:${port}/api/stream`)
  })

  // Graceful shutdown
  process.on('SIGTERM', async () => {
    console.log('[Server] Shutting down...')
    await mapService.stop()
    process.exit(0)
  })
}

// ============================================
// Example 2: Using the Client
// ============================================

async function exampleClient() {
  const { createMapClient } = await import('./client-hooks')

  // Create client instance
  const { api, sse } = createMapClient({
    baseUrl: 'http://localhost:3000/api/map',
    sseUrl: 'http://localhost:3000/api/stream',
    reconnectDelay: 2000,
    maxReconnectAttempts: 10,
  })

  // Fetch traffic nodes
  const bounds = {
    northEast: { lat: -1.15, lng: 36.95 },
    southWest: { lat: -1.45, lng: 36.65 },
  }

  const nodes = await api.getNodes(bounds)
  console.log(`Found ${nodes.length} traffic nodes`)

  // Find nearest vehicles to a point
  const center = { lat: -1.2921, lng: 36.8219 }
  const nearestVehicles = await api.getNearestVehicles(center, {
    limit: 10,
    maxDistance: 5000,
  })
  console.log(`Found ${nearestVehicles.length} nearby vehicles`)

  // Simulate site impact
  const siteLocation = { lat: -1.2868, lng: 36.8224 }
  const impact = await api.simulateSiteImpact(siteLocation, 500)
  console.log('Site impact analysis:', impact)

  // Connect to real-time stream
  sse.connect({
    bounds,
    onVehicleUpdate: (data) => {
      console.log(`Received ${data.vehicles.length} vehicle updates`)
    },
    onTrafficUpdate: (data) => {
      console.log(`Traffic update: ${data.nodes.length} nodes`)
    },
    onError: (error) => {
      console.error('SSE error:', error)
    },
  })

  // Disconnect after 60 seconds
  setTimeout(() => {
    sse.disconnect()
    console.log('Disconnected from stream')
  }, 60000)
}

// ============================================
// Example 3: Express Middleware
// ============================================

function expressMiddleware() {
  const app = express()

  // Get SSE middleware
  const sseMiddleware = sseStreamManager.createMiddleware() as (
    req: express.Request,
    res: express.Response,
    next: express.NextFunction,
  ) => unknown

  // Mount SSE stream
  app.get('/stream', (req, res, next) => {
    const result = sseMiddleware(req, res, next)
    if (result && typeof result === 'object' && 'success' in result && !result.success) {
      res.status(503).json(result)
    }
  })

  // Mount map routes
  app.use('/api/map', createMapRoutes({} as never)) // Would use actual service
}

// ============================================
// Example 4: H3 Grid Usage
// ============================================

async function exampleH3Grid() {
  const { createMapService } = await import('./map.service')
  const { createBoundingBox, distanceBetween } = await import('./utils/distance')

  const mapService = await createMapService({
    postgis: {
      host: 'localhost',
      port: 5432,
      database: 'nairobi_transit',
      user: 'postgres',
      password: 'password',
      poolSize: 20,
    },
    sse: {
      heartbeatInterval: 25000,
      reconnectDelay: 1000,
      maxConnections: 1000,
    },
    upstream: {
      baseUrl: 'https://maps.sxcntcnqunts.org',
      timeout: 10000,
      retryAttempts: 3,
    },
    h3: {
      defaultResolution: 9,
    },
  })

  // Get H3 cells at different resolutions
  const bounds = createBoundingBox({ lat: -1.2921, lng: 36.8219 }, 5000)

  const cells = await mapService.getH3Cells(bounds, 9)
  console.log(`Found ${cells.length} H3 cells at resolution 9`)

  // Get metrics for specific cells
  const cellIds = cells.slice(0, 10).map((c) => c.cellId)
  const metrics = await mapService.getH3Metrics(cellIds)
  console.log('H3 metrics:', metrics)

  // Export as GeoJSON
  const geojson = await mapService.exportH3GeoJSON(bounds)
  console.log(`GeoJSON has ${geojson.features.length} features`)
}

// ============================================
// Example 5: Site Selection
// ============================================

async function exampleSiteSelection() {
  const mapService = await createMapService({
    postgis: {
      host: 'localhost',
      port: 5432,
      database: 'nairobi_transit',
      user: 'postgres',
      password: 'password',
      poolSize: 20,
    },
    sse: {
      heartbeatInterval: 25000,
      reconnectDelay: 1000,
      maxConnections: 1000,
    },
    upstream: {
      baseUrl: 'https://maps.sxcntcnqunts.org',
      timeout: 10000,
      retryAttempts: 3,
    },
    h3: {
      defaultResolution: 9,
    },
  })

  // Analyze potential site locations
  const sites = [
    { lat: -1.2868, lng: 36.8224, name: 'Central Bus Station' },
    { lat: -1.3176, lng: 36.8335, name: 'Kasarani' },
    { lat: -1.1843, lng: 36.8683, name: 'Imara Daima' },
  ]

  for (const site of sites) {
    const impact = await mapService.simulateSiteImpact(site, 500)

    console.log(`\n${site.name} (${site.lat}, ${site.lng}):`)
    console.log(`  Daily commuters: ${impact.dailyCommuters.toLocaleString()}`)
    console.log(`  Peak hour volume: ${impact.peakHourVolume.toLocaleString()}`)
    console.log(`  Vehicle pass-through: ${impact.vehiclePassThrough.toLocaleString()}`)
    console.log(`  Saturation level: ${(impact.saturationLevel * 100).toFixed(1)}%`)
    console.log(`  Recommendations:`)
    impact.recommendations.forEach((r) => console.log(`    - ${r}`))
  }
}

// ============================================
// Example 6: Real-time Dashboard
// ============================================

async function exampleDashboard() {
  const { createMapClient } = await import('./client-hooks')

  const { api, sse } = createMapClient({
    baseUrl: 'http://localhost:3000/api/map',
    sseUrl: 'http://localhost:3000/api/stream',
  })

  // Track metrics
  let vehicleCount = 0
  let nodeCount = 0
  let totalThroughput = 0

  // Connect to stream
  sse.connect({
    onVehicleUpdate: (data) => {
      vehicleCount = data.vehicles.length
      updateDashboard()
    },
    onTrafficUpdate: (data) => {
      nodeCount = data.nodes.length
      totalThroughput = data.nodes.reduce(
        (sum, n) => sum + n.metrics.passengerThroughput,
        0,
      )
      updateDashboard()
    },
  })

  function updateDashboard() {
    console.clear()
    console.log('═══════════════════════════════════════')
    console.log('        NAIROBI TRANSIT DASHBOARD      ')
    console.log('═══════════════════════════════════════')
    console.log(`Active Vehicles: ${vehicleCount}`)
    console.log(`Traffic Nodes:   ${nodeCount}`)
    console.log(`Hourly Volume:  ${totalThroughput.toLocaleString()} passengers`)
    console.log('═══════════════════════════════════════')
  }

  // Initial data fetch
  const bounds = {
    northEast: { lat: -1.15, lng: 36.95 },
    southWest: { lat: -1.45, lng: 36.65 },
  }

  const [nodes, vehicles] = await Promise.all([
    api.getNodes(bounds),
    api.getVehicles(bounds),
  ])

  vehicleCount = vehicles.length
  nodeCount = nodes.length
  totalThroughput = nodes.reduce(
    (sum, n) => sum + n.metrics.passengerThroughput,
    0,
  )
  updateDashboard()
}

// ============================================
// Run Examples
// ============================================

// Uncomment to run:
// startServer()
// exampleClient()
// exampleH3Grid()
// exampleSiteSelection()
// exampleDashboard()

