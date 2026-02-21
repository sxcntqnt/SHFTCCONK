<script lang="ts">
  import { onMount } from 'svelte';
  import { gpsStore, GPSData } from '$lib/stores/gps.store';
  import { financeStore, getRevenueTrend } from '$lib/stores/finance.store';
  import { initGPSSocket } from '$lib/realtime/gpsSocket';
  import L from 'leaflet';
  import 'leaflet/dist/leaflet.css';
  import Chart from 'chart.js/auto';

  let vehicles: GPSData[] = [];
  let finance = [];

  gpsStore.subscribe(v => vehicles = v);
  financeStore.subscribe(v => finance = v);

  let map: L.Map;
  let markers: Record<string, L.Marker> = {};

  const getMarkerColor = (vehicle: GPSData) => {
    if (vehicle.rain) return 'blue'; // raining
    if (vehicle.complianceIssue) return 'red'; // compliance flagged
    return 'green'; // normal
  };

  const createIcon = (color: string, vehicleId: string, revenueTrend: number[]) => {
    // Generate a mini-chart canvas
    const canvasId = `chart-${vehicleId}`;
    const html = `
      <div style="position: relative; width:60px; height:40px;">
        <canvas id="${canvasId}" width="60" height="40" style="display:block;"></canvas>
        <div style="position:absolute;top:0;left:0;width:100%;height:100%;border-radius:50%;border:2px solid white;background:${color};opacity:0.2;"></div>
      </div>
    `;
    return L.divIcon({
      className: 'custom-marker',
      html,
      iconSize: [60, 40],
      iconAnchor: [30, 20],
    });
  };

  const renderChart = (vehicleId: string, trend: number[]) => {
    const ctx = document.getElementById(`chart-${vehicleId}`) as HTMLCanvasElement;
    if (!ctx) return;
    new Chart(ctx, {
      type: 'line',
      data: {
        labels: trend.map((_, i) => i + 1),
        datasets: [
          {
            label: 'Revenue',
            data: trend,
            borderColor: 'rgba(0,123,255,0.8)',
            backgroundColor: 'rgba(0,123,255,0.2)',
            tension: 0.3,
            pointRadius: 0,
          },
        ],
      },
      options: {
        responsive: false,
        plugins: { legend: { display: false } },
        scales: { x: { display: false }, y: { display: false } },
      },
    });
  };

  onMount(() => {
    // Initialize map
    map = L.map('map', {
      center: [1.2921, 36.8219],
      zoom: 12,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
    }).addTo(map);

    initGPSSocket();

    // Watch vehicles
    gpsStore.subscribe((data) => {
      data.forEach((v) => {
        const color = getMarkerColor(v);
        const revenueTrend = getRevenueTrend(finance.filter(f => f.vehicle === v.vehicleId));

        const icon = createIcon(color, v.vehicleId, revenueTrend);

        if (markers[v.vehicleId]) {
          // Update position & icon
          markers[v.vehicleId].setLatLng([v.lat, v.lng]);
          markers[v.vehicleId].setIcon(icon);
        } else {
          // Add new marker
          const marker = L.marker([v.lat, v.lng], { icon }).addTo(map);

          marker.bindPopup(`
            <strong>${v.vehicleId}</strong><br/>
            Speed: ${v.speed ?? 0} km/h<br/>
            Satellites: ${v.satellites ?? 'N/A'}<br/>
            Rain: ${v.rain ? 'Yes' : 'No'}<br/>
            Compliance: ${v.complianceIssue ? '⚠️' : 'OK'}<br/>
            <canvas id="popup-chart-${v.vehicleId}" width="200" height="80"></canvas>
          `);

          markers[v.vehicleId] = marker;
        }

        // Render mini chart inside popup
        setTimeout(() => renderChart(`chart-${v.vehicleId}`, revenueTrend), 50);
        setTimeout(() => renderChart(`popup-chart-${v.vehicleId}`, revenueTrend), 50);
      });
    });
  });
</script>

<h2 class="text-3xl font-bold mb-6">Real-Time Fleet Map & Revenue</h2>

<div id="map" class="h-[600px] rounded-3xl bg-white shadow-xl"></div>

<style>
  .custom-marker {
    display: flex;
    justify-content: center;
    align-items: center;
  }
</style>