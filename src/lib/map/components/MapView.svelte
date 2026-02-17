<script lang="ts">
  import { onMount } from 'svelte';
  import type { Coordinates, Geofence } from '$lib/map/stores/MapStore';
  import { geofences, mapState } from '$lib/map/stores/MapStore';
  import { get } from 'svelte/store';

  export let initialCenter: Coordinates = { lat: 1.2921, lng: 36.8219 };
  export let initialZoom: number = 1;

  let mapContainer: HTMLDivElement;
  let mapInstance: any;
  let geofenceLayer: any;

  // Reactive stores
  let center = initialCenter;
  let zoom = initialZoom;
  let layers: any[] = [];

  $: ({ center, zoom, layers } = get(mapState));

  onMount(async () => {
    if (typeof window === 'undefined') return;

    const L = await import('leaflet');
    await import('leaflet/dist/leaflet.css');

    mapInstance = L.map(mapContainer, { center, zoom });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(mapInstance);

    geofenceLayer = L.layerGroup().addTo(mapInstance);

    // Subscribe to geofences
    const unsubscribe = geofences.subscribe((list: Geofence[]) => {
      geofenceLayer.clearLayers();

      list.forEach(g => {
        try {
          const latlngs = g.coords.map(c => [c.lat, c.lng]);

          if (latlngs.length === 1) {
            // Single point
            L.marker(latlngs[0]).bindPopup(`<strong>${g.name}</strong>`).addTo(geofenceLayer);
          } else {
            // Polygon
            L.polygon(latlngs, {
              color: '#007aff',
              fillColor: '#007aff',
              fillOpacity: 0.2,
              weight: 2
            }).bindPopup(`<strong>${g.name}</strong>`).addTo(geofenceLayer);
          }
        } catch (err) {
          console.warn('Invalid geofence coords', g.coords, err);
        }
      });
    });

    return () => unsubscribe();
  });
</script>

<div bind:this={mapContainer} class="w-full h-full rounded-2xl shadow-lg"></div>

<style>
  .leaflet-container {
    width: 100%;
    height: 100%;
    border-radius: 1rem;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }
</style>
