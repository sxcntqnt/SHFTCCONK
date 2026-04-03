import { writable, derived } from "svelte/store"
import type {
  MapState,
  MapLayer,
  MapMarker,
  MapRoute,
  Geofence,
  Coordinates,
} from "$lib/map/types/MapTypes"

// ── Map viewport state ────────────────────────────────────────────────────────

export const defaultCenter: Coordinates = { lat: -1.286, lng: 36.817 } // Nairobi CBD

export const mapState = writable<MapState>({
  center: defaultCenter,
  zoom: 12,
  layers: [],
})

export function setCenter(center: Coordinates) {
  mapState.update((s) => ({ ...s, center }))
}

export function setZoom(zoom: number) {
  mapState.update((s) => ({ ...s, zoom }))
}

export function selectMarker(marker: MapMarker | undefined) {
  mapState.update((s) => ({ ...s, selectedMarker: marker }))
}

// ── Layers (legacy layer-based marker system) ─────────────────────────────────

export function addMarkerToLayer(layerId: string, marker: MapMarker) {
  mapState.update((s) => ({
    ...s,
    layers: s.layers.map((layer) =>
      layer.id === layerId
        ? { ...layer, markers: [...layer.markers, marker] }
        : layer,
    ),
  }))
}

export function toggleLayerVisibility(layerId: string) {
  mapState.update((s) => ({
    ...s,
    layers: s.layers.map((layer) =>
      layer.id === layerId ? { ...layer, visible: !layer.visible } : layer,
    ),
  }))
}

// ── Standalone layer store (MapLayerStore merged in) ─────────────────────────
//
// Keeping this separate from mapState.layers lets components add/remove
// MapLibre-backed layers without touching viewport state.

export const layers = writable<MapLayer[]>([])

export const visibleLayers = derived(
  [layers, mapState],
  ([$layers, $mapState]) => $mapState.layers.filter((l) => l.visible),
)

export function addLayer(layer: MapLayer) {
  layers.update((l) => [...l, layer])
}

export function removeLayer(id: string) {
  layers.update((l) => l.filter((layer) => layer.id !== id))
}

// ── Geofences ─────────────────────────────────────────────────────────────────

export const geofences = writable<Geofence[]>([])

export function addGeofence(g: Geofence) {
  geofences.update((list) => [...list, g])
}

export function removeGeofence(id: string) {
  geofences.update((list) => list.filter((g) => g.id !== id))
}

export function updateGeofence(
  id: string,
  patch: Partial<Omit<Geofence, "id">>,
) {
  geofences.update((list) =>
    list.map((g) => (g.id === id ? { ...g, ...patch } : g)),
  )
}

/** Ready-to-use GeoJSON for the MapLibre geofence source. */
export const geofencesGeoJSON = derived(geofences, ($geofences) => ({
  type: "FeatureCollection" as const,
  features: $geofences.map((g) => {
    // Point geofence
    if (g.coords.length === 1) {
      return {
        type: "Feature" as const,
        id: g.id,
        properties: { name: g.name, id: g.id },
        geometry: {
          type: "Point" as const,
          coordinates: [g.coords[0].lng, g.coords[0].lat],
        },
      }
    }
    // Polygon — close ring if not already closed
    const ring = g.coords.map((c) => [c.lng, c.lat] as [number, number])
    const first = ring[0]
    const last = ring[ring.length - 1]
    if (first[0] !== last[0] || first[1] !== last[1]) ring.push(first)
    return {
      type: "Feature" as const,
      id: g.id,
      properties: { name: g.name, id: g.id },
      geometry: { type: "Polygon" as const, coordinates: [ring] },
    }
  }),
}))

// ── Routes ────────────────────────────────────────────────────────────────────

export const mapRoutes = writable<MapRoute[]>([])

export function addRoute(r: MapRoute) {
  mapRoutes.update((list) => [...list, r])
}

export function removeRoute(id: string) {
  mapRoutes.update((list) => list.filter((r) => r.id !== id))
}

/** Ready-to-use GeoJSON for the MapLibre routes source. */
export const routesGeoJSON = derived(mapRoutes, ($routes) => ({
  type: "FeatureCollection" as const,
  features: $routes
    .filter((r) => r.path.length >= 2)
    .map((r) => ({
      type: "Feature" as const,
      id: r.id,
      properties: {
        id: r.id,
        color: r.color ?? "#f26522",
        weight: r.weight ?? 4,
        opacity: r.opacity ?? 0.8,
      },
      geometry: {
        type: "LineString" as const,
        coordinates: r.path.map((p) => [p.lng, p.lat]),
      },
    })),
}))

// ── Standalone markers (vehicle dots, POIs, etc.) ─────────────────────────────
//
// Separate from the layer-based mapState.layers.markers system — these are
// rendered as individual maplibregl.Marker HTML elements via <Marker />.

export const mapMarkers = writable<MapMarker[]>([])

export function addMarker(m: MapMarker) {
  mapMarkers.update((list) => [...list, m])
}

export function removeMarker(id: string) {
  mapMarkers.update((list) => list.filter((m) => m.id !== id))
}

export function updateMarker(
  id: string,
  patch: Partial<Omit<MapMarker, "id">>,
) {
  mapMarkers.update((list) =>
    list.map((m) => (m.id === id ? { ...m, ...patch } : m)),
  )
}
