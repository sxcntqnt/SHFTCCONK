<script lang="ts">
  import { onMount, createEventDispatcher } from 'svelte';
  import { geofences } from '$lib/map/stores/MapStore';
  import type { Coordinates, Geofence } from '$lib/map/stores/MapStore';

  export let initialCenter: Coordinates = { lat: 1.2921, lng: 36.8219 };
  export let initialZoom: number = 5;

  // Parent can bind this to sidebar input
  export let nextName: string = '';

  const dispatch = createEventDispatcher();

  let mapContainer: HTMLDivElement;
  let mapInstance: any;
  let drawnItems: any;

  // Track which geofence IDs have already been drawn
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

    // On shape created
    mapInstance.on('draw:created', (event: any) => {
      const layer = event.layer;

      if (!nextName) {
        alert('Enter a geofence name first');
        return;
      }

      let coords: Coordinates[] = [];

      if (layer instanceof L.Marker) {
        const latlng = layer.getLatLng();
        coords = [{ lat: latlng.lat, lng: latlng.lng }];
      } else if (layer instanceof L.Polygon || layer instanceof L.Rectangle) {
        const flatten = (arr: any): Coordinates[] =>
          arr.flat(Infinity).map((c: any) => ({ lat: c.lat, lng: c.lng }));
        coords = flatten(layer.getLatLngs());
      }

      const newGeofence: Geofence = {
        id: crypto.randomUUID(),
        name: nextName,
        coords
      };

      // Add to store
      geofences.update(list => [...list, newGeofence]);
      drawnIds.add(newGeofence.id);

      // Add to map
      if (coords.length === 1) {
        layer.bindPopup(`<strong>${nextName}</strong>`).addTo(drawnItems);
      } else {
        const polygon = L.polygon(coords.map(c => [c.lat, c.lng]), {
          color: '#007aff',
          fillOpacity: 0.2,
          weight: 2
        }).bindPopup(`<strong>${nextName}</strong>`);
        polygon.addTo(drawnItems);
      }

      // Notify parent about creation
      dispatch('created', newGeofence);
    });

    // Render existing geofences from store
    geofences.subscribe(list => {
      list.forEach(g => {
        if (drawnIds.has(g.id)) return;

        const latlngs = g.coords.map(c => [c.lat, c.lng]);
        let layer;
        if (latlngs.length === 1) {
          layer = L.marker(latlngs[0]).bindPopup(`<strong>${g.name}</strong>`);
        } else {
          layer = L.polygon(latlngs, { color: '#007aff', fillOpacity: 0.2, weight: 2 })
                   .bindPopup(`<strong>${g.name}</strong>`);
        }
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
    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
  }
</style>
