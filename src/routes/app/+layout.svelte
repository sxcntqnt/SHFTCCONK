<script lang="ts">
  import Sidebar from '$lib/components/Sidebar.svelte'
  import { onMount } from 'svelte'
  import { setUserFromBootstrap } from '$lib/auth'

  export let data: { bootstrap: any }

  onMount(() => {
    if (data?.bootstrap) setUserFromBootstrap(data.bootstrap)
  })
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
