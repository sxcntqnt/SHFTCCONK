// ============================================
// Geographic Distance Utilities
// Using the Haversine formula for accurate Earth surface calculations
// ============================================

import type { Coordinates, BoundingBox, MapMarker } from '../types/MapTypes'

const EARTH_RADIUS_METERS = 6371000
const EARTH_RADIUS_KM = 6371
const EARTH_RADIUS_MILES = 3959

// ============================================
// Core Distance Calculations
// ============================================

/**
 * Calculate distance between two coordinates using Haversine formula
 * @returns Distance in meters
 */
export function distanceBetween(a: Coordinates, b: Coordinates): number {
  const dLat = toRadians(b.lat - a.lat)
  const dLng = toRadians(b.lng - a.lng)
  const lat1 = toRadians(a.lat)
  const lat2 = toRadians(b.lat)

  const x = dLng * Math.cos((lat1 + lat2) / 2)
  const y = dLat

  return Math.sqrt(x * x + y * y) * EARTH_RADIUS_METERS
}

/**
 * Calculate distance in kilometers
 */
export function distanceInKm(a: Coordinates, b: Coordinates): number {
  return distanceBetween(a, b) / 1000
}

/**
 * Calculate distance in miles
 */
export function distanceInMiles(a: Coordinates, b: Coordinates): number {
  return distanceBetween(a, b) / 1609.344
}

/**
 * Convert degrees to radians
 */
export function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180
}

/**
 * Convert radians to degrees
 */
export function toDegrees(radians: number): number {
  return (radians * 180) / Math.PI
}

// ============================================
// Bearing Calculations
// ============================================

/**
 * Calculate initial bearing from point A to point B
 * @returns Bearing in degrees (0-360)
 */
export function bearingBetween(a: Coordinates, b: Coordinates): number {
  const dLng = toRadians(b.lng - a.lng)
  const lat1 = toRadians(a.lat)
  const lat2 = toRadians(b.lat)

  const y = Math.sin(dLng) * Math.cos(lat2)
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng)

  const bearing = toDegrees(Math.atan2(y, x))
  return (bearing + 360) % 360
}

/**
 * Calculate destination point given start, bearing, and distance
 */
export function destinationPoint(
  start: Coordinates,
  bearing: number,
  distance: number, // meters
): Coordinates {
  const R = EARTH_RADIUS_METERS
  const d = distance / R
  const brng = toRadians(bearing)
  const lat1 = toRadians(start.lat)
  const lng1 = toRadians(start.lng)

  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(d) +
      Math.cos(lat1) * Math.sin(d) * Math.cos(brng),
  )

  const lng2 =
    lng1 +
    Math.atan2(
      Math.sin(brng) * Math.sin(d) * Math.cos(lat1),
      Math.cos(d) - Math.sin(lat1) * Math.sin(lat2),
    )

  return {
    lat: toDegrees(lat2),
    lng: toDegrees(lng2),
  }
}

// ============================================
// Bounding Box Utilities
// ============================================

/**
 * Create bounding box from center point and radius
 */
export function createBoundingBox(
  center: Coordinates,
  radiusMeters: number,
): BoundingBox {
  const latDelta = (radiusMeters / EARTH_RADIUS_METERS) * (180 / Math.PI)
  const lngDelta =
    (radiusMeters / (EARTH_RADIUS_METERS * Math.cos(toRadians(center.lat)))) *
    (180 / Math.PI)

  return {
    northEast: {
      lat: center.lat + latDelta,
      lng: center.lng + lngDelta,
    },
    southWest: {
      lat: center.lat - latDelta,
      lng: center.lng - lngDelta,
    },
  }
}

/**
 * Check if a coordinate is within a bounding box
 */
export function isWithinBounds(
  point: Coordinates,
  bounds: BoundingBox,
): boolean {
  return (
    point.lat >= bounds.southWest.lat &&
    point.lat <= bounds.northEast.lat &&
    point.lng >= bounds.southWest.lng &&
    point.lng <= bounds.northEast.lng
  )
}

/**
 * Check if two bounding boxes overlap
 */
export function boundsOverlap(a: BoundingBox, b: BoundingBox): boolean {
  return (
    isWithinBounds(a.northEast, b) ||
    isWithinBounds(a.southWest, b) ||
    isWithinBounds(b.northEast, a) ||
    isWithinBounds(b.southWest, a)
  )
}

/**
 * Expand bounding box by a percentage
 */
export function expandBounds(bounds: BoundingBox, percent: number): BoundingBox {
  const latDiff = bounds.northEast.lat - bounds.southWest.lat
  const lngDiff = bounds.northEast.lng - bounds.southWest.lng
  const expandLat = latDiff * (percent / 100)
  const expandLng = lngDiff * (percent / 100)

  return {
    northEast: {
      lat: bounds.northEast.lat + expandLat,
      lng: bounds.northEast.lng + expandLng,
    },
    southWest: {
      lat: bounds.southWest.lat - expandLat,
      lng: bounds.southWest.lng - expandLng,
    },
  }
}

// ============================================
// Marker Filtering Utilities
// ============================================

/**
 * Filter markers within a given radius from a center point
 */
export function filterMarkersByRadius(
  markers: MapMarker[],
  center: Coordinates,
  radius: number,
): MapMarker[] {
  return markers.filter(
    (marker) => distanceBetween(marker.position, center) <= radius,
  )
}

/**
 * Filter markers within a bounding box
 */
export function filterMarkersByBounds(
  markers: MapMarker[],
  bounds: BoundingBox,
): MapMarker[] {
  return markers.filter((marker) => isWithinBounds(marker.position, bounds))
}

/**
 * Sort markers by distance from a center point
 */
export function sortMarkersByDistance(
  markers: MapMarker[],
  center: Coordinates,
): MapMarker[] {
  return [...markers]
    .map((marker) => ({
      marker,
      distance: distanceBetween(marker.position, center),
    }))
    .sort((a, b) => a.distance - b.distance)
    .map((item) => item.marker)
}

/**
 * Find markers within multiple radii (returns markers with their distance)
 */
export function findMarkersWithDistance(
  markers: MapMarker[],
  center: Coordinates,
  maxRadius: number,
): Array<MapMarker & { distance: number }> {
  return markers
    .map((marker) => ({
      ...marker,
      distance: distanceBetween(marker.position, center),
    }))
    .filter((marker) => marker.distance <= maxRadius)
    .sort((a, b) => a.distance - b.distance)
}

/**
 * Find nearest marker to a point
 */
export function findNearestMarker(
  markers: MapMarker[],
  center: Coordinates,
): MapMarker | null {
  if (markers.length === 0) return null

  let nearest = markers[0]
  let minDistance = distanceBetween(markers[0].position, center)

  for (const marker of markers) {
    const dist = distanceBetween(marker.position, center)
    if (dist < minDistance) {
      minDistance = dist
      nearest = marker
    }
  }

  return nearest
}

// ============================================
// Polygon & Area Utilities
// ============================================

/**
 * Calculate the centroid of a set of coordinates
 */
export function calculateCentroid(coordinates: Coordinates[]): Coordinates {
  if (coordinates.length === 0) {
    throw new Error('Cannot calculate centroid of empty array')
  }

  const sum = coordinates.reduce(
    (acc, coord) => ({
      lat: acc.lat + coord.lat,
      lng: acc.lng + coord.lng,
    }),
    { lat: 0, lng: 0 },
  )

  return {
    lat: sum.lat / coordinates.length,
    lng: sum.lng / coordinates.length,
  }
}

/**
 * Calculate approximate area of a polygon using the Shoelace formula
 * @returns Area in square meters
 */
export function calculatePolygonArea(coordinates: Coordinates[]): number {
  if (coordinates.length < 3) return 0

  let area = 0
  const n = coordinates.length

  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n
    area += coordinates[i].lng * coordinates[j].lat
    area -= coordinates[j].lng * coordinates[i].lat
  }

  area = Math.abs(area) / 2

  // Convert to square meters (approximate for Nairobi's latitude)
  const avgLat = coordinates.reduce((sum, c) => sum + c.lat, 0) / n
  const latMeters = EARTH_RADIUS_METERS * (Math.PI / 180)
  const lngMeters =
    latMeters * Math.cos(toRadians(avgLat))

  return area * latMeters * lngMeters
}

/**
 * Check if a point is inside a polygon using ray casting
 */
export function isPointInPolygon(
  point: Coordinates,
  polygon: Coordinates[],
): boolean {
  let inside = false
  const n = polygon.length

  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = polygon[i].lng
    const yi = polygon[i].lat
    const xj = polygon[j].lng
    const yj = polygon[j].lat

    const intersect =
      yi > point.lat !== yj > point.lat &&
      point.lng < ((xj - xi) * (point.lat - yi)) / (yj - yi) + xi

    if (intersect) inside = !inside
  }

  return inside
}

// ============================================
// Utility Functions
// ============================================

/**
 * Format distance for display
 */
export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)}m`
  }
  return `${(meters / 1000).toFixed(1)}km`
}

/**
 * Calculate bearing direction name
 */
export function bearingToDirection(bearing: number): string {
  const directions = [
    'N',
    'NNE',
    'NE',
    'ENE',
    'E',
    'ESE',
    'SE',
    'SSE',
    'S',
    'SSW',
    'SW',
    'WSW',
    'W',
    'WNW',
    'NW',
    'NNW',
  ]
  const index = Math.round(bearing / 22.5) % 16
  return directions[index]
}

/**
 * Generate a random coordinate within a bounding box
 * Useful for testing
 */
export function randomCoordinateInBounds(bounds: BoundingBox): Coordinates {
  const lat =
    bounds.southWest.lat +
    Math.random() * (bounds.northEast.lat - bounds.southWest.lat)
  const lng =
    bounds.southWest.lng +
    Math.random() * (bounds.northEast.lng - bounds.southWest.lng)
  return { lat, lng }
}

// ============================================
// Nairobi-Specific Constants
// ============================================

export const NAIROBI_CENTER: Coordinates = {
  lat: -1.2921,
  lng: 36.8219,
}

export const NAIROBI_BOUNDS: BoundingBox = {
  northEast: { lat: -1.15, lng: 36.95 },
  southWest: { lat: -1.45, lng: 36.65 },
}

export const NAIROBI_H3_RESOLUTION = 9 // Neighborhood level

export const MAJOR_TERMINUS_LOCATIONS: Coordinates[] = [
  { lat: -1.2868, lng: 36.8224 }, // Kenya Bus/Tuskys
  { lat: -1.3017, lng: 36.7928 }, // Kenypesa/Kenyatta Ave
  { lat: -1.3176, lng: 36.8335 }, // Kasarani
  { lat: -1.3341, lng: 36.7556 }, // Ruiru/Kamulu
  { lat: -1.1843, lng: 36.8683 }, // Imara Daima
]
