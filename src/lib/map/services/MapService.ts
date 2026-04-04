import type { Coordinates, MapMarker } from "$lib/map/types/MapTypes.ts"

// Calculate distance in meters between two coordinates
export function distanceBetween(a: Coordinates, b: Coordinates): number {
  const R = 6371000 // Earth radius in meters
  const dLat = ((b.lat - a.lat) * Math.PI) / 180
  const dLng = ((b.lng - a.lng) * Math.PI) / 180
  const lat1 = (a.lat * Math.PI) / 180
  const lat2 = (b.lat * Math.PI) / 180

  const x = dLng * Math.cos((lat1 + lat2) / 2)
  const y = dLat
  return Math.sqrt(x * x + y * y) * R
}

// Generate an Apple-style gradient icon for a marker
export function generateMarkerIcon(color: string = "#0A84FF") {
  const svg = `<svg width="32" height="32" viewBox="0 0 24 24" fill="${color}" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="10" fill="${color}" />
  </svg>`
  return `data:image/svg+xml;base64,${btoa(svg)}`
}

// Example: filter markers within radius
export function filterMarkersByRadius(
  markers: MapMarker[],
  center: Coordinates,
  radius: number,
) {
  return markers.filter(
    (marker) => distanceBetween(marker.position, center) <= radius,
  )
}
