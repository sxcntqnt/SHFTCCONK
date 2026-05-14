<!--
  LiveTracking.svelte

  Real-time vehicle tracking using VehicleTrafficClient (browser SSE).
  
  Key changes from original:
  - Pulse driven by CSS @keyframes, NOT requestAnimationFrame + $state(tick)
    → zero JS per frame, composited on GPU, no Svelte diff at 60fps
  - EventSource replaced by VehicleTrafficClient (shared reconnect logic)
  - reconnectAttempts removed — client handles backoff internally
  - Each vehicle gets a stable CSS animation-delay from its id hash
-->

<script lang="ts">
  import { onMount, onDestroy } from "svelte"
  import { VehicleTrafficClient } from "$lib/realtime/vehicleTrafficController.client"
  import type { RequestContext } from "$lib/map"
  import type { AttentionItem } from "$lib/realtime/hypntyz"

  // ── Types ──────────────────────────────────────────────────────────────────

  interface SvgVehicle {
    id: string
    x: number
    y: number
    color: string
    /** Stable 0–1 offset derived from id; drives CSS animation-delay, never changes */
    phaseOffset: number
    label: string
    isPartner: boolean
  }

  // ── Props ──────────────────────────────────────────────────────────────────

  interface Props {
    requestContext?: RequestContext | null
    width?: number
    height?: number
    hypnotizUrl?: string
    partnerSaccoIds?: string[]
  }

  let {
    requestContext = null,
    width = 600,
    height = 380,
    hypnotizUrl = "http://localhost:8080",
    partnerSaccoIds = [],
  }: Props = $props()

  // ── City bounding boxes ────────────────────────────────────────────────────

  const CITY_BOUNDS: Record<
    string,
    { sw: { lat: number; lng: number }; ne: { lat: number; lng: number } }
  > = {
    Nairobi: { sw: { lat: -1.45, lng: 36.65 }, ne: { lat: -1.15, lng: 36.95 } },
    Mombasa: { sw: { lat: -4.12, lng: 39.58 }, ne: { lat: -3.97, lng: 39.75 } },
    Kisumu: { sw: { lat: -0.16, lng: 34.7 }, ne: { lat: -0.02, lng: 34.85 } },
    Nakuru: { sw: { lat: -0.38, lng: 36.02 }, ne: { lat: -0.22, lng: 36.18 } },
    Eldoret: { sw: { lat: 0.46, lng: 35.21 }, ne: { lat: 0.57, lng: 35.32 } },
  }

  const DEFAULT_BOUNDS = CITY_BOUNDS.Nairobi

  function getCityBounds() {
    if (!requestContext?.city) return DEFAULT_BOUNDS
    return CITY_BOUNDS[requestContext.city] ?? DEFAULT_BOUNDS
  }

  function projectToSvg(lat: number, lng: number) {
    const { sw, ne } = getCityBounds()
    return {
      x: ((lng - sw.lng) / (ne.lng - sw.lng)) * width,
      y: ((ne.lat - lat) / (ne.lat - sw.lat)) * height, // Y inverted: north = top
    }
  }

  /**
   * Derive a stable 0–1 phase offset from a vehicle id string.
   * This replaces the per-frame Math.sin(tick + v.pulse) calls.
   * Result is constant for a given id — animation-delay does the rest.
   */
  function idToPhase(id: string): number {
    let h = 0
    for (let i = 0; i < id.length; i++) {
      h = (h * 31 + id.charCodeAt(i)) >>> 0
    }
    return (h % 1000) / 1000
  }

  function vehicleColor(isPartner: boolean): string {
    return isPartner ? "#f26522" : "#00b09b"
  }

  // ── SSE State ──────────────────────────────────────────────────────────────

  type ConnectionStatus =
    | "connecting"
    | "connected"
    | "reconnecting"
    | "offline"

  let status = $state<ConnectionStatus>("connecting")
  let vehicles = $state<SvgVehicle[]>([])
  let client: VehicleTrafficClient | null = null

  // ── VehicleTrafficClient wiring ────────────────────────────────────────────

  onMount(async () => {
    client = new VehicleTrafficClient({ url: hypnotizUrl })

    const unsub = client.on((event) => {
      switch (event.type) {
        case "connected":
          status = "connected"
          subscribeCurrentViewport()
          break

        case "disconnected":
          status = "offline"
          vehicles = []
          break

        case "error":
          // Client handles reconnect internally; we just reflect degraded UI
          if (status === "connected") status = "reconnecting"
          break

        case "backpressure":
          // Optional: show degraded state
          break

        case "update":
          // event.payload is SirtebasinResponse { ts, items: AttentionItem[] }
          vehicles = toSvgVehicles(event.payload.items)
          break
      }
    })

    try {
      await client.connect()
    } catch {
      status = "offline"
    }

    // Return unsub so Svelte can call it if the effect ever re-runs
    // (In practice onMount runs once; we handle cleanup in onDestroy)
    return unsub
  })

  onDestroy(() => {
    client?.destroy()
    client = null
  })

  function subscribeCurrentViewport() {
    if (!client) return
    const { sw, ne } = getCityBounds()
    const center = {
      lat: (sw.lat + ne.lat) / 2,
      lng: (sw.lng + ne.lng) / 2,
    }
    client
      .subscribe({
        viewport: {
          minLat: sw.lat,
          maxLat: ne.lat,
          minLng: sw.lng,
          maxLng: ne.lng,
        },
        center,
        zoom: 12,
        budget: { total: 300, reserved: { anomalies: 20, clusters: 30 } },
        policy: { includeAnomalies: true, includeHighSpeed: true },
      })
      .catch(() => {}) // subscribe is best-effort
  }

  // ── Coordinate mapping ─────────────────────────────────────────────────────

  function toSvgVehicles(items: AttentionItem[]): SvgVehicle[] {
    return items
      .filter((item) => item.kind === "vehicle")
      .map((item) => {
        const { x, y } = projectToSvg(item.lat, item.lng)
        const isPartner = partnerSaccoIds.includes((item as any).saccoId ?? "")
        return {
          id: item.id,
          x,
          y,
          color: vehicleColor(isPartner),
          phaseOffset: idToPhase(item.id),
          label:
            (item as any).saccoName ?? (item as any).plateNumber ?? item.id,
          isPartner,
        }
      })
      .filter((v) => v.x >= 0 && v.x <= width && v.y >= 0 && v.y <= height)
  }

  // ── UI helpers ─────────────────────────────────────────────────────────────

  const STATUS_COLOR: Record<ConnectionStatus, string> = {
    connected: "#00b09b",
    connecting: "#f59e0b",
    reconnecting: "#f59e0b",
    offline: "#ef4444",
  }

  const STATUS_LABEL: Record<ConnectionStatus, string> = {
    connected: "LIVE",
    connecting: "Connecting…",
    reconnecting: "Reconnecting…",
    offline: "Offline",
  }

  const cityName = $derived(requestContext?.city ?? "Nairobi")

  // ── Decorative hex grid ────────────────────────────────────────────────────

  const HEX_R = 22
  const H = HEX_R * Math.sqrt(3)
  const cols = Math.ceil(width / (HEX_R * 1.5)) + 2
  const rows = Math.ceil(height / H) + 2

  function hexPoints(cx: number, cy: number, r: number): string {
    return Array.from({ length: 6 }, (_, i) => {
      const a = (Math.PI / 3) * i - Math.PI / 6
      return `${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`
    }).join(" ")
  }

  const hexGrid = Array.from({ length: cols }, (_, col) =>
    Array.from({ length: rows }, (_, row) => ({
      cx: col * HEX_R * 1.5,
      cy: row * H + (col % 2 === 0 ? 0 : H / 2),
      key: `${col}-${row}`,
    })),
  ).flat()

  const roads = [
    "M 60 190 Q 200 160 400 180 Q 500 185 580 170",
    "M 0 240 Q 150 220 300 230 Q 450 240 600 220",
    "M 300 0 Q 310 100 290 200 Q 275 300 300 380",
    "M 0 80 Q 120 100 200 140 Q 300 175 400 300 Q 450 340 500 380",
    "M 100 380 Q 200 300 280 230",
    "M 400 0 Q 380 80 350 160",
  ]
</script>

<div class="map">
  <svg
    viewBox="0 0 {width} {height}"
    class="map-svg"
    aria-label="Live vehicle tracking — {cityName} network"
  >
    <defs>
      <radialGradient id="mapvign" cx="50%" cy="50%" r="50%">
        <stop offset="55%" stop-color="transparent" />
        <stop offset="100%" stop-color="rgba(0,0,0,0.55)" />
      </radialGradient>
      <filter id="vblur" x="-5%" y="-5%" width="110%" height="110%">
        <feGaussianBlur stdDeviation="0.6" />
      </filter>
      <filter id="vglow" x="-60%" y="-60%" width="220%" height="220%">
        <feGaussianBlur stdDeviation="4" result="blur" />
        <feMerge>
          <feMergeNode in="blur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
    </defs>

    <!-- Hex grid overlay -->
    {#each hexGrid as h (h.key)}
      <polygon
        points={hexPoints(h.cx, h.cy, HEX_R - 1)}
        fill="none"
        stroke="rgba(255,255,255,0.028)"
        stroke-width="0.7"
      />
    {/each}

    <!-- Decorative road lines -->
    {#each roads as d, i}
      <path
        {d}
        fill="none"
        stroke="rgba(255,255,255,0.06)"
        stroke-width={i < 2 ? 2.5 : 1.5}
        stroke-linecap="round"
        filter="url(#vblur)"
      />
    {/each}

    <!-- Live Vehicles ─────────────────────────────────────────────────────
         Pulse is entirely CSS-driven.
         animation-delay offsets each vehicle by its stable phaseOffset
         so they don't all throb in sync, without any JS per frame.
    ───────────────────────────────────────────────────────────────────── -->
    {#each vehicles as v (v.id)}
      <g
        class="vehicle"
        style="--color:{v.color}; --delay:{-(v.phaseOffset * 2).toFixed(3)}s"
        transform="translate({v.x},{v.y})"
      >
        <!-- Outer pulse ring — CSS animates r and opacity via stroke-width trick -->
        <circle class="pulse-outer" cx="0" cy="0" r="12" />
        <!-- Inner pulse ring -->
        <circle class="pulse-inner" cx="0" cy="0" r="6" />
        <!-- Vehicle body -->
        <rect
          x="-7"
          y="-4.5"
          width="14"
          height="9"
          rx="2.5"
          fill="var(--color)"
          filter="url(#vglow)"
          opacity="0.92"
        />
        <!-- Windscreen glint -->
        <rect
          x="-4"
          y="-3"
          width="4"
          height="2.5"
          rx="1"
          fill="rgba(255,255,255,0.30)"
        />
        <!-- Route dot -->
        <circle cx="4" cy="-1" r="1.5" fill="rgba(0,0,0,0.40)" />
      </g>
    {/each}

    <!-- Empty state -->
    {#if vehicles.length === 0 && status === "connected"}
      <text
        x={width / 2}
        y={height / 2}
        text-anchor="middle"
        dominant-baseline="middle"
        fill="rgba(255,255,255,0.25)"
        font-size="13"
        font-family="system-ui"
      >
        No active vehicles in {cityName}
      </text>
    {/if}

    <!-- Vignette -->
    <rect
      x="0"
      y="0"
      {width}
      {height}
      fill="url(#mapvign)"
      pointer-events="none"
    />
  </svg>

  <!-- Corner labels -->
  <div class="corner nw">CBD Core</div>
  <div class="corner ne">Kasarani</div>
  <div class="corner sw">Lang'ata</div>
  <div class="corner se">Eastlands</div>

  <!-- Legend -->
  <div class="legend">
    <div class="legend-item">
      <span class="legend-dot" style="background:#f26522"></span>
      Partner SACCO
    </div>
    <div class="legend-item">
      <span class="legend-dot" style="background:#00b09b"></span>
      Tracked vehicle
    </div>
  </div>

  <!-- Connection status pill -->
  <div
    class="live-pill"
    style="
      color: {STATUS_COLOR[status]};
      background: {STATUS_COLOR[status]}18;
      border-color: {STATUS_COLOR[status]}38;
    "
  >
    <span
      class="live-dot"
      class:pulsing={status === "connected"}
      style="background:{STATUS_COLOR[status]}"
    ></span>
    {STATUS_LABEL[status]}{status === "connected"
      ? ` · ${vehicles.length}`
      : ""}
  </div>
</div>

<style>
  /* ── Layout ───────────────────────────────────────────────────────────── */

  .map {
    position: relative;
    width: 100%;
    height: 100%;
    background: #080b0e;
    overflow: hidden;
  }

  .map-svg {
    width: 100%;
    height: 100%;
    display: block;
  }

  /* ── Vehicle pulse — CSS only, no JS per frame ────────────────────────
     Each vehicle group carries --color and --delay custom properties.
     The rings animate transform + opacity via @keyframes.
     animation-delay is negative so the animation starts mid-cycle,
     giving each vehicle a different phase from mount.
  ───────────────────────────────────────────────────────────────────── */

  .vehicle {
    /* pointer-events: none so they don't block map interactions */
    pointer-events: none;
  }

  .pulse-outer {
    fill: none;
    stroke: var(--color);
    stroke-width: 1;
    opacity: 0;
    transform-origin: 0 0;
    transform-box: fill-box;
    animation: pulse-outer 2s ease-out var(--delay, 0s) infinite;
  }

  .pulse-inner {
    fill: none;
    stroke: var(--color);
    stroke-width: 0.8;
    opacity: 0;
    transform-origin: 0 0;
    transform-box: fill-box;
    animation: pulse-inner 2s ease-out calc(var(--delay, 0s) + 0.3s) infinite;
  }

  @keyframes pulse-outer {
    0% {
      opacity: 0.5;
      transform: scale(0.6);
    }
    70% {
      opacity: 0.08;
      transform: scale(1.8);
    }
    100% {
      opacity: 0;
      transform: scale(2.2);
    }
  }

  @keyframes pulse-inner {
    0% {
      opacity: 0.35;
      transform: scale(0.7);
    }
    60% {
      opacity: 0.12;
      transform: scale(1.4);
    }
    100% {
      opacity: 0;
      transform: scale(1.6);
    }
  }

  /* ── Corner labels ────────────────────────────────────────────────────── */

  .corner {
    position: absolute;
    font-size: 0.56rem;
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: rgba(255, 255, 255, 0.22);
    padding: 4px;
    pointer-events: none;
  }
  .nw {
    top: 10px;
    left: 12px;
  }
  .ne {
    top: 10px;
    right: 12px;
  }
  .sw {
    bottom: 10px;
    left: 12px;
  }
  .se {
    bottom: 10px;
    right: 12px;
  }

  /* ── Legend ───────────────────────────────────────────────────────────── */

  .legend {
    position: absolute;
    bottom: 12px;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    gap: 16px;
    font-size: 0.58rem;
    color: rgba(255, 255, 255, 0.35);
  }

  .legend-item {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .legend-dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  /* ── Live pill ────────────────────────────────────────────────────────── */

  .live-pill {
    position: absolute;
    top: 12px;
    right: 12px;
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 0.65rem;
    font-weight: 700;
    border: 1px solid;
    border-radius: 9999px;
    padding: 4px 11px;
  }

  .live-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  .live-dot.pulsing {
    animation: ldot 1.5s ease infinite;
  }

  @keyframes ldot {
    0%,
    100% {
      opacity: 1;
    }
    50% {
      opacity: 0.4;
    }
  }
</style>
