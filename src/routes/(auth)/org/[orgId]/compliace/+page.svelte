<script lang="ts">
  import { complianceStore } from "$lib/features/compliance/stores/compliance.store"
  import GlassCard from "$lib/components/GlassCard.svelte"
  import Chart from "$lib/components/Chart.svelte"
  import { writable, get } from "svelte/store"
  import L from "leaflet"
  import { onMount } from "svelte"

  let alerts = []
  complianceStore.subscribe((v) => (alerts = v))

  // Filtered vehicles with GPS (assuming complianceStore includes gpsLat/gpsLng)
  // 1. flaggedVehicles – pure derived value → use $derived
  let flaggedVehicles = $derived(
    alerts
      .filter(
        (a) =>
          a.status === "EXPIRED" ||
          a.status === "WARNING" ||
          a.status === "MEDIUM" ||
          a.status === "HIGH",
      )
      .map((a) => ({
        vehicle: a.vehicle,
        type: a.type,
        status: a.status,
        gpsLat: a.metadata?.gpsLat ?? 0,
        gpsLng: a.metadata?.gpsLng ?? 0,
      })),
  )

  // 2. globalTrend – this is a store that gets updated as a side effect
  //    → move the reactive assignment into $effect
  const globalTrend = writable<TrendItem[]>([]) // keep as writable store

  $effect(() => {
    // This runs whenever `alerts` changes (because alerts is read inside)
    globalTrend.set(getComplianceTrend(alerts))
  })

  // 3. Leaflet map references – no reactivity needed, just regular let
  //    (they're usually set once in onMount or via bind:this)
  let mapContainer: HTMLDivElement
  let mapInstance: L.Map | undefined

  onMount(() => {
    if (!mapContainer) return

    // Initialize map
    mapInstance = L.map(mapContainer).setView([1.2921, 36.8219], 12) // Default Nairobi

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors",
    }).addTo(mapInstance)

    // Add markers for flagged vehicles
    flaggedVehicles.forEach((v) => {
      if (!v.gpsLat || !v.gpsLng) return
      const color =
        v.status === "EXPIRED"
          ? "red"
          : v.status === "WARNING"
            ? "orange"
            : "blue"
      const marker = L.circleMarker([v.gpsLat, v.gpsLng], {
        color,
        radius: 8,
        fillOpacity: 0.8,
      }).addTo(mapInstance)
      marker.bindPopup(
        `<strong>${v.vehicle}</strong><br>Status: ${v.status}<br>Type: ${v.type}`,
      )
    })
  })
</script>

<h2 class="text-3xl font-bold mb-6">Compliance Monitoring</h2>

<!-- Global Compliance Trend -->
<GlassCard class="mb-6">
  <h3 class="text-xl font-semibold mb-2">Compliance Overview</h3>
  <p class="text-gray-600 mb-4">
    Global view of compliance alerts across all vehicles
  </p>
  <Chart data={$globalTrend} type="line" class="h-40" />
</GlassCard>

<!-- Summary Cards -->
<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
  <GlassCard>
    <h4 class="font-semibold mb-1">Total Alerts</h4>
    <p class="text-2xl font-bold">{alerts.length}</p>
  </GlassCard>
  <GlassCard>
    <h4 class="font-semibold mb-1">Critical Alerts</h4>
    <p class="text-2xl font-bold">
      {alerts.filter((a) => a.status === "EXPIRED" || a.status === "WARNING")
        .length}
    </p>
  </GlassCard>
  <GlassCard>
    <h4 class="font-semibold mb-1">Vehicles Monitored</h4>
    <p class="text-2xl font-bold">
      {[...new Set(alerts.map((a) => a.vehicle))].length}
    </p>
  </GlassCard>
</div>

<!-- Map for flagged vehicles -->
<GlassCard class="mb-6">
  <h3 class="text-xl font-semibold mb-2">Flagged Vehicles Map</h3>
  <p class="text-gray-600 mb-2">
    Vehicles with warnings or expired compliance items
  </p>
  <div bind:this={mapContainer} class="w-full h-96 rounded-2xl shadow-md"></div>
</GlassCard>

<!-- Per-Vehicle Compliance Cards -->
<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  {#each flaggedVehicles as v}
    <GlassCard>
      <div class="flex justify-between items-center mb-2">
        <h4 class="font-semibold">{v.vehicle}</h4>
        <span class="text-gray-600"
          >{alerts.filter((a) => a.vehicle === v.vehicle).length} alerts</span
        >
      </div>
      <div class="text-sm text-gray-500">
        {alerts
          .filter((a) => a.vehicle === v.vehicle)
          .map((a) => `${a.type}: ${a.status}`)
          .join(" | ")}
      </div>
    </GlassCard>
  {/each}
</div>
