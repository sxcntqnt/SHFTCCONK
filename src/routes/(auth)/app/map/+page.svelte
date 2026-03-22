<!-- src/routes/(auth)/org/[orgId]/map/+page.svelte -->
<!--
  SEPARATION OF CONCERNS — what was removed and why:
    reconciliationStore  → finance data has no place in a map view
    getRevenueTrend()    → revenue charts belong on /finance, not map markers
    Chart.js sparklines  → replaced with clean status-only popups
    supabase direct import → server already passes supabase via locals;
                             live GPS now uses Supabase realtime from page data
    GlassCard            → replaced with design-system panel styling
    Tailwind classes     → replaced with CSS matching the org layout aesthetic

  WHAT STAYS:
    DuckDBTileProvider   → historical aggregated vehicle layer (H3 / circles)
    Live GPS overlay     → Supabase realtime channel on vehicle_locations
    markerColor()        → rain / compliance / normal colour coding
    Popup on historical  → name, status, type from parquet properties
    Popup on live markers → plate, speed, satellites, rain, compliance

  LIVE GPS:
    Reads from vehicle_locations realtime channel (not vehicle_positions —
    that table doesn't exist; vehicle_locations is what gps/ingest writes to).
    Channel scoped to org via filter.
-->
<script lang="ts">
  import { onMount, onDestroy } from "svelte"
  import { browser } from "$app/environment"
  import DuckDBTileProvider from "$lib/map/components/MapCache.svelte"
  import type { PageData } from "./$types"

  interface Props {
    data: PageData
  }
  let { data }: Props = $props()

  // ── Live GPS state ────────────────────────────────────────────────────────

  interface LiveVehicle {
    vehicleId: string
    plate: string
    lat: number
    lng: number
    speed: number | null
    satellites: number | null
    fixStatus: number | null // 0=NO_FIX 2=2D 3=3D
    rain: boolean
    complianceIssue: boolean
  }

  let liveVehicles = $state<Record<string, LiveVehicle>>({})
  let liveCount = $derived(Object.keys(liveVehicles).length)
  let duckdbReady = $state(false)

  // ── MapLibre ──────────────────────────────────────────────────────────────

  let mapContainer: HTMLDivElement
  let mapInstance: any = null
  let liveMarkers: Record<string, any> = {}
  let gpsChannel: ReturnType<typeof data.supabase.channel> | null = null
  let mlRef: any = null // maplibregl module reference

  // ── Colour coding ─────────────────────────────────────────────────────────

  function markerColor(v: LiveVehicle): string {
    if (v.rain) return "#3b82f6" // blue  — raining
    if (v.complianceIssue) return "#ef4444" // red   — compliance flagged
    if (v.fixStatus === 0) return "#6b7280" // grey  — no GPS fix
    return "#00b09b" // teal  — normal
  }

  function fixLabel(fx: number | null): string {
    if (fx === 0) return "No fix"
    if (fx === 2) return "2D fix"
    if (fx === 3) return "3D fix"
    return "Unknown"
  }

  // ── Marker builder ────────────────────────────────────────────────────────

  function upsertLiveMarker(v: LiveVehicle): void {
    if (!mapInstance || !mlRef) return

    const color = markerColor(v)

    if (liveMarkers[v.vehicleId]) {
      // Just move it and update dot colour
      liveMarkers[v.vehicleId].setLngLat([v.lng, v.lat])
      const dot = liveMarkers[v.vehicleId]
        .getElement()
        .querySelector(".live-dot") as HTMLElement | null
      if (dot) dot.style.background = color
      return
    }

    // Build marker element
    const el = document.createElement("div")
    el.className = "live-marker-el"
    el.style.cssText = `
      width: 36px; height: 36px; border-radius: 50%; cursor: pointer;
      background: rgba(0,0,0,0.75); border: 2.5px solid ${color};
      display: flex; align-items: center; justify-content: center;
      transform: translate(-50%, -50%);
      box-shadow: 0 0 10px ${color}55, 0 4px 12px rgba(0,0,0,0.4);
      backdrop-filter: blur(4px);
      transition: transform 0.15s, box-shadow 0.15s;
    `
    el.innerHTML = `
      <span class="live-dot" style="
        width: 10px; height: 10px; border-radius: 50%;
        background: ${color};
        box-shadow: 0 0 6px ${color};
      "></span>
    `

    el.addEventListener("mouseenter", () => {
      el.style.transform = "translate(-50%, -50%) scale(1.25)"
      el.style.boxShadow = `0 0 18px ${color}88, 0 6px 20px rgba(0,0,0,0.5)`
    })
    el.addEventListener("mouseleave", () => {
      el.style.transform = "translate(-50%, -50%)"
      el.style.boxShadow = `0 0 10px ${color}55, 0 4px 12px rgba(0,0,0,0.4)`
    })

    const popup = new mlRef.Popup({
      offset: [0, -18],
      closeButton: false,
      closeOnClick: false,
      className: "mp-popup-dark",
      maxWidth: "220px",
    }).setHTML(buildPopupHTML(v))

    const marker = new mlRef.Marker({ element: el, anchor: "center" })
      .setLngLat([v.lng, v.lat])
      .setPopup(popup)
      .addTo(mapInstance)

    el.addEventListener("mouseenter", () => popup.addTo(mapInstance))
    el.addEventListener("mouseleave", () => {
      setTimeout(() => {
        if (!el.matches(":hover")) popup.remove()
      }, 200)
    })

    liveMarkers[v.vehicleId] = marker
  }

  function buildPopupHTML(v: LiveVehicle): string {
    const color = markerColor(v)
    return `
      <div style="font-family:var(--font-body,'DM Sans',sans-serif);min-width:160px">
        <div style="font-size:.88rem;font-weight:800;color:#fff;letter-spacing:-.02em;margin-bottom:6px">
          ${v.plate || v.vehicleId}
        </div>
        <div style="display:flex;flex-direction:column;gap:3px;font-size:.72rem;color:rgba(255,255,255,.6)">
          <div>Speed: <b style="color:#fff">${v.speed ?? 0} km/h</b></div>
          <div>Satellites: <b style="color:#fff">${v.satellites ?? "—"}</b></div>
          <div>GPS: <b style="color:#fff">${fixLabel(v.fixStatus)}</b></div>
          <div>Rain: <b style="color:${v.rain ? "#3b82f6" : "#fff"}">${v.rain ? "Yes" : "No"}</b></div>
          <div>Compliance:
            <b style="color:${v.complianceIssue ? "#f87171" : "#00b09b"}">
              ${v.complianceIssue ? "⚠ Issue" : "✓ OK"}
            </b>
          </div>
        </div>
        <div style="
          margin-top:8px;width:8px;height:8px;border-radius:50%;
          background:${color};display:inline-block;
          box-shadow:0 0 6px ${color};
        "></div>
      </div>
    `
  }

  // ── Map init ──────────────────────────────────────────────────────────────

  function initMap(): void {
    if (!mapContainer || mapInstance || !browser) return

    import("maplibre-gl").then((mod) => {
      mlRef = mod.default
      const maplibregl = mlRef

      // Style — dark Protomaps + optional DuckDB vehicle layer
      const sources: Record<string, unknown> = {}
      const layers: unknown[] = []

      if (data.parquetUrl) {
        sources.vehicleTiles = {
          type: "vector",
          tiles: [`duckdb.${data.parquetUrl}?z={z}&x={x}&y={y}`],
          minzoom: 0,
          maxzoom: 14,
        }
        layers.push({
          id: "historical-vehicles",
          type: "circle",
          source: "vehicleTiles",
          "source-layer": "default",
          paint: {
            "circle-radius": ["interpolate", ["linear"], ["zoom"], 8, 3, 14, 7],
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
              "#00b09b",
            ],
            "circle-opacity": 0.6,
            "circle-stroke-width": 1,
            "circle-stroke-color": "#ffffff",
          },
        })
      }

      mapInstance = new maplibregl.Map({
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
        zoom: 11,
      })

      // Attribution compact
      mapInstance
        .getContainer()
        .querySelector(".maplibregl-ctrl-attrib")
        ?.classList.add("maplibregl-compact")

      // Historical layer — click popup
      if (data.parquetUrl) {
        mapInstance.on("click", "historical-vehicles", (e: any) => {
          const f = e.features?.[0]
          if (!f) return
          const { name, status, type } = f.properties ?? {}
          new maplibregl.Popup({
            className: "mp-popup-dark",
            maxWidth: "200px",
          })
            .setLngLat(e.lngLat)
            .setHTML(
              `
              <div style="font-family:var(--font-body,'DM Sans',sans-serif)">
                <div style="font-size:.88rem;font-weight:800;color:#fff;margin-bottom:5px">${name ?? "Vehicle"}</div>
                <div style="font-size:.72rem;color:rgba(255,255,255,.6)">
                  Status: <b style="color:#fff">${status ?? "—"}</b><br/>
                  Type: <b style="color:#fff">${type ?? "—"}</b>
                </div>
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
      }

      // Start live GPS subscription
      startGpsChannel()
    })
  }

  // ── Supabase realtime GPS channel ─────────────────────────────────────────

  function startGpsChannel(): void {
    if (gpsChannel) return

    gpsChannel = data.supabase
      .channel(`fleet-map-gps-${data.orgId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "vehicle_locations",
          filter: `organization_id=eq.${data.orgId}`,
        },
        (payload) => {
          const pos = payload.new as Record<string, unknown>
          if (!pos?.vehicle_id || pos.lat == null || pos.lng == null) return

          const vehicle: LiveVehicle = {
            vehicleId: String(pos.vehicle_id),
            plate: String(pos.plate ?? pos.vehicle_id),
            lat: Number(pos.lat),
            lng: Number(pos.lng),
            speed: pos.speed != null ? Number(pos.speed) : null,
            satellites: pos.satellites != null ? Number(pos.satellites) : null,
            fixStatus: pos.fix_status != null ? Number(pos.fix_status) : null,
            rain: Boolean(pos.rain),
            complianceIssue: data.nonCompliantIds.includes(
              String(pos.vehicle_id),
            ),
          }

          liveVehicles = { ...liveVehicles, [vehicle.vehicleId]: vehicle }
          upsertLiveMarker(vehicle)
        },
      )
      .subscribe()
  }

  // ── DuckDB callbacks ──────────────────────────────────────────────────────

  function handleDuckDBReady(): void {
    duckdbReady = true
    initMap()
  }

  function handleDuckDBError(err: Error): void {
    console.error("[fleet map] DuckDB init failed:", err)
    // Still init map — live GPS overlay works without DuckDB
    initMap()
  }

  // ── When no parquetUrl: init map directly on mount ───────────────────────
  onMount(() => {
    if (!data.parquetUrl) initMap()
  })

  // ── Cleanup ───────────────────────────────────────────────────────────────
  onDestroy(() => {
    if (gpsChannel) {
      data.supabase.removeChannel(gpsChannel)
      gpsChannel = null
    }
    Object.values(liveMarkers).forEach((m) => m?.remove())
    liveMarkers = {}
    mapInstance?.remove()
    mapInstance = undefined
  })
</script>

<svelte:head><title>Fleet Map — {data.orgName}</title></svelte:head>

<div class="map-page">
  <!-- Header -->
  <div class="map-hd">
    <div>
      <div class="map-eyebrow">
        <span class="live-dot {liveCount > 0 ? 'active' : ''}"></span>
        {liveCount > 0
          ? `${liveCount} vehicle${liveCount !== 1 ? "s" : ""} live`
          : "Fleet Map"}
      </div>
      <h1 class="map-title">Real-Time <em>Fleet</em></h1>
    </div>

    <!-- Legend -->
    <div class="legend">
      <div class="legend-item">
        <span
          class="legend-dot"
          style="background:#00b09b; box-shadow:0 0 5px #00b09b44"
        ></span>
        Normal
      </div>
      <div class="legend-item">
        <span
          class="legend-dot"
          style="background:#ef4444; box-shadow:0 0 5px #ef444444"
        ></span>
        Compliance issue
      </div>
      <div class="legend-item">
        <span
          class="legend-dot"
          style="background:#3b82f6; box-shadow:0 0 5px #3b82f644"
        ></span>
        Raining
      </div>
      <div class="legend-item">
        <span class="legend-dot" style="background:#6b7280"></span>
        No GPS fix
      </div>
      {#if data.parquetUrl}
        <div class="legend-divider"></div>
        <div class="legend-item muted">
          <span class="legend-dot-sq" style="background:#3b82f620"></span>
          Historical (DuckDB)
        </div>
      {/if}
    </div>
  </div>

  <!-- Stats strip -->
  <div class="stat-strip">
    <div class="stat">
      <div class="stat-val teal">{liveCount}</div>
      <div class="stat-lbl">Live Now</div>
    </div>
    <div class="stat">
      <div class="stat-val">{data.vehicleCount}</div>
      <div class="stat-lbl">Total Fleet</div>
    </div>
    <div class="stat">
      <div class="stat-val {data.nonCompliantIds.length > 0 ? 'red' : ''}">
        {data.nonCompliantIds.length}
      </div>
      <div class="stat-lbl">Non-Compliant</div>
    </div>
    <div class="stat">
      <div class="stat-val">
        {Object.values(liveVehicles).filter((v) => v.rain).length}
      </div>
      <div class="stat-lbl">In Rain</div>
    </div>
  </div>

  <!-- Map container -->
  <div class="map-wrap">
    {#if data.parquetUrl}
      <DuckDBTileProvider
        parquetUrl={data.parquetUrl}
        onReady={handleDuckDBReady}
        onError={handleDuckDBError}
      />
    {/if}

    <div bind:this={mapContainer} class="map-el"></div>

    {#if !data.parquetUrl}
      <div class="no-historical">
        No historical data — live GPS overlay active
      </div>
    {/if}

    {#if liveCount === 0}
      <div class="no-live">
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.5"
          opacity="0.3"
        >
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
          <circle cx="12" cy="10" r="3" />
        </svg>
        Waiting for live GPS updates…
      </div>
    {/if}
  </div>
</div>

<style>
  .map-page {
    flex: 1;
    padding: 32px 40px;
    font-family: var(--font-body);
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  /* ── Header ── */
  .map-hd {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 16px;
    flex-wrap: wrap;
  }
  .map-eyebrow {
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
  }
  .live-dot.active {
    background: var(--teal, #00b09b);
    animation: dot-pulse 2s ease-out infinite;
    box-shadow: 0 0 0 0 rgba(0, 176, 155, 0.5);
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
  .map-title {
    font-family: var(--font-display);
    font-size: clamp(1.4rem, 2vw, 1.9rem);
    font-weight: 900;
    letter-spacing: -0.05em;
    color: var(--text-1);
    line-height: 1.1;
  }
  .map-title em {
    font-style: normal;
    color: var(--teal, #00b09b);
  }

  /* Legend */
  .legend {
    display: flex;
    align-items: center;
    gap: 14px;
    flex-wrap: wrap;
  }
  .legend-item {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 0.7rem;
    color: var(--text-3);
  }
  .legend-item.muted {
    color: var(--text-3);
    opacity: 0.6;
  }
  .legend-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    flex-shrink: 0;
  }
  .legend-dot-sq {
    width: 8px;
    height: 8px;
    border-radius: 2px;
    border: 1px solid rgba(255, 255, 255, 0.15);
    flex-shrink: 0;
  }
  .legend-divider {
    width: 1px;
    height: 12px;
    background: rgba(255, 255, 255, 0.08);
  }

  /* ── Stats strip ── */
  .stat-strip {
    display: flex;
    gap: 12px;
  }
  .stat {
    background: rgba(255, 255, 255, 0.025);
    border: 1px solid var(--rim, rgba(255, 255, 255, 0.07));
    border-radius: 13px;
    padding: 12px 20px;
    min-width: 90px;
  }
  .stat-val {
    font-family: var(--font-display);
    font-size: 1.4rem;
    font-weight: 900;
    letter-spacing: -0.04em;
    color: var(--text-1);
    line-height: 1;
    margin-bottom: 3px;
  }
  .stat-val.teal {
    color: var(--teal, #00b09b);
  }
  .stat-val.red {
    color: #f87171;
  }
  .stat-lbl {
    font-size: 0.58rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--text-3);
  }

  /* ── Map ── */
  .map-wrap {
    position: relative;
    flex: 1;
    min-height: 560px;
    border-radius: 20px;
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
  .no-historical {
    position: absolute;
    bottom: 14px;
    left: 14px;
    z-index: 5;
    font-size: 0.68rem;
    color: rgba(255, 255, 255, 0.3);
    background: rgba(0, 0, 0, 0.55);
    backdrop-filter: blur(8px);
    border: 1px solid rgba(255, 255, 255, 0.07);
    border-radius: 8px;
    padding: 5px 10px;
    pointer-events: none;
  }
  .no-live {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    z-index: 5;
    display: flex;
    align-items: center;
    gap: 7px;
    font-size: 0.78rem;
    color: rgba(255, 255, 255, 0.25);
    pointer-events: none;
  }

  /* ── MapLibre popup overrides ── */
  :global(.mp-popup-dark .maplibregl-popup-content) {
    background: rgba(13, 13, 20, 0.96) !important;
    border: 1px solid rgba(255, 255, 255, 0.1) !important;
    border-radius: 12px !important;
    padding: 12px 14px !important;
    box-shadow: 0 10px 32px rgba(0, 0, 0, 0.5) !important;
    backdrop-filter: blur(14px) !important;
  }
  :global(.mp-popup-dark .maplibregl-popup-tip) {
    border-top-color: rgba(13, 13, 20, 0.96) !important;
    border-bottom-color: rgba(13, 13, 20, 0.96) !important;
  }
  :global(.maplibregl-ctrl-group) {
    background: rgba(15, 15, 22, 0.92) !important;
    border: 1px solid rgba(255, 255, 255, 0.08) !important;
    border-radius: 10px !important;
    backdrop-filter: blur(8px) !important;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.5) !important;
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
    color: rgba(255, 255, 255, 0.35) !important;
    font-size: 9px !important;
    border-radius: 6px !important;
  }

  @media (max-width: 1024px) {
    .map-page {
      padding: 20px 16px;
    }
    .stat-strip {
      flex-wrap: wrap;
    }
    .map-wrap {
      min-height: 420px;
    }
  }
</style>
