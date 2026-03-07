<script lang="ts">
  import {
    analyticsStore,
    type RouteStats,
  } from "$lib/features/analytics/+analytics"
  import { derived } from "svelte/store"

  // Auto-subscribe
  // 1. stats – safe fallback to empty array
  let stats = $derived($analyticsStore ?? [])

  // 2. sortedStats – derived sorted copy (shallow copy is fine here)
  let sortedStats = $derived(
    [...stats].sort((a, b) => b.congestionScore - a.congestionScore),
  )

  // 3. Aggregates – use $derived.by for better readability with conditionals & variables
  let totalRoutes = $derived(stats.length)

  let totalActiveVehicles = $derived(
    stats.reduce((sum, r) => sum + (r.activeVehicles ?? 0), 0), // ← added ?? 0 guard
  )

  let avgNetworkSpeed = $derived.by(() => {
    if (stats.length === 0) return 0

    const sum = stats.reduce((acc, r) => acc + (r.avgSpeed ?? 0), 0)
    const avg = sum / stats.length

    return Number(avg.toFixed(1)) // keep as number (better for charts/math)
    // ↑ Use toFixed() only when displaying → or return string if you prefer
  })
</script>

<!-- NETWORK SUMMARY HEADER -->
<div
  class="bg-white/95 backdrop-blur-2xl rounded-3xl p-6 shadow-xl mb-6 border border-white/60"
>
  <h2 class="text-2xl font-bold mb-4">Network Overview</h2>

  <div class="grid grid-cols-2 md:grid-cols-3 gap-6 text-center">
    <div>
      <p class="text-sm text-gray-500">Routes</p>
      <p class="text-2xl font-bold">{totalRoutes}</p>
    </div>

    <div>
      <p class="text-sm text-gray-500">Active Vehicles</p>
      <p class="text-2xl font-bold">{totalActiveVehicles}</p>
    </div>

    <div>
      <p class="text-sm text-gray-500">Avg Network Speed</p>
      <p class="text-2xl font-bold">{avgNetworkSpeed} km/h</p>
    </div>
  </div>
</div>

<!-- ROUTE CARDS -->
<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
  {#each sortedStats as s (s.routeName)}
    <div
      class="bg-white/90 backdrop-blur-2xl rounded-3xl p-6 shadow-xl border border-white/60 hover:shadow-2xl transition"
    >
      <div class="flex justify-between items-center mb-4">
        <h3 class="text-lg font-bold">{s.routeName}</h3>

        <!-- Congestion Indicator -->
        <span
          class="px-3 py-1 rounded-full text-xs font-semibold"
          class:bg-green-100={s.congestionScore < 30}
          class:text-green-700={s.congestionScore < 30}
          class:bg-yellow-100={s.congestionScore >= 30 &&
            s.congestionScore < 70}
          class:text-yellow-700={s.congestionScore >= 30 &&
            s.congestionScore < 70}
          class:bg-red-100={s.congestionScore >= 70}
          class:text-red-700={s.congestionScore >= 70}
        >
          Congestion {s.congestionScore}
        </span>
      </div>

      <div class="space-y-2 text-sm">
        <div class="flex justify-between">
          <span class="text-gray-500">Avg Speed</span>
          <span class="font-semibold">{s.avgSpeed} km/h</span>
        </div>

        <div class="flex justify-between">
          <span class="text-gray-500">Active Vehicles</span>
          <span class="font-semibold">{s.activeVehicles}</span>
        </div>
      </div>

      <!-- Optional Visual Speed Bar -->
      <div class="mt-4 h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          class="h-full bg-blue-500 transition-all duration-500"
          style="width: {Math.min(s.avgSpeed * 2, 100)}%"
        />
      </div>
    </div>
  {/each}
</div>
