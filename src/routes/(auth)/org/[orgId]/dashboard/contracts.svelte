<script lang="ts">
  /**
   * contracts.svelte
   *
   * FIXES:
   *   - `supabase` bare global → received as prop from parent
   *   - DB update used `assignedVehicles` (camelCase) → now in store action
   *     which uses `assigned_vehicles` (snake_case)
   *   - Svelte 4 `on:click` → Svelte 5 `onclick`
   */

  import {
    contracts,
    assignVehicleToContract,
    type Contract,
  } from "$lib/features/contracts/contracts"
  import { fleetStore, type Vehicle } from "$lib/features/fleet/stores/fleet"
  import type { SupabaseClient } from "@supabase/supabase-js"

  let { supabase }: { supabase: SupabaseClient } = $props()

  function isAssigned(contract: Contract, vehicleId: string): boolean {
    return contract.assignedVehicles.includes(vehicleId)
  }

  function capacityPercent(contract: Contract): number {
    if (contract.maxVehicles === 0) return 0
    return Math.round(
      (contract.assignedVehicles.length / contract.maxVehicles) * 100,
    )
  }

  function isFull(contract: Contract): boolean {
    return contract.assignedVehicles.length >= contract.maxVehicles
  }
</script>

{#if $contracts.length === 0}
  <div class="ct-empty">No contracts loaded for this SACCO.</div>
{:else}
  <div class="ct-list">
    {#each $contracts as contract (contract.id)}
      <div class="ct-card">
        <!-- Header -->
        <div class="ct-card-header">
          <div>
            <h3 class="ct-name">{contract.name}</h3>
            <p class="ct-subsidy">
              Subsidy: <strong
                >KES {contract.subsidyAmount.toLocaleString()}</strong
              >
            </p>
          </div>
          <!-- Capacity bar -->
          <div class="ct-capacity">
            <div class="ct-capacity-label">
              {contract.assignedVehicles.length}/{contract.maxVehicles} vehicles
            </div>
            <div class="ct-capacity-bar">
              <div
                class="ct-capacity-fill"
                class:ct-capacity-full={capacityPercent(contract) >= 100}
                style="width:{capacityPercent(contract)}%"
              ></div>
            </div>
          </div>
        </div>

        <!-- Route -->
        <p class="ct-route">
          Route: <strong>{contract.route?.name ?? "—"}</strong>
          {#if contract.route?.stops?.length}
            · {contract.route.stops.length} stops
          {/if}
        </p>

        <!-- Vehicle buttons -->
        <div class="ct-vehicles">
          {#each $fleetStore as vehicle (vehicle.id)}
            <button
              class="ct-vehicle-btn"
              class:ct-assigned={isAssigned(contract, vehicle.id)}
              class:ct-full={!isAssigned(contract, vehicle.id) &&
                isFull(contract)}
              disabled={isAssigned(contract, vehicle.id) || isFull(contract)}
              onclick={() =>
                assignVehicleToContract(supabase, contract, vehicle.id)}
            >
              {vehicle.regNumber}
            </button>
          {/each}
          {#if $fleetStore.length === 0}
            <p class="ct-no-vehicles">No vehicles in fleet</p>
          {/if}
        </div>
      </div>
    {/each}
  </div>
{/if}

<style>
  .ct-empty {
    padding: 1.5rem;
    color: rgba(255, 255, 255, 0.3);
    font-size: 0.85rem;
  }
  .ct-list {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .ct-card {
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.07);
    border-radius: 14px;
    padding: 1.25rem;
  }
  .ct-card-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 1rem;
    margin-bottom: 0.85rem;
    flex-wrap: wrap;
  }

  .ct-name {
    font-size: 1rem;
    font-weight: 700;
    color: #f0f1f4;
    margin: 0 0 0.2rem;
  }
  .ct-subsidy {
    font-size: 0.78rem;
    color: rgba(255, 255, 255, 0.4);
    margin: 0;
  }
  .ct-subsidy strong {
    color: #4ade80;
  }

  .ct-capacity {
    min-width: 160px;
  }
  .ct-capacity-label {
    font-size: 0.68rem;
    color: rgba(255, 255, 255, 0.3);
    margin-bottom: 0.3rem;
  }
  .ct-capacity-bar {
    height: 6px;
    background: rgba(255, 255, 255, 0.08);
    border-radius: 100px;
    overflow: hidden;
  }
  .ct-capacity-fill {
    height: 100%;
    background: #60a5fa;
    border-radius: 100px;
    transition: width 0.3s;
  }
  .ct-capacity-full {
    background: #4ade80;
  }

  .ct-route {
    font-size: 0.78rem;
    color: rgba(255, 255, 255, 0.3);
    margin: 0 0 0.85rem;
  }
  .ct-route strong {
    color: #c8cbd3;
  }

  .ct-vehicles {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
  }
  .ct-vehicle-btn {
    padding: 0.3rem 0.75rem;
    font-size: 0.78rem;
    font-weight: 600;
    font-family: "DM Sans", system-ui, sans-serif;
    border: 1px solid rgba(96, 165, 250, 0.25);
    border-radius: 8px;
    background: rgba(96, 165, 250, 0.08);
    color: #60a5fa;
    cursor: pointer;
    transition: background 0.15s;
  }
  .ct-vehicle-btn:hover:not(:disabled) {
    background: rgba(96, 165, 250, 0.16);
  }
  .ct-assigned {
    background: rgba(74, 222, 128, 0.1) !important;
    border-color: rgba(74, 222, 128, 0.25) !important;
    color: #4ade80 !important;
    cursor: not-allowed !important;
  }
  .ct-full {
    background: rgba(255, 255, 255, 0.03) !important;
    border-color: rgba(255, 255, 255, 0.06) !important;
    color: rgba(255, 255, 255, 0.2) !important;
    cursor: not-allowed !important;
  }
  .ct-no-vehicles {
    font-size: 0.78rem;
    color: rgba(255, 255, 255, 0.2);
    font-style: italic;
  }
</style>
