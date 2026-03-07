<script lang="ts">
  /**
   * SeatViewer.svelte  (shell)
   *
   * Renders a Threlte <Canvas> containing SceneContents, plus HTML UI overlays.
   *
   * Usage:
   *   <SeatViewer selectedSeats={[2,5]} toggleSeat={fn} capacity="14" modelKey="sprinter" />
   */
  import { onMount, onDestroy } from "svelte"
  import { Canvas } from "@threlte/core"
  import SceneContents from "./SceneContents.svelte"

  let {
    selectedSeats = [],
    toggleSeat,
    capacity = "14",
    modelKey,
  }: {
    selectedSeats?: number[]
    toggleSeat: (n: number) => void
    capacity?: string
    modelKey: string
  } = $props()

  let viewMode: "exterior" | "interior" = "exterior"
  let loading = true
  let interiorLoaded = false
  let reservedSeats: number[] = []
  let sceneContents: SceneContents
  let pollingInterval: any

  async function fetchReservedSeats() {
    try {
      const res = await fetch(`/reserve/status?capacity=${capacity}`)
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
</script>

<div class="w-full h-[500px] relative">
  <!-- renderMode="on-demand" matches the original needsRender / requestRender pattern -->
  <Canvas renderMode="on-demand">
    <SceneContents
      bind:this={sceneContents}
      {selectedSeats}
      {toggleSeat}
      {modelKey}
      {reservedSeats}
      bind:viewMode
      bind:loading
      bind:interiorLoaded
    />
  </Canvas>

  {#if loading}
    <div
      class="absolute inset-0 flex items-center justify-center bg-white/80 z-10 pointer-events-none"
    >
      <div
        class="animate-spin rounded-full h-10 w-10 border-4 border-blue-500 border-t-transparent"
      />
    </div>
  {/if}

  {#if viewMode === "interior"}
    <button
      on:click={() => sceneContents.goBack()}
      class="absolute top-4 left-4 bg-white px-4 py-2 rounded shadow z-20"
    >
      ← Back
    </button>
  {/if}
</div>
