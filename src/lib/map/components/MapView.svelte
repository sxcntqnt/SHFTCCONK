<script lang="ts">
  import { onMount, onDestroy, createEventDispatcher } from "svelte"
  import { geofences } from "$lib/map/stores/MapStore"
  import type { Coordinates, Geofence } from "$lib/map/stores/MapStore"

  // ── Props ────────────────────────────────────────────────────────────────

  type Coordinates = { lat: number; lng: number }
  type Route = {
    id: string
    path: Coordinates[]
    color?: string
    weight?: number
    opacity?: number
  }

  let {
    initialCenter = { lat: 1.2921, lng: 36.8219 },
    initialZoom = 12,
    routes = [],
    nextName = "",
  }: {
    initialCenter?: Coordinates
    initialZoom?: number
    routes?: Route[]
    nextName?: string
  } = $props()

  const dispatch = createEventDispatcher()

  // ── Map & Layers ─────────────────────────────────────────────────────────
  let mapContainer: HTMLDivElement
  let mapInstance: L.Map | undefined
  let drawnItems: L.FeatureGroup
  let routeLayerGroup: L.FeatureGroup

  // Separate tracking for geofences only
  const drawnGeofenceIds = new Set<string>()

  onMount(async () => {
    if (typeof window === "undefined") return

    // Static imports (much more reliable)
    import("leaflet/dist/leaflet.css")
    import("leaflet-draw/dist/leaflet.draw.css")

    const L = await import("leaflet")
    await import("leaflet-draw")

    mapInstance = L.map(mapContainer, {
      center: initialCenter,
      zoom: initialZoom,
      zoomControl: true,
    })

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(mapInstance)

    // Force size recalculation after mount
    setTimeout(() => mapInstance?.invalidateSize(), 100)

    drawnItems = new L.FeatureGroup()
    mapInstance.addLayer(drawnItems)

    routeLayerGroup = new L.FeatureGroup()
    mapInstance.addLayer(routeLayerGroup)

    const drawControl = new L.Control.Draw({
      edit: { featureGroup: drawnItems },
      draw: {
        circle: false,
        circlemarker: false,
        marker: true,
        polygon: true,
        polyline: false,
        rectangle: true,
      },
    })
    mapInstance.addControl(drawControl)

    // ── Draw created handler ─────────────────────────────────────────────
    mapInstance.on("draw:created", (e: L.DrawEvents.Created) => {
      const layer = e.layer

      if (!nextName.trim()) {
        alert("Please enter a geofence name first")
        layer.remove()
        return
      }

      let coords: Coordinates[] = []

      if (layer instanceof L.Marker) {
        const ll = layer.getLatLng()
        coords = [{ lat: ll.lat, lng: ll.lng }]
      } else if (layer instanceof L.Rectangle || layer instanceof L.Polygon) {
        let latlngs: L.LatLng[] = []

        const raw = layer.getLatLngs()
        if (Array.isArray(raw) && raw.length > 0) {
          if (Array.isArray(raw[0])) {
            // Rectangle / simple polygon → first ring
            latlngs = raw[0] as L.LatLng[]
          } else {
            latlngs = raw as L.LatLng[]
          }
        }

        coords = latlngs.map((ll) => ({ lat: ll.lat, lng: ll.lng }))
      }

      if (coords.length === 0 || (coords.length < 3 && coords.length !== 1)) {
        alert("Invalid shape – need at least 3 points for polygon/rectangle")
        layer.remove()
        return
      }

      const newGeofence: Geofence = {
        id: crypto.randomUUID(),
        name: nextName.trim(),
        coords,
      }

      // Save to store
      geofences.update((list) => [...list, newGeofence])
      drawnGeofenceIds.add(newGeofence.id)

      // Create clean visual layer
      let visualLayer: L.Layer
      if (coords.length === 1) {
        visualLayer = L.marker([coords[0].lat, coords[0].lng]).bindPopup(
          `<strong>${newGeofence.name}</strong>`,
        )
      } else {
        visualLayer = L.polygon(
          coords.map((c) => [c.lat, c.lng]),
          { color: "#007aff", fillOpacity: 0.2, weight: 2 },
        ).bindPopup(`<strong>${newGeofence.name}</strong>`)
      }

      visualLayer.addTo(drawnItems)

      // Remove the temporary drawn layer
      layer.remove()

      // Reset input
      dispatch("created", newGeofence)
    })

    // ── Re-render stored geofences ───────────────────────────────────────
    const unsubscribe = geofences.subscribe((list) => {
      list.forEach((g) => {
        if (drawnGeofenceIds.has(g.id)) return

        const latlngs = g.coords.map((c) => [c.lat, c.lng] as [number, number])

        let layer: L.Layer
        if (latlngs.length === 1) {
          layer = L.marker(latlngs[0]).bindPopup(`<strong>${g.name}</strong>`)
        } else {
          layer = L.polygon(latlngs, {
            color: "#007aff",
            fillOpacity: 0.2,
            weight: 2,
          }).bindPopup(`<strong>${g.name}</strong>`)
        }

        layer.addTo(drawnItems)
        drawnGeofenceIds.add(g.id)
      })
    })

    return () => unsubscribe()
  })

  // ── Routes ───────────────────────────────────────────────────────────────
  $: if (mapInstance && routeLayerGroup && routes) {
    routeLayerGroup.clearLayers()
    routes.forEach((route) => {
      if (route.path.length < 2) return
      const latlngs = route.path.map((p) => [p.lat, p.lng] as [number, number])
      L.polyline(latlngs, {
        color: route.color || "#007aff",
        weight: route.weight || 4,
        opacity: route.opacity || 0.7,
      })
        .bindTooltip(`Route for matatu ${route.id}`, { sticky: true })
        .addTo(routeLayerGroup)
    })
  }

  onDestroy(() => {
    if (mapInstance) {
      mapInstance.remove()
    }
  })
</script>

<div bind:this={mapContainer} class="w-full h-full rounded-2xl shadow-lg"></div>

<style>
  .leaflet-container {
    width: 100%;
    height: 100%;
    border-radius: 1rem;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }
</style>
