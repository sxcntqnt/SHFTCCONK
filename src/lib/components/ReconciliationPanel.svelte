<script lang="ts">
  import { reconciliationStore, type ReconciliationEvent } from '../stores/reconciliation';
  import { derived } from 'svelte/store';

  // Reactive latest-first events
  const events = derived(reconciliationStore, $r => $r);

  // Optional: dismiss an event
  function dismissEvent(id: string) {
    reconciliationStore.update(r => r.filter(e => e.id !== id));
  }

  // Map status to color
  function statusColor(status: string) {
    switch (status) {
      case 'SHORTFALL': return 'text-red-600';
      case 'EXCESS': return 'text-blue-600';
      case 'MATCHED': return 'text-green-600';
      default: return 'text-gray-600';
    }
  }
</script>

<div class="space-y-4">
  {#each $events as r (r.id)}
    <div
      class="bg-white/80 backdrop-blur-2xl rounded-3xl p-5 shadow-xl relative hover:shadow-2xl transition-shadow duration-200"
    >
      <h4 class="font-bold text-lg">Vehicle {r.vehicle_id}</h4>
      <p>Total Collected: KES {r.total_collected}</p>
      <p>Expected Amount: KES {r.expected_amount}</p>
      <p class={`font-semibold mt-1 ${statusColor(r.status)}`}>
        {r.status}
      </p>

      <!-- Dismiss button -->
      <button
        aria-label="Dismiss event"
        class="absolute top-3 right-3 text-gray-400 hover:text-gray-600"
        on:click={() => dismissEvent(r.id)}
      >
        ✕
      </button>

      <!-- Optional timestamp -->
      {#if r.timestamp}
        <span class="text-xs text-gray-400 mt-1 block">{new Date(r.timestamp).toLocaleTimeString()}</span>
      {/if}
    </div>
  {/each}
</div>