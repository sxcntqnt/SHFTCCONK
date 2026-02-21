<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  export let fallback: string = 'Something went wrong.';
  const dispatch = createEventDispatcher();

  let hasError = false;

  // Catch errors in children
  function handleError(event) {
    console.error(event.detail);
    hasError = true;
    dispatch('error', event.detail);
  }
</script>

{#if hasError}
  <div class="p-6 bg-red-50 text-red-700 rounded-2xl shadow">{fallback}</div>
{:else}
  <svelte:component this={$$slots.default} on:error={handleError} />
{/if}