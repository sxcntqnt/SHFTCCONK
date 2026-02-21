<script lang="ts">
  import type { Contract } from '$lib/stores/contracts.store';
  import GlassCard from '$lib/components/GlassCard.svelte';
  import { onMount } from 'svelte';
  import L from 'leaflet';

  export let contract: Contract;

  let mapContainer: HTMLDivElement;
  let mapInstance: L.Map;

  onMount(() => {
    if (!mapContainer || !contract.route?.stops?.length) return;

    // Initialize map for this route
    const firstStop = contract.route.stops[0];
    mapInstance = L.map(mapContainer).setView([firstStop.lat, firstStop.lng], 12);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(mapInstance);

    // Draw stops as markers
    contract.route.stops.forEach(stop => {
      L.marker([stop.lat, stop.lng]).addTo(mapInstance).bindPopup(stop.name ?? 'Stop');
    });

    // Optional: draw polyline if provided
    if (contract.route.polyline) {
      const latlngs: [number, number][] = JSON.parse(contract.route.polyline);
      L.polyline(latlngs, { color: 'blue' }).addTo(mapInstance);
    }
  });
</script>

<GlassCard class="mb-4">
  <div class="flex justify-between items-center mb-2">
    <h3 class="font-semibold text-lg">{contract.name}</h3>
    <span class="text-sm text-gray-500">{contract.assignedVehicles.length} vehicles</span>
  </div>

  <div class="text-sm text-gray-600 mb-2">
    Max Vehicles: {contract.maxVehicles} | Subsidy: KES {contract.subsidyAmount.toLocaleString()}
  </div>

  <div class="w-full h-40 rounded-xl shadow-inner" bind:this={mapContainer}></div>
</GlassCard>