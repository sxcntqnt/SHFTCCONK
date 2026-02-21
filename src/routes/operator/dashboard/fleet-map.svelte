<script lang="ts">
  import { onMount, onDestroy } from 'svelte'
  import { fleet, type Vehicle } from '$lib/stores/fleet'
  import { get } from 'svelte/store'
  import L from 'leaflet'

  let map: L.Map
  let markers: Record<string, L.Marker> = {}
  let unsubscribe: () => void
  let hasInitializedBounds = false

  const NAIROBI_CENTER: [number, number] = [-1.2921, 36.8219]

  /* ============================================================
     ICONS
  ============================================================ */

  const activeIcon = L.icon({
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41]
  })

  const inactiveIcon = L.icon({
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    className: 'opacity-50'
  })

  /* ============================================================
     MAP INIT
  ============================================================ */

  onMount(() => {
    map = L.map('fleet-map', {
      zoomControl: true,
      attributionControl: true
    }).setView(NAIROBI_CENTER, 12)

    L.tileLayer(
      'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      { maxZoom: 19 }
    ).addTo(map)

    // Initial render
    updateMarkers(get(fleet))

    // Reactive subscription
    unsubscribe = fleet.subscribe(updateMarkers)
  })

  /* ============================================================
     MARKER MANAGEMENT
  ============================================================ */

  function updateMarkers(vehicles: Vehicle[]) {
    const bounds: L.LatLngExpression[] = []

    const currentIds = new Set(vehicles.map(v => v.id))

    // Remove stale markers
    Object.keys(markers).forEach(id => {
      if (!currentIds.has(id)) {
        map.removeLayer(markers[id])
        delete markers[id]
      }
    })

    vehicles.forEach(vehicle => {
      const position: [number, number] = [
        vehicle.gpsLat,
        vehicle.gpsLng
      ]

      bounds.push(position)

      if (markers[vehicle.id]) {
        // Smooth position update
        markers[vehicle.id].setLatLng(position)
      } else {
        const marker = L.marker(position, {
          icon: vehicle.active ? activeIcon : inactiveIcon
        })
          .addTo(map)
          .bindPopup(`
            <div class="text-sm">
              <strong>${vehicle.regNumber}</strong><br/>
              Status: ${vehicle.active ? 'Active' : 'Inactive'}
            </div>
          `)

        markers[vehicle.id] = marker
      }
    })

    // Auto-fit on first load
    if (!hasInitializedBounds && bounds.length > 0) {
      map.fitBounds(bounds, { padding: [40, 40] })
      hasInitializedBounds = true
    }
  }

  /* ============================================================
     CLEANUP
  ============================================================ */

  onDestroy(() => {
    unsubscribe?.()
    Object.values(markers).forEach(marker => marker.remove())
    markers = {}
    map?.remove()
  })
</script>

<div
  id="fleet-map"
  class="w-full h-[600px] rounded-3xl shadow-xl border border-white/60 overflow-hidden"
/>