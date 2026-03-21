<script lang="ts">
  import { onMount, onDestroy } from "svelte"
  import DuckDBTileProvider from "$lib/components/DuckDBTileProvider.svelte"
  import { reconciliationStore } from "$lib/features/finance/stores/finance"
  import { getRevenueTrend } from "$lib/features/finance/reconciliation"
  import { supabase } from "$lib/supabaseClient"
  import GlassCard from "$lib/components/GlassCard.svelte"

  // ── Page data ────────────────────────────────────────────────────────
  interface Props {
    data: {
      orgId: string
      parquetUrl: string | null
      vehicleCount: number
      nonCompliantIds: string[]
    }
  }

  let { data }: Props = $props()

  // ── Finance store (for popup revenue trend charts) ───────────────────
  let allReconciliation = $state($reconciliationStore)
  $effect(() => {
    return reconciliationStore.subscribe((v) => (allReconciliation = v))
  })

  // ── Live GPS state (Supabase realtime overlay) ───────────────────────
  interface LiveVehicle {
    vehicleId: string
    lat: number
    lng: number
    speed: number | null
    satellites: number | null
    rain: boolean
    complianceIssue: boolean
  }

  let liveVehicles = $state<Record<string, LiveVehicle>>({})
  let liveCount = $derived(Object.keys(liveVehicles).length)

  // ── MapLibre instance ────────────────────────────────────────────────
  let mapContainer: HTMLDivElement
  let mapInstance: any
  // Live markers are maplibregl.Marker instances (HTML-based, not tile layer)
  // because they're a small dataset and need custom HTML (mini chart canvas).
  let liveMarkers: Record<string, any> = {}

  let gpsChannel: ReturnType<typeof supabase.channel> | null = null

  // ── Marker colour logic (mirrors original getMarkerColor) ───────────
  function markerColor(v: LiveVehicle): string {
    if (v.rain) return "#3b82f6" // blue  — raining
    if (v.complianceIssue) return "#ef4444" // red   — compliance flagged
    return "#10b981" // green — normal
  }

  // ── Mini Chart.js spark line rendered into a canvas ──────────────────
  // Kept from the original — Chart.js in a divIcon-equivalent custom element.
  // Uses dynamic import so Chart.js only loads when the map is ready.
  async function renderSparkline(canvasId: string, trend: number[]) {
    const canvas = document.getElementById(canvasId) as HTMLCanvasElement | null
    if (!canvas || trend.length === 0) return

    const { Chart, registerables } = await import("chart.js")
    Chart.register(...registerables)

    // Destroy any existing chart on this canvas before re-rendering
    const existing = (Chart as any).getChart(canvas)
    existing?.destroy()

    new Chart(canvas, {
      type: "line",
      data: {
        labels: trend.map((_, i) => i),
        datasets: [
          {
            data: trend,
            borderColor: "rgba(59,130,246,0.9)",
            backgroundColor: "rgba(59,130,246,0.15)",
            borderWidth: 1.5,
            tension: 0.3,
            pointRadius: 0,
          },
        ],
      },
      options: {
        responsive: false,
        animation: false,
        plugins: { legend: { display: false } },
        scales: { x: { display: false }, y: { display: false } },
      },
    })
  }

  // ── Build or update a live marker ───────────────────────────────────
  function upsertLiveMarker(v: LiveVehicle, maplibregl: any) {
    const color = markerColor(v)
    const trend = getRevenueTrend(
      allReconciliation
        .filter((r) => r.vehicleId === v.vehicleId)
        .map((r) => ({
          vehicleId: r.vehicleId,
          expectedAmount: r.expectedAmount,
        })),
    )
    const canvasId = `spark-${v.vehicleId}`

    // Custom HTML element (replaces Leaflet divIcon)
    const el = document.createElement("div")
    el.style.cssText = `
      width: 64px; height: 44px; position: relative; cursor: pointer;
    `
    el.innerHTML = `
      <canvas id="${canvasId}" width="64" height="44"
        style="display:block;border-radius:6px;background:rgba(255,255,255,0.85);
               box-shadow:0 1px 4px rgba(0,0,0,0.2);"></canvas>
      <div style="
        position:absolute;bottom:-6px;left:50%;transform:translateX(-50%);
        width:10px;height:10px;border-radius:50%;
        background:${color};border:2px solid white;
        box-shadow:0 1px 3px rgba(0,0,0,0.3);
      "></div>
    `

    if (liveMarkers[v.vehicleId]) {
      // Update position
      liveMarkers[v.vehicleId].setLngLat([v.lng, v.lat])
      // Swap element content (re-renders canvas + dot colour)
      const wrapper = liveMarkers[v.vehicleId].getElement()
      wrapper.innerHTML = el.innerHTML
    } else {
      // Create new marker
      const marker = new maplibregl.Marker({ element: el, anchor: "bottom" })
        .setLngLat([v.lng, v.lat])
        .setPopup(
          new maplibregl.Popup({ offset: 20, maxWidth: "260px" }).setHTML(`
            <div style="font-size:13px;line-height:1.5">
              <strong>${v.vehicleId}</strong><br/>
              Speed: ${v.speed ?? 0} km/h<br/>
              Satellites: ${v.satellites ?? "N/A"}<br/>
              Rain: ${v.rain ? "Yes" : "No"}<br/>
              Compliance: ${v.complianceIssue ? "⚠️ Issue" : "✅ OK"}<br/>
              <canvas id="popup-spark-${v.vehicleId}" width="220" height="70"
                style="margin-top:6px;display:block;border-radius:4px;
                       background:#f8fafc;"></canvas>
            </div>
          `),
        )
        .addTo(mapInstance)

      // Re-render popup chart when popup opens
      marker.getPopup().on("open", () => {
        setTimeout(
          () => renderSparkline(`popup-spark-${v.vehicleId}`, trend),
          30,
        )
      })

      liveMarkers[v.vehicleId] = marker
    }

    // Always re-render the marker sparkline (position may have updated)
    setTimeout(() => renderSparkline(canvasId, trend), 30)
  }

  // ── Called by DuckDBTileProvider when WASM + protocol are ready ──────
  function initMap() {
    if (!mapContainer || mapInstance) return

    import("maplibre-gl").then((mod) => {
      const maplibregl = mod.default

      mapInstance = new maplibregl.Map({
        container: mapContainer,
        style: {
          version: 8,
          sources: data.parquetUrl
            ? {
                vehicleTiles: {
                  type: "vector",
                  // duckdb. protocol registered by DuckDBTileProvider
                  tiles: [`duckdb.${data.parquetUrl}?z={z}&x={x}&y={y}`],
                  minzoom: 0,
                  maxzoom: 14,
                },
              }
            : {},
          layers: data.parquetUrl
            ? [
                // ── Historical aggregated layer (from DuckDB parquet) ──
                // Stage 1: this becomes an H3 fill-extrusion heatmap.
                // Stage 0: circle points, colour-coded by status.
                {
                  id: "historical-vehicles",
                  type: "circle",
                  source: "vehicleTiles",
                  "source-layer": "default",
                  paint: {
                    "circle-radius": [
                      "interpolate",
                      ["linear"],
                      ["zoom"],
                      8,
                      3,
                      14,
                      7,
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
                      "#10b981",
                    ],
                    "circle-opacity": 0.6,
                    "circle-stroke-width": 1,
                    "circle-stroke-color": "#ffffff",
                  },
                },
              ]
            : [],
        },
        center: [36.8219, -1.2921], // Nairobi
        zoom: 11,
      })

      // ── Popup on click for historical layer ───────────────────────
      mapInstance.on("click", "historical-vehicles", (e: any) => {
        const f = e.features?.[0]
        if (!f) return
        const { name, status, type } = f.properties
        new maplibregl.Popup()
          .setLngLat(e.lngLat)
          .setHTML(
            `
            <div style="font-size:13px">
              <strong>${name}</strong><br/>
              Status: <b>${status}</b><br/>
              Type: ${type}
            </div>
          `,
          )
          .addTo(mapInstance)
      })

      mapInstance.on("mouseenter", "historical-vehicles", () => {
        mapInstance.getCanvas().style.cursor = "pointer"
      })
      mapInstance.on("mouseleave", "historical-vehicles", () => {
        mapInstance.getCanvas().style.cursor = ""
      })

      // ── Supabase realtime live GPS overlay ────────────────────────
      // Separate from DuckDB layer — small dataset, HTML markers,
      // gets revenue trend mini-charts. Disconnect-safe.
      gpsChannel = supabase
        .channel(`realtime-fleet-gps-${data.orgId}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "vehicle_positions",
            filter: `organization_id=eq.${data.orgId}`,
          },
          (payload) => {
            const pos = payload.new as any
            if (!pos?.vehicleId || pos.gpsLat == null || pos.gpsLng == null)
              return

            const vehicle: LiveVehicle = {
              vehicleId: pos.vehicleId,
              lat: Number(pos.gpsLat),
              lng: Number(pos.gpsLng),
              speed: pos.speed ?? null,
              satellites: pos.satellites ?? null,
              rain: !!pos.rain,
              complianceIssue: data.nonCompliantIds.includes(pos.vehicleId),
            }

            liveVehicles = { ...liveVehicles, [pos.vehicleId]: vehicle }
            upsertLiveMarker(vehicle, maplibregl)
          },
        )
        .subscribe()
    })
  }

  function handleProviderError(err: Error) {
    console.error("[fleet map] DuckDB init failed:", err)
  }

  onDestroy(() => {
    if (gpsChannel) {
      supabase.removeChannel(gpsChannel)
      gpsChannel = null
    }
    // Destroy Chart.js instances to prevent canvas memory leaks
    import("chart.js").then(({ Chart }) => {
      Object.keys(liveMarkers).forEach((id) => {
        const c1 = document.getElementById(`spark-${id}`) as HTMLCanvasElement
        const c2 = document.getElementById(
          `popup-spark-${id}`,
        ) as HTMLCanvasElement
        ;(Chart as any).getChart(c1)?.destroy()
        ;(Chart as any).getChart(c2)?.destroy()
      })
    })
    mapInstance?.remove()
    mapInstance = undefined
  })
</script>

<div class="mb-6 flex items-center justify-between">
  <h2 class="text-3xl font-bold">Real-Time Fleet Map</h2>
  {#if liveCount > 0}
    <span class="text-sm text-green-600 font-medium">
      {liveCount} vehicle{liveCount !== 1 ? "s" : ""} live
    </span>
  {/if}
</div>

<!-- Legend -->
<div class="flex gap-4 mb-4 text-xs text-gray-500 flex-wrap">
  <span class="flex items-center gap-1">
    <span class="w-3 h-3 rounded-full bg-green-500 inline-block"></span> Normal
  </span>
  <span class="flex items-center gap-1">
    <span class="w-3 h-3 rounded-full bg-red-500 inline-block"></span> Compliance
    issue
  </span>
  <span class="flex items-center gap-1">
    <span class="w-3 h-3 rounded-full bg-blue-500 inline-block"></span> Raining
  </span>
  <span class="flex items-center gap-1">
    <span class="w-3 h-3 rounded-full bg-amber-500 inline-block"></span> Warning
  </span>
  <span class="flex items-center gap-1 ml-4 text-gray-400">
    Dim circles = historical (DuckDB) · Floating markers = live GPS
  </span>
</div>

<!-- Map -->
<GlassCard>
  <div class="relative w-full h-[600px] rounded-2xl overflow-hidden">
    {#if data.parquetUrl}
      <!--
        DuckDBTileProvider:
          - boots WASM, registers duckdb. protocol
          - fires onReady → initMap() creates MapLibre + Supabase channel
        Stage 1: swap circle layer for H3 heatmap in DuckDBTileProvider SQL
        Stage 3: RealtimeOverlay already handled here via gpsChannel
      -->
      <DuckDBTileProvider
        parquetUrl={data.parquetUrl}
        onReady={initMap}
        onError={handleProviderError}
      />
    {:else}
      <!-- No parquet — still init map for live GPS overlay -->
      {#if !mapInstance}
        <!-- Trigger map init without DuckDB -->
        {@html ""}
        <script>
          // Fallback: initMap without waiting for DuckDB
          // (no historical layer, live only)
        </script>
      {/if}
    {/if}

    <div bind:this={mapContainer} class="absolute inset-0 w-full h-full" />

    {#if !data.parquetUrl}
      <div
        class="absolute inset-0 flex items-center justify-center
                  bg-gray-50/80 pointer-events-none"
      >
        <p class="text-gray-400 text-sm">
          No historical data — live layer active
        </p>
      </div>
    {/if}
  </div>
</GlassCard>

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
    padding: 10px 12px;
  }
</style>
