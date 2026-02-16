<script lang="ts">
  // Geofences / maps scaffold
  let geofences: any[] = []
  let name = ''
  let coords = ''
</script>

<div class="p-6">
  <h1 class="text-2xl font-bold mb-4">Geofences</h1>
  <form method="post" action="/geofences/create" class="max-w-md space-y-3">
    <input name="name" placeholder="Geofence name" class="w-full border rounded px-3 py-2" />
    <input name="coords" placeholder="Coordinates (geojson / simplified)" class="w-full border rounded px-3 py-2" />
    <button class="btn btn-primary">Create Geofence</button>
  </form>

  <div class="mt-6">
    <p class="text-gray-500">Map view and geofence list will appear here.</p>
  </div>
</div>
