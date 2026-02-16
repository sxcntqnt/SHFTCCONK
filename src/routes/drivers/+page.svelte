<script lang="ts">
  // Simple driver management scaffold
  import { onMount } from 'svelte'
  let drivers: any[] = []
  let name = ''
  let license = ''
  let vehicle_id = ''

  onMount(async () => {
    try {
      const res = await fetch('/api/drivers')
      if (res.ok) drivers = await res.json()
    } catch (e) {
      // ignore
    }
  })
</script>

<div class="p-6">
  <h1 class="text-2xl font-bold mb-4">Drivers</h1>
  <form method="post" action="/drivers/add" class="space-y-3 max-w-md">
    <input name="name" placeholder="Driver name" class="w-full border rounded px-3 py-2" />
    <input name="license" placeholder="License" class="w-full border rounded px-3 py-2" />
    <input name="vehicle_id" placeholder="Vehicle UUID (optional)" class="w-full border rounded px-3 py-2" />
    <button class="btn btn-primary">Add Driver</button>
  </form>

  <section class="mt-8">
    <h2 class="text-lg font-semibold mb-2">Existing Drivers</h2>
    {#if drivers.length === 0}
      <div class="text-gray-500">No drivers found.</div>
    {:else}
      <ul class="space-y-2">
        {#each drivers as d}
          <li class="p-2 border rounded">{d.name} — {d.license} {d.vehicle_id ? ` (vehicle ${d.vehicle_id})` : ''}</li>
        {/each}
      </ul>
    {/if}
  </section>
</div>
