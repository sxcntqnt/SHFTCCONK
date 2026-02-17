<script lang="ts">
  import { onMount } from 'svelte';
  import { writable, get } from 'svelte/store';
  import type { Writable } from 'svelte/store';

  // --- Geofence types ---
  export type Coordinates = { lat: number; lng: number };
  export type Geofence = { id: string; name: string; coords: Coordinates[] };

  // --- Geofence store ---
  export const geofences: Writable<Geofence[]> = writable([]);

  // --- Sidebar input ---
  let geofenceName = '';

  // --- Map refs ---
  let mapContainer: HTMLDivElement;
  let mapInstance: any;
  let drawnItems: any;
  const drawnIds = new Set<string>();

  // --- Save/Delete actions ---
  function deleteGeofence(id: string) {
    geofences.update(list => list.filter(g => g.id !== id));
  }

  function saveGeofence(g: Geofence) {
    alert(`Geofence "${g.name}" saved!`);
  }

  // --- Map initialization ---
  onMount(async () => {
    if (typeof window === 'undefined') return; // SSR-safe

    const L = await import('leaflet');
    await import('leaflet/dist/leaflet.css');
    const Draw = await import('leaflet-draw');
    await import('leaflet-draw/dist/leaflet.draw.css');

    // Initialize map
    mapInstance = L.map(mapContainer, {
      center: { lat: 1.2921, lng: 36.8219 },
      zoom: 5
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(mapInstance);

    drawnItems = new L.FeatureGroup();
    mapInstance.addLayer(drawnItems);

    const drawControl = new L.Control.Draw({
      edit: { featureGroup: drawnItems },
      draw: {
        circle: false,
        circlemarker: false,
        marker: true,
        polygon: true,
        polyline: false,
        rectangle: true
      }
    });
    mapInstance.addControl(drawControl);

    // --- Drawing new geofences ---
    mapInstance.on(L.Draw.Event.CREATED, (event: any) => {
      const layer = event.layer;

      if (!geofenceName) {
        alert('Enter a geofence name before drawing.');
        return;
      }

      let coords: Coordinates[] = [];
      if (layer instanceof L.Marker) {
        const latlng = layer.getLatLng();
        coords = [{ lat: latlng.lat, lng: latlng.lng }];
      } else if (layer instanceof L.Polygon || layer instanceof L.Rectangle) {
        const latlngs = layer.getLatLngs();
        coords = latlngs.flat(Infinity).map((c: any) => ({ lat: c.lat, lng: c.lng }));
      }

      const newGeofence: Geofence = {
        id: crypto.randomUUID(),
        name: geofenceName,
        coords
      };

      geofences.update(list => [...list, newGeofence]);
      drawnIds.add(newGeofence.id);

      // Render immediately
      if (coords.length === 1) {
        layer.bindPopup(`<strong>${geofenceName}</strong>`).addTo(drawnItems);
      } else {
        L.polygon(coords.map(c => [c.lat, c.lng]), {
          color: '#007aff',
          fillOpacity: 0.2,
          weight: 2
        }).bindPopup(`<strong>${geofenceName}</strong>`).addTo(drawnItems);
      }

      geofenceName = ''; // Clear input after drawing
    });

    // --- Render existing geofences ---
    geofences.subscribe(list => {
      drawnItems.clearLayers();
      list.forEach(g => {
        if (drawnIds.has(g.id)) return; // skip duplicates

        const latlngs = g.coords.map(c => [c.lat, c.lng]);
        if (latlngs.length === 1) {
          L.marker(latlngs[0]).bindPopup(`<strong>${g.name}</strong>`).addTo(drawnItems);
        } else {
          L.polygon(latlngs, { color: '#007aff', fillOpacity: 0.2, weight: 2 })
            .bindPopup(`<strong>${g.name}</strong>`).addTo(drawnItems);
        }
        drawnIds.add(g.id);
      });
    });
  });
</script>

<div class="min-h-screen bg-gray-50 p-6 flex flex-col lg:flex-row gap-6">
  <!-- Sidebar / Form -->
  <div class="flex-shrink-0 w-full lg:w-1/3 bg-white rounded-2xl shadow-md p-6 flex flex-col gap-6">
    <h1 class="text-2xl font-bold text-gray-900">Geofences</h1>

    <!-- Geofence Name Input -->
    <input
      bind:value={geofenceName}
      placeholder="Geofence name"
      class="w-full border border-gray-300 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
    />

    <!-- Existing Geofences -->
    {#if $geofences.length}
      <div class="mt-4 flex flex-col gap-2">
        <h2 class="text-lg font-semibold text-gray-800">Existing Geofences</h2>
        <ul class="flex flex-col gap-2">
          {#each $geofences as g (g.id)}
            <li class="p-2 border border-gray-200 rounded-xl bg-gray-50 hover:bg-gray-100 flex flex-col gap-1">
              <div class="font-medium">{g.name}</div>
              <div class="text-xs text-gray-500 truncate">{JSON.stringify(g.coords)}</div>
              <div class="flex gap-2 mt-1">
                <button
                  on:click={() => saveGeofence(g)}
                  class="px-3 py-1 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600"
                >
                  Save
                </button>
                <button
                  on:click={() => deleteGeofence(g.id)}
                  class="px-3 py-1 bg-red-500 text-white rounded-lg text-sm hover:bg-red-600"
                >
                  Delete
                </button>
              </div>
            </li>
          {/each}
        </ul>
      </div>
    {/if}
  </div>

  <!-- Map -->
  <div class="flex-1 min-h-[500px] rounded-2xl shadow-lg overflow-hidden">
    <div bind:this={mapContainer} class="w-full h-full"></div>
  </div>
</div>

<style>
  .leaflet-container {
    width: 100%;
    height: 100%;
    border-radius: 1rem;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }

  @media (max-width: 1023px) {
    .flex-col.lg\:flex-row {
      flex-direction: column;
    }
  }

  input:focus {
    outline: none;
    box-shadow: 0 0 0 3px rgba(0, 122, 255, 0.3);
  }
</style>
