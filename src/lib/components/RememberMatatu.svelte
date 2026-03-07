<!-- src/lib/components/RememberMatatu.svelte -->
<script lang="ts">
  import { Bookmark } from "@lucide/svelte"
  import { addRememberedMatatu } from "$lib/features/dashboard/stores/DashboardStore.ts"

  let { remembered = [] }: { remembered?: any[] } = $props()

  let newMatatu = ""

  function handleAddMatatu() {
    if (newMatatu.trim()) {
      addRememberedMatatu({ name: newMatatu.trim() })
      newMatatu = ""
    }
  }
</script>

<div>
  <ul class="space-y-2 mb-4">
    {#each remembered as matatu}
      <li class="card bg-base-100 shadow p-3 flex items-center">
        <Bookmark class="h-5 w-5 mr-3 text-primary" />
        {matatu.name}
      </li>
    {/each}
  </ul>

  <input
    type="text"
    bind:value={newMatatu}
    placeholder="Remember a matatu..."
    class="input input-bordered w-full mb-2"
  />
  <button
    on:click={handleAddMatatu}
    class="btn btn-secondary w-full rounded-full"
  >
    Remember
  </button>
</div>
