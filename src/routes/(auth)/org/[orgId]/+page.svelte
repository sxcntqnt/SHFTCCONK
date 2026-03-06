<script lang="ts">
  import { onDestroy } from 'svelte';
  import { fleetStore, getActiveVehicles } from '$lib/features/fleet/stores/fleet';
  import { financeStore, getTotalRevenueToday } from '$lib/features/finance/finance.store';
  import { complianceEventStore, complianceAlertStore, getUnresolvedEvents } from '$lib/features/compliance/stores/compliance';

  import OperatorStatCard from '$lib/components/OperatorStatCard.svelte';
  import GlassCard from '$lib/components/GlassCard.svelte';
  import Chart from '$lib/components/Chart.svelte'; // Chart.js wrapper

  import { getRevenueTrend } from '$lib/features/finance/reconciliation.store';

  /* ============================================================
     LOCAL REACTIVE STATE
  =========================================================== */
  let fleet = [];
  let finance = [];
  let complianceAlerts = [];
  let incidents = [];

  let revenueTrend = [];

  /* ============================================================
     SUBSCRIPTIONS
  =========================================================== */
  const fleetUnsub = fleetStore.subscribe(v => {
    fleet = v;
  });

  const financeUnsub = financeStore.subscribe(v => {
    finance = v;
    revenueTrend = getRevenueTrend(v);
  });

  const complianceUnsub = complianceAlertStore.subscribe(v => {
    complianceAlerts = v;
  });

  const incidentsUnsub = complianceEventStore.subscribe(v => {
    incidents = getUnresolvedEvents();
  });

  onDestroy(() => {
    fleetUnsub();
    financeUnsub();
    complianceUnsub();
    incidentsUnsub();
  });

  /* ============================================================
     DERIVED VALUES
  =========================================================== */
  $: activeVehicleCount = getActiveVehicles().length;
  $: totalRevenueToday = getTotalRevenueToday();
  $: totalComplianceAlerts = complianceAlerts.length;
  $: totalIncidents = incidents.length;
</script>

<h2 class="text-3xl font-bold mb-8">Fleet Command Center</h2>

<!-- Top Stats -->
<div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
  <OperatorStatCard title="Active Vehicles" value={activeVehicleCount} />
  <OperatorStatCard title="Revenue Today" value={`KES ${totalRevenueToday.toLocaleString()}`} />
  <OperatorStatCard title="Compliance Alerts" value={totalComplianceAlerts} />
  <OperatorStatCard title="Incidents" value={totalIncidents} />
</div>

<!-- Revenue Overview Chart -->
<GlassCard>
  <h3 class="text-xl font-semibold mb-4">Revenue Overview</h3>
  <Chart data={revenueTrend} type="line" />
</GlassCard>

<!-- Optional Compliance Summary -->
<GlassCard class="mt-6">
  <h3 class="text-xl font-semibold mb-4">Compliance Summary</h3>
  {#if complianceAlerts.length > 0}
    <ul class="space-y-2 text-gray-700">
      {#each complianceAlerts as alert}
        <li>
          <span class="font-medium">{alert.vehicleId}</span> - {alert.type} ({alert.status})
        </li>
      {/each}
    </ul>
  {:else}
    <p class="text-gray-500">No active alerts.</p>
  {/if}
</GlassCard>