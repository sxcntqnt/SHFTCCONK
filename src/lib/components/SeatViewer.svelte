<script lang="ts">
  /**
   * SeatViewer.svelte
   *
   * Fixes vs previous version:
   *   1. Seat polling: if the API returns 404 (endpoint doesn't exist yet),
   *      stop polling immediately rather than hammering every 10s in a loop.
   *      Falls back to mock data so the UI still works in dev.
   *   2. Mock reserved seats used when API unavailable — matching original.
   *   3. Dark theme styling matching the rest of the app.
   */
  import { onMount, onDestroy } from "svelte"
  import { Canvas } from "@threlte/core"
  import SceneContents from "./SceneContents.svelte"

  let {
    matatuId = "",
    selectedSeats = [],
    toggleSeat,
    capacity = "14",
    modelKey,
    reservedSeats: externalReserved = [],
  }: {
    matatuId: string
    selectedSeats?: number[]
    toggleSeat: (n: number) => void
    capacity?: string
    modelKey: string
    reservedSeats?: number[]
  } = $props()

  let viewMode: "exterior" | "interior" = $state("exterior")
  let loading = $state(true)
  let interiorLoaded = $state(false)
  let reservedSeats: number[] = $state([])
  let sceneContents: SceneContents

  // Mock data used when the API endpoint doesn't exist yet
  const MOCK_RESERVED = [3, 7, 12]

  async function fetchReservedSeats() {
    if (!matatuId) return

    try {
      const res = await fetch(`/api/seats/reserved/${matatuId}`)

      // If endpoint doesn't exist, use mock data and stop polling
      if (res.status === 404) {
        console.info(
          "[SeatViewer] /api/seats/reserved not found — using mock data",
        )
        reservedSeats = MOCK_RESERVED
        stopPolling()
        return
      }

      if (!res.ok) return
      const data = await res.json()
      reservedSeats = data.reserved ?? []
    } catch {
      // Network error — use mock data, don't spam console
      reservedSeats = MOCK_RESERVED
    }
  }

  let pollingInterval: ReturnType<typeof setInterval> | null = null

  function stopPolling() {
    if (pollingInterval !== null) {
      clearInterval(pollingInterval)
      pollingInterval = null
    }
  }

  onMount(() => {
    fetchReservedSeats()
    pollingInterval = setInterval(fetchReservedSeats, 10_000)
  })
  onDestroy(stopPolling)

  let allReserved = $derived([
    ...new Set([...reservedSeats, ...externalReserved]),
  ])
  let totalSeats = $derived(parseInt(capacity) || 14)
  let availableCount = $derived(totalSeats - allReserved.length)
</script>

<div class="viewer-root">
  <div class="viewer-canvas">
    <Canvas renderMode="on-demand">
      <SceneContents
        bind:this={sceneContents}
        {selectedSeats}
        {toggleSeat}
        {modelKey}
        {capacity}
        reservedSeats={allReserved}
        bind:viewMode
        bind:loading
        bind:interiorLoaded
      />
    </Canvas>
  </div>

  <!-- Vignette -->
  <div class="viewer-vignette" aria-hidden="true"></div>

  <!-- Loading overlay -->
  {#if loading}
    <div class="viewer-loading" aria-live="polite">
      <div class="loader-ring">
        <div class="loader-ring-inner"></div>
      </div>
      <span class="loader-text">Loading vehicle model…</span>
    </div>
  {/if}

  <!-- HUD top -->
  <div class="viewer-hud-top">
    {#if viewMode === "interior"}
      <button class="hud-btn" onclick={() => sceneContents.goBack()}>
        <svg
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2.5"
          stroke-linecap="round"
        >
          <path d="M19 12H5M12 19l-7-7 7-7" />
        </svg>
        Exterior View
      </button>
    {:else}
      <div class="hud-hint">
        <svg
          width="11"
          height="11"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
        </svg>
        <span>Click the door to enter</span>
      </div>
    {/if}

    <div class="hud-mode">
      <span class="hud-mode-dot" class:interior={viewMode === "interior"}
      ></span>
      {viewMode === "interior" ? "Interior" : "Exterior"}
    </div>
  </div>

  <!-- Seat legend -->
  {#if viewMode === "interior"}
    <div class="viewer-legend" role="status">
      <div class="legend-item">
        <span class="legend-dot legend-available"></span>
        <span
          >Available <span class="legend-count">({availableCount})</span></span
        >
      </div>
      <div class="legend-sep"></div>
      <div class="legend-item">
        <span class="legend-dot legend-selected"></span>
        <span
          >Selected <span class="legend-count">({selectedSeats.length})</span
          ></span
        >
      </div>
      <div class="legend-sep"></div>
      <div class="legend-item">
        <span class="legend-dot legend-reserved"></span>
        <span
          >Reserved <span class="legend-count">({allReserved.length})</span
          ></span
        >
      </div>
    </div>
  {/if}
</div>

<style>
  .viewer-root {
    position: relative;
    width: 100%;
    height: 500px;
    border-radius: 20px;
    overflow: hidden;
    background: #07091a; /* fallback while canvas loads */
    border-top: 1px solid rgba(140, 180, 255, 0.14);
    border-left: 1px solid rgba(140, 180, 255, 0.1);
    border-right: 1px solid rgba(8, 12, 36, 0.6);
    border-bottom: 1px solid rgba(8, 12, 36, 0.6);
    box-shadow:
      0 0 0 1px rgba(255, 255, 255, 0.04) inset,
      0 28px 64px rgba(0, 0, 0, 0.55),
      0 8px 24px rgba(0, 0, 0, 0.4);
  }

  .viewer-canvas {
    position: absolute;
    inset: 0;
    z-index: 1;
  }

  /* Vignette — darkens edges so model doesn't bleed into UI */
  .viewer-vignette {
    position: absolute;
    inset: 0;
    z-index: 5;
    pointer-events: none;
    background: radial-gradient(
      ellipse at center,
      transparent 40%,
      rgba(7, 9, 26, 0.5) 100%
    );
    border-radius: inherit;
  }

  /* Loading overlay */
  .viewer-loading {
    position: absolute;
    inset: 0;
    z-index: 20;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 16px;
    background: rgba(7, 9, 26, 0.88);
    backdrop-filter: blur(12px);
    pointer-events: none;
    border-radius: inherit;
  }
  .loader-ring {
    width: 42px;
    height: 42px;
    border-radius: 50%;
    border: 2.5px solid rgba(242, 101, 34, 0.12);
    border-top-color: var(--orange, #f26522);
    animation: ring-spin 0.75s linear infinite;
    position: relative;
  }
  .loader-ring-inner {
    position: absolute;
    inset: 5px;
    border-radius: 50%;
    border: 2px solid rgba(0, 176, 155, 0.12);
    border-bottom-color: var(--teal, #00b09b);
    animation: ring-spin 1.1s linear infinite reverse;
  }
  @keyframes ring-spin {
    to {
      transform: rotate(360deg);
    }
  }
  .loader-text {
    font-family: var(--font-body, system-ui);
    font-size: 0.68rem;
    font-weight: 600;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: rgba(255, 255, 255, 0.38);
  }

  /* HUD top */
  .viewer-hud-top {
    position: absolute;
    top: 12px;
    left: 12px;
    right: 12px;
    z-index: 20;
    display: flex;
    align-items: center;
    justify-content: space-between;
    pointer-events: none;
  }
  .hud-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 7px 14px;
    border-radius: 10px;
    background: rgba(7, 9, 26, 0.78);
    backdrop-filter: blur(14px);
    border: 1px solid rgba(255, 255, 255, 0.1);
    font-family: var(--font-body, system-ui);
    font-size: 0.72rem;
    font-weight: 600;
    color: rgba(255, 255, 255, 0.75);
    cursor: pointer;
    pointer-events: all;
    transition:
      background 0.15s,
      color 0.15s,
      border-color 0.15s,
      transform 0.12s;
  }
  .hud-btn:hover {
    background: rgba(242, 101, 34, 0.12);
    border-color: rgba(242, 101, 34, 0.3);
    color: var(--orange, #f26522);
    transform: translateX(-2px);
  }
  .hud-hint {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 12px;
    border-radius: 100px;
    background: rgba(7, 9, 26, 0.68);
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.07);
    font-size: 0.65rem;
    font-weight: 500;
    color: rgba(255, 255, 255, 0.45);
    animation: hint-fade 3.5s ease-in-out infinite;
  }
  @keyframes hint-fade {
    0%,
    100% {
      opacity: 0.65;
    }
    50% {
      opacity: 1;
    }
  }
  .hud-mode {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 5px 11px;
    border-radius: 100px;
    background: rgba(7, 9, 26, 0.72);
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.07);
    font-size: 0.58rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: rgba(255, 255, 255, 0.45);
  }
  .hud-mode-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--orange, #f26522);
    transition:
      background 0.3s,
      box-shadow 0.3s;
  }
  .hud-mode-dot.interior {
    background: var(--teal, #00b09b);
    box-shadow: 0 0 6px rgba(0, 176, 155, 0.6);
  }

  /* Legend */
  .viewer-legend {
    position: absolute;
    bottom: 14px;
    left: 14px;
    z-index: 20;
    display: flex;
    align-items: center;
    padding: 9px 16px;
    border-radius: 12px;
    background: rgba(7, 9, 26, 0.82);
    backdrop-filter: blur(14px);
    border: 1px solid rgba(255, 255, 255, 0.07);
    animation: legend-in 0.35s ease-out both;
  }
  @keyframes legend-in {
    from {
      opacity: 0;
      transform: translateY(6px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  .legend-item {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 0.62rem;
    font-weight: 600;
    color: rgba(255, 255, 255, 0.5);
    padding: 0 10px;
  }
  .legend-item:first-child {
    padding-left: 0;
  }
  .legend-item:last-child {
    padding-right: 0;
  }
  .legend-sep {
    width: 1px;
    height: 16px;
    background: rgba(255, 255, 255, 0.08);
    flex-shrink: 0;
  }
  .legend-dot {
    width: 8px;
    height: 8px;
    border-radius: 3px;
    flex-shrink: 0;
  }
  .legend-available {
    background: rgba(255, 255, 255, 0.7);
  }
  .legend-selected {
    background: #0ea5e9;
    box-shadow: 0 0 5px rgba(14, 165, 233, 0.5);
  }
  .legend-reserved {
    background: #ef4444;
  }
  .legend-count {
    color: rgba(255, 255, 255, 0.3);
    font-weight: 400;
  }

  @media (max-width: 640px) {
    .viewer-root {
      height: 360px;
    }
    .legend-item {
      padding: 0 7px;
      font-size: 0.58rem;
    }
  }
</style>
