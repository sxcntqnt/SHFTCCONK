<script lang="ts">
  // Props — real data passed from parent / store / API
  interface Props {
    weeklyTime?: string
    delays?: string
    cost?: string
    co2Saved?: string
  }

  let {
    weeklyTime = "—",
    delays = "—",
    cost = "—",
    co2Saved = "—",
  }: Props = $props()

  let hasData = $derived(
    weeklyTime !== "—" || delays !== "—" || cost !== "—" || co2Saved !== "—",
  )

  const metrics = $derived([
    {
      label: "Commute Time",
      value: weeklyTime,
      sub: "this week",
      variant: "neutral",
      icon: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
    },
    {
      label: "Total Delays",
      value: delays,
      sub: "vs last week",
      variant: "warn",
      icon: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
    },
    {
      label: "Fare Spent",
      value: cost,
      sub: "total this week",
      variant: "neutral",
      icon: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>`,
    },
    {
      label: "CO₂ Saved",
      value: co2Saved,
      sub: "vs driving alone",
      variant: "good",
      icon: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22c4.97 0 9-4.03 9-9s-4.03-9-9-9S3 8.03 3 13s4.03 9 9 9z"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>`,
    },
  ])

  const VARIANT_STYLES = {
    neutral: {
      color: "var(--text-1)",
      bg: "rgba(255,255,255,0.05)",
      border: "rgba(255,255,255,0.08)",
      icon: "rgba(255,255,255,0.35)",
    },
    warn: {
      color: "#f87171",
      bg: "rgba(248,113,113,0.07)",
      border: "rgba(248,113,113,0.18)",
      icon: "#f87171",
    },
    good: {
      color: "var(--teal)",
      bg: "rgba(0,176,155,0.07)",
      border: "rgba(0,176,155,0.18)",
      icon: "var(--teal)",
    },
  } as const
</script>

<div class="insights-card">
  <div class="card-head">
    <div class="card-eyebrow">Weekly Snapshot</div>
    <div class="card-title">This Week's Commute</div>
  </div>

  {#if hasData}
    <div class="metrics-grid">
      {#each metrics as m}
        {@const v = VARIANT_STYLES[m.variant]}
        <div
          class="metric-cell"
          style="background:{v.bg}; border:1px solid {v.border};"
        >
          <div
            class="metric-icon"
            style="background:rgba(255,255,255,0.04); color:{v.icon};"
          >
            {@html m.icon}
          </div>
          <div>
            <div class="metric-label">{m.label}</div>
            <div class="metric-value" style="color:{v.color};">{m.value}</div>
            <div class="metric-sub">{m.sub}</div>
          </div>
        </div>
      {/each}
    </div>

    <div class="footer-note">
      Compared to driving solo · Based on your trips this week
    </div>
  {:else}
    <div class="empty-state">
      <div class="empty-icon">
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
        </svg>
      </div>
      <div class="empty-title">No data yet this week</div>
      <p class="empty-sub">
        Your commute stats will appear here after your first few trips.
      </p>
    </div>
  {/if}
</div>

<style>
  /* ── Card shell ── */
  .insights-card {
    background: var(--surface);
    border: 1px solid var(--rim);
    border-radius: 20px;
    padding: 22px 24px;
    position: relative;
    overflow: hidden;
  }

  /* Top accent */
  .insights-card::before {
    content: "";
    position: absolute;
    top: 0;
    left: 20px;
    right: 20px;
    height: 1px;
    background: linear-gradient(
      90deg,
      transparent,
      rgba(0, 176, 155, 0.4),
      transparent
    );
  }

  /* ── Header ── */
  .card-head {
    margin-bottom: 18px;
  }
  .card-eyebrow {
    font-size: 0.62rem;
    font-weight: 700;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--teal);
    margin-bottom: 4px;
  }
  .card-title {
    font-family: var(--font-display);
    font-size: 1rem;
    font-weight: 800;
    letter-spacing: -0.03em;
    color: var(--text-1);
  }

  /* ── Metrics grid ── */
  .metrics-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 10px;
  }

  .metric-cell {
    border-radius: 14px;
    padding: 14px 15px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    transition: transform 0.2s;
  }
  .metric-cell:hover {
    transform: translateY(-2px);
  }

  .metric-icon {
    width: 32px;
    height: 32px;
    border-radius: 9px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    margin-bottom: 2px;
  }

  .metric-label {
    font-size: 0.68rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--text-3);
    line-height: 1.3;
  }

  .metric-value {
    font-family: var(--font-display);
    font-size: 1.35rem;
    font-weight: 900;
    letter-spacing: -0.04em;
    line-height: 1;
  }

  .metric-sub {
    font-size: 0.68rem;
    color: var(--text-3);
    line-height: 1.3;
  }

  /* ── Footer note ── */
  .footer-note {
    margin-top: 16px;
    padding-top: 14px;
    border-top: 1px solid var(--rim);
    font-size: 0.72rem;
    color: var(--text-3);
    text-align: center;
    line-height: 1.5;
  }

  /* ── Empty state ── */
  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 32px 24px;
    text-align: center;
    gap: 8px;
  }
  .empty-icon {
    width: 44px;
    height: 44px;
    border-radius: 14px;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid var(--rim);
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--text-3);
    margin-bottom: 4px;
  }
  .empty-title {
    font-family: var(--font-display);
    font-size: 0.9rem;
    font-weight: 700;
    letter-spacing: -0.02em;
    color: var(--text-2);
  }
  .empty-sub {
    font-size: 0.78rem;
    color: var(--text-3);
    line-height: 1.55;
  }

  /* ── Responsive ── */
  @media (max-width: 860px) {
    .metrics-grid {
      grid-template-columns: repeat(2, 1fr);
    }
  }
  @media (max-width: 480px) {
    .metrics-grid {
      grid-template-columns: 1fr 1fr;
    }
  }
</style>
