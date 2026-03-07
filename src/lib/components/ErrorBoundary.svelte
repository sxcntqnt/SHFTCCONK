<script lang="ts">
  import { createEventDispatcher } from "svelte"
  let { fallback = "Something went wrong." }: { fallback?: string } = $props()
  const dispatch = createEventDispatcher()

  let hasError = false

  // This function will be called manually by children
  function reportError(err: any) {
    console.error(err)
    hasError = true
    dispatch("error", err)
  }
</script>

{#if hasError}
  <div class="p-6 bg-red-50 text-red-700 rounded-2xl shadow">
    {fallback}
  </div>
{:else}
  <slot />
{/if}
