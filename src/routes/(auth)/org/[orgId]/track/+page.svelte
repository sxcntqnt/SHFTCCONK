<!-- src/routes/(auth)/org/[orgId]/tracking/+page.svelte -->
<!--
  ORG TRACKING PAGE — Single vehicle live tracking for fleet staff.
  Distinct from:
    /org/[orgId]/map     → full fleet overview, all vehicles simultaneously
    /app/tracking        → passenger-facing, reserved matatu tracking

  DATA FLOW:
    Server (+page.server.ts): vehicle list for this org
    SSE (gps.client.ts):      live positions for all org vehicles
    DuckDB parquet:           3D building layer around selected vehicle

  LIVE GPS:
    SSE stream scoped to orgId — all vehicle positions received.
    Only the selected vehicle's marker is rendered on the map.
    Switching vehicles pans/flies to that vehicle's last known position.
-->
<script lang="ts">
  import { onMount, onDestroy } from "svelte"
  import { browser } from "$app/environment"
  import DuckDBTileProvider from "$lib/map/components/MapCache.svelte"
  import { getUserLocation } from "$lib/map/services/geolocation"
  import {
    initGpsClient,
    destroyGpsClient,
  } from "$lib/features/fleet/gps.client"
  import type { PageData } from "./$types"

  interface Props {
    data: PageData
  }
  let { data }: Props = $props()

  // ── Selected vehicle ───────────────────────────────────────────────────────

  let selectedVehicleId = $state<string | null>(data.vehicles?.[0]?.id ?? null)

  let selectedVehicle = $derived(
    data.vehicles?.find((v: any) => v.id === selectedVehicleId) ?? null,
  )

  // ── Live position state ────────────────────────────────────────────────────

  interface LivePosition {
    vehicleId: string
    plate: string
    lat: number
    lng: number
    speed: number | null
    heading: number | null
    satellites: number | null
    fixStatus: number | null
    rain: boolean
    timestamp: string | null
  }

  let livePositions = $state<Record<string, LivePosition>>({})

  let activeLive = $derived(
    selectedVehicleId ? (livePositions[selectedVehicleId] ?? null) : null,
  )

  let isLive = $derived(activeLive !== null)

  // ── Parquet / DuckDB ───────────────────────────────────────────────────────

  let parquetUrl = $state<string | null>(null)
  let tileLoading = $state(false)
  let tileError = $state<string | null>(null)

  // ── MapLibre refs ──────────────────────────────────────────────────────────

  let mapContainer: HTMLDivElement
  let mapInstance: any = null
  let liveMarker: any = null
  let mlRef: any = null

  // ── Helpers ────────────────────────────────────────────────────────────────

  function fixLabel(fx: number | null): string {
    if (fx === 0) return "No fix"
    if (fx === 2) return "2D fix"
    if (fx === 3) return "3D fix"
    return "Unknown"
  }

  function formatSpeed(s: number | null): string {
    if (s == null) return "—"
    return `${Math.round(s)} km/h`
  }

  function timeAgo(iso: string | null): string {
    if (!iso) return "—"
    const diff = Date.now() - new Date(iso).getTime()
    const s = Math.floor(diff / 1000)
    if (s < 60) return `${s}s ago`
    if (s < 3600) return `${Math.floor(s / 60)}m ago`
    return `${Math.floor(s / 3600)}h ago`
  }

  // ── Map init ───────────────────────────────────────────────────────────────

  function initMap(): void {
    if (!mapContainer || mapInstance || !browser) return

    import("maplibre-gl").then((mod) => {
      mlRef = mod.default

      const sources: Record<string, unknown> = {}
      const layers: unknown[] = []

      if (parquetUrl) {
        sources.buildingTiles = {
          type: "vector",
          tiles: [`duckdb.${parquetUrl}?z={z}&x={x}&y={y}`],
          minzoom: 0,
          maxzoom: 14,
        }
        layers.push({
          id: "building-layer",
          type: "fill-extrusion",
          source: "buildingTiles",
          "source-layer": "default",
          paint: {
            "fill-extrusion-color": "#1a1a2e",
            "fill-extrusion-height": ["coalesce", ["get", "height"], 10],
            "fill-extrusion-base": 0,
            "fill-extrusion-opacity": 0.8,
          },
        })
      }

      mapInstance = new mlRef.Map({
        container: mapContainer,
        style: {
          version: 8,
          glyphs: "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf",
          sources: {
            ...sources,
            protomaps: {
              type: "vector",
              tiles: [
                `https://api.protomaps.com/tiles/v4/{z}/{x}/{y}.mvt?key=${data.protomapsKey ?? ""}`,
              ],
              attribution: "© Protomaps © OpenStreetMap",
            },
          },
          layers: [
            {
              id: "background",
              type: "background",
              paint: { "background-color": "#0a0a0c" },
            },
            ...layers,
          ],
        },
        center: [36.8219, -1.2921],
        zoom: 14,
        pitch: 45,
        bearing: 0,
      })

      mapInstance
        .getContainer()
        .querySelector(".maplibregl-ctrl-attrib")
        ?.classList.add("maplibregl-compact")
    })
  }

  // ── DuckDB callbacks ───────────────────────────────────────────────────────

  function handleDuckDBReady(): void {
    initMap()
  }

  function handleDuckDBError(err: Error): void {
    console.error("[org-tracking] DuckDB failed:", err)
    tileError = "3D context unavailable"
    initMap()
  }

  // ── Live marker ────────────────────────────────────────────────────────────

  function updateMarker(pos: LivePosition): void {
    if (!mapInstance || !mlRef) return

    if (liveMarker) {
      liveMarker.setLngLat([pos.lng, pos.lat])
      return
    }

    const el = document.createElement("div")
    el.style.cssText = `
      width:44px;height:44px;border-radius:50%;cursor:pointer;
      background:rgba(0,0,0,0.8);border:3px solid #00b09b;
      display:flex;align-items:center;justify-content:center;
      transform:translate(-50%,-50%);
      box-shadow:0 0 20px #00b09b66,0 6px 20px rgba(0,0,0,0.5);
      backdrop-filter:blur(6px);
    `
    el.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
        stroke="#00b09b" stroke-width="2.5">
        <rect x="1" y="3" width="15" height="13"/>
        <path d="M16 8h4l3 3v5h-7z"/>
        <circle cx="5.5" cy="18.5" r="2.5"/>
        <circle cx="18.5" cy="18.5" r="2.5"/>
      </svg>
    `

    liveMarker = new mlRef.Marker({ element: el, anchor: "center" })
      .setLngLat([pos.lng, pos.lat])
      .addTo(mapInstance)

    mapInstance.flyTo({
      center: [pos.lng, pos.lat],
      zoom: 15,
      pitch: 45,
      duration: 1200,
    })
  }

  // ── Mount ──────────────────────────────────────────────────────────────────

  onMount(async () => {
    // Fetch parquet tile based on user location
    tileLoading = true
    try {
      const { lat, lng } = await getUserLocation()
      const params = new URLSearchParams({
        lat: String(lat),
        lng: String(lng),
        zoom: "14",
        orgId: data.orgId,
      })
      const res = await fetch(`/api/map/tiles?${params}`)
      if (res.ok) parquetUrl = URL.createObjectURL(await res.blob())
    } catch {
      try {
        const res = await fetch(
          `/api/map/tiles?lat=-1.2921&lng=36.8219&zoom=14&orgId=${data.orgId}`,
        )
        if (res.ok) parquetUrl = URL.createObjectURL(await res.blob())
      } catch (err) {
        console.warn("[org-tracking] Tile fetch failed:", err)
        tileError = "3D context unavailable"
        initMap()
      }
    } finally {
      tileLoading = false
    }

    // SSE stream — receive all org vehicles, render only selected
    initGpsClient(data.orgId, (update) => {
      const pos: LivePosition = {
        vehicleId: update.vehicleId,
        plate: String((update as any).plate ?? update.vehicleId),
        lat: update.lat,
        lng: update.lng,
        speed: update.speed ?? null,
        heading: (update as any).heading ?? null,
        satellites: (update as any).satellites ?? null,
        fixStatus: (update as any).fix_status ?? null,
        rain: Boolean((update as any).rain),
        timestamp: update.timestamp,
      }

      livePositions = { ...livePositions, [pos.vehicleId]: pos }

      if (pos.vehicleId === selectedVehicleId) {
        updateMarker(pos)
      }
    })

    return () => {
      destroyGpsClient()
      if (parquetUrl?.startsWith("blob:")) URL.revokeObjectURL(parquetUrl)
    }
  })

  // ── Pan to vehicle when selection changes ──────────────────────────────────

  $effect(() => {
    const vid = selectedVehicleId
    if (!vid || !mapInstance) return
    const pos = livePositions[vid]
    if (pos) {
      mapInstance.flyTo({
        center: [pos.lng, pos.lat],
        zoom: 15,
        pitch: 45,
        duration: 800,
      })
      liveMarker?.remove()
      liveMarker = null
      updateMarker(pos)
    }
  })

  // ── Cleanup ────────────────────────────────────────────────────────────────

  onDestroy(() => {
    liveMarker?.remove()
    mapInstance?.remove()
    mapInstance = undefined
  })
</script>

<svelte:head><title>Tracking — {data.orgName}</title></svelte:head>

<div class="track-page">
  <!-- Header -->
  <div class="track-hd">
    <div>
      <div class="track-eyebrow">
        <span class="live-dot {isLive ? 'active' : ''}"></span>
        {isLive ? "Live tracking active" : "Waiting for GPS signal…"}
      </div>
      <h1 class="track-title">Vehicle <em>Tracking</em></h1>
    </div>

    <!-- Vehicle selector -->
    <div class="vehicle-selector">
      {#each data.vehicles ?? [] as v}
        <button
          class="v-chip {selectedVehicleId === v.id ? 'active' : ''}"
          onclick={() => (selectedVehicleId = v.id)}
        >
          <span class="v-dot {livePositions[v.id] ? 'live' : ''}"></span>
          {v.registration ?? v.id}
        </button>
      {/each}
    </div>
  </div>

  <div class="track-body">
    <!-- Live stats panel -->
    <div class="stats-panel">
      <div class="panel-label">
        {selectedVehicle?.name ?? selectedVehicle?.registration ?? "—"}
      </div>

      <div class="stat-grid">
        <div class="stat">
          <div class="stat-val teal">
            {formatSpeed(activeLive?.speed ?? null)}
          </div>
          <div class="stat-lbl">Speed</div>
        </div>
        <div class="stat">
          <div class="stat-val">{activeLive?.satellites ?? "—"}</div>
          <div class="stat-lbl">Satellites</div>
        </div>
        <div class="stat">
          <div class="stat-val">{fixLabel(activeLive?.fixStatus ?? null)}</div>
          <div class="stat-lbl">GPS Fix</div>
        </div>
        <div class="stat">
          <div class="stat-val {activeLive?.rain ? 'blue' : ''}">
            {activeLive?.rain ? "Yes" : "No"}
          </div>
          <div class="stat-lbl">Rain</div>
        </div>
      </div>

      <div class="last-seen">
        Last update: {timeAgo(activeLive?.timestamp ?? null)}
      </div>

      {#if tileError}
        <div class="tile-warn">{tileError}</div>
      {/if}

      {#if tileLoading}
        <div class="tile-loading">
          <span class="tile-spinner"></span>
          Loading 3D context…
        </div>
      {/if}

      {#if activeLive}
        <div class="coords">
          <span>{activeLive.lat.toFixed(5)}</span>
          <span class="coords-sep">,</span>
          <span>{activeLive.lng.toFixed(5)}</span>
        </div>
      {/if}
    </div>

    <!-- Map -->
    <div class="map-wrap">
      {#if parquetUrl}
        <DuckDBTileProvider
          {parquetUrl}
          onReady={handleDuckDBReady}
          onError={handleDuckDBError}
        />
      {/if}

      <div bind:this={mapContainer} class="map-el"></div>

      {#if !isLive}
        <div class="no-signal">
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.5"
            opacity="0.25"
          >
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
          No live signal for {selectedVehicle?.registration ?? "this vehicle"}
        </div>
      {/if}
    </div>
  </div>
</div>

<style>
  .track-page {
    flex: 1;
    padding: 32px 40px;
    font-family: var(--font-body);
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  /* ── Header ── */
  .track-hd {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 16px;
    flex-wrap: wrap;
  }
  .track-eyebrow {
    font-size: 0.6rem;
    font-weight: 800;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--teal, #00b09b);
    display: flex;
    align-items: center;
    gap: 7px;
    margin-bottom: 6px;
  }
  .live-dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: var(--text-3);
    flex-shrink: 0;
  }
  .live-dot.active {
    background: var(--teal, #00b09b);
    animation: dot-pulse 2s ease-out infinite;
  }
  @keyframes dot-pulse {
    0% {
      box-shadow: 0 0 0 0 rgba(0, 176, 155, 0.5);
    }
    70% {
      box-shadow: 0 0 0 6px rgba(0, 176, 155, 0);
    }
    100% {
      box-shadow: 0 0 0 0 rgba(0, 176, 155, 0);
    }
  }
  .track-title {
    font-family: var(--font-display);
    font-size: clamp(1.4rem, 2vw, 1.9rem);
    font-weight: 900;
    letter-spacing: -0.05em;
    color: var(--text-1);
    line-height: 1.1;
  }
  .track-title em {
    font-style: normal;
    color: var(--teal, #00b09b);
  }

  /* Vehicle selector */
  .vehicle-selector {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
    align-items: center;
  }
  .v-chip {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 12px;
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 100px;
    font-family: var(--font-body);
    font-size: 0.72rem;
    font-weight: 700;
    color: var(--text-3);
    cursor: pointer;
    transition: all 0.15s;
    letter-spacing: 0.04em;
  }
  .v-chip:hover {
    background: rgba(255, 255, 255, 0.06);
    color: var(--text-1);
  }
  .v-chip.active {
    background: rgba(0, 176, 155, 0.1);
    border-color: rgba(0, 176, 155, 0.3);
    color: var(--teal, #00b09b);
  }
  .v-dot {
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: var(--text-3);
    flex-shrink: 0;
  }
  .v-dot.live {
    background: var(--teal, #00b09b);
    box-shadow: 0 0 4px #00b09b;
  }

  /* ── Body layout ── */
  .track-body {
    flex: 1;
    display: grid;
    grid-template-columns: 280px 1fr;
    gap: 14px;
    min-height: 0;
  }

  /* ── Stats panel ── */
  .stats-panel {
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid var(--rim, rgba(255, 255, 255, 0.07));
    border-radius: 18px;
    padding: 20px;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
  .panel-label {
    font-family: var(--font-display);
    font-size: 1rem;
    font-weight: 900;
    letter-spacing: -0.03em;
    color: var(--text-1);
  }
  .stat-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
  }
  .stat {
    background: rgba(255, 255, 255, 0.025);
    border: 1px solid rgba(255, 255, 255, 0.06);
    border-radius: 12px;
    padding: 10px 12px;
  }
  .stat-val {
    font-family: var(--font-display);
    font-size: 1.1rem;
    font-weight: 900;
    letter-spacing: -0.03em;
    color: var(--text-1);
    line-height: 1;
    margin-bottom: 3px;
  }
  .stat-val.teal {
    color: var(--teal, #00b09b);
  }
  .stat-val.blue {
    color: #3b82f6;
  }
  .stat-lbl {
    font-size: 0.56rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--text-3);
  }
  .last-seen {
    font-size: 0.68rem;
    color: var(--text-3);
  }
  .coords {
    font-family: "Courier New", monospace;
    font-size: 0.68rem;
    color: var(--text-3);
    display: flex;
    gap: 2px;
  }
  .coords-sep {
    opacity: 0.4;
  }
  .tile-warn {
    font-size: 0.65rem;
    color: #f87171;
    background: rgba(248, 113, 113, 0.08);
    border: 1px solid rgba(248, 113, 113, 0.18);
    border-radius: 8px;
    padding: 6px 10px;
  }
  .tile-loading {
    display: flex;
    align-items: center;
    gap: 7px;
    font-size: 0.65rem;
    color: var(--text-3);
  }
  .tile-spinner {
    width: 9px;
    height: 9px;
    border: 1.5px solid rgba(255, 255, 255, 0.15);
    border-top-color: var(--teal, #00b09b);
    border-radius: 50%;
    animation: spin 0.7s linear infinite;
    flex-shrink: 0;
  }
  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  /* ── Map ── */
  .map-wrap {
    position: relative;
    border-radius: 18px;
    overflow: hidden;
    background: var(--ink-2, #0f0f16);
    border: 1px solid var(--rim, rgba(255, 255, 255, 0.07));
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
  }
  .map-el {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
  }
  .no-signal {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    z-index: 5;
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 0.78rem;
    color: rgba(255, 255, 255, 0.22);
    pointer-events: none;
  }

  /* ── MapLibre overrides ── */
  :global(.maplibregl-ctrl-group) {
    background: rgba(15, 15, 22, 0.92) !important;
    border: 1px solid rgba(255, 255, 255, 0.08) !important;
    border-radius: 10px !important;
    backdrop-filter: blur(8px) !important;
  }
  :global(.maplibregl-ctrl-group button) {
    background: transparent !important;
    border-bottom: 1px solid rgba(255, 255, 255, 0.06) !important;
    color: rgba(255, 255, 255, 0.65) !important;
    transition:
      background 0.15s,
      color 0.15s !important;
  }
  :global(.maplibregl-ctrl-group button:last-child) {
    border-bottom: none !important;
  }
  :global(.maplibregl-ctrl-group button:hover) {
    background: rgba(0, 176, 155, 0.12) !important;
    color: #00b09b !important;
  }
  :global(.maplibregl-ctrl-attrib) {
    background: rgba(0, 0, 0, 0.55) !important;
    color: rgba(255, 255, 255, 0.3) !important;
    font-size: 9px !important;
    border-radius: 6px !important;
  }

  @media (max-width: 1024px) {
    .track-page {
      padding: 20px 16px;
    }
    .track-body {
      grid-template-columns: 1fr;
    }
    .stats-panel {
      order: 2;
    }
    .map-wrap {
      order: 1;
      min-height: 360px;
    }
  }
</style>
