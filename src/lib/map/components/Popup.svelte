<script lang="ts">
  /**
   * Popup
   *
   * Displays a MapLibre popup at a given coordinate.
   * Must receive the maplibregl.Map instance as a prop.
   *
   * Usage:
   *   <Popup {map} lngLat={[36.817, -1.286]} {label} />
   *   <Popup {map} lngLat={[36.817, -1.286]}>
   *     <svelte:fragment slot="content">
   *       <strong>Custom content</strong>
   *     </svelte:fragment>
   *   </Popup>
   */

  import { onMount, onDestroy } from "svelte"
  import type { Snippet } from "svelte"

  interface Props {
    map: any
    lngLat: [number, number]
    label?: string
    /** Optional max width in pixels. Default: 240 */
    maxWidth?: number
    /** Called when the popup is closed by the user */
    onclose?: () => void
    content?: Snippet
  }

  let { map, lngLat, label, maxWidth = 240, onclose, content }: Props = $props()

  let mlPopup: any
  let popupEl: HTMLDivElement

  onMount(async () => {
    if (!map) return
    const { default: maplibregl } = await import("maplibre-gl")

    mlPopup = new maplibregl.Popup({
      closeButton: true,
      closeOnClick: false,
      maxWidth: `${maxWidth}px`,
      className: "mp-popup-dark",
      offset: [0, -6],
    })
      .setLngLat(lngLat)
      .setDOMContent(popupEl)
      .addTo(map)

    mlPopup.on("close", () => onclose?.())
  })

  // Reactively move if lngLat changes
  $effect(() => {
    mlPopup?.setLngLat(lngLat)
  })

  onDestroy(() => {
    mlPopup?.remove()
  })
</script>

<!-- Hidden anchor; content is hoisted into the MapLibre popup DOM slot -->
<div style="display:none">
  <div bind:this={popupEl} class="popup-inner">
    {#if content}
      {@render content()}
    {:else}
      <span class="popup-label">{label ?? ""}</span>
    {/if}
  </div>
</div>

<style>
  .popup-inner {
    padding: 8px 12px;
    min-width: 80px;
  }

  .popup-label {
    font-family: var(--font-body, "DM Sans", sans-serif);
    font-size: 0.82rem;
    font-weight: 600;
    color: var(--text-1, #fff);
    white-space: nowrap;
  }

  /* ── Global popup shell override ─────────────────────────────────────────── */
  :global(.mp-popup-dark .maplibregl-popup-content) {
    background: rgba(13, 13, 20, 0.96) !important;
    border: 1px solid rgba(255, 255, 255, 0.1) !important;
    border-radius: 12px !important;
    padding: 0 !important;
    color: rgba(255, 255, 255, 0.85) !important;
    font-family: var(--font-body, "DM Sans", sans-serif) !important;
    box-shadow: 0 10px 32px rgba(0, 0, 0, 0.5) !important;
    backdrop-filter: blur(14px) !important;
    pointer-events: auto !important;
  }

  :global(.mp-popup-dark .maplibregl-popup-tip) {
    border-top-color: rgba(13, 13, 20, 0.96) !important;
    border-bottom-color: rgba(13, 13, 20, 0.96) !important;
  }

  :global(.mp-popup-dark .maplibregl-popup-close-button) {
    color: rgba(255, 255, 255, 0.4) !important;
    font-size: 16px !important;
    right: 8px !important;
    top: 4px !important;
    line-height: 1 !important;
    transition: color 0.15s !important;
  }
  :global(.mp-popup-dark .maplibregl-popup-close-button:hover) {
    color: rgba(255, 255, 255, 0.85) !important;
    background: transparent !important;
  }
</style>
