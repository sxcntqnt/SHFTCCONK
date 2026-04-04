<script lang="ts">
  import { onMount, onDestroy } from "svelte"

  // ── Types ──────────────────────────────────────────────────────────────
  interface LatLng {
    latitude: number
    longitude: number
  }
  interface RawRoute {
    route_number: string
    pickup_point: {
      pickup_point: string
      pickup_latlng: LatLng
      pickup_hexid: string
    }
    destinations: Array<{
      destination: string
      destination_latlng: LatLng
      destination_hexid: string
    }>
  }
  interface HexCell {
    id: string
    lat: number
    lng: number
    cx: number
    cy: number
    weight: number
    posterior: number
    label?: string
  }

  // ── Config ─────────────────────────────────────────────────────────────
  const DATA_URL =
    "https://raw.githubusercontent.com/sxcntqnt/sxcntqnt.github.io/refs/heads/main/json/YesBana.json"
  const W = 480,
    H = 340
  // Tight Nairobi bounds (filter out bad GPS points)
  const LAT_MAX = -1.1,
    LAT_MIN = -1.42
  const LNG_MIN = 36.65,
    LNG_MAX = 37.0
  const HEX_R = 16 // SVG hex radius

  // ── State ──────────────────────────────────────────────────────────────
  let cells: HexCell[] = []
  let loading = true
  let simHour = new Date().getHours() + new Date().getMinutes() / 60
  let tick = 0 // drives reactivity
  let interval: ReturnType<typeof setInterval>

  // ── Projection ─────────────────────────────────────────────────────────
  function project(lat: number, lng: number) {
    const pad = 24
    const x = pad + ((lng - LNG_MIN) / (LNG_MAX - LNG_MIN)) * (W - pad * 2)
    const y = pad + ((LAT_MAX - lat) / (LAT_MAX - LAT_MIN)) * (H - pad * 2)
    return { x, y }
  }

  // ── Hex geometry ───────────────────────────────────────────────────────
  function hexPoints(cx: number, cy: number, r: number): string {
    return Array.from({ length: 6 }, (_, i) => {
      const a = (Math.PI / 3) * i - Math.PI / 6
      return `${(cx + r * Math.cos(a)).toFixed(2)},${(cy + r * Math.sin(a)).toFixed(2)}`
    }).join(" ")
  }

  // ── Bayesian Beta-Binomial congestion model ────────────────────────────
  // Prior: Beta(α, β) from time-of-day signal
  // Evidence: route weight (density) through this hex zone
  // Posterior mean: (α + successes) / (α + β + n)
  function timeOfDayPrior(h: number): number {
    const t = h % 24
    if (t >= 7.0 && t < 9.5) return 0.88 // morning peak
    if (t >= 17.0 && t < 20.0) return 0.92 // evening peak
    if (t >= 6.0 && t < 7.0) return 0.52
    if (t >= 9.5 && t < 11.0) return 0.38
    if (t >= 16.0 && t < 17.0) return 0.6
    if (t >= 20.0 && t < 22.0) return 0.42
    if (t >= 22.0 || t < 5.5) return 0.12
    return 0.28
  }

  function bayesianPosterior(
    weight: number,
    maxWeight: number,
    hour: number,
  ): number {
    const prior = timeOfDayPrior(hour)
    const strength = 8 // prior confidence
    const alpha0 = prior * strength
    const beta0 = (1 - prior) * strength
    // treat normalised weight as # successes out of strength observations
    const successes = (weight / maxWeight) * strength * prior * 1.6
    const n = (weight / maxWeight) * strength * 0.8
    return Math.min(0.97, (alpha0 + successes) / (alpha0 + beta0 + n))
  }

  // ── Color mapping ──────────────────────────────────────────────────────
  function heatColor(p: number, alpha = 1): string {
    // teal → amber → orange → crimson
    if (p < 0.3) {
      const t = p / 0.3
      const r = Math.round(0 + t * 250)
      const g = Math.round(176 - t * 76)
      const b = Math.round(155 - t * 155)
      return `rgba(${r},${g},${b},${(0.35 + p * 0.8) * alpha})`
    }
    if (p < 0.6) {
      const t = (p - 0.3) / 0.3
      const r = Math.round(250 - t * 8)
      const g = Math.round(100 - t * 20)
      const b = 0
      return `rgba(${r},${g},${b},${(0.55 + p * 0.4) * alpha})`
    }
    const t = (p - 0.6) / 0.4
    const r = Math.round(242 - t * 20)
    const g = Math.round(80 - t * 80)
    return `rgba(${r},${g},0,${(0.7 + t * 0.25) * alpha})`
  }

  // ── Data loading ───────────────────────────────────────────────────────
  async function load() {
    try {
      const res = await fetch(DATA_URL)
      const json = await res.json()
      const routes: RawRoute[] = json.non_null_objects ?? []

      // Aggregate weight per hex ID
      const hexMap = new Map<
        string,
        { lat: number; lng: number; weight: number; label: string }
      >()

      const addHex = (
        id: string,
        lat: number,
        lng: number,
        label: string,
        w = 1,
      ) => {
        if (
          !id ||
          lat > -0.5 ||
          lat < LAT_MIN ||
          lng < LNG_MIN ||
          lng > LNG_MAX
        )
          return
        const e = hexMap.get(id)
        if (e) {
          e.weight += w
        } else {
          hexMap.set(id, { lat, lng, weight: w, label })
        }
      }

      for (const r of routes) {
        const p = r.pickup_point
        addHex(
          p.pickup_hexid,
          p.pickup_latlng.latitude,
          p.pickup_latlng.longitude,
          p.pickup_point,
          2,
        )
        for (const d of r.destinations) {
          addHex(
            d.destination_hexid,
            d.destination_latlng.latitude,
            d.destination_latlng.longitude,
            d.destination,
            1,
          )
        }
      }

      const maxW = Math.max(
        ...Array.from(hexMap.values()).map((v) => v.weight),
        1,
      )
      const h = simHour

      cells = Array.from(hexMap.entries()).map(([id, v]) => {
        const { x, y } = project(v.lat, v.lng)
        return {
          id,
          lat: v.lat,
          lng: v.lng,
          cx: x,
          cy: y,
          weight: v.weight,
          label: v.label,
          posterior: bayesianPosterior(v.weight, maxW, h),
        }
      })
    } catch (e) {
      console.error("HeatMap load error", e)
    } finally {
      loading = false
    }
  }

  // ── Tick — advance simulated time & recompute posteriors ───────────────
  function advance() {
    simHour = (simHour + 0.25) % 24
    const maxW = Math.max(...cells.map((c) => c.weight), 1)
    cells = cells.map((c) => ({
      ...c,
      posterior: bayesianPosterior(c.weight, maxW, simHour),
    }))
    tick++
  }

  // ── Lifecycle ──────────────────────────────────────────────────────────
  onMount(async () => {
    await load()
    interval = setInterval(advance, 900)
  })
  onDestroy(() => clearInterval(interval))

  // ── Derived display ────────────────────────────────────────────────────
  $: displayHour = Math.floor(simHour % 24)
  $: displayMin = simHour % 1 >= 0.5 ? "30" : "00"
  $: ampm = displayHour >= 12 ? "PM" : "AM"
  $: h12 =
    displayHour === 0 ? 12 : displayHour > 12 ? displayHour - 12 : displayHour
  $: timeStr = `${h12}:${displayMin} ${ampm}`
  $: priorVal = timeOfDayPrior(simHour)
  $: peakLabel =
    priorVal > 0.75 ? "Peak Hour" : priorVal > 0.45 ? "Moderate" : "Off-Peak"
  $: peakCls =
    priorVal > 0.75 ? "peak" : priorVal > 0.45 ? "moderate" : "offpeak"
  $: avgCong = cells.length
    ? (
        (cells.reduce((s, c) => s + c.posterior, 0) / cells.length) *
        100
      ).toFixed(0)
    : "—"

  // Progress-bar position for time clock (0–100%)
  $: clockPct = ((simHour % 24) / 24) * 100
</script>

<!-- ── Markup ─────────────────────────────────────────────────────────── -->
<div class="hm-wrap">
  <!-- Header bar -->
  <div class="hm-header">
    <div class="hm-title">
      <span class="pulse-dot"></span>
      Nairobi Congestion
    </div>
    <div class="hm-meta">
      <span class="badge-{peakCls} badge">{peakLabel}</span>
      <span class="time-chip">
        <svg
          width="10"
          height="10"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2.5"
        >
          <circle cx="12" cy="12" r="10" /><polyline
            points="12 6 12 12 16 14"
          />
        </svg>
        {timeStr}
      </span>
    </div>
  </div>

  <!-- SVG hex canvas -->
  <div class="hm-canvas">
    {#if loading}
      <div class="hm-loader">
        <div class="loader-hex"></div>
        <span>Loading route mesh…</span>
      </div>
    {:else}
      <svg
        viewBox="0 0 {W} {H}"
        class="hm-svg"
        aria-label="Nairobi congestion heatmap"
      >
        <defs>
          <!-- Subtle vignette -->
          <radialGradient id="vignette" cx="50%" cy="50%" r="50%">
            <stop offset="60%" stop-color="transparent" />
            <stop offset="100%" stop-color="rgba(0,0,0,0.45)" />
          </radialGradient>
          <!-- Glow filter for high-congestion cells -->
          <filter id="glow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge
              ><feMergeNode in="blur" /><feMergeNode
                in="SourceGraphic"
              /></feMerge
            >
          </filter>
        </defs>

        <!-- Hex cells (sorted so hot ones render on top) -->
        {#each [...cells].sort((a, b) => a.posterior - b.posterior) as cell (cell.id)}
          {@const r = HEX_R * (0.6 + cell.weight * 0.04)}
          {@const hot = cell.posterior > 0.72}
          <polygon
            points={hexPoints(cell.cx, cell.cy, r)}
            fill={heatColor(cell.posterior)}
            stroke={hot
              ? heatColor(cell.posterior, 0.6)
              : "rgba(255,255,255,0.04)"}
            stroke-width={hot ? 0.8 : 0.4}
            filter={hot ? "url(#glow)" : undefined}
            class="hex-cell"
          >
            <title
              >{cell.label ?? cell.id} · {(cell.posterior * 100).toFixed(0)}%
              congestion</title
            >
          </polygon>
        {/each}

        <!-- Hex ID labels on heavy nodes -->
        {#each cells.filter((c) => c.posterior > 0.78 && c.weight > 3) as cell (cell.id + "-lbl")}
          <text
            x={cell.cx}
            y={cell.cy + 1}
            class="hex-label"
            text-anchor="middle"
            dominant-baseline="middle"
          >
            {(cell.posterior * 100).toFixed(0)}%
          </text>
        {/each}

        <!-- Vignette overlay -->
        <rect
          width={W}
          height={H}
          fill="url(#vignette)"
          pointer-events="none"
        />
      </svg>

      <!-- Overlay corner labels -->
      <div class="corner nw">CBD</div>
      <div class="corner ne">Kasarani</div>
      <div class="corner sw">Ngong</div>
      <div class="corner se">Eastlands</div>
    {/if}
  </div>

  <!-- Time-of-day slider (visual only) -->
  <div class="hm-timeline">
    <div class="timeline-track">
      <div class="timeline-fill" style="width:{clockPct}%"></div>
      <div class="timeline-cursor" style="left:{clockPct}%"></div>
      <!-- Peak bands -->
      <div
        class="peak-band am"
        style="left:{(7 / 24) * 100}%;width:{(2.5 / 24) * 100}%"
      ></div>
      <div
        class="peak-band pm"
        style="left:{(17 / 24) * 100}%;width:{(3 / 24) * 100}%"
      ></div>
    </div>
    <div class="timeline-ends">
      <span>12 AM</span><span>12 PM</span><span>12 AM</span>
    </div>
  </div>

  <!-- Legend + stats footer -->
  <div class="hm-footer">
    <div class="legend">
      <div class="legend-bar"></div>
      <div class="legend-labels">
        <span>Clear</span><span>Moderate</span><span>Gridlock</span>
      </div>
    </div>
    <div class="hm-stats">
      <div class="hm-stat">
        <span class="stat-n">{cells.length}</span>
        <span class="stat-l">hex zones</span>
      </div>
      <div class="hm-stat">
        <span class="stat-n">{avgCong}%</span>
        <span class="stat-l">avg congestion</span>
      </div>
      <div class="hm-stat">
        <span class="stat-n algo">β-Bayes</span>
        <span class="stat-l">model</span>
      </div>
    </div>
  </div>
</div>

<!-- ── Styles ─────────────────────────────────────────────────────────── -->
<style>
  /* Wrap */
  .hm-wrap {
    background: var(--surface);
    border: 1px solid var(--rim);
    border-radius: 20px;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }

  /* Header */
  .hm-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 14px 18px;
    border-bottom: 1px solid var(--rim);
    flex-shrink: 0;
  }
  .hm-title {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 0.72rem;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--text-2);
  }
  .pulse-dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: var(--orange);
    animation: pdot 1.8s ease infinite;
  }
  @keyframes pdot {
    0%,
    100% {
      opacity: 1;
      box-shadow: 0 0 0 0 rgba(242, 101, 34, 0.5);
    }
    50% {
      opacity: 0.7;
      box-shadow: 0 0 0 5px transparent;
    }
  }
  .hm-meta {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .badge {
    padding: 2px 9px;
    border-radius: 100px;
    font-size: 0.64rem;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }
  .badge-peak {
    background: rgba(242, 101, 34, 0.15);
    color: var(--orange);
    border: 1px solid rgba(242, 101, 34, 0.3);
  }
  .badge-moderate {
    background: rgba(242, 180, 34, 0.12);
    color: #e8ac1a;
    border: 1px solid rgba(242, 180, 34, 0.28);
  }
  .badge-offpeak {
    background: rgba(0, 176, 155, 0.1);
    color: var(--teal);
    border: 1px solid rgba(0, 176, 155, 0.22);
  }
  .time-chip {
    display: flex;
    align-items: center;
    gap: 5px;
    font-size: 0.78rem;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
    color: var(--text-1);
    background: var(--ink);
    border: 1px solid var(--rim);
    border-radius: 8px;
    padding: 3px 10px;
  }
  .time-chip svg {
    color: var(--text-3);
  }

  /* Canvas */
  .hm-canvas {
    position: relative;
    background: var(--ink);
    aspect-ratio: 480/340;
    flex-shrink: 0;
  }
  .hm-svg {
    width: 100%;
    height: 100%;
    display: block;
  }
  .hex-cell {
    transition:
      fill 0.55s ease,
      filter 0.55s ease;
  }
  .hex-label {
    fill: rgba(255, 255, 255, 0.7);
    font-size: 5.5px;
    font-weight: 700;
    letter-spacing: 0.02em;
    pointer-events: none;
  }

  /* Corner labels */
  .corner {
    position: absolute;
    font-size: 0.6rem;
    font-weight: 600;
    letter-spacing: 0.07em;
    text-transform: uppercase;
    color: rgba(255, 255, 255, 0.28);
    padding: 4px;
  }
  .nw {
    top: 8px;
    left: 10px;
  }
  .ne {
    top: 8px;
    right: 10px;
  }
  .sw {
    bottom: 8px;
    left: 10px;
  }
  .se {
    bottom: 8px;
    right: 10px;
  }

  /* Loader */
  .hm-loader {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 14px;
    color: var(--text-3);
    font-size: 0.78rem;
  }
  .loader-hex {
    width: 36px;
    height: 36px;
    background: rgba(242, 101, 34, 0.18);
    clip-path: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%);
    animation: pdot 1.1s ease infinite;
  }

  /* Timeline */
  .hm-timeline {
    padding: 10px 18px 6px;
    border-top: 1px solid var(--rim);
    flex-shrink: 0;
  }
  .timeline-track {
    position: relative;
    height: 6px;
    background: rgba(255, 255, 255, 0.06);
    border-radius: 100px;
    overflow: visible;
    margin-bottom: 5px;
  }
  .timeline-fill {
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    background: linear-gradient(
      90deg,
      rgba(0, 176, 155, 0.5),
      rgba(242, 101, 34, 0.7)
    );
    border-radius: 100px;
    transition: width 0.9s linear;
  }
  .timeline-cursor {
    position: absolute;
    top: 50%;
    width: 10px;
    height: 10px;
    background: #fff;
    border: 2px solid var(--orange);
    border-radius: 50%;
    transform: translate(-50%, -50%);
    transition: left 0.9s linear;
    box-shadow: 0 0 6px rgba(242, 101, 34, 0.5);
  }
  /* AM / PM peak bands */
  .peak-band {
    position: absolute;
    top: 0;
    bottom: 0;
    border-radius: 2px;
    pointer-events: none;
  }
  .peak-band.am {
    background: rgba(242, 101, 34, 0.22);
  }
  .peak-band.pm {
    background: rgba(242, 101, 34, 0.28);
  }
  .timeline-ends {
    display: flex;
    justify-content: space-between;
    font-size: 0.6rem;
    color: var(--text-3);
    letter-spacing: 0.04em;
  }

  /* Footer */
  .hm-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 18px 14px;
    flex-shrink: 0;
    gap: 16px;
  }
  .legend {
    flex: 1;
  }
  .legend-bar {
    height: 5px;
    border-radius: 100px;
    background: linear-gradient(
      90deg,
      rgba(0, 176, 155, 0.75),
      rgba(250, 100, 0, 0.75),
      rgba(220, 0, 0, 0.85)
    );
    margin-bottom: 5px;
  }
  .legend-labels {
    display: flex;
    justify-content: space-between;
    font-size: 0.6rem;
    color: var(--text-3);
    font-weight: 600;
  }
  .hm-stats {
    display: flex;
    gap: 14px;
    flex-shrink: 0;
  }
  .hm-stat {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
  }
  .stat-n {
    font-size: 0.82rem;
    font-weight: 800;
    color: var(--text-1);
    font-variant-numeric: tabular-nums;
    letter-spacing: -0.02em;
  }
  .stat-n.algo {
    font-family: monospace;
    color: var(--orange);
    font-size: 0.7rem;
  }
  .stat-l {
    font-size: 0.58rem;
    color: var(--text-3);
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }
</style>
