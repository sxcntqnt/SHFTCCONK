<script lang="ts">
  import { page } from '$app/state';
  import { onDestroy } from 'svelte';
  import { fleetStore, getVehicleById, requireVehicleAccess } from '$lib/stores/fleet.store';
  import { complianceStore } from '$lib/stores/compliance.store';
  import { financeStore } from '$lib/stores/finance.store';
  import GlassCard from '$lib/components/GlassCard.svelte';
  import { writable } from 'svelte/store';
  import { supabase } from '$lib/supabaseClient';

  let vehicleId: string;
  let vehicle = null;
  let alerts = [];
  let revenue = 0;

  // Editable route/status
  const editRoute = writable('');
  const editStatus = writable('');

  $: vehicleId = page.params.vehicleId;

  // Subscriptions
  const fleetUnsub = fleetStore.subscribe(v => {
    vehicle = getVehicleById(vehicleId);
    if (vehicle) {
      editRoute.set(vehicle.route);
      editStatus.set(vehicle.status);
      requireVehicleAccess(vehicle); // tenant & RLS guard
    }
  });

  const complianceUnsub = complianceStore.subscribe(v => {
    alerts = v.filter(a => a.vehicle === vehicleId);
  });

  const financeUnsub = financeStore.subscribe(v => {
    revenue = v
      .filter(f => f.vehicle === vehicleId)
      .reduce((acc, curr) => acc + curr.collected, 0);
  });

  onDestroy(() => {
    fleetUnsub();
    complianceUnsub();
    financeUnsub();
  });

  // Status badge helper
  function statusClass(status: string): string {
    switch(status) {
      case 'ACTIVE': return 'bg-green-100 text-green-800';
      case 'NON_COMPLIANT': return 'bg-yellow-100 text-yellow-800';
      case 'MAINTENANCE': return 'bg-blue-100 text-blue-800';
      case 'SUSPENDED': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }

  // Save updates
  async function saveVehicle() {
    if (!vehicle) return;

    const updated = {
      route: $editRoute,
      status: $editStatus
    };

    const { error } = await supabase
      .from('vehicles')
      .update(updated)
      .eq('id', vehicle.id)
      .eq('organizationId', vehicle.organizationId); // tenant safety

    if (error) {
      alert(`Failed to update vehicle: ${error.message}`);
    } else {
      alert('Vehicle updated successfully!');
    }
  }
</script>

{#if vehicle}
  <h2 class="text-3xl font-bold mb-6">Vehicle: {vehicle.registration}</h2>

  <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
    <!-- Vehicle Info + Editable -->
    <GlassCard>
      <h3 class="text-xl font-semibold mb-2">Vehicle Info</h3>
      <p><strong>Registration:</strong> {vehicle.registration}</p>
      <p>
        <strong>Route:</strong>
        <input type="text" bind:value={$editRoute} class="border rounded px-2 py-1 w-full"/>
      </p>
      <p>
        <strong>Status:</strong>
        <select bind:value={$editStatus} class="border rounded px-2 py-1 w-full">
          <option value="ACTIVE">ACTIVE</option>
          <option value="NON_COMPLIANT">NON_COMPLIANT</option>
          <option value="MAINTENANCE">MAINTENANCE</option>
          <option value="SUSPENDED">SUSPENDED</option>
        </select>
      </p>
      <p><strong>Owner ID:</strong> {vehicle.ownerId}</p>
      <p><strong>GPS:</strong> {vehicle.gpsLat}, {vehicle.gpsLng}</p>
      <p><strong>Active:</strong> {vehicle.active ? 'Yes' : 'No'}</p>
      <button on:click={saveVehicle} class="mt-4 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition">
        Save Changes
      </button>
    </GlassCard>

    <!-- Compliance Alerts -->
    <GlassCard>
      <h3 class="text-xl font-semibold mb-2">Compliance Alerts</h3>
      {#if alerts.length > 0}
        <ul class="space-y-2">
          {#each alerts as alert}
            <li class="bg-red-100 text-red-800 rounded-md px-3 py-2">
              <strong>{alert.type}</strong> - Expires: {alert.expiryDate} - Status: {alert.status}
            </li>
          {/each}
        </ul>
      {:else}
        <p class="text-gray-500">No alerts for this vehicle.</p>
      {/if}
    </GlassCard>
  </div>

  <!-- Revenue Card -->
  <GlassCard>
    <h3 class="text-xl font-semibold mb-2">Revenue Overview</h3>
    <p class="text-gray-700">Total Revenue Collected: <strong>KES {revenue.toLocaleString()}</strong></p>
  </GlassCard>
{:else}
  <p class="text-gray-500 text-center py-10">Vehicle not found or loading...</p>
{/if}