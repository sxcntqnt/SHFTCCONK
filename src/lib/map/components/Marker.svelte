<script lang="ts">
  /**
   * Marker
   *
   * Renders a custom HTML marker on a MapLibre map.
   * Must be used inside a parent that holds a maplibregl.Map reference,
   * which it receives via the `map` prop.
   *
   * Usage:
   *   <Marker {map} {marker} />
   */

  import { onMount, onDestroy } from "svelte"
  import type { MapMarker } from "$lib/map/types/MapTypes"

  interface Props {
    /** The maplibregl.Map instance from the parent MapView */
    map: any
    marker: MapMarker
    /** Called when the marker is clicked */
    onclick?: (marker: MapMarker) => void
  }

  let { map, marker, onclick }: Props = $props()

  let mlMarker: any // maplibregl.Marker
  let mlPopup: any // maplibregl.Popup
  let el: HTMLDivElement

  onMount(async () => {
    if (!map) return

    const { default: maplibregl } = await import("maplibre-gl")

    // Build the popup
    mlPopup = new maplibregl.Popup({
      offset: 25,
      closeButton: false,
      className: "mp-marker-popup",
    }).setHTML(`<span>${marker.popup ?? marker.label}</span>`)

    // Build the marker using our custom HTML element
    mlMarker = new maplibregl.Marker({ element: el, anchor: "center" })
      .setLngLat([marker.coordinates.lng, marker.coordinates.lat])
      .setPopup(mlPopup)
      .addTo(map)
  })

  // Reactively move the marker if coordinates change
  $effect(() => {
    mlMarker?.setLngLat([marker.coordinates.lng, marker.coordinates.lat])
  })

  onDestroy(() => {
    mlMarker?.remove()
  })
</script>

<!--
  The visible element — exactly the same markup/style as the original Marker.svelte,
  but now rendered into a maplibregl.Marker's HTML slot instead of the DOM directly.
-->
<div
  bind:this={el}
  class="marker"
  style="transform: translate(-50%, -50%);"
  onclick={() => onclick?.(marker)}
  role="button"
  tabindex="0"
  onkeydown={(e) => e.key === "Enter" && onclick?.(marker)}
  aria-label={marker.label}
>
  <img src={marker.iconUrl} alt={marker.label} title={marker.label} />
</div>

<style>
  .marker img {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    box-shadow:
      0 4px 12px rgba(0, 0, 0, 0.15),
      0 0 8px rgba(242, 101, 34, 0.5); /* brand orange glow instead of blue */
    cursor: pointer;
    transition:
      transform 0.2s ease,
      box-shadow 0.2s ease;
    display: block;
  }
  .marker img:hover {
    transform: scale(1.2);
    box-shadow:
      0 6px 20px rgba(0, 0, 0, 0.25),
      0 0 14px rgba(242, 101, 34, 0.75);
  }
</style>
