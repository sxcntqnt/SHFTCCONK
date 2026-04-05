<script lang="ts">
  interface Vehicle {
    x: number
    y: number
    color: string
    pulse: number
  }

  // Props with runes
  let {
    vehicles = $bindable([]),
    width = 600,
    height = 380,
  } = $props<{
    vehicles?: Vehicle[]
    width?: number
    height?: number
  }>()

  // Hex grid overlay
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

  let hexGrid: HexCell[] = $state([])

  // Precompute hex grid (this is static, so we can do it at init)
  for (let col = -1; col < cols; col++) {
    for (let row = -1; row < rows; row++) {
      const cx = col * HEX_R * 1.5
      const cy = row * H + (col % 2 === 0 ? 0 : H / 2)
      hexGrid.push({ cx, cy, key: `${col}-${row}` })
    }
  }

  // Animated tick for vehicle pulse
  let tick = $state(0)
  let rafId: number | null = null

  $effect(() => {
    // This effect only runs in the browser
    function loop() {
      tick = (tick + 1) % 120
      rafId = requestAnimationFrame(loop)
    }

    rafId = requestAnimationFrame(loop)

    return () => {
      if (rafId !== null) {
        cancelAnimationFrame(rafId)
      }
    }
  })

  // Pulse helper (reactive on tick)
  const pulseScale = (base: number) =>
    1 + Math.sin((tick / 120) * Math.PI * 2 + base) * 0.35

  // Nairobi road-like lines (purely decorative)
  const roads = [
    "M 60 190 Q 200 160 400 180 Q 500 185 580 170",
    "M 0 240 Q 150 220 300 230 Q 450 240 600 220",
    "M 300 0 Q 310 100 290 200 Q 275 300 300 380",
    "M 0 80  Q 120 100 200 140 Q 300 175 400 300 Q 450 340 500 380",
    "M 100 380 Q 200 300 280 230",
    "M 400 0  Q 380 80  350 160",
  ]
</script>

<div class="map">
  <svg
    viewBox="0 0 {width} {height}"
    class="map-svg"
    aria-label="Live vehicle tracking map — Nairobi matatu network"
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

    <!-- Hex grid -->
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
        stroke-width={i === 0 || i === 1 ? 2.5 : 1.5}
        stroke-linecap="round"
        filter="url(#vblur)"
      />
    {/each}

    <!-- Vehicles -->
    {#each vehicles as v}
      {@const ps = pulseScale(v.pulse)}
      {@const isOrange = v.color === "#f26522" || v.color.includes("f26")}

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

    <!-- Vignette -->
    <rect {width} {height} fill="url(#mapvign)" pointer-events="none" />
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

  <!-- Live pill -->
  <div class="live-pill">
    <span class="live-dot"></span>
    {vehicles.length} Live
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

  /* Live pill */
  .live-pill {
    position: absolute;
    top: 10px;
    right: 12px;
    display: flex;
    align-items: center;
    gap: 5px;
    font-size: 0.62rem;
    font-weight: 700;
    color: #00b09b;
    background: rgba(0, 176, 155, 0.1);
    border: 1px solid rgba(0, 176, 155, 0.22);
    border-radius: 100px;
    padding: 3px 9px;
  }
  .live-dot {
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: #00b09b;
    animation: ldot 1.5s ease infinite;
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
