<!-- src/components/LearnMore.svelte -->
<script>
  import { Info } from '@lucide/svelte';
  let showInfo = false;
</script>

<div>
  <button on:click={() => showInfo = !showInfo} class="btn btn-neutral w-full rounded-full">
    <Info class="h-5 w-5 mr-2" /> Learn More
  </button>
  {#if showInfo}
    <div class="mt-4 card bg-base-100 shadow-xl">
      <div class="card-body">
        <p>This dashboard is your gateway to mobility transportation. Favorite drivers and matatus, search easily, tip your favorites, and remember routes for quick access. Enhanced with modern Svelte stores for reactive state management and custom data integration.</p>
      </div>
    </div>
  {/if}
</div>