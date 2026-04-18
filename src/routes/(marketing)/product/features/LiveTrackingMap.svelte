<script lang="ts">
  // LiveTracking.svelte
  //
  // Real-time vehicle tracking visualization.
  // Connects to the SSE endpoint for live vehicle positions and projects
  // lat/lng coordinates into the SVG viewport using the city bounding box.
  //
  // PREVIOUS VERSION: decorative SVG with $bindable fake vehicles,
  //   no SSE connection, no coordinate projection.
  //
  // THIS VERSION:
  //   - Opens SSE connection to /api/map/stream (server-sent events)
  //   - Reads requestContext to know which city and bounding box to use
  //   - Projects real lat/lng → SVG x/y using the city bounds
  //   - Reconnects with exponential backoff on error
  //   - Preserves the exact SVG visualization (hex grid, roads, pulse, labels)
  //   - Shows connection status to the user

  import { onMount, onDestroy } from "svelte"
  import type { RequestContext } from "$lib/map"

  // ── Types ────────────────────────────────────────────────────────────────

  interface SvgVehicle {
    id: string
    x: number
    y: number
    color: string
    pulse: number
    label?: string
  }

  interface SSEVehicle {
    id: string
    saccoId: string
    saccoName: string
    plateNumber: string
    currentPosition: { lat: number; lng: number }
    heading: number
    speed: number
    status: string
    lastUpdated: string
  }

  // ── Props ────────────────────────────────────────────────────────────────

  interface Props {
    requestContext?: RequestContext | null
    width?: number
    height?: number
    /** SSE endpoint — defaults to /api/map/stream */
    sseUrl?: string
    /** Highlight these sacco IDs in brand orange */
    partnerSaccoIds?: string[]
  }

  let {
    requestContext = null,
    width = 600,
    height = 380,
    sseUrl = "/api/map/stream",
    partnerSaccoIds = [],
  }: Props = $props()

  // ── City bounding box for coordinate projection ───────────────────────────
  // Derived from requestContext city, falling back to Nairobi metro.
  // These match the bounds in BootstrapManifestService's CITY_INDEX.

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

  // Project real lat/lng to SVG coordinates
  function projectToSvg(
    lat: number,
    lng: number,
    bounds: typeof DEFAULT_BOUNDS,
  ): { x: number; y: number } {
    const { sw, ne } = bounds
    const x = ((lng - sw.lng) / (ne.lng - sw.lng)) * width
    // Y is inverted: north is top (small y), south is bottom (large y)
    const y = ((ne.lat - lat) / (ne.lat - sw.lat)) * height
    return { x, y }
  }

  function isPartner(saccoId: string): boolean {
    return partnerSaccoIds.includes(saccoId)
  }

  function vehicleColor(v: SSEVehicle): string {
    return isPartner(v.saccoId) ? "#f26522" : "#00b09b"
  }

  // ── SSE State ────────────────────────────────────────────────────────────

  type ConnectionStatus =
    | "connecting"
    | "connected"
    | "reconnecting"
    | "offline"

  let status = $state<ConnectionStatus>("connecting")
  let svgVehicles = $state<SvgVehicle[]>([])
  let clientId = $state<string | null>(null)

  let eventSource: EventSource | null = null
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null
  let reconnectAttempts = 0
  const MAX_RECONNECTS = 10
  const BASE_DELAY_MS = 2000

  function buildSSEUrl(): string {
    const params = new URLSearchParams()

    if (clientId) params.set("clientId", clientId)

    // Send city bounds as the filter — server returns vehicles in this bbox
    const bounds = getCityBounds()
    params.set(
      "bounds",
      `${bounds.sw.lat},${bounds.sw.lng},${bounds.ne.lat},${bounds.ne.lng}`,
    )

    return `${sseUrl}?${params.toString()}`
  }

  function connect() {
    if (eventSource) {
      eventSource.close()
      eventSource = null
    }

    status = reconnectAttempts === 0 ? "connecting" : "reconnecting"

    eventSource = new EventSource(buildSSEUrl())

    eventSource.onopen = () => {
      status = "connected"
      reconnectAttempts = 0
    }

    eventSource.onerror = () => {
      status = "reconnecting"
      eventSource?.close()
      eventSource = null

      if (reconnectAttempts >= MAX_RECONNECTS) {
        status = "offline"
        return
      }

      const delay = BASE_DELAY_MS * Math.pow(1.5, reconnectAttempts)
      reconnectTimer = setTimeout(() => {
        reconnectAttempts++
        connect()
      }, delay)
    }

    // ── SSE events ───────────────────────────────────────────────────────

    eventSource.addEventListener("connected", (e) => {
      try {
        const data = JSON.parse(e.data)
        clientId = data.data?.clientId ?? null
      } catch {}
    })

    eventSource.addEventListener("vehicle_update", (e) => {
      try {
        const payload = JSON.parse(e.data)
        const raw: SSEVehicle[] = payload?.data?.vehicles ?? []

        const bounds = getCityBounds()

        svgVehicles = raw
          .filter((v) => v.status === "active")
          .map((v, i) => {
            const { x, y } = projectToSvg(
              v.currentPosition.lat,
              v.currentPosition.lng,
              bounds,
            )
            return {
              id: v.id,
              x,
              y,
              color: vehicleColor(v),
              pulse: (i * 0.7) % (Math.PI * 2), // stagger pulse phase
              label: v.saccoName,
            }
          })
          // Only show vehicles within SVG bounds (clip to viewport)
          .filter((v) => v.x >= 0 && v.x <= width && v.y >= 0 && v.y <= height)
      } catch {}
    })

    eventSource.addEventListener("heartbeat", () => {
      // Connection alive — no action needed
    })
  }

  function disconnect() {
    if (reconnectTimer) {
      clearTimeout(reconnectTimer)
      reconnectTimer = null
    }
    eventSource?.close()
    eventSource = null
    status = "offline"
    svgVehicles = []
  }

  // ── Lifecycle ────────────────────────────────────────────────────────────

  onMount(() => {
    connect()
  })

  onDestroy(() => {
    disconnect()
  })

  // ── SVG Hex grid ─────────────────────────────────────────────────────────

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

  interface HexCell {
    cx: number
    cy: number
    key: string
  }
  const hexGrid: HexCell[] = []

  for (let col = -1; col < cols; col++) {
    for (let row = -1; row < rows; row++) {
      const cx = col * HEX_R * 1.5
      const cy = row * H + (col % 2 === 0 ? 0 : H / 2)
      hexGrid.push({ cx, cy, key: `${col}-${row}` })
    }
  }

  // ── Nairobi decorative road lines (matches the bounding box projection) ─
  // These are approximate Nairobi roads mapped to the SVG coordinate space

  const roads = [
    "M 60 190 Q 200 160 400 180 Q 500 185 580 170", // Ngong Rd
    "M 0 240 Q 150 220 300 230 Q 450 240 600 220", // Outer Ring Rd
    "M 300 0 Q 310 100 290 200 Q 275 300 300 380", // Uhuru Hwy
    "M 0 80  Q 120 100 200 140 Q 300 175 400 300 Q 450 340 500 380", // Mombasa Rd
    "M 100 380 Q 200 300 280 230", // Lang'ata Rd
    "M 400 0  Q 380 80  350 160", // Thika Rd
  ]

  // ── Pulse animation ───────────────────────────────────────────────────────

  let tick = $state(0)
  let rafId: number | null = null

  $effect(() => {
    function loop() {
      tick = (tick + 1) % 120
      rafId = requestAnimationFrame(loop)
    }
    rafId = requestAnimationFrame(loop)
    return () => {
      if (rafId !== null) cancelAnimationFrame(rafId)
    }
  })

  const pulseScale = (base: number) =>
    1 + Math.sin((tick / 120) * Math.PI * 2 + base) * 0.35

  // ── City corner labels (from bounds context) ──────────────────────────────

  const cityName = requestContext?.city ?? "Nairobi"
  const CORNER_LABELS: Record<string, [string, string, string, string]> = {
    Nairobi: ["CBD Core", "Kasarani", "Lang'ata", "Eastlands"],
    Mombasa: ["Old Town", "Nyali", "Likoni", "Bamburi"],
    default: ["NW", "NE", "SW", "SE"],
  }
  const [nw, ne, sw, se] = CORNER_LABELS[cityName] ?? CORNER_LABELS.default

  // ── Status indicator ──────────────────────────────────────────────────────

  const STATUS_COLOR: Record<ConnectionStatus, string> = {
    connected: "#00b09b",
    connecting: "#f59e0b",
    reconnecting: "#f59e0b",
    offline: "#ef4444",
  }
  const STATUS_LABEL: Record<ConnectionStatus, string> = {
    connected: "Live",
    connecting: "Connecting",
    reconnecting: "Reconnecting",
    offline: "Offline",
  }
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

    <!-- Decorative road lines (approximate Nairobi arterials) -->
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

    <!-- Live vehicles from SSE -->
    {#each svgVehicles as v (v.id)}
      {@const ps = pulseScale(v.pulse)}

      <!-- Outer pulse ring -->
      <circle
        cx={v.x}
        cy={v.y}
        r={(9 + v.pulse) * ps}
        fill="none"
        stroke={v.color}
        stroke-width="1"
        opacity={0.18 / ps}
      />

      <!-- Inner pulse ring -->
      <circle
        cx={v.x}
        cy={v.y}
        r={(5 + v.pulse * 0.5) * (1 + (1 - ps) * 0.3)}
        fill="none"
        stroke={v.color}
        stroke-width="0.8"
        opacity="0.30"
      />

      <!-- Vehicle body -->
      <rect
        x={v.x - 7}
        y={v.y - 4.5}
        width="14"
        height="9"
        rx="2.5"
        fill={v.color}
        filter="url(#vglow)"
        opacity="0.92"
      />

      <!-- Windscreen reflection -->
      <rect
        x={v.x - 4}
        y={v.y - 3}
        width="4"
        height="2.5"
        rx="1"
        fill="rgba(255,255,255,0.30)"
      />

      <!-- Route dot -->
      <circle cx={v.x + 4} cy={v.y - 1} r="1.5" fill="rgba(0,0,0,0.4)" />
    {/each}

    <!-- Empty state when no vehicles -->
    {#if svgVehicles.length === 0 && status === "connected"}
      <text
        x={width / 2}
        y={height / 2}
        text-anchor="middle"
        dominant-baseline="middle"
        fill="rgba(255,255,255,0.2)"
        font-size="12"
        font-family="system-ui"
      >
        No active vehicles in {cityName}
      </text>
    {/if}

    <!-- Vignette -->
    <rect {width} {height} fill="url(#mapvign)" pointer-events="none" />
  </svg>

  <!-- Corner labels (city-aware) -->
  <div class="corner nw">{nw}</div>
  <div class="corner ne">{ne}</div>
  <div class="corner sw">{sw}</div>
  <div class="corner se">{se}</div>

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

  <!-- Connection status pill (replaces static "Live" label) -->
  <div
    class="live-pill"
    style="color:{STATUS_COLOR[status]}; background:{STATUS_COLOR[
      status
    ]}18; border-color:{STATUS_COLOR[status]}38"
  >
    <span
      class="live-dot"
      style="background:{STATUS_COLOR[status]};
      animation: {status === 'connected' ? 'ldot 1.5s ease infinite' : 'none'}"
    ></span>
    {STATUS_LABEL[status]}{status === "connected"
      ? ` · ${svgVehicles.length}`
      : ""}
  </div>
</div>

<style>
  .map {
    position: relative;
    width: 100%;
    height: 100%;
    background: #080b0e;
    border-radius: 0;
    overflow: hidden;
  }
  .map-svg {
    width: 100%;
    height: 100%;
    display: block;
  }

  /* Corners */
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

  /* Legend */
  .legend {
    position: absolute;
    bottom: 10px;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    gap: 14px;
  }
  .legend-item {
    display: flex;
    align-items: center;
    gap: 5px;
    font-size: 0.58rem;
    font-weight: 600;
    color: rgba(255, 255, 255, 0.35);
    letter-spacing: 0.04em;
  }
  .legend-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  /* Status pill */
  .live-pill {
    position: absolute;
    top: 10px;
    right: 12px;
    display: flex;
    align-items: center;
    gap: 5px;
    font-size: 0.62rem;
    font-weight: 700;
    border: 1px solid;
    border-radius: 100px;
    padding: 3px 9px;
    transition:
      color 0.3s,
      background 0.3s,
      border-color 0.3s;
  }
  .live-dot {
    width: 5px;
    height: 5px;
    border-radius: 50%;
    flex-shrink: 0;
  }
  @keyframes ldot {
    0%,
    100% {
      opacity: 1;
    }
    50% {
      opacity: 0.3;
    }
  }
</style>
