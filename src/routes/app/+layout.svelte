<script lang="ts">
  import Sidebar from '$lib/components/Sidebar.svelte'
  import { onMount } from 'svelte'
  import { setUserFromBootstrap } from '$lib/features/auth/stores/auth'
  import { currentTrip } from '$lib/features/trips/userTripStore';


  export let data: { bootstrap: any }

  onMount(() => {
    if (data?.bootstrap) setUserFromBootstrap(data.bootstrap)
  })

  setInterval(() => {
    currentTrip.update(trip => {
      if (!trip) return trip;
      if (Math.random() > 0.8) {
        trip.delay += 2;
      }
      return trip;
    });
  }, 30000);
</script>

{#if data?.bootstrap}
  <div class="p-2 text-sm text-slate-600">Logged in as: {data.bootstrap.profile_id} — role: {data.bootstrap.actor_type ?? 'PASSENGER'}</div>
{/if}

<div class="flex min-h-screen">
  <Sidebar />
  <main class="flex-1 p-6">
      <slot />
  </main>
</div>

  

<style>
  :global(html,body,#svelte) { height: 100%; }
</style>
