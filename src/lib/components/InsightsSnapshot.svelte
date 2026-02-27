<!-- src/lib/components/WeeklyInsightsCard.svelte -->
<script>
  // Props — you can pass real data from parent / store / API
  export let weeklyTime = '—';
  export let delays = '—';
  export let cost = '—';
  export let co2Saved = '—';

  // Optional: fallback / derived state
  $: hasData = weeklyTime !== '—' || delays !== '—' || cost !== '—' || co2Saved !== '—';
</script>

<div class="card">
  <h2>This Week</h2>

  {#if hasData}
    <div class="stats-grid">
      <div class="stat-item">
        <span class="icon">⏱️</span>
        <div class="stat-content">
          <div class="label">Total Commute Time</div>
          <div class="value">{weeklyTime}</div>
        </div>
      </div>

      <div class="stat-item warning">
        <span class="icon">⚠️</span>
        <div class="stat-content">
          <div class="label">Total Delays</div>
          <div class="value">{delays}</div>
        </div>
      </div>

      <div class="stat-item">
        <span class="icon">💰</span>
        <div class="stat-content">
          <div class="label">Money Spent</div>
          <div class="value">{cost}</div>
        </div>
      </div>

      <div class="stat-item success">
        <span class="icon">🌿</span>
        <div class="stat-content">
          <div class="label">CO₂ Saved</div>
          <div class="value">{co2Saved}</div>
        </div>
      </div>
    </div>

    <div class="footer-note">
      Compared to driving alone • Based on your recent trips
    </div>
  {:else}
    <div class="empty-state">
      <p>No commute data this week yet</p>
      <p class="sub">Your stats will appear here after a few trips</p>
    </div>
  {/if}
</div>

<style>
  .card {
    background: white;
    padding: 1.25rem;
    border-radius: 12px;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
  }

  .card h2 {
    margin: 0 0 1.25rem 0;
    font-size: 1.35rem;
    font-weight: 600;
    color: #1e293b;
  }

  .stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
    gap: 1rem;
  }

  .stat-item {
    display: flex;
    align-items: center;
    gap: 0.9rem;
    padding: 0.9rem;
    background: #f8fafc;
    border-radius: 10px;
    transition: background 0.18s;
  }

  .stat-item:hover {
    background: #f1f5f9;
  }

  .stat-item .icon {
    font-size: 1.9rem;
    line-height: 1;
  }

  .stat-content {
    flex: 1;
  }

  .label {
    font-size: 0.875rem;
    color: #64748b;
    margin-bottom: 0.25rem;
  }

  .value {
    font-size: 1.25rem;
    font-weight: 600;
    color: #1e293b;
  }

  .warning .value {
    color: #dc2626;
  }

  .success .value {
    color: #15803d;
  }

  .footer-note {
    margin-top: 1.25rem;
    font-size: 0.82rem;
    color: #64748b;
    text-align: center;
    line-height: 1.4;
  }

  .empty-state {
    text-align: center;
    color: #64748b;
    padding: 1.8rem 1rem;
  }

  .empty-state p {
    margin: 0.5rem 0;
  }

  .empty-state .sub {
    font-size: 0.95rem;
    margin-top: 0.6rem;
  }

  @media (max-width: 500px) {
    .stats-grid {
      grid-template-columns: 1fr;
    }
  }
</style>