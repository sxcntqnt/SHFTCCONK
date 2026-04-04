<script lang="ts">
  export let totalRoutes   = 42;
  export let activeVehicles = 28;
  export let avgCongestion  = 63;
  export let onTimeRate     = 94;
  export let timeStr        = "9:30 AM";
  export let peakLabel      = "Peak Hour";
  export let peakColor      = "#f26522";

  // Derived
  $: congestionClass = avgCongestion > 75 ? "bad" : avgCongestion > 45 ? "warn" : "good";
  $: onTimeClass     = onTimeRate   > 90 ? "good" : onTimeRate > 75 ? "warn" : "bad";

  // Sparkline data (fixed — deterministic visual only)
  const spark = [38, 51, 44, 63, 72, 68, 81, 74, 59, 55, 63];
  const sparkMax = Math.max(...spark);
  const sparkMin = Math.min(...spark);
  function sparkY(v: number, h = 32): number {
    return h - ((v - sparkMin) / (sparkMax - sparkMin)) * h;
  }
  const pts = spark.map((v, i) => `${(i / (spark.length - 1)) * 100},${sparkY(v)}`).join(" ");

  // Mini route bars
  const bars = [
    { label: "46", score: 0.91, label2: "Westlands" },
    { label: "11b", score: 0.76, label2: "Parklands" },
    { label: "107", score: 0.83, label2: "Ruaka" },
    { label: "100", score: 0.68, label2: "Kiambu Rd" },
  ];
</script>

<div class="dash">
  <!-- Header -->
  <div class="dash-header">
    <div class="dash-brand">
      <div class="brand-hex">⬡</div>
      <div class="brand-text">
        <div class="brand-name">Fleet Analytics</div>
        <div class="brand-sub">YesBana Network</div>
      </div>
    </div>
    <div class="dash-meta">
      <div class="time-badge">
        <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
        </svg>
        {timeStr}
      </div>
      <div class="peak-chip" style="color:{peakColor};border-color:{peakColor}33;background:{peakColor}12">
        {peakLabel}
      </div>
    </div>
  </div>

  <!-- KPI row -->
  <div class="kpi-row">
    <div class="kpi">
      <div class="kpi-val">{activeVehicles}</div>
      <div class="kpi-label">Live Vehicles</div>
      <div class="kpi-dot dot-live"></div>
    </div>
    <div class="kpi-sep"></div>
    <div class="kpi">
      <div class="kpi-val kpi-{congestionClass}">{avgCongestion}%</div>
      <div class="kpi-label">Congestion</div>
      <div class="kpi-dot dot-{congestionClass}"></div>
    </div>
    <div class="kpi-sep"></div>
    <div class="kpi">
      <div class="kpi-val kpi-{onTimeClass}">{onTimeRate}%</div>
      <div class="kpi-label">On-Time</div>
      <div class="kpi-dot dot-{onTimeClass}"></div>
    </div>
    <div class="kpi-sep"></div>
    <div class="kpi kpi-iq">
      <div class="kpi-val kpi-iq-val">92.4</div>
      <div class="kpi-label">Route IQ</div>
      <div class="kpi-dot dot-iq"></div>
    </div>
  </div>

  <!-- Congestion sparkline -->
  <div class="spark-block">
    <div class="spark-label">Congestion trend · last 11 cycles</div>
    <svg viewBox="0 0 100 34" preserveAspectRatio="none" class="spark-svg">
      <defs>
        <linearGradient id="sg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stop-color="#f26522" stop-opacity="0.22"/>
          <stop offset="100%" stop-color="#f26522" stop-opacity="0"/>
        </linearGradient>
      </defs>
      <polyline points={pts + ` 100,34 0,34`} fill="url(#sg)" stroke="none"/>
      <polyline points={pts} fill="none" stroke="#f26522" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round"/>
    </svg>
  </div>

  <!-- Route bars -->
  <div class="route-bars">
    <div class="bars-title">Top Routes · IQ Score</div>
    {#each bars as b}
      <div class="bar-row">
        <div class="bar-pill">⬡ {b.label}</div>
        <div class="bar-name">{b.label2}</div>
        <div class="bar-track">
          <div class="bar-fill" style="width:{b.score * 100}%"></div>
        </div>
        <div class="bar-score">{b.score.toFixed(2)}</div>
      </div>
    {/each}
  </div>

  <!-- Footer stats -->
  <div class="dash-footer">
    <span class="footer-stat">{totalRoutes} routes indexed</span>
    <span class="footer-dot">·</span>
    <span class="footer-stat">12 partner SACCOs</span>
    <span class="footer-dot">·</span>
    <span class="footer-stat live-text">● Live</span>
  </div>
</div>

<style>
  .dash {
    width: 100%; height: 100%;
    background: var(--ink, #0d0d0d);
    border-radius: 0;
    display: flex;
    flex-direction: column;
    gap: 0;
    padding: 22px 22px 18px;
    box-sizing: border-box;
    font-family: inherit;
    color: var(--text-1, #f0f0f0);
  }

  /* Header */
  .dash-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 18px;
  }
  .dash-brand {
    display: flex;
    align-items: center;
    gap: 9px;
  }
  .brand-hex {
    font-size: 1.3rem;
    color: #f26522;
    line-height: 1;
  }
  .brand-name {
    font-size: 0.82rem;
    font-weight: 800;
    color: var(--text-1, #f0f0f0);
    letter-spacing: -0.01em;
    line-height: 1.2;
  }
  .brand-sub {
    font-size: 0.60rem;
    color: var(--text-3, #555);
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }
  .dash-meta {
    display: flex;
    align-items: center;
    gap: 7px;
  }
  .time-badge {
    display: flex;
    align-items: center;
    gap: 5px;
    font-size: 0.72rem;
    font-weight: 700;
    color: var(--text-2, #999);
    background: rgba(255,255,255,0.05);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 8px;
    padding: 3px 9px;
    font-variant-numeric: tabular-nums;
  }
  .peak-chip {
    font-size: 0.60rem;
    font-weight: 700;
    letter-spacing: 0.07em;
    text-transform: uppercase;
    padding: 3px 9px;
    border-radius: 100px;
    border: 1px solid;
  }

  /* KPIs */
  .kpi-row {
    display: flex;
    align-items: center;
    background: rgba(255,255,255,0.03);
    border: 1px solid rgba(255,255,255,0.07);
    border-radius: 14px;
    padding: 14px 8px;
    margin-bottom: 14px;
    gap: 0;
  }
  .kpi {
    flex: 1;
    text-align: center;
    position: relative;
    padding: 0 6px;
  }
  .kpi-iq {
    position: relative;
  }
  .kpi-iq::before {
    content: '';
    position: absolute;
    inset: -14px -1px;
    border-radius: 10px;
    border: 1px solid rgba(242,101,34,0.3);
    background: rgba(242,101,34,0.04);
    pointer-events: none;
  }
  .kpi-val {
    font-size: 1.4rem;
    font-weight: 900;
    letter-spacing: -0.05em;
    color: var(--text-1, #f0f0f0);
    line-height: 1;
    margin-bottom: 4px;
    font-variant-numeric: tabular-nums;
  }
  .kpi-iq-val { color: #f26522; }
  .kpi-good { color: #00b09b; }
  .kpi-warn { color: #e8ac1a; }
  .kpi-bad  { color: #f26522; }
  .kpi-label {
    font-size: 0.60rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--text-3, #555);
    font-weight: 600;
    margin-bottom: 6px;
  }
  .kpi-dot {
    width: 5px; height: 5px;
    border-radius: 50%;
    margin: 0 auto;
  }
  .dot-live { background: #00b09b; box-shadow: 0 0 4px #00b09b; animation: blink 1.6s ease infinite; }
  .dot-good { background: #00b09b; }
  .dot-warn { background: #e8ac1a; }
  .dot-bad  { background: #f26522; }
  .dot-iq   { background: #f26522; box-shadow: 0 0 4px rgba(242,101,34,.5); }
  @keyframes blink { 0%,100%{opacity:1} 50%{opacity:.35} }
  .kpi-sep {
    width: 1px; height: 36px;
    background: rgba(255,255,255,0.08);
    flex-shrink: 0;
  }

  /* Sparkline */
  .spark-block {
    margin-bottom: 14px;
  }
  .spark-label {
    font-size: 0.60rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--text-3, #555);
    font-weight: 600;
    margin-bottom: 5px;
  }
  .spark-svg {
    width: 100%;
    height: 34px;
    display: block;
    overflow: visible;
  }

  /* Route bars */
  .route-bars {
    flex: 1;
  }
  .bars-title {
    font-size: 0.60rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--text-3, #555);
    font-weight: 600;
    margin-bottom: 8px;
  }
  .bar-row {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 7px;
  }
  .bar-pill {
    font-size: 0.62rem;
    font-weight: 700;
    color: #f26522;
    background: rgba(242,101,34,0.1);
    border: 1px solid rgba(242,101,34,0.2);
    border-radius: 100px;
    padding: 2px 7px;
    white-space: nowrap;
    letter-spacing: 0.02em;
  }
  .bar-name {
    font-size: 0.68rem;
    color: var(--text-2, #888);
    width: 60px;
    flex-shrink: 0;
  }
  .bar-track {
    flex: 1;
    height: 5px;
    background: rgba(255,255,255,0.07);
    border-radius: 100px;
    overflow: hidden;
  }
  .bar-fill {
    height: 100%;
    background: linear-gradient(90deg, #00b09b, #f26522);
    border-radius: 100px;
    transition: width 0.6s ease;
  }
  .bar-score {
    font-size: 0.68rem;
    font-weight: 800;
    color: var(--text-1, #f0f0f0);
    width: 30px;
    text-align: right;
    font-variant-numeric: tabular-nums;
  }

  /* Footer */
  .dash-footer {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 12px;
    padding-top: 10px;
    border-top: 1px solid rgba(255,255,255,0.07);
  }
  .footer-stat {
    font-size: 0.60rem;
    color: var(--text-3, #555);
    font-weight: 600;
  }
  .footer-dot { color: var(--text-3, #444); font-size: 0.55rem; }
  .live-text  { color: #00b09b; }
</style>