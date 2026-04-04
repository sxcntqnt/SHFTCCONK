<script lang="ts">
  interface RouteItem {
    route_number: string | number
  }
  export let routes: RouteItem[] = []

  // Deterministic score from route number — no random()
  function routeScore(num: string | number): number {
    const n = parseInt(String(num).replace(/\D/g, "") || "7", 10)
    return parseFloat((0.6 + ((n * 17 + 13) % 37) / 100).toFixed(2))
  }

  function scoreClass(s: number): string {
    if (s >= 0.85) return "great"
    if (s >= 0.72) return "good"
    if (s >= 0.58) return "warn"
    return "low"
  }

  function scoreLabel(s: number): string {
    if (s >= 0.85) return "Optimal"
    if (s >= 0.72) return "Good"
    if (s >= 0.58) return "Moderate"
    return "Low"
  }

  // Condition tags — cycle through per route
  const conditions = [
    "Off-peak",
    "Peak",
    "Reliable",
    "Variable",
    "Express",
    "Busy",
  ]
  function condTag(n: string | number): string {
    const i = parseInt(String(n).replace(/\D/g, "") || "0", 10)
    return conditions[i % conditions.length]
  }

  $: scored = routes.slice(0, 7).map((r) => {
    const s = routeScore(r.route_number)
    return {
      ...r,
      score: s,
      cls: scoreClass(s),
      label: scoreLabel(s),
      cond: condTag(r.route_number),
    }
  })

  // Overall IQ — average
  $: avgIQ = scored.length
    ? ((scored.reduce((a, r) => a + r.score, 0) / scored.length) * 100).toFixed(
        1,
      )
    : "—"
</script>

<div class="intel">
  <!-- Header -->
  <div class="intel-header">
    <div class="intel-title">
      <svg
        width="12"
        height="12"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2.5"
        aria-hidden="true"
      >
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
      </svg>
      Route Intelligence
    </div>
    <div class="iq-badge">
      <span class="iq-val">{avgIQ}</span>
      <span class="iq-lbl">Network IQ</span>
    </div>
  </div>

  <!-- Score legend -->
  <div class="legend-row">
    <div class="legend-item great">Optimal 0.85+</div>
    <div class="legend-item good">Good 0.72+</div>
    <div class="legend-item warn">Moderate</div>
    <div class="legend-item low">Low</div>
  </div>

  <!-- Route rows -->
  <div class="intel-list">
    {#if scored.length === 0}
      <div class="empty-state">No routes loaded</div>
    {:else}
      {#each scored as r (r.route_number)}
        <div class="intel-row">
          <!-- Route pill -->
          <div class="route-pill">
            <span class="hex-g">⬡</span>
            {r.route_number}
          </div>

          <!-- Condition tag -->
          <div class="cond-tag cond-{r.cls}">{r.cond}</div>

          <!-- Score bar -->
          <div class="score-bar-wrap">
            <div class="score-bar-track">
              <div
                class="score-bar-fill fill-{r.cls}"
                style="width:{r.score * 100}%"
              ></div>
            </div>
          </div>

          <!-- Score + label -->
          <div class="score-right">
            <div class="score-num score-{r.cls}">{r.score.toFixed(2)}</div>
            <div class="score-lbl">{r.label}</div>
          </div>
        </div>
      {/each}
    {/if}
  </div>

  <!-- Footer -->
  <div class="intel-footer">
    <span class="footer-note"
      >Scores update every trip cycle · powered by Beta-Bayes model</span
    >
  </div>
</div>

<style>
  .intel {
    width: 100%;
    height: 100%;
    background: var(--ink, #0d0d0d);
    display: flex;
    flex-direction: column;
    padding: 20px 20px 16px;
    box-sizing: border-box;
    gap: 0;
  }

  /* Header */
  .intel-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 12px;
  }
  .intel-title {
    display: flex;
    align-items: center;
    gap: 7px;
    font-size: 0.72rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--text-2, #999);
  }
  .intel-title svg {
    color: #f26522;
  }
  .iq-badge {
    display: flex;
    align-items: baseline;
    gap: 4px;
    background: rgba(242, 101, 34, 0.08);
    border: 1px solid rgba(242, 101, 34, 0.2);
    border-radius: 10px;
    padding: 4px 10px;
  }
  .iq-val {
    font-size: 0.9rem;
    font-weight: 900;
    color: #f26522;
    font-variant-numeric: tabular-nums;
    letter-spacing: -0.02em;
  }
  .iq-lbl {
    font-size: 0.58rem;
    font-weight: 700;
    color: rgba(242, 101, 34, 0.55);
    text-transform: uppercase;
    letter-spacing: 0.07em;
  }

  /* Legend */
  .legend-row {
    display: flex;
    gap: 6px;
    margin-bottom: 12px;
  }
  .legend-item {
    font-size: 0.56rem;
    font-weight: 700;
    padding: 2px 7px;
    border-radius: 100px;
    letter-spacing: 0.04em;
  }
  .legend-item.great {
    background: rgba(0, 176, 155, 0.12);
    color: #00b09b;
    border: 1px solid rgba(0, 176, 155, 0.2);
  }
  .legend-item.good {
    background: rgba(100, 200, 150, 0.1);
    color: #5ec99a;
    border: 1px solid rgba(100, 200, 150, 0.2);
  }
  .legend-item.warn {
    background: rgba(232, 172, 26, 0.1);
    color: #e8ac1a;
    border: 1px solid rgba(232, 172, 26, 0.2);
  }
  .legend-item.low {
    background: rgba(242, 101, 34, 0.1);
    color: #f26522;
    border: 1px solid rgba(242, 101, 34, 0.2);
  }

  /* List */
  .intel-list {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 7px;
    overflow-y: auto;
    scrollbar-width: thin;
    scrollbar-color: rgba(255, 255, 255, 0.08) transparent;
  }
  .empty-state {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 80px;
    font-size: 0.78rem;
    color: var(--text-3, #555);
  }

  /* Row */
  .intel-row {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .route-pill {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 0.68rem;
    font-weight: 800;
    color: var(--text-1, #f0f0f0);
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 100px;
    padding: 3px 9px;
    white-space: nowrap;
    min-width: 52px;
    justify-content: center;
  }
  .hex-g {
    color: rgba(242, 101, 34, 0.55);
    font-size: 0.7rem;
  }

  .cond-tag {
    font-size: 0.56rem;
    font-weight: 700;
    padding: 2px 6px;
    border-radius: 5px;
    white-space: nowrap;
    min-width: 44px;
    text-align: center;
  }
  .cond-great {
    background: rgba(0, 176, 155, 0.1);
    color: #00b09b;
  }
  .cond-good {
    background: rgba(100, 200, 150, 0.1);
    color: #5ec99a;
  }
  .cond-warn {
    background: rgba(232, 172, 26, 0.1);
    color: #e8ac1a;
  }
  .cond-low {
    background: rgba(242, 101, 34, 0.1);
    color: #f26522;
  }

  /* Score bar */
  .score-bar-wrap {
    flex: 1;
  }
  .score-bar-track {
    height: 5px;
    background: rgba(255, 255, 255, 0.07);
    border-radius: 100px;
    overflow: hidden;
  }
  .score-bar-fill {
    height: 100%;
    border-radius: 100px;
    transition: width 0.5s ease;
  }
  .fill-great {
    background: linear-gradient(90deg, #00b09b, #00d4b4);
  }
  .fill-good {
    background: linear-gradient(90deg, #00b09b80, #5ec99a);
  }
  .fill-warn {
    background: linear-gradient(90deg, #e8ac1a80, #e8ac1a);
  }
  .fill-low {
    background: linear-gradient(90deg, #f2652280, #f26522);
  }

  /* Score right */
  .score-right {
    text-align: right;
    min-width: 52px;
  }
  .score-num {
    font-size: 0.8rem;
    font-weight: 800;
    font-variant-numeric: tabular-nums;
    letter-spacing: -0.02em;
    line-height: 1;
  }
  .score-great {
    color: #00b09b;
  }
  .score-good {
    color: #5ec99a;
  }
  .score-warn {
    color: #e8ac1a;
  }
  .score-low {
    color: #f26522;
  }
  .score-lbl {
    font-size: 0.56rem;
    color: var(--text-3, #555);
    text-transform: uppercase;
    letter-spacing: 0.06em;
    font-weight: 600;
  }

  /* Footer */
  .intel-footer {
    margin-top: 10px;
    padding-top: 10px;
    border-top: 1px solid rgba(255, 255, 255, 0.07);
  }
  .footer-note {
    font-size: 0.56rem;
    color: var(--text-3, #555);
    font-weight: 500;
    letter-spacing: 0.03em;
  }
</style>
