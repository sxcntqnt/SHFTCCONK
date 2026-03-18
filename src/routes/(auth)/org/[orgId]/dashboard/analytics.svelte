<script lang="ts">
  /**
   * analytics.svelte
   *
   * FIXES:
   *   - Import path: `$lib/features/analytics/+analytics` → `analytics.store`
   *   - Export name: `analyticsStore` (was `analytics` in old file, now both exported)
   */

  import { analyticsStore } from "$lib/features/analytics/analytics.store"

  let stats = $derived($analyticsStore ?? [])
  let sortedStats = $derived(
    [...stats].sort((a, b) => b.congestionScore - a.congestionScore),
  )
  let totalRoutes = $derived(stats.length)
  let totalActiveVehicles = $derived(
    stats.reduce((sum, r) => sum + (r.activeVehicles ?? 0), 0),
  )
  let avgNetworkSpeed = $derived.by(() => {
    if (stats.length === 0) return 0
    const sum = stats.reduce((acc, r) => acc + (r.avgSpeed ?? 0), 0)
    return Number((sum / stats.length).toFixed(1))
  })

  function congestionClass(score: number): string {
    if (score < 30) return "cong-low"
    if (score < 70) return "cong-mid"
    return "cong-high"
  }
</script>

<!-- Network summary -->
<div class="an-summary">
  <h2 class="an-summary-title">Network Overview</h2>
  <div class="an-summary-stats">
    <div class="an-stat">
      <span class="an-stat-label">Routes</span>
      <span class="an-stat-value">{totalRoutes}</span>
    </div>
    <div class="an-stat">
      <span class="an-stat-label">Active Vehicles</span>
      <span class="an-stat-value">{totalActiveVehicles}</span>
    </div>
    <div class="an-stat">
      <span class="an-stat-label">Avg Speed</span>
      <span class="an-stat-value">{avgNetworkSpeed} km/h</span>
    </div>
  </div>
</div>

<!-- Route cards -->
{#if sortedStats.length === 0}
  <p class="an-empty">No route analytics available.</p>
{:else}
  <div class="an-grid">
    {#each sortedStats as s (s.routeName)}
      <div class="an-card">
        <div class="an-card-header">
          <h3 class="an-route-name">{s.routeName}</h3>
          <span class="an-cong-badge {congestionClass(s.congestionScore)}">
            Congestion {s.congestionScore}
          </span>
        </div>
        <div class="an-stats">
          <div class="an-row">
            <span>Avg Speed</span><strong>{s.avgSpeed} km/h</strong>
          </div>
          <div class="an-row">
            <span>Active Vehicles</span><strong>{s.activeVehicles}</strong>
          </div>
        </div>
        <div class="an-speed-bar">
          <div
            class="an-speed-fill"
            style="width:{Math.min(s.avgSpeed * 2, 100)}%"
          ></div>
        </div>
      </div>
    {/each}
  </div>
{/if}

<style>
  .an-summary {
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.07);
    border-radius: 12px;
    padding: 1.25rem;
    margin-bottom: 1rem;
  }
  .an-summary-title {
    font-size: 0.95rem;
    font-weight: 700;
    color: #f0f1f4;
    margin: 0 0 1rem;
  }
  .an-summary-stats {
    display: flex;
    gap: 2rem;
    flex-wrap: wrap;
  }
  .an-stat {
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
  }
  .an-stat-label {
    font-size: 0.65rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: rgba(255, 255, 255, 0.3);
  }
  .an-stat-value {
    font-size: 1.4rem;
    font-weight: 800;
    color: #f0f1f4;
  }

  .an-empty {
    font-size: 0.85rem;
    color: rgba(255, 255, 255, 0.25);
    text-align: center;
    padding: 2rem;
  }

  .an-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 0.85rem;
  }
  .an-card {
    background: rgba(255, 255, 255, 0.025);
    border: 1px solid rgba(255, 255, 255, 0.07);
    border-radius: 12px;
    padding: 1.1rem;
  }
  .an-card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 0.75rem;
    gap: 0.5rem;
    flex-wrap: wrap;
  }
  .an-route-name {
    font-size: 0.88rem;
    font-weight: 700;
    color: #f0f1f4;
    margin: 0;
  }

  .an-cong-badge {
    font-size: 0.65rem;
    font-weight: 700;
    padding: 0.2rem 0.6rem;
    border-radius: 100px;
  }
  .cong-low {
    background: rgba(74, 222, 128, 0.1);
    color: #4ade80;
    border: 1px solid rgba(74, 222, 128, 0.2);
  }
  .cong-mid {
    background: rgba(250, 204, 21, 0.1);
    color: #facc15;
    border: 1px solid rgba(250, 204, 21, 0.2);
  }
  .cong-high {
    background: rgba(248, 113, 113, 0.1);
    color: #f87171;
    border: 1px solid rgba(248, 113, 113, 0.2);
  }

  .an-stats {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
    margin-bottom: 0.75rem;
  }
  .an-row {
    display: flex;
    justify-content: space-between;
    font-size: 0.78rem;
    color: rgba(255, 255, 255, 0.4);
  }
  .an-row strong {
    color: #d4d7e0;
  }

  .an-speed-bar {
    height: 4px;
    background: rgba(255, 255, 255, 0.07);
    border-radius: 100px;
    overflow: hidden;
  }
  .an-speed-fill {
    height: 100%;
    background: #60a5fa;
    border-radius: 100px;
    transition: width 0.4s;
  }
</style>
