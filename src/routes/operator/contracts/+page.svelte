<script lang="ts">
  import { contracts, initContracts, destroyContracts } from '$lib/stores/contracts.store';
  import ContractCard from '$lib/components/ContractCard.svelte';
  import { onMount, onDestroy } from 'svelte';

  let allContracts = [];

  onMount(async () => {
    await initContracts();
    contracts.subscribe(v => allContracts = v);
  });

  onDestroy(async () => {
    await destroyContracts();
  });
</script>

<h2 class="text-3xl font-bold mb-6">Contracts Overview</h2>

<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  {#each allContracts as contract}
    <ContractCard {contract} />
  {/each}

  {#if allContracts.length === 0}
    <p class="col-span-full text-gray-500 text-center mt-10">
      No contracts assigned to your organization yet.
    </p>
  {/if}
</div>