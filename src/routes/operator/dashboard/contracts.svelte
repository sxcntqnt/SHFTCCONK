<script lang="ts">
  import { onMount } from 'svelte'
  import { get } from 'svelte/store'
  import { contracts, initContracts, type Contract } from '$lib/stores/contracts'
  import { fleet, type Vehicle } from '$lib/stores/fleet'
  import { supabase } from '$lib/supabaseClient'

  let loading = true
  let error: string | null = null

  onMount(async () => {
    try {
      await initContracts()
    } catch (e: any) {
      error = e.message
    } finally {
      loading = false
    }
  })

  /* ============================================================
     ASSIGN VEHICLE
  ============================================================ */

  async function assignVehicle(contract: Contract, vehicle: Vehicle) {
    if (contract.assignedVehicles.includes(vehicle.id)) return
    if (contract.assignedVehicles.length >= contract.maxVehicles) return

    // Optimistic update
    contracts.update(cs =>
      cs.map(c =>
        c.id === contract.id
          ? { ...c, assignedVehicles: [...c.assignedVehicles, vehicle.id] }
          : c
      )
    )

    // Persist to backend
    const { error } = await supabase
      .from('contracts')
      .update({
        assignedVehicles: [...contract.assignedVehicles, vehicle.id]
      })
      .eq('id', contract.id)

    if (error) {
      // rollback
      contracts.update(cs =>
        cs.map(c =>
          c.id === contract.id
            ? {
                ...c,
                assignedVehicles: c.assignedVehicles.filter(id => id !== vehicle.id)
              }
            : c
        )
      )
    }
  }

  /* ============================================================
     UTILITIES
  ============================================================ */

  function isVehicleAssigned(contract: Contract, vehicleId: string) {
    return contract.assignedVehicles.includes(vehicleId)
  }

  function capacityPercent(contract: Contract) {
    return Math.round(
      (contract.assignedVehicles.length / contract.maxVehicles) * 100
    )
  }
</script>

{#if loading}
  <div class="p-6 text-gray-500">Loading contracts...</div>
{:else if error}
  <div class="p-6 text-red-500">{error}</div>
{:else}

<div class="space-y-10">
  {#each $contracts as contract (contract.id)}
    <div class="bg-white/90 backdrop-blur-xl p-6 rounded-3xl shadow-xl border border-white/60">

      <!-- Header -->
      <div class="flex flex-col md:flex-row md:items-center md:justify-between mb-4 gap-4">
        <div>
          <h3 class="text-xl font-bold">
            {contract.name}
          </h3>
          <p class="text-sm text-gray-600">
            Subsidy: <span class="font-semibold">KES {contract.subsidyAmount.toLocaleString()}</span>
          </p>
        </div>

        <!-- Capacity Indicator -->
        <div class="w-full md:w-64">
          <div class="text-xs text-gray-600 mb-1">
            Capacity: {contract.assignedVehicles.length}/{contract.maxVehicles}
          </div>
          <div class="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              class="h-full bg-blue-500 transition-all"
              style="width: {capacityPercent(contract)}%"
            />
          </div>
        </div>
      </div>

      <!-- Route Display -->
      <div class="mb-4 text-sm text-gray-600">
        Route: <span class="font-medium">{contract.route.name}</span>
        {#if contract.route.stops?.length}
          • Stops: {contract.route.stops.length}
        {/if}
      </div>

      <!-- Vehicles Grid -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
        {#each $fleet as vehicle (vehicle.id)}
          <button
            class="p-2 rounded-xl text-sm transition-all border
              {isVehicleAssigned(contract, vehicle.id)
                ? 'bg-green-100 border-green-300 text-green-800 cursor-not-allowed'
                : contract.assignedVehicles.length >= contract.maxVehicles
                  ? 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed'
                  : 'bg-blue-50 border-blue-200 hover:bg-blue-100'}"
            disabled={
              isVehicleAssigned(contract, vehicle.id) ||
              contract.assignedVehicles.length >= contract.maxVehicles
            }
            on:click={() => assignVehicle(contract, vehicle)}
          >
            {vehicle.regNumber}
          </button>
        {/each}
      </div>

    </div>
  {/each}
</div>

{/if}