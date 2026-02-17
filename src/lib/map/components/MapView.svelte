<script lang="ts">
  import { onMount } from 'svelte';
  import { geofences } from '$lib/map/stores/MapStore';
  import type { Coordinates, Geofence } from '$lib/map/stores/MapStore';

  export let initialCenter: Coordinates = { lat: 1.2921, lng: 36.8219 };
  export let initialZoom: number = 5;
  export let currentName: string = '';

  let mapContainer: HTMLDivElement;
  let mapInstance: any;
  let drawnItems: any;
  const drawnIds = new Set<string>();

  onMount(async () => {
    if (typeof window === 'undefined') return;

    const L = await import('leaflet');
    await import('leaflet/dist/leaflet.css');
    await import('leaflet-draw');
    await import('leaflet-draw/dist/leaflet.draw.css');

    mapInstance = L.map(mapContainer, { center: initialCenter, zoom: initialZoom });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(mapInstance);

    drawnItems = new L.FeatureGroup();
    mapInstance.addLayer(drawnItems);

    const drawControl = new L.Control.Draw({
      edit: { featureGroup: drawnItems },
      draw: { circle: false, circlemarker: false, marker: true, polygon: true, polyline: false, rectangle: true }
    });
    mapInstance.addControl(drawControl);

    // Draw event
    mapInstance.on(L.Draw.Event.CREATED, (event: any) => {
      const layer = event.layer;

      if (!currentName) {
        alert('Enter a geofence name first');
        return;
      }

      let coords: Coordinates[] = [];
      if (layer instanceof L.Marker) {
        const latlng = layer.getLatLng();
        coords = [{ lat: latlng.lat, lng: latlng.lng }];
      } else if (layer instanceof L.Polygon || layer instanceof L.Rectangle) {
        const latlngs = layer.getLatLngs();
        const flatten = (arr: any): Coordinates[] => arr.flat(Infinity).map((c: any) => ({ lat: c.lat, lng: c.lng }));
        coords = flatten(latlngs);
      }

      const newGeofence: Geofence = { id: crypto.randomUUID(), name: currentName, coords };
      geofences.update(list => [...list, newGeofence]);
      drawnIds.add(newGeofence.id);

      let mapLayer;
      if (coords.length === 1) {
        mapLayer = layer.bindPopup(`<strong>${currentName}</strong>`).addTo(drawnItems);
      } else {
        mapLayer = L.polygon(coords.map(c => [c.lat, c.lng]), { color: '#007aff', fillOpacity: 0.2, weight: 2 })
                     .bindPopup(`<strong>${currentName}</strong>`)
                     .addTo(drawnItems);
      }

      currentName = ''; // clear input
    });

    // Render existing geofences
    geofences.subscribe(list => {
      list.forEach(g => {
        if (drawnIds.has(g.id)) return;

        const latlngs = g.coords.map(c => [c.lat, c.lng]);
        let layer;
        if (latlngs.length === 1) layer = L.marker(latlngs[0]).bindPopup(`<strong>${g.name}</strong>`);
        else layer = L.polygon(latlngs, { color: '#007aff', fillOpacity: 0.2, weight: 2 }).bindPopup(`<strong>${g.name}</strong>`);

        layer.addTo(drawnItems);
        drawnIds.add(g.id);
      });
    });
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
