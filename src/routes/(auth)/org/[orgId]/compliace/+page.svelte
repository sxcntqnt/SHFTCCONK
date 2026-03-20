<script lang="ts">
  import { onDestroy } from "svelte"
  import {
    complianceEventStore,
    complianceAlertStore,
  } from "$lib/features/compliance/stores/compliance"
  import GlassCard from "$lib/components/GlassCard.svelte"
  import Chart from "$lib/components/Chart.svelte"
  import DuckDBTileProvider from "$lib/components/DuckDBTileProvider.svelte"

  // ── Page data (from +page.server.ts) ────────────────────────────────────
  interface Props {
    data: {
      parquetUrl: string | null
      vehicleCount: number
      alertsCount: number
      orgId: string
      error?: string
    }
  }

  let { data }: Props = $props()

  // ── Store reads (client-only, correct store names) ───────────────────────
  // complianceEventStore → unresolved compliance events with severity
  // complianceAlertStore → per-vehicle expiry alerts
  let events = $state($complianceEventStore)
  let alerts = $state($complianceAlertStore)

  $effect(() => {
    const unsubE = complianceEventStore.subscribe((v) => (events = v))
    const unsubA = complianceAlertStore.subscribe((v) => (alerts = v))
    return () => {
      unsubE()
      unsubA()
    }
  })

  // ── Derived values ───────────────────────────────────────────────────────
  const criticalEvents = $derived(
    events.filter((e) => e.severity === "HIGH" || e.severity === "MEDIUM"),
  )

  const flaggedVehicles = $derived(
    alerts.filter((a) => a.status === "EXPIRED" || a.status === "WARNING"),
  )

  const uniqueVehicles = $derived(new Set(events.map((e) => e.vehicleId)).size)

  // ── MapLibre instance ────────────────────────────────────────────────────
  // Map is created AFTER DuckDBTileProvider fires onReady — the duckdb. protocol
  // must be registered before the map style references it.
  let mapContainer: HTMLDivElement
  let mapInstance: any

  function initMap() {
    if (!mapContainer || !data.parquetUrl || mapInstance) return

    import("maplibre-gl").then((mod) => {
      const maplibregl = mod.default

      mapInstance = new maplibregl.Map({
        container: mapContainer,
        style: {
          version: 8,
          sources: {
            vehicleTiles: {
              type: "vector",
              // duckdb. protocol is registered by DuckDBTileProvider before onReady fires
              tiles: [`duckdb.${data.parquetUrl}?z={z}&x={x}&y={y}`],
              minzoom: 0,
              maxzoom: 14,
            },
          },
          layers: [
            {
              id: "vehicles-layer",
              type: "circle",
              source: "vehicleTiles",
              "source-layer": "default",
              paint: {
                "circle-radius": [
                  "interpolate",
                  ["linear"],
                  ["zoom"],
                  8,
                  4,
                  14,
                  8,
                ],
                "circle-color": [
                  "match",
                  ["get", "status"],
                  "EXPIRED",
                  "#ef4444",
                  "WARNING",
                  "#f59e0b",
                  "HIGH",
                  "#f97316",
                  "MEDIUM",
                  "#3b82f6",
                  /* default */ "#10b981",
                ],
                "circle-opacity": 0.85,
                "circle-stroke-width": 1,
                "circle-stroke-color": "#ffffff",
              },
            },
          ],
        },
        center: [36.8219, -1.2921], // Nairobi
        zoom: 11,
      })

      // ── Popup on click ─────────────────────────────────────────────────
      mapInstance.on("click", "vehicles-layer", (e: any) => {
        const feature = e.features?.[0]
        if (!feature) return
        const { name, status, type } = feature.properties
        new maplibregl.Popup()
          .setLngLat(e.lngLat)
          .setHTML(
            `
            <strong>${name}</strong><br/>
            Status: <b>${status}</b><br/>
            Type: ${type}
          `,
          )
          .addTo(mapInstance)
      })

      mapInstance.on("mouseenter", "vehicles-layer", () => {
        mapInstance.getCanvas().style.cursor = "pointer"
      })
      mapInstance.on("mouseleave", "vehicles-layer", () => {
        mapInstance.getCanvas().style.cursor = ""
      })
    })
  }

  function handleProviderError(err: Error) {
    console.error("[compliance map] DuckDB init failed:", err)
  }

  onDestroy(() => {
    mapInstance?.remove()
    mapInstance = undefined
  })
</script>

<h2 class="text-3xl font-bold mb-6">Compliance Monitoring</h2>

<!-- Error banner (from server load) -->
{#if data.error}
  <GlassCard class="mb-6 bg-red-50 border-red-200">
    <div class="text-red-800 p-4">
      <h3 class="font-semibold mb-1">Data Error</h3>
      <p>{data.error}</p>
    </div>
  </GlassCard>
{/if}

<!-- Summary cards ─────────────────────────────────────────────────────── -->
<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
  <GlassCard>
    <h4 class="font-semibold mb-1">Total Events</h4>
    <p class="text-2xl font-bold">{events.length}</p>
  </GlassCard>

  <GlassCard>
    <h4 class="font-semibold mb-1">Critical</h4>
    <p class="text-2xl font-bold text-red-600">{criticalEvents.length}</p>
  </GlassCard>

  <GlassCard>
    <h4 class="font-semibold mb-1">Vehicles Monitored</h4>
    <!-- prefer server count (accurate); fall back to derived from store -->
    <p class="text-2xl font-bold">{data.vehicleCount || uniqueVehicles}</p>
  </GlassCard>

  <GlassCard>
    <h4 class="font-semibold mb-1">Flagged Vehicles</h4>
    <p class="text-2xl font-bold text-amber-600">{flaggedVehicles.length}</p>
  </GlassCard>
</div>

<!-- Map ────────────────────────────────────────────────────────────────── -->
<GlassCard class="mb-6">
  <h3 class="text-xl font-semibold mb-2">Flagged Vehicles Map</h3>
  <p class="text-gray-600 mb-4">
    Live positions sourced from DuckDB WASM — zoom to adjust aggregation
  </p>

  <div class="relative w-full h-96 rounded-2xl overflow-hidden shadow-md">
    {#if data.parquetUrl}
      <!--
        DuckDBTileProvider:
          1. Boots DuckDB WASM + spatial + h3 extensions
          2. Caches the parquet file in tile_cache table
          3. Registers the "duckdb." MapLibre protocol
          4. Fires onReady → initMap() creates the MapLibre map

        Stage 1 swap: add H3 aggregation SQL inside DuckDBTileProvider
        Stage 3 swap: add <RealtimeOverlay> as a sibling below the map div
      -->
      <DuckDBTileProvider
        parquetUrl={data.parquetUrl}
        onReady={initMap}
        onError={handleProviderError}
      />
      <div bind:this={mapContainer} class="absolute inset-0 w-full h-full" />
    {:else}
      <div class="absolute inset-0 flex items-center justify-center bg-gray-50">
        <p class="text-gray-500">No GPS data available for this organisation</p>
      </div>
    {/if}
  </div>
</GlassCard>

<!-- Per-vehicle alert cards ────────────────────────────────────────────── -->
{#if flaggedVehicles.length > 0}
  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
    {#each flaggedVehicles as alert}
      <GlassCard>
        <div class="flex justify-between items-center mb-2">
          <h4 class="font-semibold">{alert.vehicleId}</h4>
          <span
            class="text-xs px-2 py-1 rounded-full font-medium"
            class:bg-red-100={alert.status === "EXPIRED"}
            class:text-red-800={alert.status === "EXPIRED"}
            class:bg-amber-100={alert.status === "WARNING"}
            class:text-amber-800={alert.status === "WARNING"}
          >
            {alert.status}
          </span>
        </div>
        <p class="text-sm text-gray-500">
          {alert.type} — expires {alert.expiryDate}
        </p>
      </GlassCard>
    {/each}
  </div>
{/if}

<style>
  :global(.maplibregl-map) {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
  }

  :global(.maplibregl-popup-content) {
    border-radius: 8px;
    font-size: 13px;
  }
</style>
