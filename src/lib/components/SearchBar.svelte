<!-- src/lib/components/SearchBar.svelte -->
<script lang="ts">
  import { Search } from '@lucide/svelte';
  
  // Assuming your store is now in the proper location
  import { searchQuery } from '$lib/features/dashboard/stores/DashboardStore.ts';
</script>

<div class="mt-4 relative">
  <input
    type="text"
    bind:value={$searchQuery}
    placeholder="Search drivers, conductors, matatus..."
    class="input input-bordered input-lg w-full pl-12 rounded-full shadow-sm focus:ring-2 focus:ring-primary focus:border-primary"
  />
  <Search 
    class="absolute left-4 top-1/2 transform -translate-y-1/2 h-6 w-6 text-base-content/60" 
  />

  {#if $searchQuery}
    <button
      on:click={() => searchQuery.set('')}
      class="absolute right-4 top-1/2 transform -translate-y-1/2 btn btn-ghost btn-sm btn-circle"
      aria-label="Clear search"
    >
      <X class="h-5 w-5" />
    </button>
  {/if}
</div>

<style>
  input:focus {
    outline: none;
  }
</style>