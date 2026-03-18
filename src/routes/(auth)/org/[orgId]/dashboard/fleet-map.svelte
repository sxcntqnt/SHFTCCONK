<script lang="ts">
  /**
   * fleet-map.svelte
   *
   * FIXES:
   *   - `L.icon()` called at module level BEFORE L was imported.
   *     L is only available inside onMount (dynamic import).
   *     Icons are now created inside onMount after `await import('leaflet')`.
   *   - `fleet` store import → correct export name `fleetStore`
   *   - `map` and `markers` declared outside updateMarkers so
   *     onDestroy can access them (were block-scoped before)
   *   - Svelte 5: no changes needed — onMount/onDestroy still valid
   */

  import { onMount, onDestroy } from "svelte"
  import { get } from "svelte/store"
  import { fleetStore, type Vehicle } from "$lib/features/fleet/fleet.store"

  const NAIROBI_CENTER: [number, number] = [-1.2921, 36.8219]

  // Declared outside onMount so onDestroy can clean them up
  let map: any = null
  let markers: Record<string, any> = {}
  let unsubscribe: (() => void) | null = null
  let hasInitializedBounds = false

  onMount(async () => {
    // FIX: L is only available here — all L.icon() calls moved inside
    const L = await import("leaflet")
    await import("leaflet/dist/leaflet.css")

    // Icons defined AFTER L is available
    const activeIcon = L.icon({
      iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
      shadowUrl:
        "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      iconSize: [25, 41],
      iconAnchor: [12, 41],
    })

    const inactiveIcon = L.icon({
      iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
      shadowUrl:
        "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      className: "opacity-50",
    })

    map = L.map("fleet-map", { zoomControl: true }).setView(NAIROBI_CENTER, 12)

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "© OpenStreetMap contributors",
    }).addTo(map)

    function updateMarkers(vehicles: Vehicle[]) {
      const bounds: [number, number][] = []
      const currentIds = new Set(vehicles.map((v) => v.id))

      // Remove stale markers
      Object.keys(markers).forEach((id) => {
        if (!currentIds.has(id)) {
          map.removeLayer(markers[id])
          delete markers[id]
        }
      })

      vehicles.forEach((vehicle) => {
        if (!vehicle.gpsLat || !vehicle.gpsLng) return
        const position: [number, number] = [vehicle.gpsLat, vehicle.gpsLng]
        bounds.push(position)

        if (markers[vehicle.id]) {
          markers[vehicle.id].setLatLng(position)
        } else {
          markers[vehicle.id] = L.marker(position, {
            icon: vehicle.active ? activeIcon : inactiveIcon,
          }).addTo(map).bindPopup(`
              <div style="font-family:sans-serif;font-size:13px">
                <strong>${vehicle.regNumber}</strong><br/>
                Status: ${vehicle.status}<br/>
                ${vehicle.active ? "🟢 Active" : "🔴 Inactive"}
              </div>
            `)
        }
      })

      if (!hasInitializedBounds && bounds.length > 0) {
        map.fitBounds(bounds, { padding: [40, 40] })
        hasInitializedBounds = true
      }
    }

    // Initial render from current store state
    updateMarkers(get(fleetStore))

    // Subscribe to live updates
    unsubscribe = fleetStore.subscribe(updateMarkers)
  })

  onDestroy(() => {
    unsubscribe?.()
    Object.values(markers).forEach((m) => m?.remove())
    markers = {}
    map?.remove()
    map = null
  })
</script>

<div
  id="fleet-map"
  style="width:100%; height:500px; border-radius:14px; overflow:hidden; border:1px solid rgba(255,255,255,.08)"
></div>
