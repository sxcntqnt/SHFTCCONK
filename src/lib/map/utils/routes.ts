// ============================================
// Express Routes for Map Service
// REST API endpoints + SSE streaming
// ============================================

import type { Request, Response, Router } from 'express'
import type { MapService } from './map.service'
import type { BoundingBox, MapMarker } from './types'
import {
  createBoundingBox,
  distanceBetween,
  sortMarkersByDistance,
  formatDistance,
  NAIROBI_CENTER,
} from './utils/distance'

// ============================================
// Route Factory
// ============================================

export function createMapRoutes(mapService: MapService): Router {
  const router = Router()

  // ============================================
  // Health & Status
  // ============================================

  router.get('/health', async (_req: Request, res: Response) => {
    const health = await mapService.getHealth()
    res.json(health)
  })

  router.get('/stats', (_req: Request, res: Response) => {
    const stats = mapService.getSSEStats()
    res.json(stats)
  })

  // ============================================
  // Traffic Nodes
  // ============================================

  router.get('/nodes', async (req: Request, res: Response) => {
    try {
      const bounds = parseBounds(req.query.bounds as string)
      if (!bounds) {
        res.status(400).json({ error: 'Invalid bounds parameter' })
        return
      }

      const options: { nodeTypes?: string[]; minSaturation?: number } = {}
      if (req.query.types) {
        options.nodeTypes = (req.query.types as string).split(',')
      }
      if (req.query.minSaturation) {
        options.minSaturation = parseFloat(req.query.minSaturation as string)
      }

      const nodes = await mapService.getTrafficNodes(bounds, options as { nodeTypes?: ('terminus' | 'interchange' | 'staging_point')[]; minSaturation?: number })
      res.json({ data: nodes, count: nodes.length })
    } catch (error) {
      console.error('Error fetching nodes:', error)
      res.status(500).json({ error: 'Failed to fetch nodes' })
    }
  })

  router.get('/nodes/:id', async (req: Request, res: Response) => {
    try {
      const node = await mapService.getNodeById(req.params.id)
      if (!node) {
        res.status(404).json({ error: 'Node not found' })
        return
      }
      res.json(node)
    } catch (error) {
      console.error('Error fetching node:', error)
      res.status(500).json({ error: 'Failed to fetch node' })
    }
  })

  router.get('/nodes/:id/saturation', async (req: Request, res: Response) => {
    try {
      const metrics = await mapService.getNodeSaturation(req.params.id)
      if (!metrics) {
        res.status(404).json({ error: 'Node not found' })
        return
      }
      res.json(metrics)
    } catch (error) {
      console.error('Error fetching saturation:', error)
      res.status(500).json({ error: 'Failed to fetch saturation metrics' })
    }
  })

  // ============================================
  // Corridors
  // ============================================

  router.get('/corridors', async (req: Request, res: Response) => {
    try {
      const bounds = parseBounds(req.query.bounds as string)
      if (!bounds) {
        res.status(400).json({ error: 'Invalid bounds parameter' })
        return
      }

      const corridors = await mapService.getCorridorAnalytics(bounds)
      res.json({ data: corridors, count: corridors.length })
    } catch (error) {
      console.error('Error fetching corridors:', error)
      res.status(500).json({ error: 'Failed to fetch corridors' })
    }
  })

  // ============================================
  // Vehicles
  // ============================================

  router.get('/vehicles', async (req: Request, res: Response) => {
    try {
      const bounds = parseBounds(req.query.bounds as string) || {
        northEast: { lat: -1.15, lng: 36.95 },
        southWest: { lat: -1.45, lng: 36.65 },
      }

      const vehicles = await mapService.getVehicles(bounds)
      res.json({ data: vehicles, count: vehicles.length })
    } catch (error) {
      console.error('Error fetching vehicles:', error)
      res.status(500).json({ error: 'Failed to fetch vehicles' })
    }
  })

  router.get('/vehicles/nearest', async (req: Request, res: Response) => {
    try {
      const lat = parseFloat(req.query.lat as string)
      const lng = parseFloat(req.query.lng as string)
      const limit = parseInt(req.query.limit as string) || 10
      const maxDistance = parseInt(req.query.maxDistance as string) || 5000

      if (isNaN(lat) || isNaN(lng)) {
        res.status(400).json({ error: 'Invalid lat/lng parameters' })
        return
      }

      const vehicles = await mapService.getNearestVehicles(
        { lat, lng },
        limit,
        maxDistance,
      )

      // Add distance from query point
      const vehiclesWithDistance = vehicles.map((v) => ({
        ...v,
        distanceFromQuery: distanceBetween(v.currentPosition, { lat, lng }),
        distanceFormatted: formatDistance(
          distanceBetween(v.currentPosition, { lat, lng }),
        ),
      }))

      res.json({ data: vehiclesWithDistance, count: vehicles.length })
    } catch (error) {
      console.error('Error fetching nearest vehicles:', error)
      res.status(500).json({ error: 'Failed to fetch nearest vehicles' })
    }
  })

  // ============================================
  // H3 Grid
  // ============================================

  router.get('/h3', async (req: Request, res: Response) => {
    try {
      const bounds = parseBounds(req.query.bounds as string)
      if (!bounds) {
        res.status(400).json({ error: 'Invalid bounds parameter' })
        return
      }

      const resolution = parseInt(req.query.resolution as string) || 9
      const cells = await mapService.getH3Cells(bounds, resolution)

      res.json({ data: cells, count: cells.length })
    } catch (error) {
      console.error('Error fetching H3 cells:', error)
      res.status(500).json({ error: 'Failed to fetch H3 cells' })
    }
  })

  router.get('/h3/metrics', async (req: Request, res: Response) => {
    try {
      const cellIds = (req.query.cellIds as string)?.split(',') || []
      if (cellIds.length === 0) {
        res.status(400).json({ error: 'cellIds parameter required' })
        return
      }

      const metrics = await mapService.getH3Metrics(cellIds)
      res.json({ data: metrics, count: metrics.length })
    } catch (error) {
      console.error('Error fetching H3 metrics:', error)
      res.status(500).json({ error: 'Failed to fetch H3 metrics' })
    }
  })

  // ============================================
  // GeoJSON Export
  // ============================================

  router.get('/export/geojson', async (req: Request, res: Response) => {
    try {
      const bounds = parseBounds(req.query.bounds as string) || {
        northEast: { lat: -1.15, lng: 36.95 },
        southWest: { lat: -1.45, lng: 36.65 },
      }

      const geojson = await mapService.exportGeoJSON(bounds)
      res.setHeader('Content-Type', 'application/geo+json')
      res.json(geojson)
    } catch (error) {
      console.error('Error exporting GeoJSON:', error)
      res.status(500).json({ error: 'Failed to export GeoJSON' })
    }
  })

  router.get('/export/nodes', async (req: Request, res: Response) => {
    try {
      const bounds = parseBounds(req.query.bounds as string) || {
        northEast: { lat: -1.15, lng: 36.95 },
        southWest: { lat: -1.45, lng: 36.65 },
      }

      const geojson = await mapService.exportNodesGeoJSON(bounds)
      res.setHeader('Content-Type', 'application/geo+json')
      res.json(geojson)
    } catch (error) {
      console.error('Error exporting nodes:', error)
      res.status(500).json({ error: 'Failed to export nodes' })
    }
  })

  router.get('/export/h3', async (req: Request, res: Response) => {
    try {
      const bounds = parseBounds(req.query.bounds as string) || {
        northEast: { lat: -1.15, lng: 36.95 },
        southWest: { lat: -1.45, lng: 36.65 },
      }

      const geojson = await mapService.exportH3GeoJSON(bounds)
      res.setHeader('Content-Type', 'application/geo+json')
      res.json(geojson)
    } catch (error) {
      console.error('Error exporting H3 GeoJSON:', error)
      res.status(500).json({ error: 'Failed to export H3 data' })
    }
  })

  // ============================================
  // Site Selection / Simulation
  // ============================================

  router.post('/simulate/site-impact', async (req: Request, res: Response) => {
    try {
      const { lat, lng, radius } = req.body

      if (typeof lat !== 'number' || typeof lng !== 'number') {
        res.status(400).json({ error: 'lat and lng are required' })
        return
      }

      const impact = await mapService.simulateSiteImpact(
        { lat, lng },
        radius || 500,
      )

      res.json(impact)
    } catch (error) {
      console.error('Error simulating site impact:', error)
      res.status(500).json({ error: 'Failed to simulate site impact' })
    }
  })

  // ============================================
  // Markers (Helper Endpoints)
  // ============================================

  router.get('/markers', async (req: Request, res: Response) => {
    try {
      const bounds = parseBounds(req.query.bounds as string) || {
        northEast: { lat: -1.15, lng: 36.95 },
        southWest: { lat: -1.45, lng: 36.65 },
      }

      const [nodes, vehicles, corridors] = await Promise.all([
        mapService.getTrafficNodes(bounds),
        mapService.getVehicles(bounds),
        mapService.getCorridorAnalytics(bounds),
      ])

      // Convert to markers
      const nodeMarkers: MapMarker[] = nodes.map((n) => ({
        id: n.id,
        position: n.position,
        label: n.name,
        color: saturationToColor(n.metrics.saturationLevel),
        metadata: { type: 'node', throughput: n.metrics.passengerThroughput },
      }))

      const vehicleMarkers: MapMarker[] = vehicles.map((v) => ({
        id: v.id,
        position: v.currentPosition,
        color: '#10B981', // Green
        metadata: {
          type: 'vehicle',
          plate: v.plateNumber,
          sacco: v.saccoName,
          speed: v.speed,
        },
      }))

      res.json({
        data: [...nodeMarkers, ...vehicleMarkers],
        counts: {
          nodes: nodeMarkers.length,
          vehicles: vehicleMarkers.length,
          corridors: corridors.length,
        },
      })
    } catch (error) {
      console.error('Error fetching markers:', error)
      res.status(500).json({ error: 'Failed to fetch markers' })
    }
  })

  router.get('/markers/nearby', async (req: Request, res: Response) => {
    try {
      const lat = parseFloat(req.query.lat as string)
      const lng = parseFloat(req.query.lng as string)
      const radius = parseInt(req.query.radius as string) || 1000

      if (isNaN(lat) || isNaN(lng)) {
        res.status(400).json({ error: 'Invalid lat/lng' })
        return
      }

      const bounds = createBoundingBox({ lat, lng }, radius)
      const nodes = await mapService.getTrafficNodes(bounds)

      const markers: MapMarker[] = nodes.map((n) => ({
        id: n.id,
        position: n.position,
        label: n.name,
        color: saturationToColor(n.metrics.saturationLevel),
        metadata: { type: 'node', throughput: n.metrics.passengerThroughput },
      }))

      const sorted = sortMarkersByDistance(markers, { lat, lng })

      res.json({
        data: sorted.map((m) => ({
          ...m,
          distance: distanceBetween(m.position, { lat, lng }),
          distanceFormatted: formatDistance(distanceBetween(m.position, { lat, lng })),
        })),
        count: sorted.length,
      })
    } catch (error) {
      console.error('Error fetching nearby markers:', error)
      res.status(500).json({ error: 'Failed to fetch nearby markers' })
    }
  })

  // ============================================
  // Tiles (Upstream Proxy)
  // ============================================

  router.get('/tiles/:z/:x/:y.pbf', async (req: Request, res: Response) => {
    try {
      const { x, y, z } = req.params
      const buffer = await mapService.getTile(
        parseInt(x),
        parseInt(y),
        parseInt(z),
      )

      res.setHeader('Content-Type', 'application/x-protobuf')
      res.send(Buffer.from(buffer))
    } catch (error) {
      console.error('Error fetching tile:', error)
      res.status(500).json({ error: 'Failed to fetch tile' })
    }
  })

  return router
}

// ============================================
// SSE Route Handler
// ============================================

export function createSSERoutes(sseStreamManager: {
  registerClient: (clientId: string, response: unknown, filters?: unknown) => { success: boolean; error?: string }
  removeClient: (clientId: string) => void
  createMiddleware: () => (req: Request, res: Response, next: () => void) => unknown
}): Router {
  const router = Router()

  router.get('/stream', (req: Request, res: Response) => {
    const clientId =
      (req.query.clientId as string) ||
      `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    const bounds = req.query.bounds
      ? parseBounds(req.query.bounds as string)
      : undefined

    const result = sseStreamManager.registerClient(
      clientId,
      res,
      {
        bounds,
        includeHeartbeat: req.query.heartbeat !== 'false',
      },
    )

    if (!result.success) {
      res.status(503).json({ error: result.error })
      return
    }

    // Set SSE headers
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control',
    })

    // Handle client disconnect
    req.on('close', () => {
      sseStreamManager.removeClient(clientId)
    })
  })

  return router
}

// ============================================
// Helper Functions
// ============================================

function parseBounds(boundsStr?: string): BoundingBox | null {
  if (!boundsStr) return null

  try {
    // Try JSON format first
    if (boundsStr.startsWith('{')) {
      const parsed = JSON.parse(boundsStr)
      return {
        northEast: {
          lat: parseFloat(parsed.neLat || parsed.northEast?.lat),
          lng: parseFloat(parsed.neLng || parsed.northEast?.lng),
        },
        southWest: {
          lat: parseFloat(parsed.swLat || parsed.southWest?.lat),
          lng: parseFloat(parsed.swLng || parsed.southWest?.lng),
        },
      }
    }

    // Try comma-separated: swLat,swLng,neLat,neLng
    const parts = boundsStr.split(',').map(Number)
    if (parts.length === 4 && parts.every((n) => !isNaN(n))) {
      return {
        southWest: { lat: parts[0], lng: parts[1] },
        northEast: { lat: parts[2], lng: parts[3] },
      }
    }

    return null
  } catch {
    return null
  }
}

function saturationToColor(saturation: number): string {
  // 0-0.3: Green (low)
  // 0.3-0.6: Yellow (medium)
  // 0.6-0.8: Orange (high)
  // 0.8-1: Red (critical)
  if (saturation <= 0.3) return '#22C55E'
  if (saturation <= 0.6) return '#EAB308'
  if (saturation <= 0.8) return '#F97316'
  return '#EF4444'
}
