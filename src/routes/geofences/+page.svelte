<script lang="ts">
  import { geofences } from '$lib/map/stores/MapStore';
  import MapView from '$lib/map/components/MapView.svelte';
  import type { Coordinates } from '$lib/map/stores/MapStore';

  let name = '';
  let coords = '';

  // Add geofence function
  function addGeofence() {
    if (!name || !coords) return;

    let parsedCoords: Coordinates[] = [];

    try {
      const data = JSON.parse(coords);
      if (Array.isArray(data)) {
        if (data.length && Array.isArray(data[0])) {
          parsedCoords = data.map((c: number[]) => ({ lat: c[0], lng: c[1] }));
        } else if ('lat' in data && 'lng' in data) {
          parsedCoords = [data];
        }
      }
    } catch {
      const parts = coords.split(',').map(Number);
      if (parts.length === 2) parsedCoords = [{ lat: parts[0], lng: parts[1] }];
    }

    if (parsedCoords.length === 0) return;

    geofences.update(list => [
      ...list,
      { id: crypto.randomUUID(), name, coords: parsedCoords }
    ]);

    name = '';
    coords = '';
  }
</script>

<div class="min-h-screen bg-gray-50 p-6 flex flex-col lg:flex-row gap-6">
  <!-- Sidebar / Form -->
  <div class="flex-shrink-0 w-full lg:w-1/3 bg-white rounded-2xl shadow-md p-6 flex flex-col gap-6">
    <h1 class="text-2xl font-bold text-gray-900">Geofences</h1>

    <form on:submit|preventDefault={addGeofence} class="flex flex-col gap-3">
      <input bind:value={name} placeholder="Geofence name"
        class="w-full border border-gray-300 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400" />
      <input bind:value={coords} placeholder='Coordinates: e.g. [[lat,lng],[lat,lng]] or "lat,lng"'
        class="w-full border border-gray-300 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400" />
      <button type="submit" class="btn btn-primary w-full py-2 rounded-xl font-semibold">
        Add Geofence
      </button>
    </form>

    {#if $geofences.length}
      <div class="mt-4 flex flex-col gap-2">
        <h2 class="text-lg font-semibold text-gray-800">Existing Geofences</h2>
        <ul class="flex flex-col gap-1">
          {#each $geofences as g}
            <li class="p-2 border border-gray-200 rounded-xl bg-gray-50 hover:bg-gray-100">
              <div class="font-medium">{g.name}</div>
              <div class="text-xs text-gray-500 truncate">{JSON.stringify(g.coords)}</div>
            </li>
          {/each}
        </ul>
      </div>
    {/if}
  </div>

  <!-- Map -->
  <div class="flex-1 min-h-[500px] rounded-2xl shadow-lg overflow-hidden">
    <MapView initialCenter={{ lat: 1.2921, lng: 36.8219 }} initialZoom={13} />
  </div>
</div>

<style>
  @media (max-width: 1023px) {
    .flex-col.lg\:flex-row { flex-direction: column; }
  }
  input:focus { outline: none; box-shadow: 0 0 0 3px rgba(0, 122, 255, 0.3); }
  button.btn-primary {
    background: linear-gradient(to bottom, #007aff, #0051a8);
    color: white; transition: background 0.2s;
  }
  button.btn-primary:hover {
    background: linear-gradient(to bottom, #0051a8, #003c7a);
  }
</style>
