<script lang="ts">
  import { onMount, onDestroy } from "svelte"
  import { writable, get } from "svelte/store"
  import DuckDBTileProvider from "$lib/map/components/DuckDBTileProvider.svelte"
  import gsap from "gsap"

  export let data: {
    matatuId: string
    hex: string
    lat: number
    lng: number
    k: number
  }

  export let reservedMatatus: {
    matatuId: string
    saccoName: string
    routeNumber: string
    routePolyline: { lat: number; lng: number }[]
  }[] = []

  // ── Types ────────────────────────────────────────────────────────────────
  type FleetMarker = {
    id: string
    label: string
    coords: { lat: number; lng: number }
    iconUrl: string
    currentIndex: number
  }

  // ── Stores & state ───────────────────────────────────────────────────────
  let markers = writable<FleetMarker[]>([])
  let dbReady = false
  let mapInstance: any = null // maplibregl.Map
  let mapContainer: HTMLDivElement

  // ── MapLibre source/layer IDs ────────────────────────────────────────────
  const FLEET_SOURCE = "fleet-markers"
  const FLEET_LAYER = "fleet-circles"
  const FLEET_LABELS = "fleet-labels"
  const DUCKDB_SOURCE = "duckdb-h3"
  const DUCKDB_FILL = "h3-fill"
  const DUCKDB_STROKE = "h3-stroke"

  // ── Kalman smoother ──────────────────────────────────────────────────────
  const K = 0.5
  function kalmanUpdate(
    pos: { lat: number; lng: number },
    estimate: { lat: number; lng: number },
  ) {
    return {
      lat: estimate.lat + K * (pos.lat - estimate.lat),
      lng: estimate.lng + K * (pos.lng - estimate.lng),
    }
  }

  // ── GSAP route animation ─────────────────────────────────────────────────
  function animateAlongRoute(
    marker: FleetMarker,
    route: { lat: number; lng: number }[],
  ) {
    if (!route.length) return
    const nextIndex = (marker.currentIndex + 1) % route.length
    const end = route[nextIndex]

    gsap.to(marker.coords, {
      lat: end.lat,
      lng: end.lng,
      duration: 4.5,
      ease: "power1.inOut",
      onUpdate: () => {
        markers.update((list) =>
          list.map((m) => (m.id === marker.id ? { ...m } : m)),
        )
        flushMarkersToMap()
      },
      onComplete: () => {
        marker.currentIndex = nextIndex
        animateAlongRoute(marker, route)
      },
    })
  }

  // ── Push current marker list into MapLibre source ────────────────────────
  function flushMarkersToMap() {
    if (!mapInstance) return
    const source = mapInstance.getSource(FLEET_SOURCE) as any
    if (!source) return
    const mList = get(markers)
    source.setData({
      type: "FeatureCollection",
      features: mList.map((m) => ({
        type: "Feature",
        id: m.id,
        properties: { label: m.label },
        geometry: { type: "Point", coordinates: [m.coords.lng, m.coords.lat] },
      })),
    })
  }

  // ── Live position polling ────────────────────────────────────────────────
  async function fetchLivePositions() {
    for (const m of reservedMatatus) {
      try {
        const res = await fetch(`/api/matatu/live/${m.matatuId}`)
        if (!res.ok) continue
        const liveData = await res.json()

        markers.update((list) => {
          let marker = list.find((x) => x.id === m.matatuId)
          if (!marker) {
            const startPos = m.routePolyline[0] ?? {
              lat: -1.2921,
              lng: 36.8219,
            }
            const newMarker: FleetMarker = {
              id: m.matatuId,
              label: `${m.saccoName} (${m.routeNumber})`,
              coords: { ...startPos },
              iconUrl: "/icons/matatu.png",
              currentIndex: 0,
            }
            list.push(newMarker)
            animateAlongRoute(newMarker, m.routePolyline)
          } else {
            marker.coords = kalmanUpdate(liveData, marker.coords)
          }
          return list
        })
        flushMarkersToMap()
      } catch (err) {
        console.error(`Error fetching matatu ${m.matatuId} data`, err)
      }
    }
  }

  // ── Map initialisation ───────────────────────────────────────────────────
  onMount(async () => {
    if (!mapContainer || reservedMatatus.length === 0) return

    const mlModule = await import("maplibre-gl")
    const maplibregl = mlModule.default

    if (!document.getElementById("maplibre-css")) {
      const link = document.createElement("link")
      link.id = "maplibre-css"
      link.rel = "stylesheet"
      link.href = "https://unpkg.com/maplibre-gl@latest/dist/maplibre-gl.css"
      document.head.appendChild(link)
    }

    const initialCenter = reservedMatatus[0]?.routePolyline[0] ?? {
      lat: -1.2921,
      lng: 36.8219,
    }

    mapInstance = new maplibregl.Map({
      container: mapContainer,
      style:
        "https://api.protomaps.com/styles/v4/dark.json?key=REPLACE_WITH_KEY",
      center: [initialCenter.lng, initialCenter.lat],
      zoom: 15,
    })

    await new Promise<void>((res) => mapInstance.once("load", res))

    // ── Fleet GeoJSON source + layers ─────────────────────────────────────
    mapInstance.addSource(FLEET_SOURCE, {
      type: "geojson",
      data: { type: "FeatureCollection", features: [] },
    })

    // Pulsing circle per vehicle
    mapInstance.addLayer({
      id: FLEET_LAYER,
      type: "circle",
      source: FLEET_SOURCE,
      paint: {
        "circle-radius": 10,
        "circle-color": "#f26522",
        "circle-opacity": 0.9,
        "circle-stroke-width": 2,
        "circle-stroke-color": "#ffffff",
      },
    })

    // Sacco + route label
    mapInstance.addLayer({
      id: FLEET_LABELS,
      type: "symbol",
      source: FLEET_SOURCE,
      layout: {
        "text-field": ["get", "label"],
        "text-size": 11,
        "text-offset": [0, 1.6],
        "text-anchor": "top",
        "text-allow-overlap": false,
      },
      paint: {
        "text-color": "#ffffff",
        "text-halo-color": "#000000",
        "text-halo-width": 1.5,
      },
    })

    // ── Start polling ─────────────────────────────────────────────────────
    fetchLivePositions()
    interval = setInterval(fetchLivePositions, 5000)

    // ── Reactive map re-centre when markers move ──────────────────────────
    const unsubMarkers = markers.subscribe((mList) => {
      if (!mList.length || !mapInstance) return
      const lats = mList.map((m) => m.coords.lat)
      const lngs = mList.map((m) => m.coords.lng)
      const minLat = Math.min(...lats),
        maxLat = Math.max(...lats)
      const minLng = Math.min(...lngs),
        maxLng = Math.max(...lngs)
      const maxDiff = Math.max(maxLat - minLat, maxLng - minLng)
      mapInstance.easeTo({
        center: [(minLng + maxLng) / 2, (minLat + maxLat) / 2],
        zoom:
          maxDiff < 0.001
            ? 17
            : maxDiff < 0.005
              ? 16
              : maxDiff < 0.01
                ? 15
                : maxDiff < 0.03
                  ? 14
                  : 13,
        duration: 800,
      })
    })
    ;(mapInstance as any)._unsubMarkers = unsubMarkers
  })

  // ── DuckDB H3 layer — wired in once MapCache fires onReady ───────────────
  function handleDbReady() {
    dbReady = true
    if (!mapInstance || mapInstance.getSource(DUCKDB_SOURCE)) return

    mapInstance.addSource(DUCKDB_SOURCE, {
      type: "vector",
      tiles: ["duckdb://nairobi?z={z}&x={x}&y={y}"],
      scheme: "xyz",
    })
    mapInstance.addLayer(
      {
        id: DUCKDB_FILL,
        type: "fill",
        source: DUCKDB_SOURCE,
        "source-layer": "default",
        paint: { "fill-color": "#f26522", "fill-opacity": 0.18 },
      },
      FLEET_LAYER, // insert below fleet markers
    )
    mapInstance.addLayer(
      {
        id: DUCKDB_STROKE,
        type: "line",
        source: DUCKDB_SOURCE,
        "source-layer": "default",
        paint: {
          "line-color": "#f26522",
          "line-width": 1,
          "line-opacity": 0.5,
        },
      },
      FLEET_LAYER,
    )
  }

  // ── Polling interval ─────────────────────────────────────────────────────
  let interval: any

  onDestroy(() => {
    clearInterval(interval)
    ;(mapInstance as any)?._unsubMarkers?.()
    mapInstance?.remove()
    stopRacingAnimation()
  })

  // ── Empty-state racing animation (unchanged) ─────────────────────────────
  let raceContainer: HTMLElement
  let busTweens: gsap.core.Tween[] = []
  let ctaTween: gsap.core.Tween | null = null
  let titleTween: gsap.core.Tween | null = null

  function startRacingAnimation() {
    stopRacingAnimation()
    if (!raceContainer) return
    gsap.fromTo(
      raceContainer,
      { opacity: 0, y: 40 },
      { opacity: 1, y: 0, duration: 1.2, ease: "power3.out" },
    )
    gsap.fromTo(
      raceContainer.querySelectorAll(".reveal-item"),
      { opacity: 0, y: 24 },
      {
        opacity: 1,
        y: 0,
        duration: 0.8,
        stagger: 0.14,
        ease: "power3.out",
        delay: 0.3,
      },
    )
    const buses = raceContainer.querySelectorAll<HTMLElement>(".bus-racer")
    const screenWidth = window.innerWidth
    buses.forEach((bus, i) => {
      gsap.set(bus, { x: -220, scaleX: 1, opacity: 0.7 + i * 0.07 })
      busTweens.push(
        gsap.to(bus, {
          x: screenWidth + 220,
          duration: 7 + i * 1.4,
          ease: "none",
          repeat: -1,
          delay: i * 0.65,
          onRepeat: () => {
            gsap.set(bus, { x: -220 })
            gsap.to(bus, {
              y: `+=${(Math.random() - 0.5) * 6}`,
              duration: 0.4,
              ease: "sine.inOut",
            })
          },
        }),
        gsap.to(bus, {
          scaleY: 0.94,
          duration: 0.22 + i * 0.04,
          repeat: -1,
          yoyo: true,
          ease: "sine.inOut",
          delay: i * 0.1,
        }),
      )
    })
    const lanes = raceContainer.querySelectorAll<HTMLElement>(".road-lane")
    lanes.forEach((lane, i) => {
      busTweens.push(
        gsap.fromTo(
          lane,
          { x: 0 },
          { x: -200, duration: 1.4 + i * 0.15, ease: "none", repeat: -1 },
        ),
      )
    })
    ctaTween = gsap.to(".cta-button", {
      boxShadow: "0 0 32px rgba(242,101,34,0.45), 0 8px 40px rgba(0,0,0,0.4)",
      duration: 2.2,
      repeat: -1,
      yoyo: true,
      ease: "sine.inOut",
    })
    titleTween = gsap.to(".title-shimmer", {
      backgroundPositionX: "200%",
      duration: 3.5,
      repeat: -1,
      ease: "none",
    })
  }
  function stopRacingAnimation() {
    busTweens.forEach((t) => t.kill())
    busTweens = []
    ctaTween?.kill()
    ctaTween = null
    titleTween?.kill()
    titleTween = null
  }

  $: {
    if (reservedMatatus.length === 0 && raceContainer) startRacingAnimation()
    else stopRacingAnimation()
  }
</script>

<svelte:head>
  <title>Live Tracking — Matatu Pulse</title>
</svelte:head>

<!-- MapCache: registers the duckdb:// protocol; renders nothing -->
{#if reservedMatatus.length > 0}
  <DuckDBTileProvider
    parquetUrl="https://data.example.com/nairobi_h3.parquet"
    onReady={handleDbReady}
    onError={(e) => console.error("[MapCache]", e)}
  />
{/if}

<div class="page">
  <div class="atm atm-1" aria-hidden="true"></div>
  <div class="atm atm-2" aria-hidden="true"></div>

  {#if reservedMatatus.length > 0}
    <!-- ── Live tracking view ── -->
    <div class="track-layout">
      <div class="page-header">
        <div class="eyebrow">
          <span class="eyebrow-dot"></span>Real-Time Fleet
        </div>
        <h1 class="page-title">Live <em>Tracking</em></h1>
        <p class="page-sub">
          Your reserved matatus — watch them move in real time.
        </p>
      </div>

      <!-- Fleet sidebar (unchanged) -->
      <div class="sidebar">
        <div class="panel">
          <div class="panel-head">
            <div class="panel-ey">On The Road</div>
            <div class="panel-ti">
              Your Fleet <span class="fleet-count"
                >{reservedMatatus.length}</span
              >
            </div>
          </div>
          <div class="fleet-list">
            {#each reservedMatatus as m (m.matatuId)}
              <div class="fleet-row">
                <div class="fleet-icon">
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  >
                    <rect x="1" y="3" width="15" height="13" rx="2" />
                    <path d="M16 8h4l3 5v3h-7V8z" />
                    <circle cx="5.5" cy="18.5" r="2.5" />
                    <circle cx="18.5" cy="18.5" r="2.5" />
                  </svg>
                </div>
                <div class="fleet-info">
                  <div class="fleet-name">{m.saccoName}</div>
                  <div class="fleet-meta">
                    <span class="route-pill">Route {m.routeNumber}</span>
                    <span class="live-chip"
                      ><span class="live-dot"></span>Live</span
                    >
                  </div>
                </div>
              </div>
            {/each}
          </div>
        </div>
      </div>

      <!-- Raw MapLibre canvas — replaces <MapView> -->
      <div class="map-area">
        <div class="map-badge">
          <span class="map-badge-dot"></span>
          {$markers.length} vehicle{$markers.length !== 1 ? "s" : ""} tracked
          {#if dbReady}
            <span class="h3-badge">H3</span>
          {/if}
        </div>
        <div bind:this={mapContainer} class="map-container"></div>
      </div>
    </div>
  {:else}
    <!-- ── Empty state: racing animation (unchanged) ── -->
    <div bind:this={raceContainer} class="empty-page" aria-live="polite">
      <div class="road" aria-hidden="true">
        {#each Array(3) as _, i}
          <div class="road-lane-row" style="top: {18 + i * 22}%">
            {#each Array(14) as _}
              <div class="road-lane"></div>
            {/each}
          </div>
        {/each}
        <div class="bus-racer" style="top: 15%" aria-hidden="true">
          <div class="bus-body">
            <span class="bus-emoji">🚌</span>
            <div class="bus-exhaust"></div>
          </div>
        </div>
        <div class="bus-racer" style="top: 35%" aria-hidden="true">
          <div class="bus-body bus-body--alt">
            <span class="bus-emoji">🚌</span>
            <div class="bus-exhaust bus-exhaust--alt"></div>
          </div>
        </div>
        <div class="bus-racer" style="top: 57%" aria-hidden="true">
          <div class="bus-body">
            <span class="bus-emoji">🚌</span>
            <div class="bus-exhaust"></div>
          </div>
        </div>
        <div class="bus-racer" style="top: 76%" aria-hidden="true">
          <div class="bus-body bus-body--alt">
            <span class="bus-emoji">🚌</span>
            <div class="bus-exhaust bus-exhaust--alt"></div>
          </div>
        </div>
      </div>

      <div class="empty-content">
        <div class="reveal-item eyebrow" style="justify-content:center">
          <span class="eyebrow-dot"></span>Fleet Management
        </div>
        <h1 class="reveal-item page-title title-shimmer">
          They're Leaving<br /><em>Without You</em>
        </h1>
        <p class="reveal-item empty-sub">
          Reserve your seat now and join the ride.
          <span class="accent">Watch your matatu live</span> as it comes for you.
        </p>
        <a href={`/feed/h3/${data.hex}?k=${K}`} class="reveal-item cta-button">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.5"
            stroke-linecap="round"
            aria-hidden="true"
          >
            <circle cx="12" cy="10" r="3" />
            <path
              d="M12 21.7C17.3 17 20 13 20 10a8 8 0 10-16 0c0 3 2.7 6.9 8 11.7z"
            />
          </svg>
          Reserve My Seat Now
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.5"
            stroke-linecap="round"
            aria-hidden="true"
          >
            <line x1="5" y1="12" x2="19" y2="12" />
            <polyline points="12 5 19 12 12 19" />
          </svg>
        </a>
      </div>
    </div>
  {/if}
</div>

<style>
  /* ── All original styles preserved exactly ── */
  .page {
    display: flex;
    flex-direction: column;
    height: 100%;
    background: var(--ink);
    font-family: var(--font-body);
    position: relative;
    overflow: hidden;
  }
  .atm {
    position: fixed;
    border-radius: 50%;
    pointer-events: none;
    z-index: 0;
    filter: blur(70px);
  }
  .atm-1 {
    width: 520px;
    height: 520px;
    top: -120px;
    right: -80px;
    background: radial-gradient(
      circle,
      rgba(242, 101, 34, 0.07),
      transparent 65%
    );
  }
  .atm-2 {
    width: 400px;
    height: 400px;
    bottom: -80px;
    left: -80px;
    background: radial-gradient(
      circle,
      rgba(0, 176, 155, 0.06),
      transparent 65%
    );
  }
  .eyebrow {
    font-size: 0.6rem;
    font-weight: 700;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--orange);
    display: flex;
    align-items: center;
    gap: 7px;
    margin-bottom: 7px;
  }
  .eyebrow-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--orange);
    animation: pulse-o 2s ease-out infinite;
    flex-shrink: 0;
  }
  @keyframes pulse-o {
    0% {
      box-shadow: 0 0 0 0 rgba(242, 101, 34, 0.5);
    }
    70% {
      box-shadow: 0 0 0 5px rgba(242, 101, 34, 0);
    }
    100% {
      box-shadow: 0 0 0 0 rgba(242, 101, 34, 0);
    }
  }
  .page-title {
    font-family: var(--font-display);
    font-size: clamp(1.5rem, 2.5vw, 2rem);
    font-weight: 900;
    letter-spacing: -0.05em;
    line-height: 1.1;
    color: var(--text-1);
    margin-bottom: 4px;
  }
  .page-title em {
    font-style: normal;
    color: var(--orange);
  }
  .page-sub {
    font-size: 0.875rem;
    color: var(--text-3);
    line-height: 1.6;
  }
  .panel {
    background: rgba(255, 255, 255, 0.025);
    border: 1px solid var(--rim);
    border-radius: 16px;
    overflow: hidden;
  }
  .panel-head {
    padding: 14px 16px 10px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  }
  .panel-ey {
    font-size: 0.58rem;
    font-weight: 700;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--text-3);
    margin-bottom: 3px;
  }
  .panel-ti {
    font-family: var(--font-display);
    font-size: 0.88rem;
    font-weight: 800;
    letter-spacing: -0.03em;
    color: var(--text-1);
    display: flex;
    align-items: center;
    gap: 7px;
  }
  .fleet-count {
    font-family: var(--font-body);
    font-size: 0.72rem;
    font-weight: 600;
    color: var(--text-3);
  }
  .track-layout {
    display: grid;
    grid-template-columns: 280px 1fr;
    grid-template-rows: auto 1fr;
    gap: 16px;
    padding: 28px 32px 32px;
    height: 100%;
    position: relative;
    z-index: 1;
  }
  .page-header {
    grid-column: 1/-1;
  }
  .sidebar {
    display: flex;
    flex-direction: column;
    gap: 12px;
    overflow-y: auto;
    scrollbar-width: thin;
    scrollbar-color: rgba(255, 255, 255, 0.08) transparent;
  }
  .fleet-list {
    padding: 10px 10px 12px;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .fleet-row {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 12px;
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid rgba(255, 255, 255, 0.05);
    border-radius: 12px;
    transition:
      background 0.15s,
      border-color 0.15s;
  }
  .fleet-row:hover {
    background: rgba(255, 255, 255, 0.04);
    border-color: rgba(255, 255, 255, 0.1);
  }
  .fleet-icon {
    width: 30px;
    height: 30px;
    border-radius: 9px;
    background: rgba(242, 101, 34, 0.1);
    border: 1px solid rgba(242, 101, 34, 0.2);
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--orange);
    flex-shrink: 0;
  }
  .fleet-info {
    flex: 1;
    min-width: 0;
  }
  .fleet-name {
    font-size: 0.8rem;
    font-weight: 700;
    color: var(--text-1);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .fleet-meta {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-top: 3px;
  }
  .route-pill {
    padding: 1px 7px;
    border-radius: 100px;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.08);
    font-size: 0.58rem;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--text-3);
  }
  .live-chip {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 1px 7px;
    border-radius: 100px;
    background: rgba(0, 176, 155, 0.1);
    border: 1px solid rgba(0, 176, 155, 0.2);
    font-size: 0.58rem;
    font-weight: 700;
    color: var(--teal);
  }
  .live-dot {
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: var(--teal);
    animation: pulse-t 1.8s ease-out infinite;
  }
  @keyframes pulse-t {
    0% {
      box-shadow: 0 0 0 0 rgba(0, 176, 155, 0.6);
    }
    70% {
      box-shadow: 0 0 0 4px rgba(0, 176, 155, 0);
    }
    100% {
      box-shadow: 0 0 0 0 rgba(0, 176, 155, 0);
    }
  }

  /* Map area — raw canvas replaces MapView wrapper */
  .map-area {
    border-radius: 20px;
    overflow: hidden;
    position: relative;
    box-shadow:
      0 0 0 1px rgba(255, 255, 255, 0.07),
      0 24px 64px rgba(0, 0, 0, 0.5);
  }
  .map-container {
    width: 100%;
    height: 100%;
  }
  .map-badge {
    position: absolute;
    top: 14px;
    right: 14px;
    z-index: 5;
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 5px 12px;
    background: rgba(13, 13, 20, 0.88);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 100px;
    backdrop-filter: blur(12px);
    font-size: 0.7rem;
    font-weight: 700;
    color: var(--text-2);
    pointer-events: none;
  }
  .map-badge-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--orange);
    animation: pulse-o 2s ease-out infinite;
  }
  .h3-badge {
    padding: 1px 6px;
    border-radius: 100px;
    background: rgba(0, 176, 155, 0.15);
    border: 1px solid rgba(0, 176, 155, 0.25);
    font-size: 0.6rem;
    color: var(--teal);
  }

  /* Empty state — all original styles preserved */
  .empty-page {
    position: relative;
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    z-index: 1;
  }
  .road {
    position: absolute;
    inset: 0;
    pointer-events: none;
    overflow: hidden;
  }
  .road-lane-row {
    position: absolute;
    left: 0;
    display: flex;
    gap: 28px;
    align-items: center;
    width: 200%;
    overflow: hidden;
  }
  .road-lane {
    width: 48px;
    height: 2px;
    border-radius: 2px;
    background: rgba(242, 101, 34, 0.1);
    flex-shrink: 0;
  }
  .bus-racer {
    position: absolute;
    left: 0;
    will-change: transform;
  }
  .bus-body {
    display: flex;
    align-items: center;
    gap: 4px;
    filter: drop-shadow(0 3px 8px rgba(242, 101, 34, 0.25));
  }
  .bus-body--alt {
    filter: drop-shadow(0 3px 8px rgba(0, 176, 155, 0.2));
    opacity: 0.85;
  }
  .bus-emoji {
    font-size: 2.2rem;
    display: block;
    line-height: 1;
  }
  .bus-exhaust {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: rgba(242, 101, 34, 0.3);
    animation: exhaust 0.5s ease-out infinite;
  }
  .bus-exhaust--alt {
    background: rgba(0, 176, 155, 0.25);
    animation-delay: 0.15s;
  }
  @keyframes exhaust {
    0% {
      transform: scale(1);
      opacity: 0.5;
    }
    100% {
      transform: scale(3) translateX(-8px);
      opacity: 0;
    }
  }
  .empty-content {
    position: relative;
    z-index: 10;
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    gap: 16px;
    max-width: 560px;
    padding: 48px 40px;
    background: rgba(10, 14, 30, 0.72);
    border-top: 1px solid rgba(242, 101, 34, 0.18);
    border-left: 1px solid rgba(242, 101, 34, 0.12);
    border-right: 1px solid rgba(8, 12, 28, 0.6);
    border-bottom: 1px solid rgba(8, 12, 28, 0.6);
    border-radius: 28px;
    backdrop-filter: blur(32px) saturate(1.5);
    box-shadow:
      0 2px 0 rgba(242, 101, 34, 0.06) inset,
      0 32px 80px rgba(0, 0, 0, 0.55),
      0 0 60px rgba(242, 101, 34, 0.05);
  }
  .empty-content .page-title {
    font-size: clamp(2rem, 5vw, 3.2rem);
    line-height: 1.05;
    margin-bottom: 0;
  }
  .title-shimmer {
    background: linear-gradient(
      105deg,
      var(--text-1) 0%,
      var(--text-1) 35%,
      rgba(242, 101, 34, 0.9) 50%,
      var(--text-1) 65%,
      var(--text-1) 100%
    );
    background-size: 200% auto;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }
  .empty-sub {
    font-size: 0.95rem;
    color: var(--text-3);
    line-height: 1.7;
    max-width: 380px;
    margin-bottom: 4px;
  }
  .empty-sub .accent {
    color: var(--orange);
    font-weight: 600;
  }
  .cta-button {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    padding: 14px 28px;
    border-radius: 9999px;
    background: rgba(242, 101, 34, 0.15);
    border: 1px solid rgba(242, 101, 34, 0.35);
    color: var(--orange);
    font-family: var(--font-body);
    font-size: 0.92rem;
    font-weight: 700;
    letter-spacing: 0.02em;
    text-decoration: none;
    cursor: pointer;
    transition:
      background 0.2s,
      transform 0.15s,
      border-color 0.2s;
    box-shadow: 0 8px 28px rgba(0, 0, 0, 0.35);
    margin-top: 4px;
  }
  .cta-button:hover {
    background: rgba(242, 101, 34, 0.25);
    border-color: rgba(242, 101, 34, 0.55);
    transform: translateY(-2px);
  }
  .cta-button:active {
    transform: scale(0.97);
  }

  @media (max-width: 1024px) {
    .track-layout {
      grid-template-columns: 1fr;
      padding: 20px;
    }
    .page-header {
      grid-column: 1;
    }
    .map-area {
      min-height: 420px;
    }
    .sidebar {
      flex-direction: row;
      overflow-x: auto;
    }
    .panel {
      min-width: 240px;
    }
  }
  @media (max-width: 600px) {
    .empty-content {
      padding: 32px 24px;
      margin: 20px;
    }
  }

  /* MapLibre GL overrides (dark theme — same as original MapView styles) */
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
    background: rgba(242, 101, 34, 0.12) !important;
    color: #f26522 !important;
  }
  :global(.maplibregl-ctrl-attrib) {
    background: rgba(0, 0, 0, 0.55) !important;
    color: rgba(255, 255, 255, 0.35) !important;
    font-size: 9px !important;
    border-radius: 6px !important;
  }
  :global(.maplibregl-popup-content) {
    background: rgba(15, 15, 22, 0.95) !important;
    color: rgba(255, 255, 255, 0.85) !important;
    border: 1px solid rgba(255, 255, 255, 0.1) !important;
    border-radius: 10px !important;
    padding: 8px 14px !important;
    font-size: 12px !important;
    font-weight: 600 !important;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4) !important;
    backdrop-filter: blur(12px) !important;
  }
</style>
