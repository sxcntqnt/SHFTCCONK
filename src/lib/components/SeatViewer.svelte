<script lang="ts">
  /**
   * SeatViewer.svelte (shell)
   *
   * Renders a Threlte <Canvas> with SceneContents, plus premium HTML overlays
   * for loading, navigation, and seat legend.
   */
  import { onMount, onDestroy } from "svelte"
  import { Canvas } from "@threlte/core"
  import SceneContents from "./SceneContents.svelte"

  let {
    selectedSeats = [],
    toggleSeat,
    capacity = "14",
    modelKey,
    reservedSeats: externalReserved = [],
  }: {
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

  let pollingInterval: any

  async function fetchReservedSeats() {
    try {
      const res = await fetch(`/admin/api/reserve/status?capacity=${matatuId}`)
      const data = await res.json()
      reservedSeats = data.reserved ?? []
    } catch (err) {
      console.error("Seat polling failed", err)
    }
  }

  onMount(() => {
    fetchReservedSeats()
    pollingInterval = setInterval(fetchReservedSeats, 10_000)
  })

  onDestroy(() => clearInterval(pollingInterval))

  // Merge external reserved seats with polled ones
  let allReserved = $derived([
    ...new Set([...reservedSeats, ...externalReserved]),
  ])

  let totalSeats = $derived(parseInt(capacity) || 14)
  let availableCount = $derived(totalSeats - allReserved.length)
</script>

<div class="viewer-root">
  <!-- 3D Canvas -->
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

  <!-- Loading overlay -->
  {#if loading}
    <div class="viewer-loading">
      <div class="loader-ring">
        <div class="loader-ring-inner"></div>
      </div>
      <span class="loader-text">Loading vehicle model…</span>
    </div>
  {/if}

  <!-- View mode indicator + back button -->
  <div class="viewer-hud-top">
    {#if viewMode === "interior"}
      <button class="hud-back" onclick={() => sceneContents.goBack()}>
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2.5"><path d="M19 12H5M12 19l-7-7 7-7" /></svg
        >
        Exterior View
      </button>
    {:else}
      <div class="hud-hint">
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          ><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" /></svg
        >
        <span>Click the door to enter</span>
      </div>
    {/if}

    <div class="hud-mode">
      <span
        class="hud-mode-dot"
        class:hud-mode-interior={viewMode === "interior"}
      ></span>
      {viewMode === "interior" ? "Interior" : "Exterior"}
    </div>
  </div>

  <!-- Seat legend (visible in interior mode) -->
  {#if viewMode === "interior"}
    <div class="viewer-legend">
      <div class="legend-item">
        <span class="legend-dot legend-available"></span>
        <span>Available ({availableCount})</span>
      </div>
      <div class="legend-item">
        <span class="legend-dot legend-selected"></span>
        <span>Selected ({selectedSeats.length})</span>
      </div>
      <div class="legend-item">
        <span class="legend-dot legend-reserved"></span>
        <span>Reserved ({allReserved.length})</span>
      </div>
    </div>
  {/if}

  <!-- Subtle vignette overlay for cinematic depth -->
  <div class="viewer-vignette"></div>
</div>

<style>
  .viewer-root {
    position: relative;
    width: 100%;
    height: 500px;
    border-radius: 16px;
    overflow: hidden;
    background: #0a0a0e;
    border: 1px solid var(--rim, rgba(255, 255, 255, 0.06));
  }

  .viewer-canvas {
    position: absolute;
    inset: 0;
    z-index: 1;
  }

  /* ── Loading ── */
  .viewer-loading {
    position: absolute;
    inset: 0;
    z-index: 10;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 14px;
    background: rgba(10, 10, 14, 0.9);
    backdrop-filter: blur(8px);
    pointer-events: none;
  }

  .loader-ring {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    border: 3px solid rgba(242, 101, 34, 0.1);
    border-top-color: var(--orange, #f26522);
    animation: ring-spin 0.8s linear infinite;
    position: relative;
  }

  .loader-ring-inner {
    position: absolute;
    inset: 4px;
    border-radius: 50%;
    border: 2px solid rgba(0, 176, 155, 0.1);
    border-bottom-color: var(--teal, #00b09b);
    animation: ring-spin 1.2s linear infinite reverse;
  }

  @keyframes ring-spin {
    to {
      transform: rotate(360deg);
    }
  }

  .loader-text {
    font-size: 0.72rem;
    font-weight: 600;
    color: rgba(255, 255, 255, 0.4);
    letter-spacing: 0.04em;
  }

  /* ── HUD top ── */
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

  .hud-back {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 7px 14px;
    border-radius: 10px;
    background: rgba(10, 10, 14, 0.75);
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.08);
    font-size: 0.75rem;
    font-weight: 600;
    color: rgba(255, 255, 255, 0.8);
    cursor: pointer;
    pointer-events: all;
    font-family: var(--font-body, system-ui);
    transition:
      background 0.15s,
      color 0.15s,
      border-color 0.15s;
  }
  .hud-back:hover {
    background: rgba(10, 10, 14, 0.9);
    color: #fff;
    border-color: rgba(255, 255, 255, 0.15);
  }

  .hud-hint {
    display: flex;
    align-items: center;
    gap: 5px;
    padding: 6px 12px;
    border-radius: 100px;
    background: rgba(10, 10, 14, 0.6);
    backdrop-filter: blur(8px);
    border: 1px solid rgba(255, 255, 255, 0.05);
    font-size: 0.68rem;
    font-weight: 500;
    color: rgba(255, 255, 255, 0.45);
    animation: hint-pulse 3s ease-in-out infinite;
  }

  @keyframes hint-pulse {
    0%,
    100% {
      opacity: 0.7;
    }
    50% {
      opacity: 1;
    }
  }

  .hud-mode {
    display: flex;
    align-items: center;
    gap: 5px;
    padding: 5px 10px;
    border-radius: 100px;
    background: rgba(10, 10, 14, 0.6);
    backdrop-filter: blur(8px);
    font-size: 0.62rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: rgba(255, 255, 255, 0.5);
  }

  .hud-mode-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--orange, #f26522);
    transition: background 0.3s ease;
  }
  .hud-mode-interior {
    background: var(--teal, #00b09b);
    box-shadow: 0 0 6px rgba(0, 176, 155, 0.5);
  }

  /* ── Legend ── */
  .viewer-legend {
    position: absolute;
    bottom: 12px;
    left: 12px;
    z-index: 20;
    display: flex;
    gap: 12px;
    padding: 8px 14px;
    border-radius: 10px;
    background: rgba(10, 10, 14, 0.75);
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.06);
    animation: legend-in 0.4s ease-out;
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
    gap: 5px;
    font-size: 0.65rem;
    font-weight: 600;
    color: rgba(255, 255, 255, 0.55);
  }

  .legend-dot {
    width: 8px;
    height: 8px;
    border-radius: 3px;
  }
  .legend-available {
    background: #fff;
  }
  .legend-selected {
    background: #0ea5e9;
    box-shadow: 0 0 4px rgba(14, 165, 233, 0.4);
  }
  .legend-reserved {
    background: #ef4444;
  }

  /* ── Vignette ── */
  .viewer-vignette {
    position: absolute;
    inset: 0;
    z-index: 5;
    pointer-events: none;
    background: radial-gradient(
      ellipse at center,
      transparent 50%,
      rgba(10, 10, 14, 0.3) 100%
    );
  }

  /* ── Responsive ── */
  @media (max-width: 640px) {
    .viewer-root {
      height: 380px;
    }
    .viewer-legend {
      gap: 8px;
      padding: 6px 10px;
    }
  }
</style>
