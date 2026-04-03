<script lang="ts">
  import { complianceStore, type ComplianceEvent } from "../stores/compliance"
  import { derived } from "svelte/store"

  // Reactive subscription, latest events first
  const events = derived(complianceStore, ($c) => $c)

  // Optional: dismiss a single alert
  function dismissAlert(id: string) {
    complianceStore.update((evs) => evs.filter((e) => e.id !== id))
  }
</script>

<div class="space-y-4">
  {#each $events as e (e.id)}
    <div
      class="bg-red-50 border border-red-200 backdrop-blur-xl rounded-2xl p-4 shadow-lg hover:shadow-xl transition-shadow duration-200 relative"
    >
      <div class="flex justify-between items-center">
        <h4 class="font-semibold text-red-600">{e.type}</h4>
        <span class="text-xs text-gray-500 uppercase">{e.severity}</span>

        <!-- Dismiss button -->
        <button
          aria-label="Dismiss alert"
          class="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
          on:click={() => dismissAlert(e.id)}
        >
          ✕
        </button>
      </div>

      <p class="text-sm text-gray-700 mt-2">{e.message}</p>

      <!-- Optional timestamp -->
      <span class="text-xs text-gray-400 mt-1 block"
        >{new Date(e.timestamp).toLocaleTimeString()}</span
      >
    </div>
  {/each}
</div>
