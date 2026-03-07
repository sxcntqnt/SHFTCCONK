<script lang="ts">
  import type { MapMarker } from "$lib/map/types/MapTypes.ts"
  let { marker }: { marker: MapMarker } = $props()
</script>

<div class="marker" style="transform: translate(-50%, -50%);">
  <img src={marker.iconUrl} alt={marker.label} title={marker.label} />
</div>

<style>
  .marker img {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    box-shadow:
      0 4px 12px rgba(0, 0, 0, 0.15),
      0 0 8px rgba(10, 132, 255, 0.6);
    transition:
      transform 0.2s ease,
      box-shadow 0.2s ease;
  }
  .marker img:hover {
    transform: scale(1.2);
    box-shadow:
      0 6px 20px rgba(0, 0, 0, 0.2),
      0 0 12px rgba(10, 132, 255, 0.8);
  }
</style>
