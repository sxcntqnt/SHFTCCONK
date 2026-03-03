<script lang="ts">
  import { financeStore, getRevenueTrend } from '$lib/stores/finance.store';
  import GlassCard from '$lib/components/GlassCard.svelte';
  import Chart from '$lib/components/Chart.svelte';
  import { writable, get } from 'svelte/store';

  /* ============================================================
     Reactive Stores
  ============================================================ */
  let finance = [];
  financeStore.subscribe(v => finance = v);

  // Derived analytics: revenue trends per vehicle
  const vehicleTrends = writable<{ vehicle: string; trend: number[] }[]>([]);

  $: vehicleTrends.set(
    finance.map(f => ({
      vehicle: f.vehicle,
      trend: getRevenueTrend([f]) // single vehicle trend
    }))
  );

  // Total revenue for header
  $: totalRevenue = finance.reduce((sum, f) => sum + f.collected, 0);

  // Global revenue trend combining all vehicles
  $: globalTrend = getRevenueTrend(finance);

  // Route-level analytics (example, aggregate by route)
  $: routeRevenue = finance.reduce((acc, f) => {
    if (!acc[f.route]) acc[f.route] = { collected: 0, target: 0, variance: 0 };
    acc[f.route].collected += f.collected;
    acc[f.route].target += f.target;
    acc[f.route].variance += f.variance;
    return acc;
  }, {} as Record<string, { collected: number; target: number; variance: number }>);

  const routeTrends = Object.entries(routeRevenue).map(([route, data]) => ({
    route,
    collected: data.collected,
    target: data.target,
    variance: data.variance,
    trend: getRevenueTrend(
      finance.filter(f => f.route === route)
    )
  }));
</script>

<!-- =========================
     Page Header
========================= -->
<h2 class="text-3xl font-bold mb-6">Finance & Route Intelligence</h2>

<!-- =========================
     Global Revenue Trend
========================= -->
<GlassCard class="mb-6">
  <h3 class="text-xl font-semibold mb-2">Total Revenue Trend</h3>
  <p class="text-gray-600 mb-4">
    Combined revenue across all vehicles — daily remittance overview
  </p>
  <Chart data={globalTrend} type="line" class="h-40" />
</GlassCard>

<!-- =========================
     Total Revenue Summary
========================= -->
<GlassCard class="mb-6 flex flex-col md:flex-row items-center justify-between gap-4">
  <div>
    <h3 class="text-xl font-semibold mb-2">Total Revenue Today</h3>
    <p class="text-2xl font-bold">KES {totalRevenue.toLocaleString()}</p>
  </div>
</GlassCard>

<!-- =========================
     Per Vehicle Revenue
========================= -->
<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
  {#each get(vehicleTrends) as vt}
    <GlassCard>
      <div class="flex justify-between items-center mb-2">
        <h4 class="font-semibold">{vt.vehicle}</h4>
        <span class="text-gray-600">
          KES {finance.find(f => f.vehicle === vt.vehicle)?.collected.toLocaleString()}
        </span>
      </div>
      <Chart data={vt.trend} type="line" class="h-28" />
      <div class="mt-2 text-sm text-gray-500">
        Target: KES {finance.find(f => f.vehicle === vt.vehicle)?.target?.toLocaleString()} | 
        Variance: KES {finance.find(f => f.vehicle === vt.vehicle)?.variance?.toLocaleString()}
      </div>
    </GlassCard>
  {/each}
</div>

<!-- =========================
     Route Intelligence Panel
========================= -->
<h2 class="text-3xl font-bold mb-6">Route Intelligence</h2>

<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  {#each routeTrends as route}
    <GlassCard>
      <div class="flex justify-between items-center mb-2">
        <h4 class="font-semibold">{route.route}</h4>
        <span class="text-gray-600">
          KES {route.collected.toLocaleString()}
        </span>
      </div>
      <Chart data={route.trend} type="line" class="h-28" />
      <div class="mt-2 text-sm text-gray-500">
        Target: KES {route.target.toLocaleString()} | Variance: KES {route.variance.toLocaleString()}
      </div>
    </GlassCard>
  {/each}
</div>