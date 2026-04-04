<script lang="ts">
  const routes = [
    { name: "CBD → Westlands", meta: "Via Uhuru Highway & Waiyaki Way", badge: "live", badgeLabel: "Live", vehicles: 14, avg: "11 min" },
    { name: "CBD → Kangemi", meta: "Via Waiyaki Way (Route 46)", badge: "busy", badgeLabel: "Peak Hours", vehicles: 9, avg: "28 min" },
    { name: "CBD → Kasarani", meta: "Via Thika Road", badge: "live", badgeLabel: "Live", vehicles: 11, avg: "34 min" },
    { name: "CBD → Rongai", meta: "Via Lang'ata Road", badge: "live", badgeLabel: "Live", vehicles: 7, avg: "42 min" },
    { name: "CBD → Eastlands", meta: "Via Jogoo Road", badge: "live", badgeLabel: "Live", vehicles: 16, avg: "18 min" },
    { name: "CBD → Ngong", meta: "Via Ngong Road", badge: "busy", badgeLabel: "Peak Hours", vehicles: 6, avg: "55 min" }
  ];
</script>

<div class="routes-grid">
  {#each routes as r}
    <div class="route-card">
      <div class="route-header">
        <div class="route-name">{r.name}</div>
        <span class="route-badge badge-{r.badge}">{r.badgeLabel}</span>
      </div>
      <div class="route-meta">{r.meta}</div>
      <div class="route-stats">
        <div>
          <div class="route-stat-val">{r.vehicles}</div>
          <div class="route-stat-lbl">Vehicles Tracked</div>
        </div>
        <div>
          <div class="route-stat-val">{r.avg}</div>
          <div class="route-stat-lbl">Avg ETA From CBD</div>
        </div>
      </div>
    </div>
  {/each}
</div>

<style>
  .routes-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 14px;
  }
  .route-card {
    background: var(--surface);
    border: 1px solid var(--rim);
    border-radius: 18px;
    padding: 28px 24px;
    transition:
      border-color 0.3s,
      transform 0.3s;
  }
  .route-card:hover {
    border-color: rgba(242, 101, 34, 0.28);
    transform: translateY(-3px);
  }
  .route-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 16px;
  }
  .route-name {
    font-family: var(--font-display);
    font-size: 1rem;
    font-weight: 700;
    color: var(--text-1);
  }
  .route-badge {
    padding: 3px 10px;
    border-radius: 100px;
    font-size: 0.68rem;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }
  .badge-live {
    background: rgba(0, 176, 155, 0.12);
    color: var(--teal);
    border: 1px solid rgba(0, 176, 155, 0.25);
  }
  .badge-busy {
    background: rgba(242, 101, 34, 0.12);
    color: var(--orange);
    border: 1px solid rgba(242, 101, 34, 0.25);
  }
  .route-meta {
    font-size: 0.78rem;
    color: var(--text-3);
    margin-bottom: 14px;
  }
  .route-stats {
    display: flex;
    gap: 20px;
  }
  .route-stat-val {
    font-family: var(--font-display);
    font-size: 1.3rem;
    font-weight: 800;
    color: var(--text-1);
    letter-spacing: -0.03em;
  }
  .route-stat-lbl {
    font-size: 0.7rem;
    color: var(--text-3);
    margin-top: 2px;
  }

  @media (max-width: 900px) {
    .routes-grid {
      grid-template-columns: 1fr;
    }
  }
</style>