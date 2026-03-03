<script lang="ts">
  import MapView from '$lib/map/components/MapView.svelte';
  import { geofences } from '$lib/map/stores/MapStore';
  import type { Geofence} from '$lib/map/stores/MapStore';

  let geofenceName = '';
  let defaultCenter: Coordinates = { lat: 1.2921, lng: 36.8219 }; // Nairobi


  // Handle new geofence from MapView
  function handleCreated(event: CustomEvent<Geofence>) {
    geofenceName = ''; // clears input after drawing
  }

  // Delete geofence
  async function deleteGeofence(id: string) {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;

  if (!token) {
    console.error('User not authenticated');
    return;
  }

  const res = await fetch(`/api/geofences?id=${id}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  if (res.ok) {
    geofences.update(list => list.filter(g => g.id !== id));
  } else {
    console.error('Failed to delete geofence');
  }
}

  // Save button (placeholder)
  async function saveGeofence(g: Geofence) {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;

  if (!token) {
    console.error('User not authenticated');
    return;
  }

  const res = await fetch('/api/geofences', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(g)
  });

  if (!res.ok) {
    console.error('Failed to save geofence');
  }
}
</script>

<div class="min-h-screen bg-gray-50 p-6 flex flex-col lg:flex-row gap-6">
  <!-- Sidebar / Form -->
  <div class="flex-shrink-0 w-full lg:w-1/3 bg-white rounded-2xl shadow-md p-6 flex flex-col gap-6">
    <h1 class="text-2xl font-bold text-gray-900">Geofences</h1>

    <!-- Name input -->
    <input
      bind:value={geofenceName}
      placeholder="Geofence name"
      class="w-full border border-gray-300 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
    />

    <!-- Existing geofences list -->
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
    <MapView
      defaultCenter={{ lat: 1.2921, lng: 36.8219 }}
      initialZoom={5}
      bind:nextName={geofenceName}
      on:created={handleCreated}
    />
  </div>
</div>

<style>
  @media (max-width: 1023px) {
    .flex-col.lg\:flex-row {
      flex-direction: column;
    }
  }

  input:focus {
    outline: none;
    box-shadow: 0 0 0 3px rgba(0, 122, 255, 0.3);
  }

  .leaflet-container {
    width: 100%;
    height: 100%;
    border-radius: 1rem;
    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
  }
</style>
